import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:4200',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      RUNNING_IN_DOCKER: process.env.RUNNING_IN_DOCKER || false
    },
    setupNodeEvents(on, config) {
      // Docker-specific configuration
      if (process.env.RUNNING_IN_DOCKER === 'true') {
        config.baseUrl = 'http://app-e2e:4200';
        config.defaultCommandTimeout = 15000;
        config.video = false; // Disable video in CI to save resources
      }
      
      // Import cypress-visual-regression plugin (package exports are under dist)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const visualPlugin = require('cypress-visual-regression/dist/plugin');
        if (typeof visualPlugin === 'function') {
          // Ensure the required env.type is set to avoid runtime errors in CI
          // Allowed values: 'base' or 'actual'. Default to 'actual' for comparisons.
          config.env = config.env || {};
          if (!config.env.type) {
            config.env.type = process.env.CYPRESS_type || 'actual';
          }
          visualPlugin(on, config);
          // quick debug to confirm registration when reading logs
          // eslint-disable-next-line no-console
          console.log('cypress-visual-regression plugin registered');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('cypress-visual-regression plugin not found, visual tests may be skipped');
      }
      
      return config;
    }
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts'
  }
});
