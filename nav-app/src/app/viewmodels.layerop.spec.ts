import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './services/data.service';
import { ViewModelsService } from './services/viewmodels.service';
import { ViewModel } from './classes';

describe('ViewModelsService.layerLayerOperation', () => {
  let data: DataService;
  let vms: ViewModelsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService, ViewModelsService]
    });
    data = TestBed.inject(DataService);
    vms = TestBed.inject(ViewModelsService);
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('./assets/config.json').flush({ versions: [] });
  });

  afterEach(() => httpMock.verify());

  it('combines scores across VMs and updates gradient', () => {
    // Seed domain with two techniques under same tactic
    const objs = [
      { type: 'attack-pattern', id: 'attack-pattern--a', name: 'A',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T9000' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }] },
      { type: 'attack-pattern', id: 'attack-pattern--b', name: 'B',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T9001' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'execution' }] },
      { type: 'x-mitre-tactic', id: 'x-mitre-tactic--E', x_mitre_shortname: 'execution', name: 'Execution',
        external_references: [{ source_name: 'mitre-attack', external_id: 'TA0002' }] },
      { type: 'x-mitre-matrix', id: 'x-mitre-matrix--ENT', name: 'Enterprise', tactic_refs: ['x-mitre-tactic--E'],
        external_references: [{ source_name: 'mitre-attack', external_id: 'enterprise-matrix' }] }
    ];
    data.setUpURLs([{ name: 'ATT&CK v12', version: '12', domains: [{ name: 'Test', identifier: 'test', data: [] }] }] as any);
    const domain = data.getDomain('test-12')!;
    data.parseBundle(domain, [{ objects: objs }] as any);

    const vmA = vms.newViewModel('A', domain.id);
    const vmB = vms.newViewModel('B', domain.id);
    const id1 = 'T9000^execution';
    const id2 = 'T9001^execution';
    // Manually seed techniqueVMs
    (vmA as any).techniqueVMs.set(id1, { technique_tactic_union_id: id1, score: '1' });
    (vmA as any).techniqueVMs.set(id2, { technique_tactic_union_id: id2, score: '2' });
    (vmB as any).techniqueVMs.set(id1, { technique_tactic_union_id: id1, score: '1' });
    // vmB missing id2 to exercise misses logic

    const vars = new Map<string, ViewModel>([['a', vmA], ['b', vmB]]);
  const result = vms.layerLayerOperation(domain.id, 'a + b', vars, null as any, null as any, null as any, null as any, null as any, null as any, 'combined', null as any, null as any);
    // Expect per-technique scores: id1 => 2, id2 => 2 (since b is missing -> 0)
    const r1 = (result as any).techniqueVMs.get(id1);
    const r2 = (result as any).techniqueVMs.get(id2);
    (expect(r1.score) as any).toBe('2');
    (expect(r2.score) as any).toBe('2');
    // With identical min/max, gradient should not be binary preset, but min/max should be set when range exists
    // Now change vmB to provide a different second value to get a range
    (vmB as any).techniqueVMs.set(id2, { technique_tactic_union_id: id2, score: '10' });
  const result2 = vms.layerLayerOperation(domain.id, 'a + b', vars, null as any, null as any, null as any, null as any, null as any, null as any, 'combined2', null as any, null as any);
  (expect(result2.gradient.minValue <= result2.gradient.maxValue) as any).toBeTruthy();
  });
});
