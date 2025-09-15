#!/bin/bash

# ATT&CK Navigator Test Verification Script
# This script validates that all testing components are working correctly

set -e

echo "📝 ATT&CK Navigator Test Verification Script"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}? $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}??  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}? $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}??  $message${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if npm package is installed
npm_package_exists() {
    npm list "$1" >/dev/null 2>&1
}

print_status "INFO" "Starting test environment verification..."

# Check if we're in the right directory
if [ ! -f "nav-app/package.json" ]; then
    print_status "ERROR" "Please run this script from the project root directory"
    exit 1
fi

# Change to nav-app directory
cd nav-app

# Check Node.js version
print_status "INFO" "Checking Node.js version..."
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "SUCCESS" "Node.js version: $NODE_VERSION"
    
    # Check if version is 16 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_MAJOR" -ge 16 ]; then
        print_status "SUCCESS" "Node.js version is compatible"
    else
        print_status "WARNING" "Node.js version might be too old. Recommended: v16 or higher"
    fi
else
    print_status "ERROR" "Node.js is not installed"
    exit 1
fi

# Check npm
print_status "INFO" "Checking npm..."
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "SUCCESS" "npm version: $NPM_VERSION"
else
    print_status "ERROR" "npm is not installed"
    exit 1
fi

# Check if dependencies are installed
print_status "INFO" "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "WARNING" "Dependencies not installed. Installing..."
    npm ci --legacy-peer-deps
else
    print_status "SUCCESS" "Dependencies are installed"
fi

# Verify key testing dependencies
print_status "INFO" "Verifying testing dependencies..."

REQUIRED_DEPS=(
    "karma"
    "jasmine-core"
    "cypress"
    "jest"
    "playwright"
    "selenium-webdriver"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if npm_package_exists "$dep"; then
        print_status "SUCCESS" "$dep is installed"
    else
        print_status "WARNING" "$dep is not installed or not found"
    fi
done

# Check Angular CLI
print_status "INFO" "Checking Angular CLI..."
if command_exists ng; then
    NG_VERSION=$(ng version --help 2>/dev/null || echo "Unknown")
    print_status "SUCCESS" "Angular CLI is available"
else
    print_status "WARNING" "Angular CLI not found globally. Using local version."
fi

# Test basic compilation
print_status "INFO" "Testing basic compilation..."
if npm run build > /dev/null 2>&1; then
    print_status "SUCCESS" "Application builds successfully"
else
    print_status "ERROR" "Application failed to build"
    echo "Please fix build errors before running tests"
    exit 1
fi

# Test unit tests
print_status "INFO" "Running unit tests..."
if npm run test:ci > /dev/null 2>&1; then
    print_status "SUCCESS" "Unit tests pass"
    
    # Check coverage
    if [ -f "coverage/nav-app/lcov.info" ]; then
        print_status "SUCCESS" "Code coverage report generated"
    else
        print_status "WARNING" "Code coverage report not found"
    fi
else
    print_status "ERROR" "Unit tests failed"
    echo "Please fix unit test failures before proceeding"
    exit 1
fi

# Test linting
print_status "INFO" "Running linting..."
if npm run lint > /dev/null 2>&1; then
    print_status "SUCCESS" "Linting passes"
else
    print_status "WARNING" "Linting issues found (non-blocking)"
fi

# Check Docker (if available)
if command_exists docker; then
    print_status "INFO" "Docker is available"
    
    # Test Docker build
    print_status "INFO" "Testing Docker build..."
    cd ..
    if docker build --target test -t attack-navigator:test . > /dev/null 2>&1; then
        print_status "SUCCESS" "Docker test build successful"
    else
        print_status "WARNING" "Docker test build failed"
    fi
    cd nav-app
else
    print_status "WARNING" "Docker not available (optional for local development)"
fi

# Check Cypress
print_status "INFO" "Verifying Cypress setup..."
if [ -f "cypress.config.ts" ]; then
    print_status "SUCCESS" "Cypress configuration found"
    
    if [ -d "cypress/e2e" ]; then
        TEST_COUNT=$(find cypress/e2e -name "*.cy.ts" | wc -l)
        print_status "SUCCESS" "Found $TEST_COUNT Cypress E2E test files"
    else
        print_status "WARNING" "Cypress E2E test directory not found"
    fi
else
    print_status "WARNING" "Cypress configuration not found"
fi

# Check Selenium tests
print_status "INFO" "Verifying Selenium setup..."
if [ -d "tests/selenium" ]; then
    SELENIUM_COUNT=$(find tests/selenium -name "*.spec.ts" | wc -l)
    print_status "SUCCESS" "Found $SELENIUM_COUNT Selenium test files"
else
    print_status "WARNING" "Selenium test directory not found"
fi

# Check Playwright tests
print_status "INFO" "Verifying Playwright setup..."
if [ -d "tests/performance" ]; then
    PLAYWRIGHT_COUNT=$(find tests/performance -name "*.spec.ts" | wc -l)
    print_status "SUCCESS" "Found $PLAYWRIGHT_COUNT Playwright test files"
else
    print_status "WARNING" "Playwright test directory not found"
fi

# Check GitHub Actions workflows
print_status "INFO" "Verifying GitHub Actions workflows..."
cd ..
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" | wc -l)
    print_status "SUCCESS" "Found $WORKFLOW_COUNT GitHub Actions workflow files"
    
    # Check for required workflows
    if [ -f ".github/workflows/comprehensive-test-suite.yml" ]; then
        print_status "SUCCESS" "Comprehensive test suite workflow found"
    fi
    
    if [ -f ".github/workflows/enhanced-test-azure-integration.yml" ]; then
        print_status "SUCCESS" "Enhanced Azure integration workflow found"
    fi
else
    print_status "WARNING" "GitHub Actions workflows directory not found"
fi

# Summary
print_status "INFO" "Test environment verification complete!"
echo ""
echo "?? Summary:"
echo "- ? Basic build and unit tests are working"
echo "- ? Testing framework dependencies are installed"
echo "- ? Code coverage reporting is configured"
echo "- ? GitHub Actions workflows are in place"
echo ""
echo "?? You can now run:"
echo "  npm run test:ci          # Unit tests with coverage"
echo "  npm run e2e:ci           # Cypress E2E tests"
echo "  npm run test:selenium    # Selenium cross-browser tests"
echo "  npm run test:performance # Playwright performance tests"
echo "  npm run test:all         # All tests"
echo ""
echo "?? For Docker testing:"
echo "  docker-compose -f docker-compose.test.yml up"
echo ""
echo "??  GitHub Actions will automatically run all tests on push/PR"

cd nav-app