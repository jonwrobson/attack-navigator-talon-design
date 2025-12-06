import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  StixBundle, 
  StixControl, 
  StixMapping, 
  Nist80053Control,
  MappingValidationResult,
  ValidationSummary 
} from './ctid-stix.models';
import { ControlFramework } from '../control-framework';
import { DataService } from '../../services/data.service';

/** STIX Attack Pattern (technique) for resolving IDs */
interface StixAttackPattern {
  type: 'attack-pattern';
  id: string;
  name: string;
  external_references: { source_name: string; external_id: string; }[];
}

/**
 * Service to fetch and parse MITRE CTID Attack Control Framework Mappings
 * from your GitHub fork for validation against your curated mappings.
 */
@Injectable({
  providedIn: 'root'
})
export class CtidValidationService {
  
  // Your fork's raw GitHub URLs
  private readonly BASE_URL = 'https://raw.githubusercontent.com/jonwrobson/attack-control-framework-mappings/main';
  private readonly ATTACK_VERSION = 'attack_12_1';
  private readonly FRAMEWORK = 'nist800_53_r5';
  
  private controlsUrl = `${this.BASE_URL}/frameworks/${this.ATTACK_VERSION}/${this.FRAMEWORK}/stix/nist800-53-r5-controls.json`;
  private mappingsUrl = `${this.BASE_URL}/frameworks/${this.ATTACK_VERSION}/${this.FRAMEWORK}/stix/nist800-53-r5-mappings.json`;
  // Enterprise ATT&CK bundle with mitigations substituted - contains technique definitions
  private attackDataUrl = `${this.BASE_URL}/frameworks/${this.ATTACK_VERSION}/${this.FRAMEWORK}/stix/nist800-53-r5-enterprise-attack.json`;
  
  // Cached data
  private controls: Map<string, Nist80053Control> = new Map();
  private controlsByStixId: Map<string, Nist80053Control> = new Map();
  private techniqueToControls: Map<string, string[]> = new Map();  // ATT&CK ID -> control IDs
  private stixIdToAttackId: Map<string, string> = new Map();  // STIX ID -> ATT&CK ID
  private isLoaded = false;
  private lastFetchTime: Date | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Fetch and parse CTID data from your fork
   */
  loadCtidData(): Observable<boolean> {
    if (this.isLoaded) {
      return of(true);
    }

    return forkJoin({
      controls: this.http.get<StixBundle>(this.controlsUrl),
      mappings: this.http.get<StixBundle>(this.mappingsUrl),
      attackData: this.http.get<StixBundle>(this.attackDataUrl)
    }).pipe(
      tap(({ controls, mappings, attackData }) => {
        this.parseAttackData(attackData);  // Parse techniques first to build ID map
        this.parseControls(controls);
        this.parseMappings(mappings);
        this.isLoaded = true;
        this.lastFetchTime = new Date();
        console.log(`CTID data loaded: ${this.controls.size} controls, ${this.techniqueToControls.size} technique mappings`);
      }),
      map(() => true),
      catchError(error => {
        console.error('Failed to load CTID data:', error);
        return of(false);
      })
    );
  }

  /**
   * Force refresh data from your fork
   */
  refreshData(): Observable<boolean> {
    this.isLoaded = false;
    this.controls.clear();
    this.controlsByStixId.clear();
    this.techniqueToControls.clear();
    this.stixIdToAttackId.clear();
    return this.loadCtidData();
  }

  /**
   * Get NIST 800-53 controls that mitigate a specific technique
   */
  getControlsForTechnique(techniqueId: string): Nist80053Control[] {
    const controlIds = this.techniqueToControls.get(techniqueId) || [];
    return controlIds.map(id => this.controls.get(id)).filter(c => c !== undefined);
  }

  /**
   * Get all control IDs that mitigate a technique
   */
  getControlIdsForTechnique(techniqueId: string): string[] {
    return this.techniqueToControls.get(techniqueId) || [];
  }

  /**
   * Get a specific control by ID
   */
  getControl(controlId: string): Nist80053Control | undefined {
    return this.controls.get(controlId);
  }

  /**
   * Get all controls
   */
  getAllControls(): Nist80053Control[] {
    return Array.from(this.controls.values());
  }

  /**
   * Validate your curated mappings against CTID data
   */
  validateMappings(
    controlFramework: ControlFramework,
    dataService: DataService,
    domainVersionID: string
  ): Observable<MappingValidationResult[]> {
    return this.loadCtidData().pipe(
      map(() => {
        const domain = dataService.getDomain(domainVersionID);
        const results: MappingValidationResult[] = [];

        // Get your mitigation→NIST mappings
        const yourMappings = controlFramework.mitigationNist;

        for (const mapping of yourMappings) {
          const mitigation = domain.mitigations.find(m => m.attackID === mapping.mitigation.attackId);
          if (!mitigation) continue;

          // Get techniques this mitigation addresses
          const techniqueIds = mitigation.mitigated(domainVersionID);
          
          // Get CTID's 800-53 controls for those techniques
          const ctidTechniques = techniqueIds.map(techId => {
            const technique = domain.techniques.find(t => t.id === techId);
            return {
              techniqueId: technique?.attackID || techId,
              techniqueName: technique?.name || 'Unknown',
              ctidControls: this.getControlIdsForTechnique(technique?.attackID || '')
            };
          }).filter(t => t.ctidControls.length > 0);

          // Get all unique CTID controls for this mitigation's techniques
          const allCtidControls = [...new Set(
            ctidTechniques.flatMap(t => t.ctidControls)
          )];

          // Get 800-53 controls from your NIST CSF mappings
          const your80053Controls = this.get80053FromCsfMappings(
            mapping.nist, 
            controlFramework
          );

          // Calculate overlap
          const matchingControls = your80053Controls.filter(c => allCtidControls.includes(c));
          const missingFromYours = allCtidControls.filter(c => !your80053Controls.includes(c));
          const uniqueToYours = your80053Controls.filter(c => !allCtidControls.includes(c));

          // Determine status
          let status: MappingValidationResult['status'];
          let coveragePercent = 0;

          if (allCtidControls.length === 0) {
            status = 'pending';  // No CTID data to compare
          } else {
            coveragePercent = (matchingControls.length / allCtidControls.length) * 100;
            if (coveragePercent >= 80) {
              status = 'validated';
            } else if (coveragePercent >= 50) {
              status = 'needs-review';
            } else {
              status = 'gap';
            }
          }

          results.push({
            mitigationId: mapping.mitigation.attackId,
            mitigationName: mitigation.name,
            mitigationDescription: mapping.mitigation.description,
            yourNistCsfMappings: mapping.nist,
            ctidTechniques,
            your80053Controls,
            matchingControls,
            missingFromYours,
            uniqueToYours,
            status,
            coveragePercent: Math.round(coveragePercent)
          });
        }

        return results.sort((a, b) => a.coveragePercent - b.coveragePercent);
      })
    );
  }

  /**
   * Get validation summary statistics
   */
  getValidationSummary(results: MappingValidationResult[]): ValidationSummary {
    const validated = results.filter(r => r.status === 'validated').length;
    const needsReview = results.filter(r => r.status === 'needs-review').length;
    const gaps = results.filter(r => r.status === 'gap').length;
    const pending = results.filter(r => r.status === 'pending').length;
    
    const avgCoverage = results.length > 0
      ? results.reduce((sum, r) => sum + r.coveragePercent, 0) / results.length
      : 0;

    return {
      totalMitigations: results.length,
      validated,
      needsReview,
      gaps,
      pending,
      averageCoverage: Math.round(avgCoverage),
      lastUpdated: this.lastFetchTime || new Date(),
      ctidVersion: '1.0',
      attackVersion: '12.1'
    };
  }

  /**
   * Extract NIST 800-53 control IDs from NIST CSF subcategory mappings
   */
  private get80053FromCsfMappings(csfSubcategories: string[], controlFramework: ControlFramework): string[] {
    const controls: string[] = [];
    
    for (const csfId of csfSubcategories) {
      const nistItem = controlFramework.getNistItemByNistSubCatId(csfId);
      if (nistItem?.mappings?.['NIST SP 800-53 Rev. 4']) {
        const mappedControls = nistItem.mappings['NIST SP 800-53 Rev. 4'];
        if (Array.isArray(mappedControls)) {
          controls.push(...mappedControls);
        } else if (typeof mappedControls === 'string') {
          controls.push(mappedControls);
        }
      }
    }
    
    return [...new Set(controls)];
  }

  /**
   * Parse STIX controls bundle
   */
  private parseControls(bundle: StixBundle): void {
    for (const obj of bundle.objects) {
      if (obj.type === 'course-of-action' && obj.external_references?.length > 0) {
        const control = obj as StixControl;
        const externalId = control.external_references[0].external_id;
        
        const parsed: Nist80053Control = {
          controlId: externalId,
          name: control.name,
          description: control.description,
          family: control.x_mitre_family || this.deriveFamilyFromId(externalId),
          priority: control.x_mitre_priority,
          impact: control.x_mitre_impact,
          stixId: control.id,
          techniqueIds: []
        };
        
        this.controls.set(externalId, parsed);
        this.controlsByStixId.set(control.id, parsed);
      }
    }
  }

  /**
   * Parse STIX mappings bundle - now uses ATT&CK IDs
   */
  private parseMappings(bundle: StixBundle): void {
    for (const obj of bundle.objects) {
      if (obj.type === 'relationship' && obj.relationship_type === 'mitigates') {
        const mapping = obj as StixMapping;
        
        // source_ref is the control, target_ref is the technique
        const control = this.controlsByStixId.get(mapping.source_ref);
        if (!control) continue;

        // Resolve STIX ID to ATT&CK ID
        const techniqueStixId = mapping.target_ref;
        const attackId = this.stixIdToAttackId.get(techniqueStixId);
        
        if (!attackId) {
          // Skip if we can't resolve the technique
          continue;
        }
        
        // Store mapping by ATT&CK ID
        if (!this.techniqueToControls.has(attackId)) {
          this.techniqueToControls.set(attackId, []);
        }
        this.techniqueToControls.get(attackId)!.push(control.controlId);
        control.techniqueIds.push(attackId);
      }
    }
  }

  /**
   * Parse ATT&CK data to build STIX ID → ATT&CK ID mapping
   */
  private parseAttackData(bundle: StixBundle): void {
    for (const obj of bundle.objects) {
      if (obj.type === 'attack-pattern' && obj.external_references?.length > 0) {
        const technique = obj as StixAttackPattern;
        const attackRef = technique.external_references.find(
          ref => ref.source_name === 'mitre-attack'
        );
        if (attackRef) {
          this.stixIdToAttackId.set(technique.id, attackRef.external_id);
        }
      }
    }
    console.log(`Parsed ${this.stixIdToAttackId.size} technique ID mappings`);
  }

  /**
   * Derive control family from control ID
   */
  private deriveFamilyFromId(controlId: string): string {
    const familyMap: { [key: string]: string } = {
      'AC': 'Access Control',
      'AT': 'Awareness and Training',
      'AU': 'Audit and Accountability',
      'CA': 'Assessment, Authorization, and Monitoring',
      'CM': 'Configuration Management',
      'CP': 'Contingency Planning',
      'IA': 'Identification and Authentication',
      'IR': 'Incident Response',
      'MA': 'Maintenance',
      'MP': 'Media Protection',
      'PE': 'Physical and Environmental Protection',
      'PL': 'Planning',
      'PM': 'Program Management',
      'PS': 'Personnel Security',
      'PT': 'PII Processing and Transparency',
      'RA': 'Risk Assessment',
      'SA': 'System and Services Acquisition',
      'SC': 'System and Communications Protection',
      'SI': 'System and Information Integrity',
      'SR': 'Supply Chain Risk Management'
    };
    
    const prefix = controlId.match(/^([A-Z]+)/)?.[1] || '';
    return familyMap[prefix] || 'Unknown';
  }

  /**
   * Get data load status
   */
  get loaded(): boolean {
    return this.isLoaded;
  }

  get lastFetch(): Date | null {
    return this.lastFetchTime;
  }
}
