#!/usr/bin/env node

/**
 * Attack Chain Generator CLI
 * 
 * Main entry point that orchestrates the full chain generation pipeline.
 * Fetches STIX data, parses it, generates attack chains, and writes output files.
 * 
 * @module generate-attack-chains
 */

import { fetchStixBundle, clearCache } from './lib/stix-fetcher.js';
import { StixParser } from './lib/stix-parser.js';
import { generateAttackChains } from './lib/chain-generator.js';
import { writeChainFiles, DEFAULT_OUTPUT_DIR } from './lib/chain-writer.js';

// Version
const VERSION = '1.0.0';

/**
 * Parses command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: DEFAULT_OUTPUT_DIR,
    useCache: true,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      
      case '--output':
      case '-o':
        if (i + 1 >= args.length) {
          throw new Error('--output requires a path argument');
        }
        options.output = args[++i];
        break;
      
      case '--no-cache':
        options.useCache = false;
        break;
      
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

/**
 * Displays help message
 */
function showHelp() {
  console.log(`
Attack Chain Generator v${VERSION}
=============================

Generates attack chain data files from MITRE ATT&CK STIX data.

Usage:
  npm run generate-chains
  node scripts/generate-attack-chains.js [options]

Options:
  --output, -o    Output directory (default: nav-app/src/assets/attack-chains)
  --no-cache      Force re-download of STIX data (ignore cache)
  --verbose, -v   Show detailed progress information
  --help, -h      Show this help message

Examples:
  # Basic usage (use cache if available)
  npm run generate-chains

  # Custom output directory
  node scripts/generate-attack-chains.js --output ./custom-dir

  # Force fresh download, verbose output
  node scripts/generate-attack-chains.js --no-cache --verbose

Exit Codes:
  0  Success
  1  Error occurred
`);
}

/**
 * Formats bytes to human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats milliseconds to human-readable duration
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Logs a message (only in verbose mode)
 * @param {string} message - Message to log
 * @param {boolean} verbose - Whether verbose mode is enabled
 */
function verboseLog(message, verbose) {
  if (verbose) {
    console.log(`  ${message}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // Parse arguments
    const options = parseArgs();
    
    // Show help if requested
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    // Display header
    console.log(`Attack Chain Generator v${VERSION}`);
    console.log('=============================');
    
    // Step 1: Fetch STIX data
    console.log('Fetching STIX data from attack-stix-data...');
    
    // Clear cache if --no-cache is set
    if (!options.useCache) {
      verboseLog('Clearing cache...', options.verbose);
      clearCache();
    }
    
    const fetchStartTime = Date.now();
    const bundle = await fetchStixBundle({ useCache: options.useCache });
    const fetchDuration = Date.now() - fetchStartTime;
    
    // Calculate approximate size
    const bundleSize = JSON.stringify(bundle).length;
    verboseLog(`Downloaded enterprise-attack.json (${formatBytes(bundleSize)}) in ${formatDuration(fetchDuration)}`, options.verbose);
    console.log(`  ✓ Downloaded enterprise-attack.json (${formatBytes(bundleSize)})`);
    
    // Step 2: Parse STIX bundle
    console.log('Parsing STIX bundle...');
    
    const parseStartTime = Date.now();
    const parser = new StixParser(bundle);
    const parseDuration = Date.now() - parseStartTime;
    
    verboseLog(`Parsed ${parser.techniques.length} techniques, ${parser.groups.length} groups, ${parser.campaigns.length} campaigns in ${formatDuration(parseDuration)}`, options.verbose);
    console.log(`  ✓ Found ${parser.techniques.length} techniques, ${parser.groups.length} groups, ${parser.campaigns.length} campaigns`);
    
    // Step 3: Generate chains for all techniques
    console.log('Generating chains...');
    
    const genStartTime = Date.now();
    const allChains = [];
    
    for (let i = 0; i < parser.techniques.length; i++) {
      const technique = parser.techniques[i];
      
      // Show progress every 50 techniques in verbose mode
      if (options.verbose && (i + 1) % 50 === 0) {
        verboseLog(`Processing techniques... [${i + 1}/${parser.techniques.length}]`, true);
      }
      
      const chains = generateAttackChains(technique.attackId, parser);
      if (chains) {
        allChains.push(chains);
      }
    }
    
    const genDuration = Date.now() - genStartTime;
    verboseLog(`Generated chains for ${allChains.length} techniques in ${formatDuration(genDuration)}`, options.verbose);
    console.log(`  ✓ Processing techniques... [${parser.techniques.length}/${parser.techniques.length}]`);
    
    // Step 4: Write output files
    console.log('Writing output files...');
    
    const writeStartTime = Date.now();
    const writeStats = await writeChainFiles(allChains, parser, options.output);
    const writeDuration = Date.now() - writeStartTime;
    
    verboseLog(`Written ${writeStats.fileCount} files (${formatBytes(writeStats.totalSize)}) in ${formatDuration(writeDuration)}`, options.verbose);
    console.log(`  ✓ Written ${writeStats.fileCount} chain files (skipped ${writeStats.skippedCount} with no chains)`);
    console.log(`  ✓ Written index.json`);
    
    // Step 5: Display summary
    const totalDuration = Date.now() - startTime;
    console.log('\nSummary:');
    console.log(`  Files generated: ${writeStats.fileCount}`);
    console.log(`  Total size: ${formatBytes(writeStats.totalSize)}`);
    console.log(`  Time elapsed: ${formatDuration(totalDuration)}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle interruption (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Generation interrupted by user');
  process.exit(130); // Standard exit code for SIGINT
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Generation terminated');
  process.exit(143); // Standard exit code for SIGTERM
});

// Run main function
main();
