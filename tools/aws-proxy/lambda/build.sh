#!/usr/bin/env bash
# Build Lambda deployment packages.
# Usage:
#   ./build.sh           — build all Lambdas
#   ./build.sh handler   — build subscription handler only
#   ./build.sh health    — build health check only
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

build_handler() {
  zip -j lambda.zip handler.py
  echo "Built lambda.zip (subscription handler)"
}

build_health() {
  zip -j health_check.zip health_check.py
  echo "Built health_check.zip (health check)"
}

case "${1:-all}" in
  handler)  build_handler ;;
  health)   build_health ;;
  all)      build_handler; build_health ;;
  *)        echo "Usage: $0 [handler|health|all]"; exit 1 ;;
esac
