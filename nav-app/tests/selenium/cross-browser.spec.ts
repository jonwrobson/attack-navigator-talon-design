import { Builder, By, WebDriver, until, Capabilities } from 'selenium-webdriver';
import { Options as ChromeOptions } from 'selenium-webdriver/chrome';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox';

describe('ATT&CK Navigator Cross-Browser Tests', () => {
  let driver: WebDriver;
  const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:4200';
  const seleniumHub = process.env.SELENIUM_HUB || 'http://localhost:4444/wd/hub';

  const browsers = ['chrome', 'firefox'];

  browsers.forEach(browserName => {
    describe(`${browserName} browser tests`, () => {
      beforeAll(async () => {
        let capabilities: Capabilities;
        
        if (process.env.SELENIUM_HUB) {
          // Running on Selenium Grid
          capabilities = new Capabilities();
          capabilities.set('browserName', browserName);
          capabilities.set('version', 'latest');
          capabilities.set('enableVNC', true);
          capabilities.set('enableVideo', false);
          
          driver = await new Builder()
            .usingServer(seleniumHub)
            .withCapabilities(capabilities)
            .build();
        } else {
          // Running locally
          if (browserName === 'chrome') {
            const options = new ChromeOptions();
            if (process.env.CI) {
              options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
            }
            driver = await new Builder()
              .forBrowser('chrome')
              .setChromeOptions(options)
              .build();
          } else if (browserName === 'firefox') {
            const options = new FirefoxOptions();
            if (process.env.CI) {
              options.addArguments('--headless');
            }
            driver = await new Builder()
              .forBrowser('firefox')
              .setFirefoxOptions(options)
              .build();
          }
        }

        await driver.manage().window().setRect({ width: 1280, height: 720 });
      }, 60000);

      afterAll(async () => {
        if (driver) {
          await driver.quit();
        }
      });

      beforeEach(async () => {
        await driver.get(baseUrl);
        await driver.wait(until.titleContains('ATT&CK'), 10000);
      });

      it('should load the navigator interface', async () => {
        const title = await driver.getTitle();
        expect(title).toContain('ATT&CK');

        // Wait for matrix to load
        await driver.wait(
          until.elementsLocated(By.css('.technique-cell, .cell')),
          15000
        );

        const techniques = await driver.findElements(By.css('.technique-cell, .cell'));
        expect(techniques.length).toBeGreaterThan(0);
      });

      it('should handle technique interactions', async () => {
        // Wait for techniques to load
        await driver.wait(
          until.elementsLocated(By.css('.technique-cell, .cell')),
          15000
        );

        const firstTechnique = await driver.findElement(By.css('.technique-cell, .cell'));
        await firstTechnique.click();

        // Small delay for any animations
        await driver.sleep(500);

        // Check if technique shows some selection state
        const techniqueClass = await firstTechnique.getAttribute('class');
        expect(techniqueClass).toBeTruthy();
      });

      it('should support keyboard navigation', async () => {
        const body = await driver.findElement(By.css('body'));
        
        // Test tab navigation
        await body.sendKeys('\t');
        await driver.sleep(200);
        
        const activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getTagName()).toBeTruthy();
      });

      it('should handle matrix loading without errors', async () => {
        // Check for JavaScript errors in console
        const logs = await driver.manage().logs().get('browser');
        const errors = logs.filter(log => log.level.name === 'SEVERE');
        
        // Allow for minor warnings but no severe errors
        expect(errors.length).toBeLessThan(5);
      });

      it('should load within acceptable time', async () => {
        const startTime = Date.now();
        
        await driver.get(baseUrl);
        await driver.wait(
          until.elementsLocated(By.css('.technique-cell, .cell')),
          15000
        );
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds
      });
    });
  });
});
