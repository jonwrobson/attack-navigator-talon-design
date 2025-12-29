/**
 * Tests for Attack Chain Generator
 * 
 * Generates attack chain structures for each technique showing:
 * - Groups/campaigns that use the technique
 * - Full attack path ordered by tactic
 * - Campaign attribution to groups
 */

import { jest } from '@jest/globals';

// Helper to create a minimal STIX bundle for testing
const createTestBundle = () => ({
  type: 'bundle',
  id: 'bundle--test',
  objects: [
    // Techniques
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t1566',
      name: 'Phishing',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1566' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'initial-access' }]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t1078',
      name: 'Valid Accounts',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1078' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'persistence' }]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t1078-001',
      name: 'Default Accounts',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1078.001' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'persistence' }]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t1021',
      name: 'Remote Services',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1021' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'lateral-movement' }]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t1486',
      name: 'Data Encrypted for Impact',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T1486' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'impact' }]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--t9999',
      name: 'Unused Technique',
      external_references: [{ source_name: 'mitre-attack', external_id: 'T9999' }],
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }]
    },
    // Groups
    {
      type: 'intrusion-set',
      id: 'intrusion-set--g0007',
      name: 'APT28',
      external_references: [{ source_name: 'mitre-attack', external_id: 'G0007' }]
    },
    {
      type: 'intrusion-set',
      id: 'intrusion-set--g0032',
      name: 'Lazarus Group',
      external_references: [{ source_name: 'mitre-attack', external_id: 'G0032' }]
    },
    // Campaigns
    {
      type: 'campaign',
      id: 'campaign--c0051',
      name: 'Campaign Alpha',
      external_references: [{ source_name: 'mitre-attack', external_id: 'C0051' }]
    },
    {
      type: 'campaign',
      id: 'campaign--c0052',
      name: 'Campaign Beta',
      external_references: [{ source_name: 'mitre-attack', external_id: 'C0052' }]
    },
    // Relationships: APT28 uses T1566, T1078, T1021
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0007',
      target_ref: 'attack-pattern--t1566'
    },
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0007',
      target_ref: 'attack-pattern--t1078'
    },
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0007',
      target_ref: 'attack-pattern--t1021'
    },
    // Relationships: Lazarus uses T1566, T1078, T1486
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0032',
      target_ref: 'attack-pattern--t1566'
    },
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0032',
      target_ref: 'attack-pattern--t1078'
    },
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--g0032',
      target_ref: 'attack-pattern--t1486'
    },
    // Relationships: Campaign Alpha (attributed to APT28) uses T1078
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'campaign--c0051',
      target_ref: 'attack-pattern--t1078'
    },
    {
      type: 'relationship',
      relationship_type: 'attributed-to',
      source_ref: 'campaign--c0051',
      target_ref: 'intrusion-set--g0007'
    },
    // Relationships: Campaign Beta (attributed to APT28) uses T1078
    {
      type: 'relationship',
      relationship_type: 'uses',
      source_ref: 'campaign--c0052',
      target_ref: 'attack-pattern--t1078'
    },
    {
      type: 'relationship',
      relationship_type: 'attributed-to',
      source_ref: 'campaign--c0052',
      target_ref: 'intrusion-set--g0007'
    }
  ]
});

describe('Attack Chain Generator', () => {
  let generateAttackChains, StixParser;

  beforeAll(async () => {
    const chainGenerator = await import('../../scripts/lib/chain-generator.js');
    const stixParser = await import('../../scripts/lib/stix-parser.js');
    generateAttackChains = chainGenerator.generateAttackChains;
    StixParser = stixParser.StixParser;
  });

  describe('generateAttackChains', () => {
    it('should generate empty chains array for technique with no group usage', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T9999 is not used by any group
      const result = generateAttackChains('T9999', parser);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('T9999');
      expect(result.name).toBe('Unused Technique');
      expect(result.tactic).toBe('execution');
      expect(result.chains).toEqual([]);
    });

    it('should generate single chain for technique used by one group', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1021 is only used by APT28
      const result = generateAttackChains('T1021', parser);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('T1021');
      expect(result.name).toBe('Remote Services');
      expect(result.chains).toHaveLength(1);
      
      const chain = result.chains[0];
      expect(chain.group).toEqual({ id: 'G0007', name: 'APT28' });
      expect(chain.path).toBeDefined();
      expect(Array.isArray(chain.path)).toBe(true);
    });

    it('should generate multiple chains for technique used by multiple groups', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1078 is used by both APT28 and Lazarus Group
      const result = generateAttackChains('T1078', parser);
      
      expect(result).toBeDefined();
      expect(result.chains).toHaveLength(2);
      
      const groupIds = result.chains.map(c => c.group.id).sort();
      expect(groupIds).toEqual(['G0007', 'G0032']);
    });

    it('should order path by tactic kill chain sequence', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1078 used by APT28: T1566 (initial-access=3) → T1078 (persistence=5) → T1021 (lateral-movement=10)
      const result = generateAttackChains('T1078', parser);
      
      const apt28Chain = result.chains.find(c => c.group.id === 'G0007');
      expect(apt28Chain).toBeDefined();
      expect(apt28Chain.path.length).toBeGreaterThan(0);
      
      // Verify tactics are in order
      const tactics = apt28Chain.path.map(t => t.tactic);
      const tacticOrders = apt28Chain.path.map(t => t.tacticOrder);
      
      // Tactic orders should be ascending
      for (let i = 1; i < tacticOrders.length; i++) {
        expect(tacticOrders[i]).toBeGreaterThanOrEqual(tacticOrders[i - 1]);
      }
    });

    it('should mark the selected technique in path with selected: true', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      const result = generateAttackChains('T1078', parser);
      
      // Each chain should have exactly one selected technique
      for (const chain of result.chains) {
        const selectedTechniques = chain.path.filter(t => t.selected === true);
        expect(selectedTechniques).toHaveLength(1);
        expect(selectedTechniques[0].id).toBe('T1078');
      }
    });

    it('should aggregate campaigns under their attributed group', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1078 is used by Campaign Alpha and Beta, both attributed to APT28
      const result = generateAttackChains('T1078', parser);
      
      const apt28Chain = result.chains.find(c => c.group.id === 'G0007');
      expect(apt28Chain).toBeDefined();
      expect(apt28Chain.campaigns).toBeDefined();
      expect(Array.isArray(apt28Chain.campaigns)).toBe(true);
      expect(apt28Chain.campaigns.length).toBeGreaterThanOrEqual(2);
      
      const campaignIds = apt28Chain.campaigns.map(c => c.id).sort();
      expect(campaignIds).toContain('C0051');
      expect(campaignIds).toContain('C0052');
    });

    it('should calculate correct campaignCount', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      const result = generateAttackChains('T1078', parser);
      
      const apt28Chain = result.chains.find(c => c.group.id === 'G0007');
      expect(apt28Chain).toBeDefined();
      expect(apt28Chain.campaignCount).toBe(apt28Chain.campaigns.length);
      expect(apt28Chain.campaignCount).toBe(2);
    });

    it('should handle sub-techniques (T1078.001) correctly', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1078.001 should be a valid technique that can be queried
      const technique = parser.getTechnique('T1078.001');
      expect(technique).toBeDefined();
      expect(technique.name).toBe('Default Accounts');
      
      // Should be able to generate chains for it (even if empty)
      const result = generateAttackChains('T1078.001', parser);
      expect(result).toBeDefined();
      expect(result.id).toBe('T1078.001');
      expect(result.name).toBe('Default Accounts');
    });

    it('should include technique name and tactic in each path node', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      const result = generateAttackChains('T1078', parser);
      
      const apt28Chain = result.chains.find(c => c.group.id === 'G0007');
      expect(apt28Chain).toBeDefined();
      
      // Every path node should have id, name, tactic, and tacticOrder
      for (const node of apt28Chain.path) {
        expect(node.id).toBeDefined();
        expect(typeof node.id).toBe('string');
        expect(node.name).toBeDefined();
        expect(typeof node.name).toBe('string');
        expect(node.tactic).toBeDefined();
        expect(typeof node.tactic).toBe('string');
        expect(node.tacticOrder).toBeDefined();
        expect(typeof node.tacticOrder).toBe('number');
      }
    });

    it('should handle technique not in STIX data gracefully', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // Non-existent technique
      const result = generateAttackChains('T9998', parser);
      
      expect(result).toBeNull();
    });

    it('should handle empty parser gracefully', () => {
      const emptyBundle = { type: 'bundle', id: 'empty', objects: [] };
      const parser = new StixParser(emptyBundle);
      
      const result = generateAttackChains('T1078', parser);
      
      expect(result).toBeNull();
    });

    it('should handle groups with no campaigns', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      // T1021 is used by APT28 but not by any campaign
      const result = generateAttackChains('T1021', parser);
      
      const apt28Chain = result.chains.find(c => c.group.id === 'G0007');
      expect(apt28Chain).toBeDefined();
      expect(apt28Chain.campaigns).toEqual([]);
      expect(apt28Chain.campaignCount).toBe(0);
    });

    it('should output valid JSON structure', () => {
      const bundle = createTestBundle();
      const parser = new StixParser(bundle);
      
      const result = generateAttackChains('T1078', parser);
      
      // Should be serializable as JSON
      expect(() => JSON.stringify(result)).not.toThrow();
      
      // Should match expected schema
      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        tactic: expect.any(String),
        chains: expect.any(Array)
      });
      
      if (result.chains.length > 0) {
        expect(result.chains[0]).toMatchObject({
          group: {
            id: expect.any(String),
            name: expect.any(String)
          },
          campaigns: expect.any(Array),
          campaignCount: expect.any(Number),
          path: expect.any(Array)
        });
      }
    });
  });
});
