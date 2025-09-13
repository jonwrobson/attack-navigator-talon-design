# ?? **CORRECTED: How to Run All Tests Locally**

## ? **Error You Encountered**
```bash
PS E:\Code\attack-navigator-talon-design\nav-app> npm run test:docker
npm error Missing script: "test:docker"
```

The `test:docker` script doesn't exist! Here are the **correct commands**:

## ? **CORRECT Commands to Run All Tests**

### **?? Available Test Scripts (From package.json)**

| Command | Purpose | Duration |
|---------|---------|----------|
| `npm run test:ci` | Unit tests with coverage | 2-5 min |
| `npm run test:all` | All tests locally | 10-30 min |
| `npm run e2e:ci` | Cypress E2E tests | 5-15 min |
| `npm run test:selenium` | Cross-browser tests | 5-15 min |
| `npm run test:performance` | Playwright performance | 3-8 min |
| `npm run build` | Build verification | 2-5 min |
| `npm run lint` | Code linting | 1-2 min |

### **?? Available Docker Test Scripts**

| Command | Purpose | Duration |
|---------|---------|----------|
| `npm run test:docker:unit` | Docker unit tests | 3-8 min |
| `npm run test:docker:e2e` | Docker E2E tests | 10-20 min |
| `npm run test:docker:selenium` | Docker cross-browser | 15-30 min |
| `npm run test:docker:all` | All Docker tests | 20-45 min |

## ?? **How to Run All Tests (Step by Step)**

### **Step 1: Prerequisites**
```bash
cd nav-app

# Install dependencies (if not done already)
npm install --legacy-peer-deps
```

### **Step 2: Local Tests (Recommended First)**
```bash
# Quick validation
npm run test:ci

# All tests locally (fastest way to run everything)
npm run test:all
```

### **Step 3: Docker Tests (Optional)**
```bash
# From nav-app directory, run Docker unit tests
npm run test:docker:unit

# Run Docker E2E tests
npm run test:docker:e2e

# Run all Docker tests (takes longest)
npm run test:docker:all
```

### **Step 4: Individual Test Types**
```bash
# Unit tests with coverage
npm run test:ci

# End-to-end tests
npm run e2e:ci

# Cross-browser tests
npm run test:selenium

# Performance tests
npm run test:performance

# Build verification
npm run build

# Code linting
npm run lint
```

## ?? **Recommended Test Flow**

### **For Daily Development:**
```bash
cd nav-app

# 1. Quick unit tests
npm run test:ci

# 2. Quick build check
npm run build

# 3. Lint check
npm run lint
```

### **Before Committing:**
```bash
cd nav-app

# Run all tests locally
npm run test:all

# This runs:
# ? npm run test:ci (unit tests + coverage)
# ? npm run e2e:ci (Cypress E2E tests)
# ? npm run test:selenium (cross-browser tests)
```

### **Full Docker Testing:**
```bash
cd nav-app

# Start with unit tests in Docker
npm run test:docker:unit

# Then E2E tests in Docker
npm run test:docker:e2e

# Finally cross-browser tests in Docker
npm run test:docker:selenium

# Or run all at once (takes 20-45 minutes)
npm run test:docker:all
```

## ?? **What Each Command Actually Does**

### **Local Test Commands:**
- **`npm run test:ci`** ? `ng test --watch=false --browsers=ChromeHeadlessCI --code-coverage`
- **`npm run e2e:ci`** ? `cypress run --headless`
- **`npm run test:selenium`** ? `npm run build && jest tests/selenium --testTimeout=30000`
- **`npm run test:all`** ? Runs test:ci + e2e:ci + test:selenium

### **Docker Test Commands:**
- **`npm run test:docker:unit`** ? `docker-compose -f ../docker-compose.test.yml up app-test`
- **`npm run test:docker:e2e`** ? `docker-compose -f ../docker-compose.test.yml --profile e2e up`
- **`npm run test:docker:selenium`** ? `docker-compose -f ../docker-compose.test.yml --profile selenium up`
- **`npm run test:docker:all`** ? Runs e2e and selenium profiles together

## ?? **Success Indicators**

You'll know tests are working when you see:

1. **`npm run test:ci`** ? Shows passing unit tests with coverage %
2. **`npm run e2e:ci`** ? Cypress tests complete successfully
3. **`npm run test:selenium`** ? Cross-browser tests pass
4. **`npm run test:all`** ? All three test suites complete
5. **Docker commands** ? Start containers without errors

## ?? **Quick Troubleshooting**

### **If tests fail:**
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Try individual tests
npm run test:ci
npm run build
npm run lint
```

### **If Docker fails:**
```bash
# Pull required Docker images
docker pull selenium/hub:4.15.0
docker pull selenium/node-chrome:4.15.0
docker pull selenium/node-firefox:4.15.0

# Try unit tests first
npm run test:docker:unit
```

---

**?? Use `npm run test:all` for the fastest way to run all tests locally, or `npm run test:docker:unit` to start with Docker testing!**