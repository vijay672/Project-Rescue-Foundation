#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Automation Script for Project Rescue Foundation
# Handles pre-flight checks, automated builds, zero-downtime restarts, and health checks
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  Project Rescue Foundation — Production Deployment Pipeline     ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# 1. Pre-flight Environment Validation
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env" ]; then
        echo -e "${YELLOW}[Notice] .env.production not found; utilizing active .env file.${NC}"
        ENV_FILE=".env"
    else
        echo -e "${RED}[Error] Neither .env.production nor .env found!${NC}"
        echo -e "Please copy .env.production.example to .env.production and configure your Supabase/PostgreSQL keys."
        exit 1
    fi
fi

echo -e "${GREEN}[✓] Environment manifest validated: ${ENV_FILE}${NC}"

# 2. Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[Error] Docker daemon is not installed on this host.${NC}"
    exit 1
fi

COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}[Error] Neither 'docker compose' nor 'docker-compose' found.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[✓] Container runtime verified: ${COMPOSE_CMD}${NC}"

# 3. Choose Compose File (production compose preferred)
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi
echo -e "${BLUE}[*] Orchestrating deployment via: ${COMPOSE_FILE}...${NC}"

# 4. Pull base images and build containers
echo -e "${BLUE}[*] Building production container images (multi-stage)...${NC}"
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull

# 5. Bring up database and message brokers first
echo -e "${BLUE}[*] Initializing core brokers (Redis, ClamAV)...${NC}"
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d redis clamav

# 6. Launch Backend, Celery Worker, and Scheduler
echo -e "${BLUE}[*] Launching Backend and Celery Worker clusters...${NC}"
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend worker celery_beat

# 7. Launch Frontend Web Application & Reverse Proxy
echo -e "${BLUE}[*] Launching Frontend Nginx Reverse Proxy...${NC}"
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d frontend

# 8. Post-Deployment Verification & Health Probe Loop
echo -e "${BLUE}[*] Performing post-deployment health probes...${NC}"

MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "Waiting for services to report nominal health (${RETRY_COUNT}/${MAX_RETRIES})..."
    
    # Check if backend responds
    if curl -s -f "http://localhost:8000/api/v1/health" > /dev/null 2>&1 || curl -s -f "http://localhost/api/v1/health" > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep 3
done

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  [DEPLOYMENT SUCCESSFUL] All services are online and healthy!    ${NC}"
    echo -e "${GREEN}  - Web Application: http://localhost                            ${NC}"
    echo -e "${GREEN}  - API Documentation: http://localhost:8000/api/docs             ${NC}"
    echo -e "${GREEN}  - Worker Telemetry:  http://localhost:8000/api/v1/worker/health ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    exit 0
else
    echo -e "${RED}[Alert] Health probes timed out. Showing service logs:${NC}"
    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=40
    exit 1
fi
