// Supabase Edge Function: reverse-geocode
// Phase 5: Authenticated GPS reverse geocoding with area, city, district, state, country
// Deno / TypeScript runtime

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get('lat');
    const lngStr = url.searchParams.get('lng');

    if (!latStr || !lngStr) {
      return new Response(JSON.stringify({ error: 'lat and lng parameters are required' }), { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(JSON.stringify({ error: 'Invalid latitude or longitude coordinates' }), { status: 400 });
    }

    // Call OpenStreetMap Nominatim with strict User-Agent
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'ProjectRescueFoundation/2.0 (field-operations@projectrescue.org)',
        'Accept-Language': 'en',
      },
    });

    if (!osmRes.ok) {
      return new Response(
        JSON.stringify({
          formattedAddress: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          provider: 'backend_osm',
          status: 'failed',
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await osmRes.json();
    const addr = data.address || {};

    const area = addr.suburb || addr.neighbourhood || addr.quarter || addr.commercial || addr.industrial || addr.residential;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet;
    const district = addr.county || addr.district || addr.state_district;
    const state = addr.state || addr.region || addr.province;
    const country = addr.country;
    const postalCode = addr.postcode;

    const parts = [area, city, district, state, country].filter(Boolean);
    const formattedAddress = data.display_name || (parts.length > 0 ? parts.join(', ') : `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    return new Response(
      JSON.stringify({
        formattedAddress,
        area: area || undefined,
        city: city || undefined,
        district: district || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        provider: 'backend_osm',
        status: 'resolved',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
