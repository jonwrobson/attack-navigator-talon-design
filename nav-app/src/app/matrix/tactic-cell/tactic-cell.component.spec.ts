import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TacticCellComponent } from './tactic-cell.component';

describe('TacticCellComponent', () => {
  let component: TacticCellComponent;
  let fixture: ComponentFixture<TacticCellComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TacticCellComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TacticCellComponent);
    component = fixture.componentInstance;
    // provide minimal viewModel with layout expected by template
    (component as any).viewModel = { layout: { showID: false, showName: true } };
    (component as any).tactic = { attackID: 'TA0001', name: 'Initial Access' };
    (component as any).tooltip = '';
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
