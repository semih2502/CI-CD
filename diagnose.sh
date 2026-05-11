#!/bin/bash

# Script de diagnostic pour TrainShop API
# Usage: bash diagnose.sh

echo "🏥 TrainShop API - Diagnostic Script"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:3000}"

function check_service() {
  local name=$1
  local url=$2
  
  echo -n "🔍 Checking $name... "
  
  if curl -s -f -m 5 "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    return 1
  fi
}

function get_health() {
  echo ""
  echo "📊 API Health Status:"
  echo "---------------------"
  
  HEALTH=$(curl -s "$API_URL/health")
  
  STATUS=$(echo $HEALTH | jq -r '.status' 2>/dev/null || echo "unknown")
  DB=$(echo $HEALTH | jq -r '.database' 2>/dev/null || echo "unknown")
  MEMORY=$(echo $HEALTH | jq -r '.checks.memory_mb' 2>/dev/null || echo "unknown")
  UPTIME=$(echo $HEALTH | jq -r '.checks.uptime_seconds' 2>/dev/null || echo "unknown")
  
  if [ "$STATUS" = "ok" ]; then
    echo -e "Status:     ${GREEN}✓ OK${NC}"
    echo -e "Database:   ${GREEN}✓ Connected${NC}"
  else
    echo -e "Status:     ${RED}✗ ERROR${NC}"
    echo -e "Database:   ${RED}✗ $DB${NC}"
  fi
  
  echo "Memory:     $MEMORY MB"
  echo "Uptime:     $UPTIME seconds"
}

function get_metrics() {
  echo ""
  echo "📈 API Metrics:"
  echo "---------------"
  
  METRICS=$(curl -s "$API_URL/metrics")
  
  TOTAL=$(echo $METRICS | jq '.requests.total')
  SUCCESS=$(echo $METRICS | jq '.requests.success')
  ERRORS=$(echo $METRICS | jq '.requests.errors')
  SUCCESS_RATE=$(echo $METRICS | jq '.requests.success_rate_percent')
  
  echo "Total Requests:   $TOTAL"
  echo "Successful:       $SUCCESS"
  echo "Errors:           $ERRORS"
  echo "Success Rate:     $SUCCESS_RATE%"
  
  # Check for errors
  if [ "$ERRORS" -gt "0" ]; then
    LAST_ERROR=$(echo $METRICS | jq '.last_error')
    echo -e ""
    echo -e "${YELLOW}⚠ Last Error:${NC}"
    echo "$LAST_ERROR" | jq '.'
  fi
}

function check_containers() {
  echo ""
  echo "🐳 Container Status:"
  echo "-------------------"
  
  docker compose ps 2>/dev/null || echo "Docker Compose not found or not running"
}

function check_logs() {
  echo ""
  echo "📝 Recent Logs (last 20 lines):"
  echo "--------------------------------"
  
  docker compose logs --tail=20 api 2>/dev/null || echo "Could not retrieve logs"
}

function test_endpoints() {
  echo ""
  echo "🧪 Testing Endpoints:"
  echo "--------------------"
  
  check_service "/health" "$API_URL/health"
  check_service "/metrics" "$API_URL/metrics"
  check_service "/products" "$API_URL/products"
}

# Main execution
echo "API URL: $API_URL"
echo ""

# Quick status check
test_endpoints

# Detailed info
get_health
get_metrics

# Container info
check_containers

# Logs
read -p "View detailed logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  check_logs
fi

echo ""
echo "======================================"
echo "✅ Diagnostic complete!"
echo ""
echo "Quick Actions:"
echo "  docker compose restart api    # Restart API"
echo "  docker compose logs -f api    # Follow logs"
echo "  curl http://localhost:3000/health    # Check health"
