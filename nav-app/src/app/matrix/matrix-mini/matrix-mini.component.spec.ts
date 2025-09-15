import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MatrixMiniComponent } from './matrix-mini.component';
import { Tactic } from '../../data.service';

describe('MatrixMiniComponent', () => {
  let component: MatrixMiniComponent;
  let fixture: ComponentFixture<MatrixMiniComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MatrixMiniComponent ],
      imports: [ HttpClientTestingModule ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MatrixMiniComponent);
    component = fixture.componentInstance;
    // minimal inputs expected by template
    (component as any).matrix = { tactics: [] };
    (component as any).viewModel = {
      filterTactics: (t) => t,
      filterTechniques: (ts) => ts,
      sortTechniques: (ts) => ts,
      applyControls: (ts) => ts,
      isTechniqueSelected: () => false,
      getTechniqueVM: () => ({ comment: '', metadata: [], links: [], enabled: true }),
      layout: { showTacticRowBackground: false }
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});