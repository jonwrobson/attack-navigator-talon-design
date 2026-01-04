/**
 * STIX Data Fetcher
 * 
 * Fetches MITRE ATT&CK STIX 2.1 data from the attack-stix-data repository.
 * Supports caching to avoid repeated network requests.
 * 
 * @module stix-fetcher
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ATT&CK STIX 2.1 data URL from the official attack-stix-data repository
// Using the latest enterprise-attack bundle
export const STIX_BUNDLE_URL = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json';

// Cache configuration
const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'enterprise-attack.json');
const DEFAULT_CACHE_EXPIRY_HOURS = 24;

/**
 * Ensures the cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Checks if the cached file is still valid (not expired)
 * @param {number} maxAgeHours - Maximum age of cache in hours
 * @returns {boolean} True if cache is valid
 */
function isCacheValid(maxAgeHours = DEFAULT_CACHE_EXPIRY_HOURS) {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }
  
  const stats = fs.statSync(CACHE_FILE);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  return ageHours < maxAgeHours;
}

/**
 * Reads the STIX bundle from cache
 * @returns {Object} Parsed STIX bundle
 * @throws {Error} If cache read fails
 */
function readFromCache() {
  const content = fs.readFileSync(CACHE_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Writes the STIX bundle to cache
 * @param {Object} bundle - STIX bundle to cache
 */
function writeToCache(bundle) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(bundle), 'utf-8');
}

/**
 * Validates that the fetched data is a valid STIX bundle
 * @param {Object} data - Data to validate
 * @returns {boolean} True if valid STIX bundle
 */
function isValidStixBundle(data) {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'bundle' &&
    typeof data.id === 'string' &&
    data.id.startsWith('bundle--') &&
    Array.isArray(data.objects)
  );
}

/**
 * Fetches the STIX bundle from the network
 * @param {string} url - URL to fetch from
 * @returns {Promise<Object>} Parsed STIX bundle
 * @throws {Error} If fetch fails or data is invalid
 */
async function fetchFromNetwork(url) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch STIX bundle: HTTP ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!isValidStixBundle(data)) {
    throw new Error('Fetched data is not a valid STIX bundle: missing required properties');
  }
  
  return data;
}

/**
 * Fetches the MITRE ATT&CK STIX bundle
 * 
 * @param {Object} options - Fetch options
 * @param {boolean} [options.useCache=true] - Whether to use cached data if available
 * @param {number} [options.cacheExpiryHours=24] - Cache expiry time in hours
 * @param {string} [options.url] - Custom URL to fetch from (for testing)
 * @returns {Promise<Object>} Parsed STIX bundle
 * @throws {Error} If fetch fails and no valid cache exists
 * 
 * @example
 * const bundle = await fetchStixBundle();
 * console.log(`Loaded ${bundle.objects.length} objects`);
 * 
 * @example
 * // Force fresh fetch
 * const bundle = await fetchStixBundle({ useCache: false });
 */
export async function fetchStixBundle(options = {}) {
  const {
    useCache = true,
    cacheExpiryHours = DEFAULT_CACHE_EXPIRY_HOURS,
    url = STIX_BUNDLE_URL
  } = options;
  
  // Try to use cache first
  if (useCache && isCacheValid(cacheExpiryHours)) {
    try {
      return readFromCache();
    } catch (error) {
      // Cache read failed, will try network
      console.warn('Cache read failed, fetching from network:', error.message);
    }
  }
  
  // Fetch from network
  try {
    const bundle = await fetchFromNetwork(url);
    
    // Save to cache for future use
    if (useCache) {
      try {
        writeToCache(bundle);
      } catch (cacheError) {
        console.warn('Failed to write cache:', cacheError.message);
      }
    }
    
    return bundle;
  } catch (networkError) {
    // If network fails and we have a cache (even expired), use it
    if (fs.existsSync(CACHE_FILE)) {
      console.warn('Network fetch failed, using expired cache:', networkError.message);
      return readFromCache();
    }
    
    // No cache available, re-throw the error
    throw new Error(`Failed to fetch STIX bundle: ${networkError.message}`);
  }
}

/**
 * Clears the STIX bundle cache
 * 
 * @example
 * clearCache();
 */
export function clearCache() {
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
  }
}

/**
 * Gets information about the cache status
 * 
 * @returns {Object} Cache information
 * @property {boolean} exists - Whether cache file exists
 * @property {string} path - Path to cache file
 * @property {number} [sizeBytes] - Size of cache file in bytes
 * @property {number} [ageHours] - Age of cache in hours
 * @property {Date} [lastModified] - Last modification date
 * 
 * @example
 * const info = getCacheInfo();
 * if (info.exists) {
 *   console.log(`Cache is ${info.ageHours.toFixed(1)} hours old`);
 * }
 */
export function getCacheInfo() {
  const info = {
    exists: fs.existsSync(CACHE_FILE),
    path: CACHE_FILE
  };
  
  if (info.exists) {
    const stats = fs.statSync(CACHE_FILE);
    info.sizeBytes = stats.size;
    info.lastModified = stats.mtime;
    info.ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
  }
  
  return info;
}
