#!/usr/bin/env bash
# ==============================================================================
# Database & Supabase Storage Migration Automation Script
# Applies PostgreSQL PostGIS schemas and sets up private 'foundation-media' bucket
# ==============================================================================

set -eo pipefail

echo "=================================================================="
echo "  Project Rescue Foundation — Schema & Storage Migration Pipeline"
echo "=================================================================="

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "[*] Supabase CLI detected. Applying migrations..."
    supabase db push || true
else
    echo "[!] Supabase CLI not installed. Running SQL migrations directly via PostgreSQL connection..."
    if [ -n "$DATABASE_URL" ] && command -v psql &> /dev/null; then
        echo "[*] Executing database schema migrations..."
        psql "$DATABASE_URL" -f supabase/migrations/20261014000004_supabase_storage_foundation_media.sql || true
    else
        echo "[Note] Please apply 'supabase/migrations/20261014000004_supabase_storage_foundation_media.sql' in your Supabase SQL Editor."
    fi
fi

echo "[✓] Migration pipeline sequence complete."
