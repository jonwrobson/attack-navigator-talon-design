import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ContextmenuComponent } from './contextmenu.component';

describe('ContextmenuComponent', () => {
  let component: ContextmenuComponent;
  let fixture: ComponentFixture<ContextmenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ContextmenuComponent ],
      imports: [ HttpClientTestingModule ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContextmenuComponent);
    component = fixture.componentInstance;
    // provide minimal inputs required by template & methods
    (component as any).technique = { name: 'Technique', url: '', id: 'attack-pattern--x' };
    (component as any).tactic = { name: 'Tactic', url: '', id: 'tactic--x' };
    (component as any).viewModel = {
      getTechniqueVM: () => ({ links: [], technique_tactic_union_id: 'uuid', enabled: true, comment: '', metadata: [], score: '', aggregateScore: '', aggregateScoreColor: '', scoreColor: '' }),
      clearSelectedTechniques: () => {},
      selectTechnique: () => {},
      unselectTechnique: () => {},
      selectAllTechniques: () => {},
      unselectAllTechniquesInTactic: () => {},
      selectAllTechniquesInTactic: () => {}
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
