/**
 * Tests for STIX Data Fetcher
 * 
 * This module fetches MITRE ATT&CK STIX 2.1 data from the attack-stix-data repository.
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to cache directory (for tests, we use a temp directory)
const TEST_CACHE_DIR = path.join(__dirname, '../../scripts/.cache');
const TEST_CACHE_FILE = path.join(TEST_CACHE_DIR, 'enterprise-attack.json');

describe('STIX Fetcher', () => {
  let fetchStixBundle, clearCache, getCacheInfo, STIX_BUNDLE_URL;
  
  beforeAll(async () => {
    // Import the module under test
    const stixFetcher = await import('../../scripts/lib/stix-fetcher.js');
    fetchStixBundle = stixFetcher.fetchStixBundle;
    clearCache = stixFetcher.clearCache;
    getCacheInfo = stixFetcher.getCacheInfo;
    STIX_BUNDLE_URL = stixFetcher.STIX_BUNDLE_URL;
  });

  beforeEach(() => {
    // Clear cache before each test
    if (fs.existsSync(TEST_CACHE_FILE)) {
      fs.unlinkSync(TEST_CACHE_FILE);
    }
  });

  afterAll(() => {
    // Clean up cache after tests
    if (fs.existsSync(TEST_CACHE_FILE)) {
      fs.unlinkSync(TEST_CACHE_FILE);
    }
  });

  describe('fetchStixBundle', () => {
    it('should fetch STIX bundle from valid URL', async () => {
      // This test makes a real network request
      const bundle = await fetchStixBundle({ useCache: false });
      
      expect(bundle).toBeDefined();
      expect(bundle.type).toBe('bundle');
      expect(bundle.id).toMatch(/^bundle--/);
      expect(Array.isArray(bundle.objects)).toBe(true);
      expect(bundle.objects.length).toBeGreaterThan(0);
    }, 120000); // Allow up to 2 minutes for network request

    it('should use cached file if exists and not expired', async () => {
      // First fetch to populate cache
      const firstFetch = await fetchStixBundle({ useCache: true });
      expect(firstFetch).toBeDefined();
      
      // Get cache info
      const cacheInfo = getCacheInfo();
      expect(cacheInfo.exists).toBe(true);
      expect(cacheInfo.path).toBe(TEST_CACHE_FILE);
      
      // Second fetch should use cache (should be much faster)
      const startTime = Date.now();
      const secondFetch = await fetchStixBundle({ useCache: true });
      const elapsed = Date.now() - startTime;
      
      expect(secondFetch).toBeDefined();
      expect(secondFetch.type).toBe('bundle');
      // Cached read should be fast (under 5 seconds)
      expect(elapsed).toBeLessThan(5000);
    }, 180000);

    it('should throw meaningful error on network failure', async () => {
      // Mock fetch to simulate network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error: ENOTFOUND'));
      
      // Clear cache to force network request
      clearCache();
      
      try {
        await expect(fetchStixBundle({ useCache: false })).rejects.toThrow();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should validate bundle has required structure', async () => {
      const bundle = await fetchStixBundle({ useCache: true });
      
      // Required STIX bundle properties
      expect(bundle).toHaveProperty('type', 'bundle');
      expect(bundle).toHaveProperty('id');
      expect(bundle).toHaveProperty('objects');
      
      // Should contain attack-pattern objects (techniques)
      const attackPatterns = bundle.objects.filter(obj => obj.type === 'attack-pattern');
      expect(attackPatterns.length).toBeGreaterThan(0);
      
      // Should contain intrusion-set objects (groups)
      const intrusionSets = bundle.objects.filter(obj => obj.type === 'intrusion-set');
      expect(intrusionSets.length).toBeGreaterThan(0);
      
      // Should contain campaign objects
      const campaigns = bundle.objects.filter(obj => obj.type === 'campaign');
      expect(campaigns.length).toBeGreaterThan(0);
      
      // Should contain relationship objects
      const relationships = bundle.objects.filter(obj => obj.type === 'relationship');
      expect(relationships.length).toBeGreaterThan(0);
    }, 180000);

    it('should handle cache expiry correctly', async () => {
      // First fetch to populate cache
      await fetchStixBundle({ useCache: true });
      
      // Verify cache exists
      expect(fs.existsSync(TEST_CACHE_FILE)).toBe(true);
      
      // Get cache age
      const cacheInfo = getCacheInfo();
      expect(cacheInfo.exists).toBe(true);
      expect(cacheInfo.ageHours).toBeDefined();
      expect(cacheInfo.ageHours).toBeLessThan(1); // Just created, should be < 1 hour
    }, 180000);
  });

  describe('clearCache', () => {
    it('should remove cached file', async () => {
      // First fetch to populate cache
      await fetchStixBundle({ useCache: true });
      expect(fs.existsSync(TEST_CACHE_FILE)).toBe(true);
      
      // Clear cache
      clearCache();
      expect(fs.existsSync(TEST_CACHE_FILE)).toBe(false);
    }, 180000);

    it('should not throw if cache does not exist', () => {
      // Ensure cache doesn't exist
      if (fs.existsSync(TEST_CACHE_FILE)) {
        fs.unlinkSync(TEST_CACHE_FILE);
      }
      
      // Should not throw
      expect(() => clearCache()).not.toThrow();
    });
  });

  describe('getCacheInfo', () => {
    it('should return correct info when cache exists', async () => {
      await fetchStixBundle({ useCache: true });
      
      const info = getCacheInfo();
      expect(info.exists).toBe(true);
      expect(info.path).toBe(TEST_CACHE_FILE);
      expect(typeof info.sizeBytes).toBe('number');
      expect(info.sizeBytes).toBeGreaterThan(0);
      expect(typeof info.ageHours).toBe('number');
    }, 180000);

    it('should return correct info when cache does not exist', () => {
      clearCache();
      
      const info = getCacheInfo();
      expect(info.exists).toBe(false);
      expect(info.path).toBe(TEST_CACHE_FILE);
      expect(info.sizeBytes).toBeUndefined();
      expect(info.ageHours).toBeUndefined();
    });
  });

  describe('STIX_BUNDLE_URL', () => {
    it('should point to attack-stix-data repository', () => {
      expect(STIX_BUNDLE_URL).toContain('attack-stix-data');
      expect(STIX_BUNDLE_URL).toContain('enterprise-attack');
      expect(STIX_BUNDLE_URL).toContain('.json');
    });
  });
});
