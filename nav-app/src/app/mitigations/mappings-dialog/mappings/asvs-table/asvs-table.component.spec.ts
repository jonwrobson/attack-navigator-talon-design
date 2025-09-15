/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { AsvsTableComponent } from './asvs-table.component';

describe('AsvsTableComponent', () => {
  let component: AsvsTableComponent;
  let fixture: ComponentFixture<AsvsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ AsvsTableComponent ],
      imports: [ MatTableModule ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AsvsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
