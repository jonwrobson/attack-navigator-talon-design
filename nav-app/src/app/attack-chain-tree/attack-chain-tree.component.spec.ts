import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttackChainTreeComponent } from './attack-chain-tree.component';
import { AttackChain } from '../services/attack-chain.service';

describe('AttackChainTreeComponent', () => {
    let component: AttackChainTreeComponent;
    let fixture: ComponentFixture<AttackChainTreeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AttackChainTreeComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(AttackChainTreeComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Tree Rendering', () => {
        it('should render tree with correct number of nodes', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [{ id: 'C0001', name: 'Campaign1' }],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            const svg = fixture.nativeElement.querySelector('svg');
            expect(svg).toBeTruthy();
            
            const nodes = fixture.nativeElement.querySelectorAll('.tree-node');
            expect(nodes.length).toBe(2);
        });

        it('should display technique ID and name on each node', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            const nodeText = fixture.nativeElement.querySelector('.node-id');
            expect(nodeText?.textContent).toContain('T1566');
            
            const nodeName = fixture.nativeElement.querySelector('.node-name');
            expect(nodeName?.textContent).toContain('Phishing');
        });

        it('should show score badge when score exists', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            const scores = new Map<string, number>();
            scores.set('T1566', 3);
            
            component.chain = mockChain;
            component.scores = scores;
            fixture.detectChanges();

            const badge = fixture.nativeElement.querySelector('.score-badge');
            expect(badge).toBeTruthy();
            
            const scoreText = fixture.nativeElement.querySelector('.score-text');
            expect(scoreText?.textContent).toContain('3');
        });

        it('should hide score badge when no score', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            const scores = new Map<string, number>();
            
            component.chain = mockChain;
            component.scores = scores;
            fixture.detectChanges();

            const badge = fixture.nativeElement.querySelector('.score-badge');
            expect(badge).toBeFalsy();
        });
    });

    describe('Node Selection', () => {
        it('should highlight selected technique node', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1, selected: true },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            const selectedNode = fixture.nativeElement.querySelector('.tree-node.selected');
            expect(selectedNode).toBeTruthy();
        });

        it('should fade non-selected nodes', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1, selected: true },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5, selected: false }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            const fadedNodes = fixture.nativeElement.querySelectorAll('.tree-node.faded');
            expect(fadedNodes.length).toBeGreaterThan(0);
        });

        it('should emit nodeSelected when node clicked', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            spyOn(component.nodeSelected, 'emit');
            
            const node = fixture.nativeElement.querySelector('.tree-node');
            node?.click();

            expect(component.nodeSelected.emit).toHaveBeenCalled();
        });
    });

    describe('Edge Interactions', () => {
        it('should display campaign count on edges', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [{ id: 'C0001', name: 'Campaign1' }, { id: 'C0002', name: 'Campaign2' }],
                campaignCount: 2,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            const edgeLabel = fixture.nativeElement.querySelector('.edge-label');
            expect(edgeLabel).toBeTruthy();
            expect(edgeLabel?.textContent).toContain('2');
        });

        it('should emit campaignClicked when edge clicked', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [{ id: 'C0001', name: 'Campaign1' }],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            };
            component.chain = mockChain;
            fixture.detectChanges();

            spyOn(component.campaignClicked, 'emit');
            
            const edge = fixture.nativeElement.querySelector('.tree-edge');
            edge?.click();

            expect(component.campaignClicked.emit).toHaveBeenCalled();
        });
    });

    describe('Input Changes', () => {
        it('should handle empty chain gracefully', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 0,
                path: []
            };
            component.chain = mockChain;
            
            expect(() => fixture.detectChanges()).not.toThrow();
        });

        it('should update when @Input chain changes', () => {
            const mockChain1: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            component.chain = mockChain1;
            fixture.detectChanges();

            let nodes = fixture.nativeElement.querySelectorAll('.tree-node');
            expect(nodes.length).toBe(1);

            const mockChain2: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 },
                    { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion', tacticOrder: 5 }
                ]
            };
            component.chain = mockChain2;
            fixture.detectChanges();

            nodes = fixture.nativeElement.querySelectorAll('.tree-node');
            expect(nodes.length).toBe(2);
        });

        it('should update badges when @Input scores changes', () => {
            const mockChain: AttackChain = {
                group: { id: 'G0007', name: 'APT28' },
                campaigns: [],
                campaignCount: 1,
                path: [
                    { id: 'T1566', name: 'Phishing', tactic: 'initial-access', tacticOrder: 1 }
                ]
            };
            component.chain = mockChain;
            component.scores = new Map<string, number>();
            fixture.detectChanges();

            let badge = fixture.nativeElement.querySelector('.score-badge');
            expect(badge).toBeFalsy();

            const scores = new Map<string, number>();
            scores.set('T1566', 5);
            component.scores = scores;
            fixture.detectChanges();

            badge = fixture.nativeElement.querySelector('.score-badge');
            expect(badge).toBeTruthy();
            
            const scoreText = fixture.nativeElement.querySelector('.score-text');
            expect(scoreText?.textContent).toContain('5');
        });
    });
});
