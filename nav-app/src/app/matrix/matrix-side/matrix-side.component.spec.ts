import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {HttpClientModule} from '@angular/common/http';
import { MatrixSideComponent } from './matrix-side.component';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
describe('MatrixSideComponent', () => {
  let component: MatrixSideComponent;
  let fixture: ComponentFixture<MatrixSideComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        MatDialogModule 
      ],
      declarations: [ MatrixSideComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MatrixSideComponent);
    component = fixture.componentInstance;
    (component as any).matrix = { tactics: [] };
    // provide minimal viewModel with layout and required functions
    (component as any).viewModel = {
      layout: { showTacticRowBackground: false },
      filterTactics: (t) => t,
      filterTechniques: (ts) => ts,
      sortTechniques: (ts) => ts,
      applyControls: (ts) => ts,
      isTechniqueSelected: () => false,
      getTechniqueVM: () => ({ comment: '', metadata: [], links: [], enabled: true })
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
