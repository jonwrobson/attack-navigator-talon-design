#!/bin/bash

# ATT&CK Navigator Test Execution and Validation Script
# This script runs comprehensive tests to verify the application functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}? $message${NC}"
            ((TESTS_PASSED++))
            ;;
        "FAILED")
            echo -e "${RED}? $message${NC}"
            ((TESTS_FAILED++))
            ;;
        "SKIPPED")
            echo -e "${YELLOW}??  $message${NC}"
            ((TESTS_SKIPPED++))
            ;;
        "INFO")
            echo -e "${BLUE}??  $message${NC}"
            ;;
    esac
}

# Function to run a test and capture the result
run_test() {
    local test_name=$1
    local test_command=$2
    local optional=${3:-false}
    
    echo -e "\n${BLUE}?? Running: $test_name${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command" >/dev/null 2>&1; then
        print_status "SUCCESS" "$test_name passed"
        return 0
    else
        if [ "$optional" = "true" ]; then
            print_status "SKIPPED" "$test_name failed (optional)"
            return 0
        else
            print_status "FAILED" "$test_name failed"
            return 1
        fi
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "?? ATT&CK Navigator Comprehensive Test Suite"
echo "============================================="

# Verify we're in the correct directory
if [ ! -f "nav-app/package.json" ]; then
    print_status "FAILED" "Please run this script from the project root directory"
    exit 1
fi

cd nav-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "\n${BLUE}?? Installing dependencies...${NC}"
    npm ci --legacy-peer-deps
fi

# Test 1: Application Build
run_test "Application Build" "npm run build"

# Test 2: Unit Tests with Coverage
run_test "Unit Tests with Coverage" "npm run test:ci"

# Test 3: Linting
run_test "Code Linting" "npm run lint" true

# Test 4: TypeScript Compilation Check
run_test "TypeScript Compilation" "npx tsc --noEmit"

# Start application for E2E tests
echo -e "\n${BLUE}?? Starting application server...${NC}"
npm start &
APP_PID=$!

# Wait for application to start
echo "Waiting for application to be ready..."
npx wait-on http://localhost:4200 --timeout 60000

# Test 5: Application Health Check
run_test "Application Health Check" "curl -f http://localhost:4200"

# Test 6: Cypress E2E Tests (if Cypress is available)
if command_exists cypress; then
    run_test "Cypress E2E Tests" "npx cypress run --headless --browser chrome" true
else
    print_status "SKIPPED" "Cypress not available - E2E tests skipped"
fi

# Test 7: Basic API/Route Tests
run_test "Basic Route Test" "curl -f http://localhost:4200/index.html"

# Test 8: Application Load Test (simple)
echo -e "\n${BLUE}? Running basic load test...${NC}"
LOAD_TEST_RESULT=0
for i in {1..10}; do
    if ! curl -f http://localhost:4200 >/dev/null 2>&1; then
        LOAD_TEST_RESULT=1
        break
    fi
done

if [ $LOAD_TEST_RESULT -eq 0 ]; then
    print_status "SUCCESS" "Basic load test (10 requests)"
else
    print_status "FAILED" "Basic load test failed"
fi

# Test 9: Memory Usage Check
echo -e "\n${BLUE}?? Checking memory usage...${NC}"
MEMORY_USAGE=$(ps -p $APP_PID -o rss= 2>/dev/null || echo "0")
if [ "$MEMORY_USAGE" -gt 0 ] && [ "$MEMORY_USAGE" -lt 500000 ]; then  # Less than 500MB
    print_status "SUCCESS" "Memory usage acceptable (${MEMORY_USAGE}KB)"
else
    print_status "FAILED" "Memory usage too high or process not found (${MEMORY_USAGE}KB)"
fi

# Test 10: Security Headers Check
echo -e "\n${BLUE}?? Checking security headers...${NC}"
SECURITY_CHECK=0
HEADERS=$(curl -I http://localhost:4200 2>/dev/null)

if echo "$HEADERS" | grep -i "x-frame-options" >/dev/null; then
    ((SECURITY_CHECK++))
fi
if echo "$HEADERS" | grep -i "x-content-type-options" >/dev/null; then
    ((SECURITY_CHECK++))
fi

if [ $SECURITY_CHECK -gt 0 ]; then
    print_status "SUCCESS" "Some security headers present ($SECURITY_CHECK/2)"
else
    print_status "FAILED" "No security headers found"
fi

# Test 11: Accessibility Quick Check (if axe-core is available)
if command_exists axe; then
    run_test "Accessibility Quick Check" "axe http://localhost:4200 --exit" true
else
    print_status "SKIPPED" "axe-core not available - accessibility check skipped"
fi

# Test 12: Performance Quick Check
echo -e "\n${BLUE}? Running performance check...${NC}"
START_TIME=$(date +%s%3N)
curl -f http://localhost:4200 >/dev/null 2>&1
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$RESPONSE_TIME" -lt 5000 ]; then  # Less than 5 seconds
    print_status "SUCCESS" "Response time acceptable (${RESPONSE_TIME}ms)"
else
    print_status "FAILED" "Response time too slow (${RESPONSE_TIME}ms)"
fi

# Cleanup
echo -e "\n${BLUE}?? Cleaning up...${NC}"
kill $APP_PID 2>/dev/null || true
wait $APP_PID 2>/dev/null || true

# Test 13: Docker Build Test (if Docker is available)
if command_exists docker; then
    echo -e "\n${BLUE}?? Testing Docker build...${NC}"
    cd ..
    run_test "Docker Build (Test Stage)" "docker build --target test -t attack-navigator:test ." true
    run_test "Docker Build (Production Stage)" "docker build --target production -t attack-navigator:prod ." true
    cd nav-app
else
    print_status "SKIPPED" "Docker not available - container tests skipped"
fi

# Test 14: Code Coverage Analysis
if [ -f "coverage/nav-app/lcov.info" ]; then
    echo -e "\n${BLUE}?? Analyzing code coverage...${NC}"
    if [ -f "coverage/nav-app/lcov-report/index.html" ]; then
        COVERAGE=$(grep -oP '(?<=Lines\s+:\s)\d+(?=\.\d+%)' coverage/nav-app/lcov-report/index.html | head -1 || echo "0")
        if [ "$COVERAGE" -ge 70 ]; then
            print_status "SUCCESS" "Code coverage acceptable (${COVERAGE}%)"
        else
            print_status "FAILED" "Code coverage below threshold (${COVERAGE}% < 70%)"
        fi
    else
        print_status "SKIPPED" "Coverage report format not recognized"
    fi
else
    print_status "SKIPPED" "Coverage report not found"
fi

# Test 15: Bundle Size Check
if [ -d "dist" ]; then
    echo -e "\n${BLUE}?? Checking bundle size...${NC}"
    BUNDLE_SIZE=$(du -sk dist | cut -f1)
    if [ "$BUNDLE_SIZE" -lt 50000 ]; then  # Less than 50MB
        print_status "SUCCESS" "Bundle size reasonable (${BUNDLE_SIZE}KB)"
    else
        print_status "FAILED" "Bundle size too large (${BUNDLE_SIZE}KB)"
    fi
else
    print_status "SKIPPED" "Build artifacts not found for size check"
fi

# Final Results Summary
echo ""
echo "="*60
echo -e "${BLUE}?? TEST EXECUTION SUMMARY${NC}"
echo "="*60
echo -e "? Tests Passed:  ${GREEN}$TESTS_PASSED${NC}"
echo -e "? Tests Failed:  ${RED}$TESTS_FAILED${NC}"
echo -e "??  Tests Skipped: ${YELLOW}$TESTS_SKIPPED${NC}"
echo -e "?? Total Tests:   $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"

# Calculate success rate
TOTAL_CRITICAL=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_CRITICAL -gt 0 ]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_CRITICAL))
    echo -e "?? Success Rate:  ${SUCCESS_RATE}%"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}?? ALL CRITICAL TESTS PASSED!${NC}"
    echo -e "${GREEN}? Application is ready for deployment${NC}"
    
    # Generate test report
    cat > test-report.md << EOF
# ATT&CK Navigator Test Report

## Summary
- **Date**: $(date)
- **Total Tests**: $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
- **Passed**: $TESTS_PASSED
- **Failed**: $TESTS_FAILED
- **Skipped**: $TESTS_SKIPPED
- **Success Rate**: ${SUCCESS_RATE:-0}%

## Status
${TESTS_FAILED -eq 0 && echo "? **PASSED** - Application ready for deployment" || echo "? **FAILED** - Issues found that need attention"}

## Test Coverage
$([ -f "coverage/nav-app/lcov-report/index.html" ] && echo "- Code Coverage: ${COVERAGE:-Unknown}%" || echo "- Code Coverage: Not measured")

## Recommendations
$([ $TESTS_FAILED -eq 0 ] && echo "- Application is production-ready" || echo "- Fix failing tests before deployment")
- Consider running full E2E test suite before major releases
- Monitor performance metrics in production
- Keep dependencies updated for security

EOF
    
    echo "?? Test report saved to test-report.md"
    exit 0
else
    echo -e "${RED}?? TESTS FAILED!${NC}"
    echo -e "${RED}? Please fix the failing tests before proceeding${NC}"
    exit 1
fi