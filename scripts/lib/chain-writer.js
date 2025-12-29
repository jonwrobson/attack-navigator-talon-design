/**
 * Attack Chain Writer
 * 
 * Writes generated attack chain data to static JSON files optimized for web delivery.
 * One file per technique, plus an index file with metadata.
 * 
 * @module chain-writer
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default output directory for chain files
 * Relative to the project root
 */
export const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../../nav-app/src/assets/attack-chains');

/**
 * Ensures the output directory exists, creating it if necessary
 * @param {string} outputDir - Path to output directory
 * @returns {Promise<void>}
 */
async function ensureOutputDirectory(outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Writes a single technique's chain data to a JSON file
 * @param {Object} chainData - Attack chain data for a technique
 * @param {string} outputDir - Path to output directory
 * @returns {Promise<number>} File size in bytes
 */
async function writeTechniqueFile(chainData, outputDir) {
  const filename = `${chainData.id}.json`;
  const filePath = path.join(outputDir, filename);
  
  // Minify JSON (no pretty printing)
  const content = JSON.stringify(chainData);
  
  await fs.writeFile(filePath, content, 'utf-8');
  
  // Get file size
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Creates the index file with metadata about all generated files
 * @param {Array} techniqueEntries - Array of technique metadata entries
 * @param {Object} parser - StixParser instance for ATT&CK version
 * @param {string} outputDir - Path to output directory
 * @returns {Promise<void>}
 */
async function writeIndexFile(techniqueEntries, parser, outputDir) {
  const index = {
    generated: new Date().toISOString(),
    attackVersion: parser.attackVersion || 'unknown',
    techniqueCount: techniqueEntries.length,
    techniques: techniqueEntries
  };
  
  const indexPath = path.join(outputDir, 'index.json');
  // Minify index file too
  const content = JSON.stringify(index);
  
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * Writes all attack chain data to static JSON files
 * 
 * @param {Array} chains - Array of attack chain objects from chain generator
 * @param {Object} parser - StixParser instance with ATT&CK version metadata
 * @param {string} [outputDir] - Optional output directory path
 * @returns {Promise<Object>} Statistics about the generation process
 * 
 * @example
 * const parser = new StixParser(bundle);
 * const chains = techniques.map(t => generateAttackChains(t.id, parser));
 * const stats = await writeChainFiles(chains, parser);
 * 
 * console.log(`Generated ${stats.fileCount} files`);
 * console.log(`Total size: ${stats.totalSize} bytes`);
 * console.log(`Skipped ${stats.skippedCount} techniques with no chains`);
 * console.log(`Duration: ${stats.duration}ms`);
 */
export async function writeChainFiles(chains, parser, outputDir = DEFAULT_OUTPUT_DIR) {
  const startTime = Date.now();
  
  // Ensure output directory exists
  await ensureOutputDirectory(outputDir);
  
  let fileCount = 0;
  let totalSize = 0;
  let skippedCount = 0;
  const techniqueEntries = [];
  
  // Process each technique's chain data
  for (const chainData of chains) {
    // Skip techniques with no chains (not used by any groups)
    if (!chainData.chains || chainData.chains.length === 0) {
      skippedCount++;
      continue;
    }
    
    // Write the technique file
    const fileSize = await writeTechniqueFile(chainData, outputDir);
    
    // Track for index file
    techniqueEntries.push({
      id: chainData.id,
      name: chainData.name,
      chainCount: chainData.chains.length,
      fileSize: fileSize
    });
    
    fileCount++;
    totalSize += fileSize;
  }
  
  // Write the index file
  await writeIndexFile(techniqueEntries, parser, outputDir);
  
  const duration = Date.now() - startTime;
  
  return {
    fileCount,
    totalSize,
    skippedCount,
    duration
  };
}
