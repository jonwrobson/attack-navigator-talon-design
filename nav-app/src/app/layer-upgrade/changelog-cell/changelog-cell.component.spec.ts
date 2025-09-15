import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from '../../data.service';
import {HttpClientModule} from '@angular/common/http';
import { ChangelogCellComponent } from './changelog-cell.component';

describe('ChangelogCellComponent', () => {
    let component: ChangelogCellComponent;
    let fixture: ComponentFixture<ChangelogCellComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
        imports: [
        HttpClientTestingModule 
      ],
            declarations: [ChangelogCellComponent]
        })
            .compileComponents();
    });

        beforeEach(() => {
            fixture = TestBed.createComponent(ChangelogCellComponent);
            component = fixture.componentInstance;
            // Provide minimal required inputs to avoid template errors
            (component as any).technique = { id: 'attack-pattern--x', isSubtechnique: false };
            (component as any).tactic = { id: 'tactic--x' };
                (component as any).viewModel = {
                selectSubtechniquesWithParent: false,
                highlightedTechniques: new Set<string>(),
                isTechniqueSelected: () => false,
                getTechniqueVM: () => ({ comment: '', metadata: [], links: [], enabled: true }),
                    layout: { showID: false, showName: true, layout: 'side' },
                    domainVersionID: 'enterprise-attack-9'
            };
                // Stub dataService.getDomain to return a domain with empty notes
                const ds = TestBed.inject(DataService) as any;
                ds.getDomain = () => ({ notes: [] });
        fixture.detectChanges();
    });

    it('should create', () => {
        (expect(component) as any).toBeTruthy();
    });
});
