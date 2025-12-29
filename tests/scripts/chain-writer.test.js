/**
 * Tests for Attack Chain Writer
 * 
 * Writes generated chain data to static JSON files optimized for web delivery.
 * One file per technique, plus an index file with metadata.
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Helper to create a minimal chain data for testing
const createTestChainData = (techniqueId, name, tactic, chainCount = 1) => ({
  id: techniqueId,
  name: name,
  tactic: tactic,
  chains: chainCount > 0 ? Array(chainCount).fill(null).map((_, i) => ({
    group: { id: `G000${i}`, name: `Test Group ${i}` },
    campaigns: [],
    campaignCount: 0,
    path: [
      { id: techniqueId, name: name, tactic: tactic, tacticOrder: 3, selected: true }
    ]
  })) : []
});

// Helper to create mock parser with test data
const createMockParser = () => {
  const mockParser = {
    techniques: [
      { attackId: 'T1078', name: 'Valid Accounts' },
      { attackId: 'T1566', name: 'Phishing' },
      { attackId: 'T1078.001', name: 'Default Accounts' },
      { attackId: 'T9999', name: 'Unused Technique' }
    ],
    getTechnique: (id) => mockParser.techniques.find(t => t.attackId === id),
    attackVersion: '18.1'
  };
  return mockParser;
};

describe('Attack Chain Writer', () => {
  let writeChainFiles, TEST_OUTPUT_DIR;

  beforeAll(async () => {
    const chainWriter = await import('../../scripts/lib/chain-writer.js');
    writeChainFiles = chainWriter.writeChainFiles;
    
    // Use a test directory instead of the actual output directory
    TEST_OUTPUT_DIR = path.join(os.tmpdir(), 'test-chain-output');
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

  describe('writeChainFiles', () => {
    it('should create output directory if not exists', async () => {
      const chains = [createTestChainData('T1078', 'Valid Accounts', 'persistence', 1)];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check that directory was created
      const stats = await fs.stat(TEST_OUTPUT_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should write valid JSON file for technique with chains', async () => {
      const chainData = createTestChainData('T1078', 'Valid Accounts', 'persistence', 2);
      const chains = [chainData];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check that file was created
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1078.json');
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Should be valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(chainData);
    });

    it('should skip techniques with no chains', async () => {
      const chains = [
        createTestChainData('T1078', 'Valid Accounts', 'persistence', 2),
        createTestChainData('T9999', 'Unused Technique', 'execution', 0) // No chains
      ];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check that T1078 was written
      const t1078Path = path.join(TEST_OUTPUT_DIR, 'T1078.json');
      await expect(fs.access(t1078Path)).resolves.not.toThrow();

      // Check that T9999 was NOT written
      const t9999Path = path.join(TEST_OUTPUT_DIR, 'T9999.json');
      await expect(fs.access(t9999Path)).rejects.toThrow();
    });

    it('should generate correct filename from technique ID', async () => {
      const chains = [createTestChainData('T1566', 'Phishing', 'initial-access', 1)];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check filename
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1566.json');
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });

    it('should handle sub-technique IDs (T1078.001 → T1078.001.json)', async () => {
      const chains = [createTestChainData('T1078.001', 'Default Accounts', 'persistence', 1)];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check filename includes the sub-technique ID
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1078.001.json');
      await expect(fs.access(filePath)).resolves.not.toThrow();
    });

    it('should create index.json with correct metadata', async () => {
      const chains = [
        createTestChainData('T1078', 'Valid Accounts', 'persistence', 2),
        createTestChainData('T1566', 'Phishing', 'initial-access', 3)
      ];
      const parser = createMockParser();

      const stats = await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Check that index.json was created
      const indexPath = path.join(TEST_OUTPUT_DIR, 'index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);

      // Verify structure
      expect(index).toHaveProperty('generated');
      expect(index).toHaveProperty('attackVersion');
      expect(index).toHaveProperty('techniqueCount');
      expect(index).toHaveProperty('techniques');
      
      // Verify metadata
      expect(index.attackVersion).toBe('18.1');
      expect(index.techniqueCount).toBe(2);
      expect(Array.isArray(index.techniques)).toBe(true);
      expect(index.techniques).toHaveLength(2);
      
      // Verify technique entries
      const t1078Entry = index.techniques.find(t => t.id === 'T1078');
      expect(t1078Entry).toBeDefined();
      expect(t1078Entry.name).toBe('Valid Accounts');
      expect(t1078Entry.chainCount).toBe(2);
      expect(t1078Entry.fileSize).toBeGreaterThan(0);
    });

    it('should report accurate file size in index', async () => {
      const chains = [createTestChainData('T1078', 'Valid Accounts', 'persistence', 1)];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Read index
      const indexPath = path.join(TEST_OUTPUT_DIR, 'index.json');
      const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      
      // Read actual file
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1078.json');
      const fileStats = await fs.stat(filePath);
      
      // Compare sizes
      const t1078Entry = index.techniques.find(t => t.id === 'T1078');
      expect(t1078Entry.fileSize).toBe(fileStats.size);
    });

    it('should minify JSON output', async () => {
      const chains = [createTestChainData('T1078', 'Valid Accounts', 'persistence', 1)];
      const parser = createMockParser();

      await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Read the file
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1078.json');
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Minified JSON should not have excessive whitespace
      // Check that it doesn't have pretty-printed indentation
      expect(content).not.toMatch(/\n\s{2,}/); // No lines with 2+ spaces of indentation
      
      // But should still be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should overwrite existing files on regeneration', async () => {
      const chains1 = [createTestChainData('T1078', 'Valid Accounts', 'persistence', 1)];
      const chains2 = [createTestChainData('T1078', 'Valid Accounts', 'persistence', 3)];
      const parser = createMockParser();

      // First write
      await writeChainFiles(chains1, parser, TEST_OUTPUT_DIR);
      const filePath = path.join(TEST_OUTPUT_DIR, 'T1078.json');
      const content1 = await fs.readFile(filePath, 'utf-8');
      const data1 = JSON.parse(content1);
      expect(data1.chains).toHaveLength(1);

      // Second write (overwrite)
      await writeChainFiles(chains2, parser, TEST_OUTPUT_DIR);
      const content2 = await fs.readFile(filePath, 'utf-8');
      const data2 = JSON.parse(content2);
      expect(data2.chains).toHaveLength(3);
    });

    it('should report generation statistics', async () => {
      const chains = [
        createTestChainData('T1078', 'Valid Accounts', 'persistence', 2),
        createTestChainData('T1566', 'Phishing', 'initial-access', 3),
        createTestChainData('T9999', 'Unused Technique', 'execution', 0) // Skip this one
      ];
      const parser = createMockParser();

      const stats = await writeChainFiles(chains, parser, TEST_OUTPUT_DIR);

      // Verify statistics
      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('skippedCount');
      expect(stats).toHaveProperty('duration');
      
      expect(stats.fileCount).toBe(2); // Only T1078 and T1566
      expect(stats.skippedCount).toBe(1); // T9999 was skipped
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.duration).toBeGreaterThan(0);
    });
  });
});
