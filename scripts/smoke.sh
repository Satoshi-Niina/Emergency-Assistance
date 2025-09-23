#!/bin/bash

# Smoke test script for Emergency Assistance System
# Tests basic endpoints using curl

set -e

# Configuration
BASE_URL=${SMOKE_TEST_URL:-"http://localhost:3001"}
TIMEOUT=10
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_test() {
    echo -e "${CYAN}🧪 $1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Emergency Assistance Smoke Test"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --url <url>      Set the base URL for testing (default: http://localhost:3001)"
            echo "  --timeout <sec>  Set the timeout for requests (default: 10)"
            echo "  --verbose, -v    Enable verbose output"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  SMOKE_TEST_URL   Base URL for testing"
            echo ""
            echo "Examples:"
            echo "  $0"
            echo "  $0 --url https://your-app.azurewebsites.net"
            echo "  SMOKE_TEST_URL=https://your-app.azurewebsites.net $0"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Test function
test_endpoint() {
    local method="$1"
    local path="$2"
    local expected_status="$3"
    local data="$4"
    
    local url="${BASE_URL}${path}"
    local curl_opts=(
        -s
        -w "%{http_code}"
        --max-time "$TIMEOUT"
        -H "Content-Type: application/json"
        -H "User-Agent: Emergency-Assistance-Smoke-Test/1.0"
    )
    
    if [ "$method" = "POST" ]; then
        curl_opts+=(-X POST -d "$data")
    fi
    
    log_test "Testing: $method $path"
    
    local start_time=$(date +%s%3N)
    local response=$(curl "${curl_opts[@]}" "$url")
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "PASS $status_code (${duration}ms)"
        if [ "$VERBOSE" = true ]; then
            echo "   Response: $(echo "$body" | head -c 100)..."
        fi
        return 0
    else
        log_error "FAIL Expected $expected_status, got $status_code (${duration}ms)"
        if [ "$VERBOSE" = true ]; then
            echo "   Response: $body"
        fi
        return 1
    fi
}

# Main test execution
log_info "Emergency Assistance Smoke Test"
log_info "Base URL: $BASE_URL"
log_info "Timeout: ${TIMEOUT}s"
log_info "Verbose: $VERBOSE"

# Test endpoints
total=0
passed=0
failed=0

# Test 1: Ping endpoint
total=$((total + 1))
if test_endpoint "GET" "/api/ping" "200"; then
    passed=$((passed + 1))
else
    failed=$((failed + 1))
fi

# Test 2: Health endpoint
total=$((total + 1))
if test_endpoint "GET" "/api/health" "200"; then
    passed=$((passed + 1))
else
    failed=$((failed + 1))
fi

# Test 3: Auth handshake
total=$((total + 1))
if test_endpoint "GET" "/api/auth/handshake" "200"; then
    passed=$((passed + 1))
else
    failed=$((failed + 1))
fi

# Test 4: Auth login
total=$((total + 1))
if test_endpoint "POST" "/api/auth/login" "200" '{"username":"test","password":"test"}'; then
    passed=$((passed + 1))
else
    failed=$((failed + 1))
fi

# Test 5: Auth me (should work in safe mode)
total=$((total + 1))
if test_endpoint "GET" "/api/auth/me" "200"; then
    passed=$((passed + 1))
else
    failed=$((failed + 1))
fi

# Summary
echo ""
log_info "Test Summary"
log_info "Total: $total"
log_success "Passed: $passed"
if [ $failed -gt 0 ]; then
    log_error "Failed: $failed"
else
    log_success "Failed: $failed"
fi

# Exit with appropriate code
if [ $failed -eq 0 ]; then
    log_success "All tests passed!"
    exit 0
else
    log_error "Some tests failed"
    exit 1
fi
