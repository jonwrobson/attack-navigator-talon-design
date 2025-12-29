import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AttackChainViewerComponent } from './attack-chain-viewer.component';
import { AttackChainService, TechniqueChains, AttackChain } from '../services/attack-chain.service';
import { ViewModel } from '../classes/view-model';
import { of, BehaviorSubject } from 'rxjs';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttackChainTreeComponent } from '../attack-chain-tree/attack-chain-tree.component';

describe('AttackChainViewerComponent', () => {
    let component: AttackChainViewerComponent;
    let fixture: ComponentFixture<AttackChainViewerComponent>;
    let mockChainService: jasmine.SpyObj<AttackChainService>;
    let mockViewModel: ViewModel;

    const mockTechniqueChains: TechniqueChains = {
        id: 'T1078',
        name: 'Valid Accounts',
        tactic: 'defense-evasion',
        chains: [
            {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [
                    { id: 'C0001', name: 'Campaign1' },
                    { id: 'C0002', name: 'Campaign2' }
                ],
                campaignCount: 2,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            },
            {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [{ id: 'C0003', name: 'Campaign3' }],
                campaignCount: 1,
                path: [
                    { id: 'T1189', name: 'Drive-by Compromise', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 },
                    { id: 'T1021', name: 'Remote Services', tactic: 'lateral-movement', tacticOrder: 8 }
                ]
            },
            {
                group: { id: 'G0016', name: 'APT29' },
                campaigns: [{ id: 'C0004', name: 'Campaign4' }],
                campaignCount: 1,
                path: [
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            }
        ]
    };

    beforeEach(async () => {
        mockChainService = jasmine.createSpyObj('AttackChainService', ['getChains', 'loadIndex']);
        mockChainService.getChains.and.returnValue(of(mockTechniqueChains));
        mockChainService.loadIndex.and.returnValue(of({ 
            generated: '2024-01-01', 
            attackVersion: '14.0', 
            techniqueCount: 1,
            techniques: [{ id: 'T1078', name: 'Valid Accounts', chainCount: 3, fileSize: 1024 }]
        }));

        mockViewModel = new ViewModel(null, null, null, null);

        await TestBed.configureTestingModule({
            declarations: [AttackChainViewerComponent, AttackChainTreeComponent],
            imports: [FormsModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
            providers: [
                { provide: AttackChainService, useValue: mockChainService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AttackChainViewerComponent);
        component = fixture.componentInstance;
        component.viewModel = mockViewModel;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Loading chains', () => {
        it('should load chains when techniqueId input changes', fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();

            expect(mockChainService.getChains).toHaveBeenCalledWith('T1078');
            expect(component.techniqueChains).toEqual(mockTechniqueChains);
            expect(component.loading).toBe(false);
        }));

        it('should display loading spinner while fetching', () => {
            const loadingSubject = new BehaviorSubject<TechniqueChains | null>(null);
            mockChainService.getChains.and.returnValue(loadingSubject.asObservable());

            component.techniqueId = 'T1078';
            component.ngOnInit();
            fixture.detectChanges();

            expect(component.loading).toBe(true);
            const spinner = fixture.debugElement.query(By.css('mat-spinner'));
            expect(spinner).toBeTruthy();

            loadingSubject.next(mockTechniqueChains);
            fixture.detectChanges();
            expect(component.loading).toBe(false);
        });

        it('should show "No chains" message when technique has no chains', fakeAsync(() => {
            mockChainService.getChains.and.returnValue(of(null));

            component.techniqueId = 'T9999';
            component.ngOnInit();
            tick();
            fixture.detectChanges();

            expect(component.techniqueChains).toBeNull();
            const noChainMsg = fixture.nativeElement.querySelector('.no-chains-message');
            expect(noChainMsg).toBeTruthy();
            expect(noChainMsg.textContent).toContain('No attack chains found');
        }));
    });

    describe('Display statistics', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should display correct chain count and group count', () => {
            const summary = fixture.nativeElement.querySelector('.chain-summary');
            expect(summary).toBeTruthy();
            expect(summary.textContent).toContain('3 chains');
            expect(summary.textContent).toContain('2 groups');
        });
    });

    describe('Filtering chains', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should filter chains by group name', fakeAsync(() => {
            const filterInput = fixture.nativeElement.querySelector('input[placeholder*="Filter"]');
            expect(filterInput).toBeTruthy();

            component.groupFilter = 'APT29';
            component.applyFilter();
            fixture.detectChanges();

            expect(component.filteredGroups.length).toBe(1);
            expect(component.filteredGroups[0].groupName).toBe('APT29');
        }));

        it('should debounce filter input', fakeAsync(() => {
            spyOn(component, 'applyFilter');
            
            component.groupFilter = 'APT';
            component.onFilterChange();
            
            expect(component.applyFilter).not.toHaveBeenCalled();
            
            tick(300);
            
            expect(component.applyFilter).toHaveBeenCalled();
        }));
    });

    describe('Node selection', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should track selected nodes across all chain trees', () => {
            component.onNodeSelected(['T1566', 'T1078'], 0, 0);
            
            expect(component.selectedNodes.has('T1566')).toBe(true);
            expect(component.selectedNodes.has('T1078')).toBe(true);
            expect(component.selectedNodes.size).toBe(2);
        });

        it('should enable "Apply Scores" button when nodes selected', () => {
            component.onNodeSelected(['T1566'], 0, 0);
            fixture.detectChanges();

            const applyBtn = fixture.nativeElement.querySelector('button[class*="apply-scores"]');
            expect(applyBtn).toBeTruthy();
            expect(applyBtn.disabled).toBe(false);
        });

        it('should disable "Apply Scores" button when no nodes selected', () => {
            component.selectedNodes.clear();
            fixture.detectChanges();

            const applyBtn = fixture.nativeElement.querySelector('button[class*="apply-scores"]');
            expect(applyBtn).toBeTruthy();
            expect(applyBtn.disabled).toBe(true);
        });
    });

    describe('Applying scores', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should emit scoresApplied with +1 for each selected technique', () => {
            spyOn(component.scoresApplied, 'emit');
            
            component.onNodeSelected(['T1566', 'T1078', 'T1021'], 0, 0);
            component.applyScores();

            expect(component.scoresApplied.emit).toHaveBeenCalled();
            const emittedScores = (component.scoresApplied.emit as jasmine.Spy).calls.mostRecent().args[0];
            expect(emittedScores.get('T1566')).toBe(1);
            expect(emittedScores.get('T1078')).toBe(1);
            expect(emittedScores.get('T1021')).toBe(1);
        });

        it('should clear selection after applying scores', () => {
            component.onNodeSelected(['T1566'], 0, 0);
            expect(component.selectedNodes.size).toBe(1);

            component.applyScores();

            expect(component.selectedNodes.size).toBe(0);
        });
    });

    describe('Close functionality', () => {
        it('should emit close when X clicked', () => {
            spyOn(component.close, 'emit');
            
            component.onClose();
            
            expect(component.close.emit).toHaveBeenCalled();
        });
    });

    describe('Collapse/expand functionality', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should collapse/expand chain trees on header click', () => {
            const groupIndex = 0;
            expect(component.filteredGroups[groupIndex].collapsed).toBe(false);

            component.toggleGroupCollapse(groupIndex);
            expect(component.filteredGroups[groupIndex].collapsed).toBe(true);

            component.toggleGroupCollapse(groupIndex);
            expect(component.filteredGroups[groupIndex].collapsed).toBe(false);
        });
    });

    describe('Score passing', () => {
        beforeEach(fakeAsync(() => {
            component.techniqueId = 'T1078';
            component.ngOnInit();
            tick();
            fixture.detectChanges();
        }));

        it('should pass current scores to child tree components', () => {
            const mockScores = new Map<string, number>();
            mockScores.set('T1078', 5);
            mockScores.set('T1566', 3);
            component.viewModel.techniqueVMs.set('T1078', { score: 5 } as any);
            component.viewModel.techniqueVMs.set('T1566', { score: 3 } as any);

            const scores = component.getCurrentScores();
            expect(scores.get('T1078')).toBe(5);
            expect(scores.get('T1566')).toBe(3);
        });
    });
});
