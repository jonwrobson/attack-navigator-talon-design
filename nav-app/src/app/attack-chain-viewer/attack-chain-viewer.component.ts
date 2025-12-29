import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { AttackChainService, TechniqueChains, AttackChain } from '../services/attack-chain.service';
import { ViewModel } from '../classes/view-model';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/**
 * Group of chains for display
 */
interface ChainGroup {
    groupId: string;
    groupName: string;
    chains: AttackChain[];
    collapsed: boolean;
}

/**
 * Container component that displays multiple attack chains for a selected technique
 * with group filtering and scoring controls.
 */
@Component({
    selector: 'app-attack-chain-viewer',
    templateUrl: './attack-chain-viewer.component.html',
    styleUrls: ['./attack-chain-viewer.component.scss']
})
export class AttackChainViewerComponent implements OnInit, OnDestroy {
    @Input() techniqueId: string;
    @Input() viewModel: ViewModel;
    @Output() scoresApplied = new EventEmitter<Map<string, number>>();
    @Output() close = new EventEmitter<void>();

    techniqueChains: TechniqueChains | null = null;
    loading = false;
    groupFilter = '';
    filteredGroups: ChainGroup[] = [];
    selectedNodes = new Set<string>();
    
    private filterSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(private chainService: AttackChainService) {}

    ngOnInit(): void {
        // Load chains when component initializes
        this.loadChains();

        // Setup debounced filter
        this.filterSubject
            .pipe(
                debounceTime(300),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.applyFilter();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load chains for the current technique
     */
    private loadChains(): void {
        if (!this.techniqueId) {
            return;
        }

        this.loading = true;
        this.chainService.getChains(this.techniqueId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(chains => {
                this.techniqueChains = chains;
                this.loading = false;
                this.groupChains();
                this.applyFilter();
            });
    }

    /**
     * Group chains by threat group
     */
    private groupChains(): void {
        if (!this.techniqueChains || !this.techniqueChains.chains) {
            this.filteredGroups = [];
            return;
        }

        const groupMap = new Map<string, AttackChain[]>();
        
        for (const chain of this.techniqueChains.chains) {
            const groupId = chain.group.id;
            if (!groupMap.has(groupId)) {
                groupMap.set(groupId, []);
            }
            groupMap.get(groupId)!.push(chain);
        }

        this.filteredGroups = Array.from(groupMap.entries()).map(([groupId, chains]) => ({
            groupId,
            groupName: chains[0].group.name,
            chains,
            collapsed: false
        }));
    }

    /**
     * Apply filter to groups
     */
    applyFilter(): void {
        if (!this.techniqueChains || !this.techniqueChains.chains) {
            this.filteredGroups = [];
            return;
        }

        const filterLower = this.groupFilter.toLowerCase().trim();
        
        if (!filterLower) {
            this.groupChains();
            return;
        }

        const groupMap = new Map<string, AttackChain[]>();
        
        for (const chain of this.techniqueChains.chains) {
            const groupName = chain.group.name.toLowerCase();
            if (groupName.includes(filterLower)) {
                const groupId = chain.group.id;
                if (!groupMap.has(groupId)) {
                    groupMap.set(groupId, []);
                }
                groupMap.get(groupId)!.push(chain);
            }
        }

        this.filteredGroups = Array.from(groupMap.entries()).map(([groupId, chains]) => ({
            groupId,
            groupName: chains[0].group.name,
            chains,
            collapsed: false
        }));
    }

    /**
     * Handle filter input change
     */
    onFilterChange(): void {
        this.filterSubject.next(this.groupFilter);
    }

    /**
     * Handle node selection from child tree component
     */
    onNodeSelected(selectedIds: string[], groupIndex: number, chainIndex: number): void {
        // Update the chain with selected nodes
        if (this.filteredGroups[groupIndex] && this.filteredGroups[groupIndex].chains[chainIndex]) {
            const chain = this.filteredGroups[groupIndex].chains[chainIndex];
            
            // Update path with selection state
            chain.path = chain.path.map(node => ({
                ...node,
                selected: selectedIds.includes(node.id)
            }));

            // Update global selected nodes set
            this.selectedNodes.clear();
            for (const group of this.filteredGroups) {
                for (const chain of group.chains) {
                    for (const node of chain.path) {
                        if (node.selected) {
                            this.selectedNodes.add(node.id);
                        }
                    }
                }
            }
        }
    }

    /**
     * Apply scores to selected techniques
     */
    applyScores(): void {
        const scores = new Map<string, number>();
        
        // Add +1 score for each selected technique
        for (const techniqueId of this.selectedNodes) {
            scores.set(techniqueId, 1);
        }

        this.scoresApplied.emit(scores);
        
        // Clear selection
        this.selectedNodes.clear();
        
        // Clear selected state from all chains
        for (const group of this.filteredGroups) {
            for (const chain of group.chains) {
                chain.path = chain.path.map(node => ({
                    ...node,
                    selected: false
                }));
            }
        }
    }

    /**
     * Toggle group collapse state
     */
    toggleGroupCollapse(groupIndex: number): void {
        if (this.filteredGroups[groupIndex]) {
            this.filteredGroups[groupIndex].collapsed = !this.filteredGroups[groupIndex].collapsed;
        }
    }

    /**
     * Close the viewer
     */
    onClose(): void {
        this.close.emit();
    }

    /**
     * Get current scores from view model
     */
    getCurrentScores(): Map<string, number> {
        const scores = new Map<string, number>();
        
        if (this.viewModel && this.viewModel.techniqueVMs) {
            for (const [id, tvm] of this.viewModel.techniqueVMs) {
                if (tvm.score !== undefined && tvm.score !== null) {
                    scores.set(id, tvm.score);
                }
            }
        }
        
        return scores;
    }

    /**
     * Get total chain count
     */
    get chainCount(): number {
        return this.techniqueChains?.chains?.length || 0;
    }

    /**
     * Get unique group count
     */
    get groupCount(): number {
        if (!this.techniqueChains || !this.techniqueChains.chains) {
            return 0;
        }
        
        const uniqueGroups = new Set(this.techniqueChains.chains.map(c => c.group.id));
        return uniqueGroups.size;
    }

    /**
     * Get campaign count for a chain
     */
    getCampaignCount(chain: AttackChain): string {
        const count = chain.campaigns.length;
        return `${count} campaign${count !== 1 ? 's' : ''}`;
    }
}
