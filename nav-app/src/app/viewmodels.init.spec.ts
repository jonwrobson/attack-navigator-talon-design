import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './services/data.service';
import { ViewModelsService } from './services/viewmodels.service';
import { ViewModel } from './classes';

describe('ViewModel initialization and static score', () => {
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

  it('initTechniqueVMs populates techniqueVMs and static scoring sets binary gradient', () => {
    const bundle = [{
      objects: [
        { type: 'attack-pattern', id: 'attack-pattern--x', name: 'X',
          external_references: [{ source_name: 'mitre-attack', external_id: 'T1111' }],
          kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'persistence' }] },
        { type: 'x-mitre-tactic', id: 'x-mitre-tactic--P', x_mitre_shortname: 'persistence', name: 'Persistence',
          external_references: [{ source_name: 'mitre-attack', external_id: 'TA0003' }] },
        { type: 'x-mitre-matrix', id: 'x-mitre-matrix--ENT', name: 'Enterprise', tactic_refs: ['x-mitre-tactic--P'],
          external_references: [{ source_name: 'mitre-attack', external_id: 'enterprise-matrix' }] }
      ]
    }];
    data.setUpURLs([{ name: 'ATT&CK v12', version: '12', domains: [{ name: 'Test', identifier: 'test', data: [] }] }] as any);
    const domain = data.getDomain('test-12')!;
    data.parseBundle(domain, bundle as any);

    const vm = vms.newViewModel('VM', domain.id);
    // Force construction and verify that tvms are present
    vm.initTechniqueVMs();
    (expect(vm.techniqueVMs.size > 0) as any).toBeTruthy();

    const vars = new Map<string, any>([['x', vm]]);
    const out = vms.layerLayerOperation(domain.id, 'true', vars as any, null as any, null as any, null as any, null as any, null as any, null as any, 'static', null as any, null as any);
    // static boolean -> binary 1 across techniques, expect transparentblue preset when min=0,max=1 not triggered because static true sets all to 1
    (expect(out.initializeScoresTo) as any).toBe('1');
    // Ensure gradient exists and has colors array
    (expect(out.gradient.colors.length > 0) as any).toBeTruthy();
  });
});
