// Jest setup file for Selenium tests
import 'jest-extended';

// Set longer timeout for integration tests
jest.setTimeout(60000);

// Global test configuration
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SELENIUM_HUB?: string;
      CYPRESS_BASE_URL?: string;
      BASE_URL?: string;
      CI?: string;
      RUNNING_IN_DOCKER?: string;
    }
  }
}

// Helper function to check if running in CI
export const isCI = () => process.env.CI === 'true';

// Helper function to check if running in Docker
export const isDocker = () => process.env.RUNNING_IN_DOCKER === 'true';

// Default URLs for testing
export const getBaseUrl = () => process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:4200';
export const getSeleniumHub = () => process.env.SELENIUM_HUB || 'http://localhost:4444/wd/hub';

// Console override for cleaner test output
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
