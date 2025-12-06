import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './services/data.service';

describe('ATT&CK model objects', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService]
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
    // Flush config
    httpMock.expectOne('./assets/config.json').flush({ versions: [] });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should wire relationships and class helpers', () => {
    const objs = [
      // Techniques A, B
      { type: 'attack-pattern', id: 'attack-pattern--a', name: 'A',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T5000', url: 'u' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }] },
      { type: 'attack-pattern', id: 'attack-pattern--b', name: 'B',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T5001', url: 'u' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }] },
      // Tactic/Matrix
      { type: 'x-mitre-tactic', id: 'x-mitre-tactic--E', name: 'Execution',
        x_mitre_shortname: 'execution', external_references: [{ source_name: 'mitre-attack', external_id: 'TA0002' }] },
      { type: 'x-mitre-matrix', id: 'x-mitre-matrix--ENT', name: 'Enterprise', tactic_refs: ['x-mitre-tactic--E'],
        external_references: [{ source_name: 'mitre-attack', external_id: 'enterprise-matrix' }] },
      // Mitigation
      { type: 'course-of-action', id: 'course-of-action--M1', name: 'Mit 1',
        external_references: [{ source_name: 'mitre-attack', external_id: 'M1000' }] },
      // Relationships
      { type: 'relationship', relationship_type: 'mitigates', id: 'rel--1', source_ref: 'course-of-action--M1', target_ref: 'attack-pattern--a' },
      // Group and uses
      { type: 'intrusion-set', id: 'intrusion-set--G1', name: 'G1', external_references: [{ source_name: 'mitre-attack', external_id: 'G1001' }] },
      { type: 'relationship', relationship_type: 'uses', id: 'rel--2', source_ref: 'intrusion-set--G1', target_ref: 'attack-pattern--a' },
      // Software and uses
      { type: 'malware', id: 'malware--S1', name: 'S1', external_references: [{ source_name: 'mitre-attack', external_id: 'S1001' }], x_mitre_platforms: ['Windows'] },
      { type: 'relationship', relationship_type: 'uses', id: 'rel--3', source_ref: 'malware--S1', target_ref: 'attack-pattern--b' },
      // Campaign and uses
      { type: 'campaign', id: 'campaign--C1', name: 'C1', external_references: [{ source_name: 'mitre-attack', external_id: 'C1001' }] },
      { type: 'relationship', relationship_type: 'attributed-to', id: 'rel--4', source_ref: 'campaign--C1', target_ref: 'intrusion-set--G1' },
      { type: 'relationship', relationship_type: 'uses', id: 'rel--5', source_ref: 'campaign--C1', target_ref: 'attack-pattern--b' },
      // Data source/component and detects
      { type: 'x-mitre-data-source', id: 'x-mitre-data-source--DS1', name: 'DS1', external_references: [{ url: 'https://example.com' }] },
      { type: 'x-mitre-data-component', id: 'x-mitre-data-component--DC1', name: 'DC1', x_mitre_data_source_ref: 'x-mitre-data-source--DS1' },
      { type: 'relationship', relationship_type: 'detects', id: 'rel--6', source_ref: 'x-mitre-data-component--DC1', target_ref: 'attack-pattern--a' },
      // Note
      { type: 'note', id: 'note--1', content: 'n', object_refs: ['attack-pattern--a'] }
    ];

    const versions: any[] = [{ name: 'ATT&CK v12', version: '12', domains: [{ name: 'Test', identifier: 'test', data: [] }] }];
    service.setUpURLs(versions as any);
    const domain = service.getDomain('test-12')!;
    service.parseBundle(domain, [{ objects: objs }] as any);

    // Tactic and technique ids
    const tactic = domain.tactics.find(t => t.shortname === 'execution');
    (expect(!!tactic) as any).toBeTrue();
    const techA = domain.techniques.find(t => t.attackID === 'T5000')!;
    const techB = domain.techniques.find(t => t.attackID === 'T5001')!;
    (expect(techA.get_all_technique_tactic_ids().length) as any).toBe(1);
  ((expect(techA.get_technique_tactic_id('execution')) as any).toContain('T5000^'));

    // Mitigation relations
    const mit = domain.mitigations[0];
  ((expect(mit.mitigated(domain.id)) as any).toContain('attack-pattern--a'));

    // Software relations
    const sw = domain.software[0];
  ((expect(sw.used(domain.id)) as any).toContain('attack-pattern--b'));

    // Group relations incl. campaignsUsed
    const grp = domain.groups[0];
  ((expect(grp.used(domain.id)) as any).toContain('attack-pattern--a'));
  ((expect(grp.campaignsUsed(domain.id)) as any).toContain('attack-pattern--b'));

    // Data component
    const dc = domain.dataComponents[0];
    const src = dc.source(domain.id);
    (expect(src.name) as any).toBe('DS1');
    (expect(dc.techniques(domain.id).length) as any).toBe(1);
  });
});
