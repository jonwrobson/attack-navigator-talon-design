import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:4200';

  test('should load initial page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(baseUrl);
    await page.waitForSelector('.technique-cell, .cell', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  test('should handle large dataset rendering efficiently', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Measure technique rendering performance
    const startTime = Date.now();
    await page.waitForSelector('.technique-cell, .cell');
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(5000);
    
    // Check number of rendered techniques
    const techniques = await page.locator('.technique-cell, .cell').count();
    expect(techniques).toBeGreaterThan(50); // Should render a reasonable number of techniques
  });

  test('should maintain responsive UI during interactions', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForSelector('.technique-cell, .cell');
    
    // Measure click response time
    const technique = page.locator('.technique-cell, .cell').first();
    
    const startTime = Date.now();
    await technique.click();
    await page.waitForTimeout(100); // Small delay for interaction
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  test('should not have memory leaks during navigation', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForSelector('.technique-cell, .cell');
    
    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Simulate user interactions
    for (let i = 0; i < 10; i++) {
      const techniques = page.locator('.technique-cell, .cell');
      const count = await techniques.count();
      if (count > i) {
        await techniques.nth(i).click();
        await page.waitForTimeout(100);
      }
    }

    // Check memory usage after interactions
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory shouldn't increase by more than 50MB
    if (initialMetrics > 0 && finalMetrics > 0) {
      const memoryIncrease = finalMetrics - initialMetrics;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should maintain good Core Web Vitals', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.technique-cell, .cell');
    
    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500); // LCP should be under 2.5 seconds
    }
  });

  test('should handle concurrent user simulations', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const startTime = Date.now();

    // Simulate concurrent users
    await Promise.all(
      pages.map(async (page) => {
        await page.goto(baseUrl);
        await page.waitForSelector('.technique-cell, .cell', { timeout: 15000 });
        
        // Simulate user interactions
        const techniques = page.locator('.technique-cell, .cell');
        const count = await techniques.count();
        if (count > 0) {
          await techniques.first().click();
        }
      })
    );

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(20000); // All users should load within 20 seconds

    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });
});
