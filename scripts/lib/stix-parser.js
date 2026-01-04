/**
 * STIX Data Parser
 * 
 * Parses MITRE ATT&CK STIX 2.1 data into usable JavaScript objects.
 * Extracts techniques, groups, campaigns, and their relationships.
 * 
 * @module stix-parser
 */

/**
 * Extracts the ATT&CK ID from a STIX object's external references
 * @param {Object} obj - STIX object
 * @returns {string|null} ATT&CK ID or null if not found
 */
function getAttackId(obj) {
  if (!obj.external_references || !Array.isArray(obj.external_references)) {
    return null;
  }
  
  const ref = obj.external_references.find(r => r.source_name === 'mitre-attack');
  return ref ? ref.external_id : null;
}

/**
 * Parses a technique (attack-pattern) object
 * @param {Object} obj - STIX attack-pattern object
 * @returns {Object} Parsed technique
 */
function parseTechnique(obj) {
  const attackId = getAttackId(obj);
  
  return {
    stixId: obj.id,
    attackId: attackId,
    name: obj.name || '',
    description: obj.description || '',
    killChainPhases: (obj.kill_chain_phases || [])
      .filter(kcp => kcp.kill_chain_name === 'mitre-attack')
      .map(kcp => kcp.phase_name),
    deprecated: obj.x_mitre_deprecated || false,
    revoked: obj.revoked || false
  };
}

/**
 * Parses a group (intrusion-set) object
 * @param {Object} obj - STIX intrusion-set object
 * @returns {Object} Parsed group
 */
function parseGroup(obj) {
  const attackId = getAttackId(obj);
  
  return {
    stixId: obj.id,
    attackId: attackId,
    name: obj.name || '',
    description: obj.description || '',
    aliases: obj.aliases || [],
    deprecated: obj.x_mitre_deprecated || false,
    revoked: obj.revoked || false
  };
}

/**
 * Parses a campaign object
 * @param {Object} obj - STIX campaign object
 * @returns {Object} Parsed campaign
 */
function parseCampaign(obj) {
  const attackId = getAttackId(obj);
  
  return {
    stixId: obj.id,
    attackId: attackId,
    name: obj.name || '',
    description: obj.description || '',
    firstSeen: obj.first_seen || null,
    lastSeen: obj.last_seen || null,
    deprecated: obj.x_mitre_deprecated || false,
    revoked: obj.revoked || false
  };
}

/**
 * Extracts unique tactics from techniques
 * @param {Array} techniques - Parsed techniques
 * @returns {Array} Array of unique tactics with order info
 */
function extractTactics(techniques) {
  // Standard ATT&CK Enterprise tactic order
  const tacticOrder = [
    'reconnaissance',
    'resource-development',
    'initial-access',
    'execution',
    'persistence',
    'privilege-escalation',
    'defense-evasion',
    'credential-access',
    'discovery',
    'lateral-movement',
    'collection',
    'command-and-control',
    'exfiltration',
    'impact'
  ];
  
  // Collect all unique tactics from techniques
  const tacticsSet = new Set();
  for (const technique of techniques) {
    for (const tactic of technique.killChainPhases) {
      tacticsSet.add(tactic);
    }
  }
  
  // Sort by standard order, unknown tactics at the end
  const tactics = Array.from(tacticsSet)
    .map(name => {
      const order = tacticOrder.indexOf(name);
      return {
        name,
        order: order >= 0 ? order : tacticOrder.length
      };
    })
    .sort((a, b) => a.order - b.order);
  
  return tactics;
}

/**
 * Builds relationship maps from STIX relationships
 * @param {Array} objects - All STIX objects
 * @param {Map} stixIdToAttackId - Map of STIX IDs to ATT&CK IDs
 * @returns {Object} Relationship maps
 */
function buildRelationshipMaps(objects, stixIdToAttackId) {
  const groupToTechniques = new Map();
  const campaignToTechniques = new Map();
  const campaignToGroups = new Map();
  
  const relationships = objects.filter(obj => obj.type === 'relationship');
  
  for (const rel of relationships) {
    // Skip if missing required properties
    if (!rel.source_ref || !rel.target_ref || !rel.relationship_type) {
      continue;
    }
    
    const sourceAttackId = stixIdToAttackId.get(rel.source_ref);
    const targetAttackId = stixIdToAttackId.get(rel.target_ref);
    
    // Skip if we can't resolve the ATT&CK IDs
    if (!sourceAttackId || !targetAttackId) {
      continue;
    }
    
    if (rel.relationship_type === 'uses') {
      // Group uses technique
      if (rel.source_ref.startsWith('intrusion-set--') && 
          rel.target_ref.startsWith('attack-pattern--')) {
        if (!groupToTechniques.has(sourceAttackId)) {
          groupToTechniques.set(sourceAttackId, []);
        }
        if (!groupToTechniques.get(sourceAttackId).includes(targetAttackId)) {
          groupToTechniques.get(sourceAttackId).push(targetAttackId);
        }
      }
      
      // Campaign uses technique
      if (rel.source_ref.startsWith('campaign--') && 
          rel.target_ref.startsWith('attack-pattern--')) {
        if (!campaignToTechniques.has(sourceAttackId)) {
          campaignToTechniques.set(sourceAttackId, []);
        }
        if (!campaignToTechniques.get(sourceAttackId).includes(targetAttackId)) {
          campaignToTechniques.get(sourceAttackId).push(targetAttackId);
        }
      }
    }
    
    // Campaign attributed to group
    if (rel.relationship_type === 'attributed-to') {
      if (rel.source_ref.startsWith('campaign--') && 
          rel.target_ref.startsWith('intrusion-set--')) {
        if (!campaignToGroups.has(sourceAttackId)) {
          campaignToGroups.set(sourceAttackId, []);
        }
        if (!campaignToGroups.get(sourceAttackId).includes(targetAttackId)) {
          campaignToGroups.get(sourceAttackId).push(targetAttackId);
        }
      }
    }
  }
  
  return {
    groupToTechniques,
    campaignToTechniques,
    campaignToGroups
  };
}

/**
 * Builds a map of techniques to their tactics
 * @param {Array} techniques - Parsed techniques
 * @returns {Map} Map of ATT&CK ID to array of tactic names
 */
function buildTechniqueToTacticsMap(techniques) {
  const techniqueToTactics = new Map();
  
  for (const technique of techniques) {
    if (technique.attackId && technique.killChainPhases.length > 0) {
      techniqueToTactics.set(technique.attackId, technique.killChainPhases);
    }
  }
  
  return techniqueToTactics;
}

/**
 * Parses a STIX bundle into structured data
 * 
 * @param {Object} bundle - STIX bundle object
 * @returns {Object} Parsed data with techniques, groups, campaigns, and relationships
 * 
 * @example
 * const bundle = await fetchStixBundle();
 * const parsed = parseStixBundle(bundle);
 * 
 * console.log(`Found ${parsed.techniques.length} techniques`);
 * console.log(`Found ${parsed.groups.length} groups`);
 * 
 * // Get techniques used by APT28
 * const apt28Techniques = parsed.groupToTechniques.get('G0007');
 */
export function parseStixBundle(bundle) {
  const objects = bundle?.objects || [];
  
  // Parse entities by type
  const techniques = objects
    .filter(obj => obj.type === 'attack-pattern')
    .map(parseTechnique)
    .filter(t => t.attackId); // Only include those with ATT&CK IDs
  
  const groups = objects
    .filter(obj => obj.type === 'intrusion-set')
    .map(parseGroup)
    .filter(g => g.attackId);
  
  const campaigns = objects
    .filter(obj => obj.type === 'campaign')
    .map(parseCampaign)
    .filter(c => c.attackId);
  
  // Build STIX ID to ATT&CK ID map for relationship resolution
  const stixIdToAttackId = new Map();
  for (const obj of objects) {
    const attackId = getAttackId(obj);
    if (attackId) {
      stixIdToAttackId.set(obj.id, attackId);
    }
  }
  
  // Extract tactics
  const tactics = extractTactics(techniques);
  
  // Build technique to tactics map
  const techniqueToTactics = buildTechniqueToTacticsMap(techniques);
  
  // Build relationship maps
  const {
    groupToTechniques,
    campaignToTechniques,
    campaignToGroups
  } = buildRelationshipMaps(objects, stixIdToAttackId);
  
  return {
    techniques,
    groups,
    campaigns,
    tactics,
    techniqueToTactics,
    groupToTechniques,
    campaignToTechniques,
    campaignToGroups
  };
}

/**
 * STIX Parser class for convenient access to parsed data
 * 
 * @class
 * @example
 * const parser = new StixParser(bundle);
 * 
 * const technique = parser.getTechnique('T1566.001');
 * console.log(technique.name); // 'Spearphishing Attachment'
 * 
 * const apt28Techniques = parser.getTechniquesForGroup('G0007');
 */
export class StixParser {
  /**
   * Creates a new StixParser instance
   * @param {Object} bundle - STIX bundle to parse
   */
  constructor(bundle) {
    const parsed = parseStixBundle(bundle);
    
    this.techniques = parsed.techniques;
    this.groups = parsed.groups;
    this.campaigns = parsed.campaigns;
    this.tactics = parsed.tactics;
    this.techniqueToTactics = parsed.techniqueToTactics;
    this.groupToTechniques = parsed.groupToTechniques;
    this.campaignToTechniques = parsed.campaignToTechniques;
    this.campaignToGroups = parsed.campaignToGroups;
    
    // Build lookup maps for fast access
    this._techniqueMap = new Map(this.techniques.map(t => [t.attackId, t]));
    this._groupMap = new Map(this.groups.map(g => [g.attackId, g]));
    this._campaignMap = new Map(this.campaigns.map(c => [c.attackId, c]));
  }
  
  /**
   * Gets a technique by ATT&CK ID
   * @param {string} attackId - ATT&CK technique ID (e.g., 'T1566.001')
   * @returns {Object|undefined} Technique object or undefined
   */
  getTechnique(attackId) {
    return this._techniqueMap.get(attackId);
  }
  
  /**
   * Gets a group by ATT&CK ID
   * @param {string} attackId - ATT&CK group ID (e.g., 'G0007')
   * @returns {Object|undefined} Group object or undefined
   */
  getGroup(attackId) {
    return this._groupMap.get(attackId);
  }
  
  /**
   * Gets a campaign by ATT&CK ID
   * @param {string} attackId - ATT&CK campaign ID (e.g., 'C0006')
   * @returns {Object|undefined} Campaign object or undefined
   */
  getCampaign(attackId) {
    return this._campaignMap.get(attackId);
  }
  
  /**
   * Gets all techniques used by a group
   * @param {string} groupId - ATT&CK group ID
   * @returns {Array} Array of technique objects
   */
  getTechniquesForGroup(groupId) {
    const techniqueIds = this.groupToTechniques.get(groupId) || [];
    return techniqueIds
      .map(id => this.getTechnique(id))
      .filter(t => t !== undefined);
  }
  
  /**
   * Gets all techniques used in a campaign
   * @param {string} campaignId - ATT&CK campaign ID
   * @returns {Array} Array of technique objects
   */
  getTechniquesForCampaign(campaignId) {
    const techniqueIds = this.campaignToTechniques.get(campaignId) || [];
    return techniqueIds
      .map(id => this.getTechnique(id))
      .filter(t => t !== undefined);
  }
  
  /**
   * Gets all groups attributed to a campaign
   * @param {string} campaignId - ATT&CK campaign ID
   * @returns {Array} Array of group objects
   */
  getGroupsForCampaign(campaignId) {
    const groupIds = this.campaignToGroups.get(campaignId) || [];
    return groupIds
      .map(id => this.getGroup(id))
      .filter(g => g !== undefined);
  }
}
