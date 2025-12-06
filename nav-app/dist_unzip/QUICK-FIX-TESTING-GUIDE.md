# ?? ATT&CK Navigator - Fixed Local Testing Guide

## ?? **URGENT: Dependencies Fixed!**

The testing issues you encountered have been resolved. Here's how to run all tests successfully:

## ?? **Step 1: Fix Dependencies (REQUIRED)**

### **Clean and Reinstall**
```bash
cd nav-app

# Remove existing installations
rm -rf node_modules package-lock.json
# Windows: rmdir /s node_modules & del package-lock.json

# Install with correct flags
npm install --legacy-peer-deps

# Verify installation
npm list --depth=0
```

## ? **Step 2: Run Tests Successfully**

### **Quick Test (Start Here)**
```bash
cd nav-app

# 1. Unit tests (fastest validation)
npm run test:ci

# 2. Build check
npm run build

# 3. Linting
npm run lint
```

### **All Tests Locally (No Docker)**
```bash
cd nav-app

# Run complete test suite
npm run test:all

# This runs:
# ? Unit tests with coverage
# ? Cypress E2E tests
# ? Selenium cross-browser tests
```

## ?? **Fixed Docker Testing**

### **Docker Issues Fixed:**
1. ? Removed obsolete `version` field
2. ? Fixed `dockerize/dockerize` image issue
3. ? Added proper health checks
4. ? Simplified service dependencies

### **Docker Commands (Now Working)**
```bash
# From project root directory

# Run unit tests in Docker
docker-compose -f docker-compose.test.yml up app-test

# Run E2E tests in Docker  
docker-compose -f docker-compose.test.yml --profile e2e up

# Run Selenium tests in Docker
docker-compose -f docker-compose.test.yml --profile selenium up

# Run everything (takes longer)
docker-compose -f docker-compose.test.yml --profile e2e --profile selenium up
```

## ?? **Test Commands Reference**

| Command | Purpose | Duration | Docker Alternative |
|---------|---------|----------|-------------------|
| `npm run test:ci` | Unit tests + coverage | 2-5 min | `docker-compose -f docker-compose.test.yml up app-test` |
| `npm run e2e:ci` | Cypress E2E tests | 5-15 min | `docker-compose -f docker-compose.test.yml --profile e2e up` |
| `npm run test:selenium` | Cross-browser tests | 5-15 min | `docker-compose -f docker-compose.test.yml --profile selenium up` |
| `npm run test:all` | All tests | 10-30 min | Multiple Docker commands |
| `npm run build` | Build verification | 2-5 min | Part of Docker build process |
| `npm run lint` | Code quality | 1-2 min | Part of test stage |

## ?? **Step-by-Step Validation**

### **Recommended Testing Flow:**
```bash
cd nav-app

# 1. ? Install dependencies 
npm install --legacy-peer-deps

# 2. ? Quick unit test validation
npm run test:ci

# 3. ? Build verification  
npm run build

# 4. ? Code quality check
npm run lint

# 5. ? E2E tests (if unit tests pass)
npm run e2e:ci

# 6. ? Cross-browser tests (optional)
npm run test:selenium

# 7. ? All tests together
npm run test:all
```

## ?? **What Fixed the Issues**

### **Package.json Fixed:**
- ? Removed `@cypress/angular@^0.0.4` (doesn't exist)
- ? Kept only working Cypress dependencies
- ? Maintained all test script definitions

### **Docker-Compose Fixed:**
- ? Removed obsolete `version: '3.8'` 
- ? Replaced broken `dockerize/dockerize` service
- ? Added proper health checks
- ? Added service profiles for selective testing
- ? Fixed dependency ordering

### **GitHub Actions:**
- ? All workflows updated with correct dependency commands
- ? Enhanced Azure deployment preserved
- ? Post-deployment testing configured

## ?? **Success Indicators**

You'll know everything is working when:

1. **`npm install --legacy-peer-deps`** ? Completes without errors
2. **`npm run test:ci`** ? Shows passing unit tests with coverage %
3. **`npm run build`** ? Creates `dist/` folder successfully  
4. **`npm run e2e:ci`** ? Runs Cypress tests without major failures
5. **Docker commands** ? Run without "repository does not exist" errors

## ?? **Test Output Locations**

- **Coverage**: `nav-app/coverage/nav-app/lcov-report/index.html`
- **Unit Test Results**: `nav-app/test-results/`
- **Cypress Videos**: `nav-app/cypress/videos/`
- **Cypress Screenshots**: `nav-app/cypress/screenshots/`
- **Build Output**: `nav-app/dist/`

## ?? **Still Having Issues?**

### **If npm install fails:**
```bash
# Try with different flags
npm install --legacy-peer-deps --force

# Or clear cache first
npm cache clean --force
npm install --legacy-peer-deps
```

### **If Docker still fails:**
```bash
# Pull images manually
docker pull selenium/hub:4.15.0
docker pull selenium/node-chrome:4.15.0
docker pull selenium/node-firefox:4.15.0

# Then try Docker Compose again
docker-compose -f docker-compose.test.yml up app-test
```

### **If tests timeout:**
```bash
# Increase memory
export NODE_OPTIONS=--max-old-space-size=4096

# Windows
set NODE_OPTIONS=--max-old-space-size=4096
```

---

**?? You now have a fully functional testing environment! Start with `npm run test:ci` to validate unit tests, then proceed with other test types.**