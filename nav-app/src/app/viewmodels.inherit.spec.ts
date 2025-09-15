import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './data.service';
import { ViewModelsService } from './viewmodels.service';

describe('ViewModelsService inheritance in layer ops', () => {
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

  it('inherits fields, filters, legendItems, and gradient', () => {
    const objs = [
      { type: 'attack-pattern', id: 'attack-pattern--a', name: 'A',
        external_references: [{ source_name: 'mitre-attack', external_id: 'T7000' }],
        kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'impact' }] },
      { type: 'x-mitre-tactic', id: 'x-mitre-tactic--I', x_mitre_shortname: 'impact', name: 'Impact',
        external_references: [{ source_name: 'mitre-attack', external_id: 'TA0040' }] },
      { type: 'x-mitre-matrix', id: 'x-mitre-matrix--ENT', name: 'Enterprise', tactic_refs: ['x-mitre-tactic--I'],
        external_references: [{ source_name: 'mitre-attack', external_id: 'enterprise-matrix' }] }
    ];
    data.setUpURLs([{ name: 'ATT&CK v12', version: '12', domains: [{ name: 'Test', identifier: 'test', data: [] }] }] as any);
    const domain = data.getDomain('test-12')!;
    data.parseBundle(domain, [{ objects: objs }] as any);

    const base = vms.newViewModel('base', domain.id);
    const id = 'T7000^impact';
    // populate base fields
    (base as any).techniqueVMs.set(id, { technique_tactic_union_id: id, score: '1', comment: 'c', links: [{ label: 'l', url: 'u' }], metadata: [{ name: 'm', value: 'v' }], color: '#fff', enabled: false });
  base.filters.platforms.selection = ['Windows'];
    base.legendItems = [{ color: '#000', label: 'low' }];
    base.gradient.setGradientPreset('greenred');

    const result = vms.layerLayerOperation(domain.id, '', new Map(), base, base, base, base, base, base, 'inherited', base, base);
    const tvm = (result as any).techniqueVMs.get(id);
    (expect(tvm.comment) as any).toBe('c');
    (expect(tvm.links[0].label) as any).toBe('l');
    (expect(tvm.metadata[0].name) as any).toBe('m');
    (expect(tvm.color) as any).toBe('#fff');
    (expect(tvm.enabled) as any).toBe(false);
  // filters cloned
  (expect(result.filters.platforms.selection[0]) as any).toBe('Windows');
    // legend cloned
    (expect(result.legendItems.length) as any).toBe(1);
    // gradient cloned
    (expect(result.gradient.colors.length) as any).toBe(base.gradient.colors.length);
  });
});
