import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataService } from '../../../data.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TooltipComponent } from './tooltip.component';

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TooltipComponent ],
      imports: [ HttpClientTestingModule ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    // provide required inputs
    // Minimal viewModel with required domainVersionID and getTechniqueVM
    (component as any).viewModel = {
      domainVersionID: 'enterprise-attack-9',
      layout: { showAggregateScores: false, aggregateFunction: 'avg', showID: false, showName: true },
      getTechniqueVM: () => ({
        technique_tactic_union_id: 't_x__ta_x',
        enabled: true,
        score: undefined,
        aggregateScore: [],
        comment: undefined,
        metadata: []
      })
    };
    (component as any).technique = {
      id: 'attack-pattern--x',
      isSubtechnique: false,
      subtechniques: [],
      name: 'Technique X',
      attackID: 'T-X'
    };
    (component as any).tactic = { id: 'tactic--x' };
    // stub dataService if needed
    const ds = TestBed.inject(DataService) as any;
    ds.getDomain = () => ({ relationships: { mitigatedBy: new Map() }, mitigations: [], notes: [] });
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
