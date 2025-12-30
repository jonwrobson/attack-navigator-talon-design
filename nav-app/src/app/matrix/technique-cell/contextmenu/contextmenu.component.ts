import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewEncapsulation, OnDestroy } from '@angular/core';
import { ContextMenuItem, Link, TechniqueVM, ViewModel } from '../../../classes';
import { Technique, Tactic } from '../../../classes/stix';
import { ViewModelsService } from '../../../services/viewmodels.service';
import { ConfigService } from '../../../services/config.service';
import { AttackChainService } from '../../../services/attack-chain.service';
import { CellPopover } from '../cell-popover';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-contextmenu',
    templateUrl: './contextmenu.component.html',
    styleUrls: ['./contextmenu.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class ContextmenuComponent extends CellPopover implements OnInit, OnDestroy {
    @Input() technique: Technique;
    @Input() tactic: Tactic;
    @Input() viewModel: ViewModel;
    public placement: string;
    @Output() close = new EventEmitter<any>();
    @Output() openAttackChainViewer = new EventEmitter<string>();

    private destroy$ = new Subject<void>();
    private _hasChains: boolean | null = null;

    public get techniqueVM(): TechniqueVM {
        return this.viewModel.getTechniqueVM(this.technique, this.tactic);
    }

    public get links(): Link[] {
        return this.techniqueVM.links;
    }

    constructor(
        private element: ElementRef,
        public configService: ConfigService,
        public viewModelsService: ViewModelsService,
        public attackChainService: AttackChainService
    ) {
        super(element);
    }

    ngOnInit() {
        this.placement = this.getPosition();
        // Load the attack chain index to enable chain availability checks
        this.attackChainService.loadIndex()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    // Cache the result to avoid repeated lookups during change detection
                    this._hasChains = this.attackChainService.hasChains(this.technique.attackID);
                },
                error: () => {
                    // If index fails to load, assume no chains available
                    this._hasChains = false;
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public closeContextmenu() {
        this.close.emit();
    }

    public select() {
        this.viewModel.clearSelectedTechniques();
        this.viewModel.selectTechnique(this.technique, this.tactic);
        this.closeContextmenu();
    }

    public addSelection() {
        this.viewModel.selectTechnique(this.technique, this.tactic);
        this.closeContextmenu();
    }

    public removeSelection() {
        this.viewModel.unselectTechnique(this.technique, this.tactic);
        this.closeContextmenu();
    }

    public selectAll() {
        this.viewModel.selectAllTechniques();
        this.closeContextmenu();
    }

    public deselectAll() {
        this.viewModel.clearSelectedTechniques();
        this.closeContextmenu();
    }

    public invertSelection() {
        this.viewModel.invertSelection();
        this.closeContextmenu();
    }

    public selectAnnotated() {
        this.viewModel.selectAnnotated();
        this.closeContextmenu();
    }

    public selectUnannotated() {
        this.viewModel.selectUnannotated();
        this.closeContextmenu();
    }

    public selectAllInTactic() {
        this.viewModel.selectAllTechniquesInTactic(this.tactic);
        this.closeContextmenu();
    }

    public deselectAllInTactic() {
        this.viewModel.unselectAllTechniquesInTactic(this.tactic);
        this.closeContextmenu();
    }

    public viewTechnique() {
        window.open(this.technique.url, '_blank');
        this.closeContextmenu();
    }

    public viewTactic() {
        window.open(this.tactic.url, '_blank');
        this.closeContextmenu();
    }

    public pinCell() {
        this.viewModelsService.pinnedCell =
            this.viewModelsService.pinnedCell === this.techniqueVM.technique_tactic_union_id ? '' : this.techniqueVM.technique_tactic_union_id;
        this.closeContextmenu();
    }

    public openCustomContextMenuItem(customItem: ContextMenuItem) {
        window.open(customItem.getReplacedURL(this.technique, this.tactic), '_blank');
        this.closeContextmenu();
    }

    public openLink(link: Link) {
        window.open(link.url);
        this.closeContextmenu();
    }

    public hasAttackChains(): boolean {
        return this._hasChains ?? false;
    }

    public viewAttackChains() {
        this.openAttackChainViewer.emit(this.technique.attackID);
        this.closeContextmenu();
    }
}
