/**
 * Models for parsing MITRE CTID Attack Control Framework Mappings STIX data
 * Source: https://github.com/jonwrobson/attack-control-framework-mappings
 */

/** STIX 2.0 Course of Action representing a NIST 800-53 control */
export interface StixControl {
  type: 'course-of-action';
  id: string;
  name: string;
  description: string;
  external_references: {
    source_name: string;
    external_id: string;  // e.g., "AC-1", "SC-7"
  }[];
  x_mitre_family?: string;
  x_mitre_priority?: string;
  x_mitre_impact?: string[];
}

/** STIX 2.0 Relationship mapping control to technique */
export interface StixMapping {
  type: 'relationship';
  id: string;
  relationship_type: 'mitigates';
  source_ref: string;  // Control STIX ID
  target_ref: string;  // Technique STIX ID
  description?: string;
}

/** STIX Bundle containing controls or mappings */
export interface StixBundle {
  type: 'bundle';
  id: string;
  spec_version: string;
  objects: (StixControl | StixMapping | any)[];
}

/** Parsed NIST 800-53 Control with technique mappings */
export interface Nist80053Control {
  controlId: string;        // e.g., "AC-1"
  name: string;
  description: string;
  family: string;           // e.g., "Access Control"
  priority?: string;
  impact?: string[];
  stixId: string;
  techniqueIds: string[];   // ATT&CK technique IDs this control mitigates
}

/** Validation comparison result */
export interface MappingValidationResult {
  mitigationId: string;
  mitigationName: string;
  mitigationDescription: string;
  
  // Your curated mappings (NIST CSF subcategories)
  yourNistCsfMappings: string[];
  
  // CTID mappings: techniques this mitigation addresses → controls for those techniques
  ctidTechniques: {
    techniqueId: string;
    techniqueName: string;
    ctidControls: string[];  // NIST 800-53 control IDs
  }[];
  
  // Derived: 800-53 controls from your CSF mappings
  your80053Controls: string[];
  
  // Overlap analysis
  matchingControls: string[];       // In both your mappings and CTID
  missingFromYours: string[];       // In CTID but not in your mappings
  uniqueToYours: string[];          // In your mappings but not in CTID
  
  // Validation status
  status: 'validated' | 'needs-review' | 'gap' | 'pending';
  coveragePercent: number;
  notes?: string;
}

/** Summary statistics for validation */
export interface ValidationSummary {
  totalMitigations: number;
  validated: number;
  needsReview: number;
  gaps: number;
  pending: number;
  averageCoverage: number;
  lastUpdated: Date;
  ctidVersion: string;
  attackVersion: string;
}
