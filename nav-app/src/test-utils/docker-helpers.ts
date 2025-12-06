export class DockerTestHelpers {
  static isRunningInDocker(): boolean {
    return process.env.RUNNING_IN_DOCKER === 'true' || 
           require('fs').existsSync('/.dockerenv');
  }

  static getBaseUrl(): string {
    if (this.isRunningInDocker()) {
      return process.env.APP_URL || 'http://app-e2e:4200';
    }
    return process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost:4200';
  }

  static getSeleniumHubUrl(): string {
    if (this.isRunningInDocker()) {
      return process.env.SELENIUM_HUB || 'http://selenium-hub:4444/wd/hub';
    }
    return 'http://localhost:4444/wd/hub';
  }

  static getTestTimeout(): number {
    // Longer timeouts in Docker due to resource constraints
    return this.isRunningInDocker() ? 60000 : 30000;
  }

  static isCI(): boolean {
    return process.env.CI === 'true';
  }

  static getBrowserOptions(browserName: string): any {
    const baseOptions = {
      args: []
    };

    if (this.isCI() || this.isRunningInDocker()) {
      baseOptions.args.push(
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions'
      );

      if (browserName === 'chrome') {
        baseOptions.args.push('--headless');
      } else if (browserName === 'firefox') {
        baseOptions.args.push('--headless');
      }
    }

    return baseOptions;
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeoutMs: number = 30000,
    intervalMs: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        if (await condition()) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  static createTestLogger(testName: string) {
    const prefix = `[${testName}]`;
    
    return {
      info: (message: string, ...args: any[]) => {
        console.log(`${prefix} ℹ ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        console.warn(`${prefix} ⚠ ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        console.error(`${prefix} ✗ ${message}`, ...args);
      },
      success: (message: string, ...args: any[]) => {
        console.log(`${prefix} ✓ ${message}`, ...args);
      }
    };
  }

  static generateTestData() {
    return {
      testTechnique: {
        id: 'T1059',
        name: 'Command and Scripting Interpreter',
        tactics: ['execution']
      },
      testMitigation: {
        id: 'M1038',
        name: 'Execution Prevention'
      },
      testLayer: {
        name: 'Test Layer',
        domain: 'enterprise-attack',
        techniques: [
          {
            techniqueID: 'T1059',
            score: 1,
            comment: 'Test comment'
          }
        ]
      }
    };
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
    
    throw lastError!;
  }
}
