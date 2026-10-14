#!/usr/bin/env bash
set -e

echo "[Production Entrypoint] Starting Project Rescue Backend Service..."

# Wait for database readiness if DATABASE_URL is PostgreSQL
if [[ "$DATABASE_URL" == *"postgresql"* ]]; then
    echo "[Production Entrypoint] Checking PostgreSQL database readiness..."
    python3 -c "
import time, os, sys
import psycopg

db_url = os.getenv('DATABASE_URL', '')
# Clean SQLAlchemy prefix if present
if db_url.startswith('postgresql+psycopg://'):
    db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')

for i in range(30):
    try:
        conn = psycopg.connect(db_url, connect_timeout=3)
        conn.close()
        print('PostgreSQL is reachable and accepting connections.')
        sys.exit(0)
    except Exception as e:
        print(f'Waiting for database ({i+1}/30): {e}')
        time.sleep(2)
print('Warning: Database check timed out; proceeding with application boot.')
" || true
fi

# Initialize database schemas / PostGIS tables
echo "[Production Entrypoint] Verifying database schemas and extensions..."
python3 -c "
from app.database import engine
from app.models import Base
try:
    Base.metadata.create_all(bind=engine)
    print('Database schema verification complete.')
except Exception as e:
    print(f'Schema initialization note: {e}')
" || true

echo "[Production Entrypoint] Executing CMD: $@"
exec "$@"
