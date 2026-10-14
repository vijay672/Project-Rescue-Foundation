// Supabase Edge Function: media-signed-url
// Generates short-lived signed URLs for the private 'foundation-media' Supabase Storage bucket
// Enforces role-based clearance, region restrictions, and quarantine invariants.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client bound to calling user's JWT to verify auth
    const supabaseUser = createClient(supabaseUrl, authHeader.replace('Bearer ', ''), {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Administrative client with service role for clearance checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const mediaId = url.searchParams.get('mediaId');
    const storageKey = url.searchParams.get('storageKey');

    if (!mediaId && !storageKey) {
      return new Response(JSON.stringify({ error: 'mediaId or storageKey query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch media asset metadata
    let mediaQuery = supabaseAdmin.from('media_assets').select('*, activities(*)');
    if (mediaId) {
      mediaQuery = mediaQuery.eq('id', mediaId);
    } else if (storageKey) {
      mediaQuery = mediaQuery.eq('storage_key', storageKey);
    }

    const { data: media, error: mediaError } = await mediaQuery.single();
    if (mediaError || !media) {
      return new Response(JSON.stringify({ error: 'Media asset not found in database records' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'field_staff';
    const assignedRegions: string[] = profile?.assigned_regions || [];
    const activity = media.activities;

    // RBAC Clearance Check
    const isAdmin = role === 'system_admin';
    const isOwner = activity?.staff_id === user.id;
    const isManagerWithRegion = role === 'operations_manager' && assignedRegions.includes(activity?.region_id);

    if (!isAdmin && !isOwner && !isManagerWithRegion) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient regional or role clearance' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Quarantine invariant check
    if (media.status === 'quarantined' && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Access Denied: Evidence asset is quarantined pending validation' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate short-lived signed URL (15 minutes = 900 seconds)
    const BUCKET = 'foundation-media';
    const expiresIn = 900;
    const { data: signedData, error: signError } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUrl(media.storage_key, expiresIn);

    if (signError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: `Failed to issue signed storage URL: ${signError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        mediaId: media.id,
        filename: media.filename,
        storageKey: media.storage_key,
        signedUrl: signedData.signedUrl,
        expiresInSeconds: expiresIn,
        status: media.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
