import { ContextMenuItem, Link, ViewModel } from "src/app/classes";
import { ContextmenuComponent } from "./contextmenu.component";
import { ConfigService } from "src/app/services/config.service";
import { ViewModelsService } from "src/app/services/viewmodels.service";
import { AttackChainService } from "src/app/services/attack-chain.service";
import { ElementRef } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Tactic, Technique } from "src/app/classes/stix";
import { of } from "rxjs";

class MockTechniqueVM {
	technique_tactic_union_id = 'mock-id';
	links = [{url: 'https://example.com'}] as Link[];
}

class MockViewModel extends ViewModel {
	clearSelectedTechniques = jasmine.createSpy('clearSelectedTechniques');
	selectTechnique = jasmine.createSpy('selectTechnique');
	unselectTechnique = jasmine.createSpy('unselectTechnique');
	selectAllTechniques = jasmine.createSpy('selectAllTechniques');
	invertSelection = jasmine.createSpy('invertSelection');
	selectAnnotated = jasmine.createSpy('selectAnnotated');
	selectUnannotated = jasmine.createSpy('selectUnannotated');
	selectAllTechniquesInTactic = jasmine.createSpy('selectAllTechniquesInTactic');
	unselectAllTechniquesInTactic = jasmine.createSpy('unselectAllTechniquesInTactic');
	getTechniqueVM = jasmine.createSpy('getTechniqueVM').and.returnValue(new MockTechniqueVM());
}

class MockViewModelsService {
	pinnedCell = '';
}

class MockAttackChainService {
	loadIndex = jasmine.createSpy('loadIndex').and.returnValue(of({ techniques: [] }));
	hasChains = jasmine.createSpy('hasChains').and.returnValue(false);
}

describe('ContextmenuComponent', () => {
	let component: ContextmenuComponent;
	let fixture: ComponentFixture<ContextmenuComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ContextmenuComponent],
			providers: [
				{provide: ConfigService, useValue: {}},
				{provide: ViewModelsService, useClass: MockViewModelsService},
				{provide: AttackChainService, useClass: MockAttackChainService},
				{provide: ElementRef, useValue: {nativeElement: {}}}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(ContextmenuComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('ngOnInit', () => {
		it('should initialize placement with getPosition', () => {
			spyOn(component, 'getPosition').and.returnValue('top-right');
			component.technique = { attackID: 'T1078' } as Technique;
			component.ngOnInit();
			expect(component.placement).toBe('top-right');
		});

		it('should load attack chain index and cache hasChains result', () => {
			spyOn(component, 'getPosition').and.returnValue('top-right');
			component.technique = { attackID: 'T1078' } as Technique;
			component.attackChainService.hasChains = jasmine.createSpy('hasChains').and.returnValue(true);
			
			component.ngOnInit();
			
			expect(component.attackChainService.loadIndex).toHaveBeenCalled();
			expect(component.hasAttackChains()).toBe(true);
		});
	});

	describe('ngOnDestroy', () => {
		it('should complete destroy subject', () => {
			const destroySpy = jasmine.createSpy('destroy');
			component['destroy$'].subscribe({complete: destroySpy});
			component.ngOnDestroy();
			expect(destroySpy).toHaveBeenCalled();
		});
	});

	describe('get techniqueVM', () => {
		it('should return techniqueVM from viewModel', () => {
			const mockTechnique = {} as Technique;
			const mockTactic  = {} as Tactic;
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			component.technique = mockTechnique;
			component.tactic = mockTactic;
			const result = component.techniqueVM;
			expect(component.viewModel.getTechniqueVM).toHaveBeenCalledWith(mockTechnique, mockTactic);
			expect(result).toBeTruthy();
		});
	});

	describe('closeContextmenu', () => {
		it('should emit close event', () => {
			spyOn(component.close, 'emit');
			component.closeContextmenu();
			expect(component.close.emit).toHaveBeenCalled();
		});
	});

	describe('selection functionality', () => {
		const mockTechnique = {} as Technique;
		const mockTactic = {} as Tactic;

		beforeEach(() => {
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			component.technique = mockTechnique;
			component.tactic = mockTactic;
			spyOn(component, 'closeContextmenu');
		});

		it('should select technique and close context menu', () => {
			component.select();
			expect(component.viewModel.clearSelectedTechniques).toHaveBeenCalled();
			expect(component.viewModel.selectTechnique).toHaveBeenCalledWith(mockTechnique, mockTactic);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should add selection and close context menu', () => {
			component.addSelection();
			expect(component.viewModel.selectTechnique).toHaveBeenCalledWith(mockTechnique, mockTactic);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should remove selection and close context menu', () => {
			component.removeSelection();
			expect(component.viewModel.unselectTechnique).toHaveBeenCalledWith(mockTechnique, mockTactic);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should deselect all techniques and close context menu', () => {
			component.deselectAll();
			expect(component.viewModel.clearSelectedTechniques).toHaveBeenCalled();
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should invert selection and close context menu', () => {
			component.invertSelection();
			expect(component.viewModel.invertSelection).toHaveBeenCalled();
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should select annotated items and close context menu', () => {
			component.selectAnnotated();
			expect(component.viewModel.selectAnnotated).toHaveBeenCalled();
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should select unannotated items and close context menu', () => {
			component.selectUnannotated();
			expect(component.viewModel.selectUnannotated).toHaveBeenCalled();
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should select all tecniques in tactic and close context menu', () => {
			component.selectAllInTactic();
			expect(component.viewModel.selectAllTechniquesInTactic).toHaveBeenCalledWith(mockTactic);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should deselect all techniques in tactic and close context menu', () => {
			component.deselectAllInTactic();
			expect(component.viewModel.unselectAllTechniquesInTactic).toHaveBeenCalledWith(mockTactic);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});
	});

	describe('open links', () => {
		beforeEach(() => {
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			spyOn(component, 'closeContextmenu');
			spyOn(window, 'open');
		});

		it('should open technique URL in new tab and close context menu', () => {
			const mockTechnique = { url: 'https://technique-url.com' } as Technique;
			component.technique = mockTechnique;
			component.viewTechnique();
			expect(window.open).toHaveBeenCalledWith(mockTechnique.url, '_blank');
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should open tactic URL in new tab and close context menu', () => {
			const mockTactic = { url: 'https://tactic-url.com' } as Tactic;
			component.tactic = mockTactic;
			component.viewTactic();
			expect(window.open).toHaveBeenCalledWith(mockTactic.url, '_blank');
			expect(component.closeContextmenu).toHaveBeenCalled();
		});

		it('should open link URL and close context menu', () => {
			const mockLink = { url: 'https://link-url.com' } as Link;
			component.openLink(mockLink);
			expect(window.open).toHaveBeenCalledWith(mockLink.url);
			expect(component.closeContextmenu).toHaveBeenCalled();
		});
	});

	describe('pinCell', () => {
		it('should toggle pinnedCell and close context menu', () => {
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			spyOn(component, 'closeContextmenu');
			const mockTechniqueVM = new MockTechniqueVM();
			component.viewModelsService = new MockViewModelsService() as ViewModelsService;
			component.pinCell();
			expect(component.viewModelsService.pinnedCell).toBe(mockTechniqueVM.technique_tactic_union_id);
			component.pinCell();
			expect(component.viewModelsService.pinnedCell).toBe('');
			expect(component.closeContextmenu).toHaveBeenCalled();
		});
	});

	describe('openCustomContextMenuItem' , () => {
		it('should open custom context menu link and close context menu', () => {
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			spyOn(component, 'closeContextmenu');
			spyOn(window, 'open');
			const customURL = 'https://custom-url.com';
			const mockCustomItem = new ContextMenuItem('label', customURL);
			spyOn(mockCustomItem, 'getReplacedURL').and.returnValue(customURL)
			component.openCustomContextMenuItem(mockCustomItem);
			expect(window.open).toHaveBeenCalledWith(customURL, '_blank');
			expect(component.closeContextmenu).toHaveBeenCalled();
		});
	});

	describe('attack chains', () => {
		beforeEach(() => {
			component.viewModel = new MockViewModel('name', 'uid', 'enterprise-attack-13', null);
			spyOn(component, 'closeContextmenu');
		});

		it('should return cached hasChains result', () => {
			const mockTechnique = { attackID: 'T1078' } as Technique;
			component.technique = mockTechnique;
			component.attackChainService.hasChains = jasmine.createSpy('hasChains').and.returnValue(true);
			
			// Initialize to cache the value
			component.ngOnInit();
			
			// Should return cached value without calling service again
			component.attackChainService.hasChains = jasmine.createSpy('hasChains').and.returnValue(false);
			const result = component.hasAttackChains();
			
			expect(result).toBe(true); // Returns cached value
		});

		it('should return false when index not yet loaded', () => {
			const mockTechnique = { attackID: 'T1078' } as Technique;
			component.technique = mockTechnique;
			
			// Don't call ngOnInit to simulate index not loaded
			const result = component.hasAttackChains();
			
			expect(result).toBe(false);
		});

		it('should emit openAttackChainViewer event with technique ID and close context menu', () => {
			const mockTechnique = { attackID: 'T1078' } as Technique;
			component.technique = mockTechnique;
			spyOn(component.openAttackChainViewer, 'emit');
			
			component.viewAttackChains();
			
			expect(component.openAttackChainViewer.emit).toHaveBeenCalledWith('T1078');
			expect(component.closeContextmenu).toHaveBeenCalled();
		});
	});
})