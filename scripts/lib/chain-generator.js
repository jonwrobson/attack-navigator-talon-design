/**
 * Attack Chain Generator
 * 
 * Generates attack chain structures showing how groups/campaigns use techniques
 * within their full attack paths, ordered by tactic (kill chain).
 * 
 * @module chain-generator
 */

/**
 * Standard ATT&CK Enterprise tactic order
 */
const TACTIC_ORDER = {
  'reconnaissance': 1,
  'resource-development': 2,
  'initial-access': 3,
  'execution': 4,
  'persistence': 5,
  'privilege-escalation': 6,
  'defense-evasion': 7,
  'credential-access': 8,
  'discovery': 9,
  'lateral-movement': 10,
  'collection': 11,
  'command-and-control': 12,
  'exfiltration': 13,
  'impact': 14
};

/**
 * Gets the order number for a tactic
 * @param {string} tactic - Tactic name
 * @returns {number} Order number (or 999 for unknown tactics)
 */
function getTacticOrder(tactic) {
  return TACTIC_ORDER[tactic] || 999;
}

/**
 * Builds a path node for a technique
 * @param {Object} technique - Technique object from parser
 * @param {boolean} isSelected - Whether this is the selected technique
 * @returns {Object} Path node with id, name, tactic, tacticOrder, and selected flag
 */
function buildPathNode(technique, isSelected = false) {
  // Get the first tactic if technique has multiple
  const tactic = technique.killChainPhases[0] || '';
  
  const node = {
    id: technique.attackId,
    name: technique.name,
    tactic: tactic,
    tacticOrder: getTacticOrder(tactic)
  };
  
  if (isSelected) {
    node.selected = true;
  }
  
  return node;
}

/**
 * Builds the attack path for a group, ordered by tactic
 * @param {string} groupId - Group ATT&CK ID
 * @param {string} selectedTechniqueId - The technique ID to mark as selected
 * @param {Object} parser - StixParser instance
 * @returns {Array} Ordered array of path nodes
 */
function buildAttackPath(groupId, selectedTechniqueId, parser) {
  const techniques = parser.getTechniquesForGroup(groupId);
  
  // Build path nodes
  const pathNodes = techniques.map(technique => {
    const isSelected = technique.attackId === selectedTechniqueId;
    return buildPathNode(technique, isSelected);
  });
  
  // Sort by tactic order
  pathNodes.sort((a, b) => a.tacticOrder - b.tacticOrder);
  
  return pathNodes;
}

/**
 * Finds campaigns that use a specific technique and are attributed to a group
 * @param {string} groupId - Group ATT&CK ID
 * @param {string} techniqueId - Technique ATT&CK ID
 * @param {Object} parser - StixParser instance
 * @returns {Array} Array of campaign objects with id and name
 */
function findCampaignsForGroupAndTechnique(groupId, techniqueId, parser) {
  const campaigns = [];
  
  // Iterate through all campaigns
  for (const campaign of parser.campaigns) {
    // Check if campaign uses the technique
    const campaignTechniques = parser.campaignToTechniques.get(campaign.attackId) || [];
    if (!campaignTechniques.includes(techniqueId)) {
      continue;
    }
    
    // Check if campaign is attributed to the group
    const campaignGroups = parser.campaignToGroups.get(campaign.attackId) || [];
    if (!campaignGroups.includes(groupId)) {
      continue;
    }
    
    campaigns.push({
      id: campaign.attackId,
      name: campaign.name
    });
  }
  
  return campaigns;
}

/**
 * Finds all groups that use a specific technique
 * @param {string} techniqueId - Technique ATT&CK ID
 * @param {Object} parser - StixParser instance
 * @returns {Array} Array of group ATT&CK IDs
 */
function findGroupsUsingTechnique(techniqueId, parser) {
  const groups = [];
  
  // Check which groups use this technique
  for (const [groupId, techniques] of parser.groupToTechniques.entries()) {
    if (techniques.includes(techniqueId)) {
      groups.push(groupId);
    }
  }
  
  return groups;
}

/**
 * Generates attack chains for a specific technique
 * 
 * @param {string} techniqueId - ATT&CK technique ID (e.g., 'T1078' or 'T1078.001')
 * @param {Object} parser - StixParser instance with parsed STIX data
 * @returns {Object|null} Attack chain structure or null if technique not found
 * 
 * @example
 * const parser = new StixParser(bundle);
 * const chains = generateAttackChains('T1078', parser);
 * 
 * console.log(chains.id);        // 'T1078'
 * console.log(chains.name);      // 'Valid Accounts'
 * console.log(chains.tactic);    // 'persistence'
 * console.log(chains.chains.length); // Number of groups using this technique
 */
export function generateAttackChains(techniqueId, parser) {
  // Get the technique
  const technique = parser.getTechnique(techniqueId);
  if (!technique) {
    return null;
  }
  
  // Get the primary tactic for this technique
  const primaryTactic = technique.killChainPhases[0] || '';
  
  // Find all groups that use this technique
  const groupIds = findGroupsUsingTechnique(techniqueId, parser);
  
  // Build chains for each group
  const chains = [];
  for (const groupId of groupIds) {
    const group = parser.getGroup(groupId);
    if (!group) {
      continue;
    }
    
    // Find campaigns for this group and technique
    const campaigns = findCampaignsForGroupAndTechnique(groupId, techniqueId, parser);
    
    // Build the attack path
    const path = buildAttackPath(groupId, techniqueId, parser);
    
    chains.push({
      group: {
        id: group.attackId,
        name: group.name
      },
      campaigns: campaigns,
      campaignCount: campaigns.length,
      path: path
    });
  }
  
  return {
    id: technique.attackId,
    name: technique.name,
    tactic: primaryTactic,
    chains: chains
  };
}
