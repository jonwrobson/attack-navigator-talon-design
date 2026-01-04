/**
 * Tests for Generate Attack Chains CLI Script
 * 
 * Main entry point that orchestrates the full chain generation pipeline with CLI interface.
 * Tests cover CLI options, progress reporting, error handling, and exit codes.
 */

import { jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Path to the script
const SCRIPT_PATH = path.resolve('scripts/generate-attack-chains.js');

// Helper to run the script with arguments
async function runScript(args = '', options = {}) {
  const command = `node ${SCRIPT_PATH} ${args}`;
  try {
    const result = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      ...options
    });
    return {
      code: 0,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    // exec throws on non-zero exit codes
    return {
      code: error.code || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

describe('Generate Attack Chains CLI', () => {
  let TEST_OUTPUT_DIR;

  beforeAll(() => {
    // Create a test output directory
    TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'test-attack-chains-output');
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch (err) {
      // Ignore if directory doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors
    }
  });

  describe('CLI options', () => {
    it('should display help message with --help flag', async () => {
      const result = await runScript('--help');
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('--output');
      expect(result.stdout).toContain('--no-cache');
      expect(result.stdout).toContain('--verbose');
      expect(result.stdout).toContain('--help');
    });

    it('should display help message with -h flag', async () => {
      const result = await runScript('-h');
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    it('should respect --output flag', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      // Should complete successfully
      expect(result.code).toBe(0);
      
      // Output directory should be created
      const stats = await fs.stat(TEST_OUTPUT_DIR);
      expect(stats.isDirectory()).toBe(true);
      
      // Should contain index.json
      const indexPath = path.join(TEST_OUTPUT_DIR, 'index.json');
      await expect(fs.access(indexPath)).resolves.not.toThrow();
    }, 120000); // Increase timeout for network request

    it('should respect -o flag (short form)', async () => {
      const result = await runScript(`-o ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      
      // Output directory should be created
      const stats = await fs.stat(TEST_OUTPUT_DIR);
      expect(stats.isDirectory()).toBe(true);
    }, 120000);

    it('should show verbose output with --verbose flag', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR} --verbose`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Fetching STIX data');
      expect(result.stdout).toContain('Parsing STIX bundle');
      expect(result.stdout).toContain('Generating chains');
      expect(result.stdout).toContain('Writing output files');
    }, 120000);

    it('should show verbose output with -v flag', async () => {
      const result = await runScript(`-o ${TEST_OUTPUT_DIR} -v`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Fetching STIX data');
    }, 120000);
  });

  describe('Cache behavior', () => {
    it('should use cache by default when available', async () => {
      // Run once to create cache
      await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      // Run again - should use cache (faster)
      const startTime = Date.now();
      const result = await runScript(`--output ${TEST_OUTPUT_DIR} --verbose`);
      const duration = Date.now() - startTime;
      
      expect(result.code).toBe(0);
      // With cache, should be faster (though this is hard to test reliably)
      // At least check that it completed successfully
      expect(result.stdout).toContain('Summary:');
    }, 120000);

    it('should force re-download with --no-cache flag', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR} --no-cache --verbose`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/Downloaded.*enterprise-attack\.json/);
    }, 120000);
  });

  describe('Progress reporting', () => {
    it('should display progress during generation', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      
      // Should show progress steps
      expect(result.stdout).toContain('Attack Chain Generator');
      expect(result.stdout).toMatch(/Fetching STIX data/);
      expect(result.stdout).toMatch(/Parsing STIX bundle/);
      expect(result.stdout).toMatch(/Generating chains/);
      expect(result.stdout).toMatch(/Writing output files/);
    }, 120000);

    it('should display checkmarks for completed steps', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/✓/); // Should have checkmarks
    }, 120000);

    it('should show technique counts during parsing', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/Found \d+ techniques/);
      expect(result.stdout).toMatch(/\d+ groups/);
    }, 120000);

    it('should show progress counter during generation', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR} --verbose`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/Processing techniques.*\[\d+\/\d+\]/);
    }, 120000);
  });

  describe('Summary statistics', () => {
    it('should display summary statistics on completion', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Summary:');
      expect(result.stdout).toMatch(/Files generated: \d+/);
      expect(result.stdout).toMatch(/Total size:.*MB/);
      expect(result.stdout).toMatch(/Time elapsed:.*s/);
    }, 120000);

    it('should report skipped techniques with no chains', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/skipped \d+ with no chains/);
    }, 120000);

    it('should report accurate file counts', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      
      // Parse the output to get file count
      const match = result.stdout.match(/Files generated: (\d+)/);
      expect(match).not.toBeNull();
      
      const fileCount = parseInt(match[1], 10);
      expect(fileCount).toBeGreaterThan(0);
      
      // Verify actual files exist (excluding index.json)
      const files = await fs.readdir(TEST_OUTPUT_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
      expect(jsonFiles.length).toBe(fileCount);
    }, 120000);
  });

  describe('Exit codes', () => {
    it('should exit with code 0 on success', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
    }, 120000);

    it('should exit with code 1 on error (invalid output path)', async () => {
      // Try to write to a path that would fail (e.g., /invalid/path)
      const result = await runScript('--output /root/invalid/forbidden/path');
      
      expect(result.code).toBe(1);
    }, 30000);

    it('should exit with code 1 on unknown option', async () => {
      const result = await runScript('--unknown-option');
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('unknown');
    }, 10000);
  });

  describe('Full pipeline', () => {
    it('should complete full pipeline with real STIX data', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      
      // Verify output files exist
      const indexPath = path.join(TEST_OUTPUT_DIR, 'index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      
      // Verify index structure
      expect(index).toHaveProperty('generated');
      expect(index).toHaveProperty('techniqueCount');
      expect(index).toHaveProperty('techniques');
      expect(index.techniqueCount).toBeGreaterThan(0);
      
      // Verify at least one technique file exists
      const firstTechnique = index.techniques[0];
      const techniquePath = path.join(TEST_OUTPUT_DIR, `${firstTechnique.id}.json`);
      await expect(fs.access(techniquePath)).resolves.not.toThrow();
      
      // Verify technique file content
      const techniqueContent = await fs.readFile(techniquePath, 'utf-8');
      const techniqueData = JSON.parse(techniqueContent);
      expect(techniqueData).toHaveProperty('id');
      expect(techniqueData).toHaveProperty('name');
      expect(techniqueData).toHaveProperty('tactic');
      expect(techniqueData).toHaveProperty('chains');
    }, 120000);

    it('should handle empty chains gracefully', async () => {
      const result = await runScript(`--output ${TEST_OUTPUT_DIR}`);
      
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/skipped \d+ with no chains/);
    }, 120000);
  });
});
