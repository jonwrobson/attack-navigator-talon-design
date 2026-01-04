/**
 * Tests for STIX Data Parser
 * 
 * This module parses MITRE ATT&CK STIX 2.1 data into usable JavaScript objects.
 */

import { jest } from '@jest/globals';

// Sample STIX bundle for testing
const createMockStixBundle = () => ({
  type: 'bundle',
  id: 'bundle--test-bundle',
  objects: [
    // Attack patterns (techniques)
    {
      type: 'attack-pattern',
      id: 'attack-pattern--0001',
      name: 'Spearphishing Attachment',
      description: 'Adversaries may send spearphishing emails with a malicious attachment.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'T1566.001' }
      ],
      kill_chain_phases: [
        { kill_chain_name: 'mitre-attack', phase_name: 'initial-access' }
      ]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--0002',
      name: 'Command and Scripting Interpreter',
      description: 'Adversaries may abuse command and script interpreters.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'T1059' }
      ],
      kill_chain_phases: [
        { kill_chain_name: 'mitre-attack', phase_name: 'execution' }
      ]
    },
    {
      type: 'attack-pattern',
      id: 'attack-pattern--0003',
      name: 'Data Encrypted for Impact',
      description: 'Adversaries may encrypt data on target systems.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'T1486' }
      ],
      kill_chain_phases: [
        { kill_chain_name: 'mitre-attack', phase_name: 'impact' }
      ]
    },
    // Intrusion sets (groups)
    {
      type: 'intrusion-set',
      id: 'intrusion-set--0001',
      name: 'APT28',
      description: 'APT28 is a threat group attributed to Russia.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'G0007' }
      ],
      aliases: ['Fancy Bear', 'Sofacy']
    },
    {
      type: 'intrusion-set',
      id: 'intrusion-set--0002',
      name: 'Lazarus Group',
      description: 'Lazarus Group is a North Korean state-sponsored threat group.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'G0032' }
      ],
      aliases: ['HIDDEN COBRA', 'Guardians of Peace']
    },
    // Campaigns
    {
      type: 'campaign',
      id: 'campaign--0001',
      name: 'Operation Ghostwriter',
      description: 'Operation Ghostwriter is a campaign.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'C0006' }
      ]
    },
    {
      type: 'campaign',
      id: 'campaign--0002',
      name: 'SolarWinds Compromise',
      description: 'SolarWinds Compromise is a supply chain attack.',
      external_references: [
        { source_name: 'mitre-attack', external_id: 'C0024' }
      ]
    },
    // Relationships: group uses technique
    {
      type: 'relationship',
      id: 'relationship--0001',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--0001',
      target_ref: 'attack-pattern--0001'
    },
    {
      type: 'relationship',
      id: 'relationship--0002',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--0001',
      target_ref: 'attack-pattern--0002'
    },
    {
      type: 'relationship',
      id: 'relationship--0003',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--0002',
      target_ref: 'attack-pattern--0003'
    },
    // Relationships: campaign uses technique
    {
      type: 'relationship',
      id: 'relationship--0004',
      relationship_type: 'uses',
      source_ref: 'campaign--0001',
      target_ref: 'attack-pattern--0001'
    },
    {
      type: 'relationship',
      id: 'relationship--0005',
      relationship_type: 'uses',
      source_ref: 'campaign--0002',
      target_ref: 'attack-pattern--0002'
    },
    // Relationships: campaign attributed to group
    {
      type: 'relationship',
      id: 'relationship--0006',
      relationship_type: 'attributed-to',
      source_ref: 'campaign--0001',
      target_ref: 'intrusion-set--0001'
    },
    // Malformed relationship (missing target_ref)
    {
      type: 'relationship',
      id: 'relationship--0007',
      relationship_type: 'uses',
      source_ref: 'intrusion-set--0001'
      // target_ref intentionally missing
    }
  ]
});

describe('STIX Parser', () => {
  let parseStixBundle, StixParser;
  
  beforeAll(async () => {
    const stixParser = await import('../../scripts/lib/stix-parser.js');
    parseStixBundle = stixParser.parseStixBundle;
    StixParser = stixParser.StixParser;
  });

  describe('parseStixBundle', () => {
    it('should extract all attack-pattern objects as techniques', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.techniques).toBeDefined();
      expect(parsed.techniques.length).toBe(3);
      
      const technique = parsed.techniques.find(t => t.attackId === 'T1566.001');
      expect(technique).toBeDefined();
      expect(technique.name).toBe('Spearphishing Attachment');
      expect(technique.stixId).toBe('attack-pattern--0001');
    });

    it('should extract all intrusion-set objects as groups', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.groups).toBeDefined();
      expect(parsed.groups.length).toBe(2);
      
      const group = parsed.groups.find(g => g.attackId === 'G0007');
      expect(group).toBeDefined();
      expect(group.name).toBe('APT28');
      expect(group.aliases).toContain('Fancy Bear');
    });

    it('should extract all campaign objects', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.campaigns).toBeDefined();
      expect(parsed.campaigns.length).toBe(2);
      
      const campaign = parsed.campaigns.find(c => c.attackId === 'C0006');
      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Operation Ghostwriter');
    });

    it('should build group→technique relationship map', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.groupToTechniques).toBeDefined();
      
      // APT28 (G0007) should have 2 techniques
      const apt28Techniques = parsed.groupToTechniques.get('G0007');
      expect(apt28Techniques).toBeDefined();
      expect(apt28Techniques.length).toBe(2);
      expect(apt28Techniques).toContain('T1566.001');
      expect(apt28Techniques).toContain('T1059');
      
      // Lazarus Group (G0032) should have 1 technique
      const lazarusTechniques = parsed.groupToTechniques.get('G0032');
      expect(lazarusTechniques).toBeDefined();
      expect(lazarusTechniques.length).toBe(1);
      expect(lazarusTechniques).toContain('T1486');
    });

    it('should build campaign→technique relationship map', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.campaignToTechniques).toBeDefined();
      
      // Operation Ghostwriter (C0006) should have 1 technique
      const ghostwriterTechniques = parsed.campaignToTechniques.get('C0006');
      expect(ghostwriterTechniques).toBeDefined();
      expect(ghostwriterTechniques.length).toBe(1);
      expect(ghostwriterTechniques).toContain('T1566.001');
      
      // SolarWinds (C0024) should have 1 technique
      const solarwindsTechniques = parsed.campaignToTechniques.get('C0024');
      expect(solarwindsTechniques).toBeDefined();
      expect(solarwindsTechniques.length).toBe(1);
      expect(solarwindsTechniques).toContain('T1059');
    });

    it('should build campaign→group attribution map', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.campaignToGroups).toBeDefined();
      
      // Operation Ghostwriter (C0006) should be attributed to APT28 (G0007)
      const ghostwriterGroups = parsed.campaignToGroups.get('C0006');
      expect(ghostwriterGroups).toBeDefined();
      expect(ghostwriterGroups.length).toBe(1);
      expect(ghostwriterGroups).toContain('G0007');
    });

    it('should extract kill_chain_phases for tactic ordering', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.tactics).toBeDefined();
      expect(parsed.tactics.length).toBeGreaterThan(0);
      
      // Should have initial-access, execution, and impact tactics
      const tacticNames = parsed.tactics.map(t => t.name);
      expect(tacticNames).toContain('initial-access');
      expect(tacticNames).toContain('execution');
      expect(tacticNames).toContain('impact');
    });

    it('should map techniques to their tactics', () => {
      const bundle = createMockStixBundle();
      const parsed = parseStixBundle(bundle);
      
      expect(parsed.techniqueToTactics).toBeDefined();
      
      // T1566.001 should be in initial-access
      const t1566Tactics = parsed.techniqueToTactics.get('T1566.001');
      expect(t1566Tactics).toBeDefined();
      expect(t1566Tactics).toContain('initial-access');
      
      // T1059 should be in execution
      const t1059Tactics = parsed.techniqueToTactics.get('T1059');
      expect(t1059Tactics).toBeDefined();
      expect(t1059Tactics).toContain('execution');
    });

    it('should handle missing/malformed relationships gracefully', () => {
      const bundle = createMockStixBundle();
      
      // Should not throw
      expect(() => parseStixBundle(bundle)).not.toThrow();
      
      const parsed = parseStixBundle(bundle);
      
      // Relationships should still be built (excluding malformed ones)
      expect(parsed.groupToTechniques.size).toBeGreaterThan(0);
    });

    it('should handle empty bundle gracefully', () => {
      const emptyBundle = {
        type: 'bundle',
        id: 'bundle--empty',
        objects: []
      };
      
      expect(() => parseStixBundle(emptyBundle)).not.toThrow();
      
      const parsed = parseStixBundle(emptyBundle);
      expect(parsed.techniques).toEqual([]);
      expect(parsed.groups).toEqual([]);
      expect(parsed.campaigns).toEqual([]);
    });

    it('should handle bundle with missing objects array', () => {
      const malformedBundle = {
        type: 'bundle',
        id: 'bundle--malformed'
        // objects intentionally missing
      };
      
      expect(() => parseStixBundle(malformedBundle)).not.toThrow();
      
      const parsed = parseStixBundle(malformedBundle);
      expect(parsed.techniques).toEqual([]);
    });
  });

  describe('StixParser class', () => {
    it('should provide lookup methods for techniques', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const technique = parser.getTechnique('T1566.001');
      expect(technique).toBeDefined();
      expect(technique.name).toBe('Spearphishing Attachment');
    });

    it('should provide lookup methods for groups', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const group = parser.getGroup('G0007');
      expect(group).toBeDefined();
      expect(group.name).toBe('APT28');
    });

    it('should provide lookup methods for campaigns', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const campaign = parser.getCampaign('C0006');
      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Operation Ghostwriter');
    });

    it('should return undefined for non-existent entities', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      expect(parser.getTechnique('T9999')).toBeUndefined();
      expect(parser.getGroup('G9999')).toBeUndefined();
      expect(parser.getCampaign('C9999')).toBeUndefined();
    });

    it('should provide techniques for a group', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const techniques = parser.getTechniquesForGroup('G0007');
      expect(techniques.length).toBe(2);
      expect(techniques.map(t => t.attackId)).toContain('T1566.001');
    });

    it('should provide techniques for a campaign', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const techniques = parser.getTechniquesForCampaign('C0006');
      expect(techniques.length).toBe(1);
      expect(techniques[0].attackId).toBe('T1566.001');
    });

    it('should provide groups for a campaign', () => {
      const bundle = createMockStixBundle();
      const parser = new StixParser(bundle);
      
      const groups = parser.getGroupsForCampaign('C0006');
      expect(groups.length).toBe(1);
      expect(groups[0].attackId).toBe('G0007');
    });
  });
});
