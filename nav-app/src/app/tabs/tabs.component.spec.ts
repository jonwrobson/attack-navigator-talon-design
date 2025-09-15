import { TabsComponent } from './tabs.component';
import { ViewModel } from '../viewmodels.service';

class FakeDialog {
  calls: any[] = [];
  open(component: any, settings?: any) {
    this.calls.push({ component, settings });
    return { close: () => {} } as any;
  }
}

class FakeViewModelsService {
  viewModels: any[] = [];
  newViewModel(name: string, domainVersionID: string) {
    const vm: any = { name, domainVersionID, loadVMData: () => { vm._loaded = true; } };
    this.viewModels.push(vm);
    return vm as ViewModel;
  }
  destroyViewModel(vm: any) {
    const i = this.viewModels.indexOf(vm);
    if (i >= 0) this.viewModels.splice(i, 1);
  }
}

class FakeConfigService {
  banner = 'banner';
  getFeatureList() { return ['export', 'help']; }
  getFeature(name: string) { return name === 'export'; }
}

class FakeDataService {
  domains: any[] = [{ id: 'test-12', dataLoaded: false }];
  loadDomainDataCalled = false;
  getConfig() { return { subscribe: (o: any) => { o.next({ default_layers: { enabled: false } }); o.complete && o.complete(); return { unsubscribe: () => {} }; } }; }
  getDomain(id: string) { return this.domains.find(d => d.id === id); }
  loadDomainData(id: string) { this.loadDomainDataCalled = true; return Promise.resolve(); }
}

describe('TabsComponent (logic only)', () => {
  let dialog: FakeDialog;
  let vms: FakeViewModelsService;
  let ds: FakeDataService;
  let cfg: FakeConfigService;
  let comp: TabsComponent;

  beforeEach(() => {
    dialog = new FakeDialog();
    vms = new FakeViewModelsService();
    ds = new FakeDataService();
    cfg = new FakeConfigService();
    comp = new TabsComponent(dialog as any, vms as any, ds as any, null as any, cfg as any);
  });

  it('getUniqueLayerName increments correctly', () => {
    vms.viewModels.push({ name: 'layer' }, { name: 'layer1' }, { name: 'layer2' }, { name: 'layer10' });
    const next = comp.getUniqueLayerName('layer');
    (expect(next) as any).toBe('layer11');
  });

  it('newBlankTab opens a new tab and selects it', () => {
    comp.newBlankTab();
    (expect(comp.layerTabs.length) as any).toBe(1);
    (expect(comp.getActiveTab().title) as any).toBe('new tab');
  });

  it('openTab selects existing tab when not forced', () => {
    comp.layerTabs = [{ title: 'foo', isCloseable: true, active: false, domainVersionID: '', dataTable: false, dataContext: {} } as any];
    comp.openTab('foo', null, false, true, false, false);
    (expect(comp.getActiveTab().title) as any).toBe('foo');
    (expect(comp.layerTabs.length) as any).toBe(1);
  });

  it('openTab replace closes active and inserts new tab', () => {
    const t1: any = { title: 'one', dataContext: {} };
    const t2: any = { title: 'two', dataContext: {} };
    comp.layerTabs = [t1, t2];
    comp.selectTab(t1);
    comp.openTab('three', { domainVersionID: 'test-12' }, true, true, true, false);
    (expect(comp.layerTabs.length) as any).toBe(2); // active removed, then new inserted at same index
    (expect(comp.getActiveTab().title) as any).toBe('three');
  });

  it('closeTab selects appropriate next tab or opens new blank when none', () => {
    const a: any = { title: 'a', dataContext: {} };
    const b: any = { title: 'b', dataContext: {} };
    comp.layerTabs = [a, b];
    comp.selectTab(a);
    comp.closeTab(a);
    (expect(comp.getActiveTab().title) as any).toBe('b'); // selects first remaining tab after removal

    // now only one tab -> closing opens a new blank tab
    comp.layerTabs = [{ title: 'solo', dataContext: {} } as any];
    comp.selectTab(comp.layerTabs[0]);
    comp.closeTab(comp.layerTabs[0]);
    (expect(comp.layerTabs.length) as any).toBe(1);
    (expect(comp.getActiveTab().title) as any).toBe('new tab');
  });

  it('indexToChar and charToIndex map only data tabs', () => {
    comp.layerTabs = [
      { title: 'blank', dataContext: null } as any,
      { title: 'vm1', dataContext: {} } as any,
      { title: 'vm2', dataContext: {} } as any,
    ];
    (expect(comp.indexToChar(0)) as any).toBe('a');
    (expect(comp.indexToChar(1)) as any).toBe('a');
    (expect(comp.indexToChar(2)) as any).toBe('b');
    (expect(comp.charToIndex('a')) as any).toBe(1);
    (expect(comp.charToIndex('b')) as any).toBe(2);
  });

  it('hasFeature proxies to config service and dialogs open', () => {
    (expect(comp.hasFeature('export')) as any).toBeTrue();
    comp.openDialog('help');
    comp.openDialog('changelog');
    (expect(dialog.calls.length) as any).toBe(2);
  });
});
 
