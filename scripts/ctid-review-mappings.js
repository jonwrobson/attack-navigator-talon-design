/**
 * CTID Mapping Review Script
 * 
 * This script reviews your curated mitigation→NIST CSF mappings against
 * CTID's 800-53→Technique data to suggest improvements.
 * 
 * Run: node scripts/ctid-review-mappings.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// URLs for CTID data from your fork
const BASE_URL = 'https://raw.githubusercontent.com/jonwrobson/attack-control-framework-mappings/master';
const ATTACK_VERSION = 'attack_12_1';
const FRAMEWORK = 'nist800_53_r5';

const URLS = {
  controls: `${BASE_URL}/frameworks/${ATTACK_VERSION}/${FRAMEWORK}/stix/nist800-53-r5-controls.json`,
  mappings: `${BASE_URL}/frameworks/${ATTACK_VERSION}/${FRAMEWORK}/stix/nist800-53-r5-mappings.json`,
  attackData: `${BASE_URL}/frameworks/${ATTACK_VERSION}/${FRAMEWORK}/stix/nist800-53-r5-enterprise-attack.json`,
  // Original ATT&CK data for mitigation→technique mappings
  originalAttack: 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json'
};

// NIST CSF to 800-53 mapping (simplified - maps CSF subcategory patterns to 800-53 families)
// This is used to reverse-lookup what CSF you might want based on 800-53 controls
const CSF_TO_80053_FAMILIES = {
  // Identify
  'ID.AM': ['CM', 'PM', 'RA'],
  'ID.BE': ['CP', 'PM', 'RA', 'SA'],
  'ID.GV': ['PM', 'PL', 'PS', 'SA'],
  'ID.RA': ['CA', 'PM', 'RA', 'SA'],
  'ID.RM': ['PM', 'RA'],
  'ID.SC': ['PM', 'SA', 'SR'],
  // Protect
  'PR.AC': ['AC', 'IA', 'PE', 'SC'],
  'PR.AT': ['AT', 'PM'],
  'PR.DS': ['AU', 'CP', 'MP', 'SC', 'SI'],
  'PR.IP': ['CM', 'CP', 'MA', 'SA', 'SI'],
  'PR.MA': ['MA'],
  'PR.PT': ['AC', 'AU', 'CM', 'CP', 'SC', 'SI'],
  // Detect
  'DE.AE': ['AU', 'CA', 'IR', 'RA', 'SI'],
  'DE.CM': ['AU', 'CA', 'CM', 'PE', 'SC', 'SI'],
  'DE.DP': ['CA', 'PM', 'SI'],
  // Respond
  'RS.RP': ['IR'],
  'RS.CO': ['IR', 'PM'],
  'RS.AN': ['AU', 'IR', 'RA', 'SI'],
  'RS.MI': ['IR'],
  'RS.IM': ['IR', 'PM'],
  // Recover
  'RC.RP': ['CP', 'IR'],
  'RC.IM': ['CP', 'IR', 'PM'],
  'RC.CO': ['IR', 'PM']
};

// Reverse mapping: 800-53 family to CSF categories
const FAMILY_TO_CSF = {};
for (const [csf, families] of Object.entries(CSF_TO_80053_FAMILIES)) {
  for (const family of families) {
    if (!FAMILY_TO_CSF[family]) FAMILY_TO_CSF[family] = [];
    if (!FAMILY_TO_CSF[family].includes(csf)) {
      FAMILY_TO_CSF[family].push(csf);
    }
  }
}

// Your current mitigations-nist mappings file
const MITIGATIONS_NIST_PATH = path.join(__dirname, '../nav-app/src/app/control-framework/control-frameworks/mappings/mitigations-nist.ts');
const NIST_CSF_PATH = path.join(__dirname, '../nav-app/src/app/control-framework/control-frameworks/mappings/NIST.ts');

// Fetch JSON from URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Parse your mitigations-nist.ts file
function parseCurrentMappings() {
  const content = fs.readFileSync(MITIGATIONS_NIST_PATH, 'utf-8');
  // Extract the array from the TypeScript file
  const match = content.match(/export let mitigationNist = (\[[\s\S]*\]);?$/m);
  if (!match) {
    throw new Error('Could not parse mitigations-nist.ts');
  }
  return eval(match[1]);
}

// Parse NIST CSF file to get all valid subcategory IDs
function parseNistCsf() {
  // Hardcoded NIST CSF subcategories (since the file is too large for simple parsing)
  const csfSubcategories = {
    // Identify
    'ID.AM-1': 'Physical devices and systems within the organization are inventoried',
    'ID.AM-2': 'Software platforms and applications within the organization are inventoried',
    'ID.AM-3': 'Organizational communication and data flows are mapped',
    'ID.AM-4': 'External information systems are catalogued',
    'ID.AM-5': 'Resources (e.g., hardware, devices, data, time, personnel, and software) are prioritized',
    'ID.AM-6': 'Cybersecurity roles and responsibilities for the entire workforce and third-party stakeholders are established',
    'ID.BE-1': 'The organization\'s role in the supply chain is identified and communicated',
    'ID.BE-2': 'The organization\'s place in critical infrastructure is identified and communicated',
    'ID.BE-3': 'Priorities for organizational mission, objectives, and activities are established',
    'ID.BE-4': 'Dependencies and critical functions for delivery of critical services are established',
    'ID.BE-5': 'Resilience requirements are established for all operating states',
    'ID.GV-1': 'Organizational cybersecurity policy is established and communicated',
    'ID.GV-2': 'Cybersecurity roles and responsibilities are coordinated and aligned',
    'ID.GV-3': 'Legal and regulatory requirements are understood and managed',
    'ID.GV-4': 'Governance and risk management processes address cybersecurity risks',
    'ID.RA-1': 'Asset vulnerabilities are identified and documented',
    'ID.RA-2': 'Cyber threat intelligence is received from information sharing forums and sources',
    'ID.RA-3': 'Threats, both internal and external, are identified and documented',
    'ID.RA-4': 'Potential business impacts and likelihoods are identified',
    'ID.RA-5': 'Threats, vulnerabilities, likelihoods, and impacts are used to determine risk',
    'ID.RA-6': 'Risk responses are identified and prioritized',
    'ID.RM-1': 'Risk management processes are established, managed, and agreed to',
    'ID.RM-2': 'Organizational risk tolerance is determined and expressed',
    'ID.RM-3': 'The organization\'s determination of risk tolerance is informed by its role in critical infrastructure',
    'ID.SC-1': 'Cyber supply chain risk management processes are established',
    'ID.SC-2': 'Suppliers and third party partners are identified',
    'ID.SC-3': 'Contracts with suppliers and third-party partners reflect the organizational risk',
    'ID.SC-4': 'Suppliers and third-party partners are routinely assessed',
    'ID.SC-5': 'Response and recovery planning are conducted with suppliers and third-party providers',
    // Protect
    'PR.AC-1': 'Identities and credentials are issued, managed, verified, revoked, and audited',
    'PR.AC-2': 'Physical access to assets is managed and protected',
    'PR.AC-3': 'Remote access is managed',
    'PR.AC-4': 'Access permissions and authorizations are managed, incorporating the principles of least privilege and separation of duties',
    'PR.AC-5': 'Network integrity is protected',
    'PR.AC-6': 'Identities are proofed and bound to credentials and asserted in interactions',
    'PR.AC-7': 'Users, devices, and other assets are authenticated commensurate with the risk',
    'PR.AT-1': 'All users are informed and trained',
    'PR.AT-2': 'Privileged users understand their roles and responsibilities',
    'PR.AT-3': 'Third-party stakeholders understand their roles and responsibilities',
    'PR.AT-4': 'Senior executives understand their roles and responsibilities',
    'PR.AT-5': 'Physical and cybersecurity personnel understand their roles and responsibilities',
    'PR.DS-1': 'Data-at-rest is protected',
    'PR.DS-2': 'Data-in-transit is protected',
    'PR.DS-3': 'Assets are formally managed throughout removal, transfers, and disposition',
    'PR.DS-4': 'Adequate capacity to ensure availability is maintained',
    'PR.DS-5': 'Protections against data leaks are implemented',
    'PR.DS-6': 'Integrity checking mechanisms are used to verify software, firmware, and information integrity',
    'PR.DS-7': 'The development and testing environment(s) are separate from the production environment',
    'PR.DS-8': 'Integrity checking mechanisms are used to verify hardware integrity',
    'PR.IP-1': 'A baseline configuration of information technology/industrial control systems is created and maintained',
    'PR.IP-2': 'A System Development Life Cycle to manage systems is implemented',
    'PR.IP-3': 'Configuration change control processes are in place',
    'PR.IP-4': 'Backups of information are conducted, maintained, and tested',
    'PR.IP-5': 'Policy and regulations regarding the physical operating environment are met',
    'PR.IP-6': 'Data is destroyed according to policy',
    'PR.IP-7': 'Protection processes are improved',
    'PR.IP-8': 'Effectiveness of protection technologies is shared',
    'PR.IP-9': 'Response plans (Incident Response and Business Continuity) are in place',
    'PR.IP-10': 'Response and recovery plans are tested',
    'PR.IP-11': 'Cybersecurity is included in human resources practices',
    'PR.IP-12': 'A vulnerability management plan is developed and implemented',
    'PR.MA-1': 'Maintenance and repair of organizational assets is performed',
    'PR.MA-2': 'Remote maintenance of organizational assets is approved, logged, and performed',
    'PR.PT-1': 'Audit/log records are determined, documented, implemented, and reviewed',
    'PR.PT-2': 'Removable media is protected and its use restricted',
    'PR.PT-3': 'The principle of least functionality is incorporated',
    'PR.PT-4': 'Communications and control networks are protected',
    'PR.PT-5': 'Mechanisms are implemented to achieve resilience requirements',
    // Detect
    'DE.AE-1': 'A baseline of network operations and expected data flows is established',
    'DE.AE-2': 'Detected events are analyzed to understand attack targets and methods',
    'DE.AE-3': 'Event data are collected and correlated from multiple sources',
    'DE.AE-4': 'Impact of events is determined',
    'DE.AE-5': 'Incident alert thresholds are established',
    'DE.CM-1': 'The network is monitored to detect potential cybersecurity events',
    'DE.CM-2': 'The physical environment is monitored to detect potential cybersecurity events',
    'DE.CM-3': 'Personnel activity is monitored to detect potential cybersecurity events',
    'DE.CM-4': 'Malicious code is detected',
    'DE.CM-5': 'Unauthorized mobile code is detected',
    'DE.CM-6': 'External service provider activity is monitored',
    'DE.CM-7': 'Monitoring for unauthorized personnel, connections, devices, and software is performed',
    'DE.CM-8': 'Vulnerability scans are performed',
    'DE.DP-1': 'Roles and responsibilities for detection are well defined',
    'DE.DP-2': 'Detection activities comply with all applicable requirements',
    'DE.DP-3': 'Detection processes are tested',
    'DE.DP-4': 'Event detection information is communicated',
    'DE.DP-5': 'Detection processes are continuously improved',
    // Respond
    'RS.RP-1': 'Response plan is executed during or after an incident',
    'RS.CO-1': 'Personnel know their roles and order of operations when a response is needed',
    'RS.CO-2': 'Incidents are reported consistent with established criteria',
    'RS.CO-3': 'Information is shared consistent with response plans',
    'RS.CO-4': 'Coordination with stakeholders occurs consistent with response plans',
    'RS.CO-5': 'Voluntary information sharing occurs with external stakeholders',
    'RS.AN-1': 'Notifications from detection systems are investigated',
    'RS.AN-2': 'The impact of the incident is understood',
    'RS.AN-3': 'Forensics are performed',
    'RS.AN-4': 'Incidents are categorized consistent with response plans',
    'RS.AN-5': 'Processes are established to receive, analyze and respond to vulnerabilities',
    'RS.MI-1': 'Incidents are contained',
    'RS.MI-2': 'Incidents are mitigated',
    'RS.MI-3': 'Newly identified vulnerabilities are mitigated or documented',
    'RS.IM-1': 'Response plans incorporate lessons learned',
    'RS.IM-2': 'Response strategies are updated',
    // Recover
    'RC.RP-1': 'Recovery plan is executed during or after a cybersecurity incident',
    'RC.IM-1': 'Recovery plans incorporate lessons learned',
    'RC.IM-2': 'Recovery strategies are updated',
    'RC.CO-1': 'Public relations are managed',
    'RC.CO-2': 'Reputation is repaired after an incident',
    'RC.CO-3': 'Recovery activities are communicated to internal and external stakeholders'
  };
  return new Map(Object.entries(csfSubcategories));
}

// Get 800-53 family from control ID (e.g., "AC-2" -> "AC")
function getFamily(controlId) {
  const match = controlId.match(/^([A-Z]{2})-/);
  return match ? match[1] : null;
}

// Suggest CSF subcategories based on 800-53 controls
function suggestCsfFromControls(controlIds, validCsfIds) {
  const suggestions = new Set();
  const familyCounts = {};
  
  for (const controlId of controlIds) {
    const family = getFamily(controlId);
    if (family) {
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    }
  }
  
  // Get CSF categories that map to the most common families
  const sortedFamilies = Object.entries(familyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);  // Top 5 families
  
  for (const [family] of sortedFamilies) {
    const csfCategories = FAMILY_TO_CSF[family] || [];
    for (const csfCat of csfCategories) {
      // Find actual subcategory IDs that start with this category
      for (const [csfId] of validCsfIds) {
        if (csfId.startsWith(csfCat)) {
          suggestions.add(csfId);
        }
      }
    }
  }
  
  return Array.from(suggestions);
}

async function main() {
  console.log('🔄 Fetching CTID data from your fork...\n');
  
  // Fetch all CTID data
  const [controlsData, mappingsData, attackData, originalAttackData] = await Promise.all([
    fetchJson(URLS.controls),
    fetchJson(URLS.mappings),
    fetchJson(URLS.attackData),
    fetchJson(URLS.originalAttack)
  ]);
  
  console.log('📊 Parsing CTID data...');
  
  // Build technique ID map (STIX ID -> ATT&CK ID) from original ATT&CK
  const stixIdToAttackId = new Map();
  const attackIdToName = new Map();
  for (const obj of originalAttackData.objects) {
    if (obj.type === 'attack-pattern' && obj.external_references) {
      const ref = obj.external_references.find(r => r.source_name === 'mitre-attack');
      if (ref) {
        stixIdToAttackId.set(obj.id, ref.external_id);
        attackIdToName.set(ref.external_id, obj.name);
      }
    }
  }
  
  // Also add from CTID attack data (may have more techniques)
  for (const obj of attackData.objects) {
    if (obj.type === 'attack-pattern' && obj.external_references) {
      const ref = obj.external_references.find(r => r.source_name === 'mitre-attack');
      if (ref && !stixIdToAttackId.has(obj.id)) {
        stixIdToAttackId.set(obj.id, ref.external_id);
        attackIdToName.set(ref.external_id, obj.name);
      }
    }
  }
  
  // Build control map (STIX ID -> control ID)
  const stixIdToControl = new Map();
  const controlDescriptions = new Map();
  for (const obj of controlsData.objects) {
    if (obj.type === 'course-of-action' && obj.external_references) {
      const ref = obj.external_references.find(r => r.source_name === 'NIST 800-53 Revision 5');
      if (ref) {
        stixIdToControl.set(obj.id, ref.external_id);
        controlDescriptions.set(ref.external_id, obj.name || obj.description);
      }
    }
  }
  
  // Build technique -> controls map
  const techniqueToControls = new Map();
  for (const obj of mappingsData.objects) {
    if (obj.type === 'relationship' && obj.relationship_type === 'mitigates') {
      const controlStixId = obj.source_ref;
      const techniqueStixId = obj.target_ref;
      
      const controlId = stixIdToControl.get(controlStixId);
      const techniqueId = stixIdToAttackId.get(techniqueStixId);
      
      if (controlId && techniqueId) {
        if (!techniqueToControls.has(techniqueId)) {
          techniqueToControls.set(techniqueId, []);
        }
        if (!techniqueToControls.get(techniqueId).includes(controlId)) {
          techniqueToControls.get(techniqueId).push(controlId);
        }
      }
    }
  }
  
  // Build mitigation -> techniques map from original ATT&CK data
  const mitigationToTechniques = new Map();
  const mitigationNames = new Map();
  
  // First collect all mitigations
  for (const obj of originalAttackData.objects) {
    if (obj.type === 'course-of-action' && obj.external_references) {
      const ref = obj.external_references.find(r => r.source_name === 'mitre-attack');
      if (ref && ref.external_id.startsWith('M')) {
        mitigationNames.set(ref.external_id, obj.name);
      }
    }
  }
  
  // Build STIX ID to mitigation ID map
  const stixIdToMitigationId = new Map();
  for (const obj of originalAttackData.objects) {
    if (obj.type === 'course-of-action' && obj.external_references) {
      const ref = obj.external_references.find(r => r.source_name === 'mitre-attack');
      if (ref && ref.external_id.startsWith('M')) {
        stixIdToMitigationId.set(obj.id, ref.external_id);
      }
    }
  }
  
  // Find mitigation->technique relationships
  for (const obj of originalAttackData.objects) {
    if (obj.type === 'relationship' && obj.relationship_type === 'mitigates') {
      const sourceId = obj.source_ref;
      const targetId = obj.target_ref;
      
      const mitId = stixIdToMitigationId.get(sourceId);
      const techId = stixIdToAttackId.get(targetId);
      
      if (mitId && techId) {
        if (!mitigationToTechniques.has(mitId)) {
          mitigationToTechniques.set(mitId, []);
        }
        if (!mitigationToTechniques.get(mitId).includes(techId)) {
          mitigationToTechniques.get(mitId).push(techId);
        }
      }
    }
  }
  
  console.log(`   - ${stixIdToAttackId.size} techniques`);
  console.log(`   - ${stixIdToControl.size} controls`);
  console.log(`   - ${techniqueToControls.size} technique->control mappings`);
  console.log(`   - ${mitigationToTechniques.size} mitigation->technique mappings`);
  
  // Parse your current mappings
  console.log('\n📋 Loading your current mappings...');
  const currentMappings = parseCurrentMappings();
  const validCsfIds = parseNistCsf();
  console.log(`   - ${currentMappings.length} mitigations with CSF mappings`);
  console.log(`   - ${validCsfIds.size} valid CSF subcategories`);
  
  // Analyze each mitigation
  console.log('\n🔍 Analyzing mappings...\n');
  console.log('='.repeat(100));
  
  const results = [];
  let totalSuggestions = 0;
  
  for (const mapping of currentMappings) {
    const mitId = mapping.mitigation.attackId;
    const mitName = mitigationNames.get(mitId) || mapping.mitigation.description.substring(0, 50);
    const currentCsf = mapping.nist || [];
    
    // Get techniques this mitigation covers
    const techniques = mitigationToTechniques.get(mitId) || [];
    
    // Get all CTID-recommended controls for those techniques
    const ctidControls = new Set();
    for (const techId of techniques) {
      const controls = techniqueToControls.get(techId) || [];
      controls.forEach(c => ctidControls.add(c));
    }
    
    // Get unique 800-53 families from CTID recommendations
    const ctidFamilies = new Set();
    for (const ctrl of ctidControls) {
      const family = getFamily(ctrl);
      if (family) ctidFamilies.add(family);
    }
    
    // Current 800-53 families (derived from your CSF mappings)
    const yourFamilies = new Set();
    for (const csfId of currentCsf) {
      const csfCat = csfId.split('-')[0]; // e.g., "PR.AC" from "PR.AC-1"
      const mappedFamilies = CSF_TO_80053_FAMILIES[csfCat] || [];
      mappedFamilies.forEach(f => yourFamilies.add(f));
    }
    
    // Find gaps: families CTID recommends that you don't have
    const missingFamilies = [...ctidFamilies].filter(f => !yourFamilies.has(f));
    
    // Suggest specific CSF subcategories based on missing families
    const suggestedCsf = [];
    for (const family of missingFamilies) {
      const csfCategories = FAMILY_TO_CSF[family] || [];
      for (const csfCat of csfCategories) {
        for (const [csfId, csfDesc] of validCsfIds) {
          if (csfId.startsWith(csfCat) && !currentCsf.includes(csfId) && !suggestedCsf.find(s => s.id === csfId)) {
            suggestedCsf.push({ id: csfId, description: csfDesc, fromFamily: family });
          }
        }
      }
    }
    
    // Limit suggestions to most relevant (based on control frequency)
    const topSuggestions = suggestedCsf.slice(0, 5);
    
    if (topSuggestions.length > 0 || missingFamilies.length > 0) {
      results.push({
        mitId,
        mitName,
        techniques: techniques.length,
        ctidControls: ctidControls.size,
        currentCsf,
        missingFamilies,
        suggestions: topSuggestions
      });
      totalSuggestions += topSuggestions.length;
    }
  }
  
  // Sort by number of suggestions (most gaps first)
  results.sort((a, b) => b.suggestions.length - a.suggestions.length);
  
  // Output results
  console.log(`\n📊 REVIEW SUMMARY: ${results.length} mitigations with potential gaps\n`);
  console.log('='.repeat(100));
  
  for (const r of results) {
    console.log(`\n${r.mitId} - ${r.mitName}`);
    console.log(`   Techniques covered: ${r.techniques} | CTID controls: ${r.ctidControls}`);
    console.log(`   Your CSF: ${r.currentCsf.join(', ') || '(none)'}`);
    if (r.missingFamilies.length > 0) {
      console.log(`   ⚠️  Missing 800-53 families: ${r.missingFamilies.join(', ')}`);
    }
    if (r.suggestions.length > 0) {
      console.log(`   💡 Suggested CSF additions:`);
      for (const s of r.suggestions) {
        console.log(`      + ${s.id}: ${s.description.substring(0, 70)}...`);
      }
    }
  }
  
  // Generate updated mappings file
  console.log('\n' + '='.repeat(100));
  console.log('\n🔧 Generating updated mappings...\n');
  
  const updatedMappings = currentMappings.map(mapping => {
    const result = results.find(r => r.mitId === mapping.mitigation.attackId);
    if (result && result.suggestions.length > 0) {
      // Add suggested CSF mappings
      const newNist = [...mapping.nist];
      for (const s of result.suggestions) {
        if (!newNist.includes(s.id)) {
          newNist.push(s.id);
        }
      }
      return {
        ...mapping,
        nist: newNist
      };
    }
    return mapping;
  });
  
  // Write updated file
  const outputContent = `export let mitigationNist = ${JSON.stringify(updatedMappings, null, 2)};
`;
  
  const outputPath = path.join(__dirname, '../nav-app/src/app/control-framework/control-frameworks/mappings/mitigations-nist-updated.ts');
  fs.writeFileSync(outputPath, outputContent);
  
  console.log(`✅ Updated mappings written to: mitigations-nist-updated.ts`);
  console.log(`   Total suggestions added: ${totalSuggestions}`);
  console.log(`\n📝 Review the file and rename to mitigations-nist.ts when ready.`);
  
  // Also output a summary CSV
  const csvLines = ['Mitigation ID,Mitigation Name,Current CSF Count,Suggestions,Missing Families'];
  for (const r of results) {
    csvLines.push(`"${r.mitId}","${r.mitName}",${r.currentCsf.length},"${r.suggestions.map(s => s.id).join('; ')}","${r.missingFamilies.join('; ')}"`);
  }
  const csvPath = path.join(__dirname, 'ctid-review-results.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`📊 Summary CSV written to: scripts/ctid-review-results.csv`);
}

main().catch(console.error);
