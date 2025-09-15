import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService, Technique, Tactic, Matrix, Domain } from './data.service';
import { ViewModelsService, ViewModel } from './viewmodels.service';

function buildBundle() {
  // Two techniques under execution; one subtechnique under T8000
  const execShort = 'execution';
  const t1 = { type: 'attack-pattern', id: 'attack-pattern--t1', name: 'Alpha',
    external_references: [{ source_name: 'mitre-attack', external_id: 'T8000' }],
    x_mitre_platforms: ['Windows', 'Linux'],
    kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: execShort }] };
  const t2 = { type: 'attack-pattern', id: 'attack-pattern--t2', name: 'Bravo',
    external_references: [{ source_name: 'mitre-attack', external_id: 'T8001' }],
    x_mitre_platforms: ['macOS'],
    kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: execShort }] };
  const s1 = { type: 'attack-pattern', id: 'attack-pattern--s1', name: 'Alpha.001',
    external_references: [{ source_name: 'mitre-attack', external_id: 'T8000.001' }],
    x_mitre_platforms: ['Windows'],
    x_mitre_is_subtechnique: true,
    kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: execShort }] };
  const rel = { type: 'relationship', relationship_type: 'subtechnique-of', source_ref: 'attack-pattern--s1', target_ref: 'attack-pattern--t1' };
  const tactic = { type: 'x-mitre-tactic', id: 'x-mitre-tactic--E', x_mitre_shortname: execShort, name: 'Execution',
    external_references: [{ source_name: 'mitre-attack', external_id: 'TA0002' }] };
  const matrixEnterprise = { type: 'x-mitre-matrix', id: 'x-mitre-matrix--ENT', name: 'Enterprise', tactic_refs: ['x-mitre-tactic--E'],
    external_references: [{ source_name: 'mitre-attack', external_id: 'enterprise-matrix' }] };
  const matrixPre = { type: 'x-mitre-matrix', id: 'x-mitre-matrix--PRE', name: 'PRE-ATT&CK', tactic_refs: ['x-mitre-tactic--E'],
    external_references: [{ source_name: 'mitre-attack', external_id: 'pre-attack-matrix' }] };
  return [{ objects: [t1, t2, s1, rel, tactic, matrixEnterprise, matrixPre] }];
}

describe('ViewModelsService controls and aggregation', () => {
  let data: DataService;
  let vms: ViewModelsService;
  let httpMock: HttpTestingController;
  let domain: Domain;
  let vm: ViewModel;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService, ViewModelsService]
    });
    data = TestBed.inject(DataService);
    vms = TestBed.inject(ViewModelsService);
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('./assets/config.json').flush({ versions: [] });

    data.setUpURLs([{ name: 'ATT&CK v12', version: '12', domains: [{ name: 'Test', identifier: 'test', data: [] }] }] as any);
    domain = data.getDomain('test-12')!;
    data.parseBundle(domain, buildBundle() as any);
    vm = vms.newViewModel('controls', domain.id);
    vm.initTechniqueVMs();
    // initialize platform options and selection
    vm.filters.initPlatformOptions(domain);
  });

  afterEach(() => httpMock.verify());

  function getMatrixByName(name: string): Matrix { return domain.matrices.find(m => m.name === name); }
  function getTacticFrom(matrix: Matrix): Tactic { return matrix.tactics[0]; }
  function getTechnique(attackID: string): Technique { return domain.techniques.find(t => t.attackID === attackID); }

  it('filterTechniques filters by platforms but not for PRE-ATT&CK', () => {
    // Restrict platforms to Windows only
    vm.filters.platforms.selection = ['Windows'];
    const ent = getMatrixByName('Enterprise');
    const pre = getMatrixByName('PRE-ATT&CK');
    const tactic = getTacticFrom(ent);

    const filteredEnt = vm.filterTechniques(tactic.techniques, tactic, ent);
    const idsEnt = filteredEnt.map(t => t.attackID);
    (expect(idsEnt.includes('T8000')) as any).toBeTrue(); // Alpha passes
    (expect(idsEnt.includes('T8001')) as any).toBeFalse(); // Bravo filtered out

    const tacticPre = getTacticFrom(pre);
    const filteredPre = vm.filterTechniques(tacticPre.techniques, tacticPre, pre);
    const idsPre = filteredPre.map(t => t.attackID);
    // PRE-ATT&CK bypass: both present regardless of platforms
    (expect(idsPre.includes('T8000') && idsPre.includes('T8001')) as any).toBeTrue();
  });

  it('isSubtechniqueEnabled returns true when a subtechnique is enabled and matches platform', () => {
    vm.filters.platforms.selection = ['Windows'];
    const ent = getMatrixByName('Enterprise');
    const tactic = getTacticFrom(ent);
    const tAlpha = getTechnique('T8000');
    const sAlpha = domain.subtechniques.find(s => s.attackID.startsWith('T8000.'));

    // Disable parent
    vm.getTechniqueVM(tAlpha, tactic).enabled = false;
    // Enable subtechnique
    vm.getTechniqueVM(sAlpha, tactic).enabled = true;

    (expect(vm.isSubtechniqueEnabled(tAlpha, vm.getTechniqueVM(tAlpha, tactic), tactic)) as any).toBeTrue();

    // Now filter out Windows, use macOS only: should become false
    vm.filters.platforms.selection = ['macOS'];
    (expect(vm.isSubtechniqueEnabled(tAlpha, vm.getTechniqueVM(tAlpha, tactic), tactic)) as any).toBeFalse();
  });

  it('sortTechniques respects modes 0-3 and numeric tie-breakers', () => {
    const ent = getMatrixByName('Enterprise');
    const tactic = getTacticFrom(ent);
    const tAlpha = getTechnique('T8000');
    const tBravo = getTechnique('T8001');

    // Set scores
    vm.getTechniqueVM(tAlpha, tactic).score = '2';
    vm.getTechniqueVM(tBravo, tactic).score = '8';

    vm.sorting = 0; // A-Z
    let sorted = vm.sortTechniques([tBravo, tAlpha], tactic);
    (expect(sorted[0].name) as any).toBe('Alpha');

    vm.sorting = 1; // Z-A
    sorted = vm.sortTechniques([tAlpha, tBravo], tactic);
    (expect(sorted[0].name) as any).toBe('Bravo');

    vm.sorting = 2; // 1-2 numeric
    sorted = vm.sortTechniques([tBravo, tAlpha], tactic);
    (expect(sorted[0].attackID) as any).toBe('T8000'); // 2 before 8

    vm.sorting = 3; // 2-1 numeric desc
    // Make equal scores to test name tie-breaker
    vm.getTechniqueVM(tAlpha, tactic).score = '5';
    vm.getTechniqueVM(tBravo, tactic).score = '5';
    sorted = vm.sortTechniques([tBravo, tAlpha], tactic);
    (expect(sorted[0].name) as any).toBe('Alpha');
  });

  it('calculateAggregateScore covers average/min/max/sum and countUnscored toggle', () => {
    const ent = getMatrixByName('Enterprise');
    const tactic = getTacticFrom(ent);
    const tAlpha = getTechnique('T8000');
    const sAlpha = domain.subtechniques.find(s => s.attackID.startsWith('T8000.'));

    const tvmP = vm.getTechniqueVM(tAlpha, tactic);
    const tvmS = vm.getTechniqueVM(sAlpha, tactic);
    tvmP.score = '8';
    tvmS.score = '2';

    // average (default), countUnscored false
    vm.layout.aggregateFunction = 'average';
    vm.layout.countUnscored = false;
    let avg = vm.calculateAggregateScore(tAlpha, tactic);
    (expect(avg) as any).toBe(5);
    (expect(tvmP.aggregateScoreColor) as any).toBeDefined();

  // average with countUnscored true: divide by (subtechniques.length + 1) = 2 -> 10/2 = 5
    vm.layout.countUnscored = true;
    avg = vm.calculateAggregateScore(tAlpha, tactic);
  (expect(avg) as any).toBe(5);

    // min
    vm.layout.aggregateFunction = 'min';
    let min = vm.calculateAggregateScore(tAlpha, tactic);
    (expect(min) as any).toBe(2);

    // max
    vm.layout.aggregateFunction = 'max';
    let max = vm.calculateAggregateScore(tAlpha, tactic);
    (expect(max) as any).toBe(8);

    // sum
    vm.layout.aggregateFunction = 'sum';
    let sum = vm.calculateAggregateScore(tAlpha, tactic);
    (expect(sum) as any).toBe(10);
  });
});
