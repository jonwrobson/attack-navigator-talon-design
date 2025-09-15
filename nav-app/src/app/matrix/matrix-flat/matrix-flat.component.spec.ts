import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MatrixFlatComponent } from './matrix-flat.component';
import { Tactic } from '../../data.service';


describe('MatrixFlatComponent', () => {
  let component: MatrixFlatComponent;
  let fixture: ComponentFixture<MatrixFlatComponent>;
  // Provide filterTactics as a function returning the tactics array per component expectations
  const mockViewModel: any = { 
    showTacticRowBackground: false, 
    legendItems: [], 
    filterTactics: (tactics: Tactic[]) => tactics,
    filterTechniques: (techniques: any[]) => techniques,
    hasTechniqueVM: () => false,
    getTechniqueVM: () => ({ score: '' })
  };
  const mockMatrix: any = { tactics: [] };


  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MatrixFlatComponent],
      imports: [HttpClientTestingModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MatrixFlatComponent);
    component = fixture.componentInstance;
    component.viewModel = mockViewModel;
    component.matrix = mockMatrix;
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
