/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { CisTableComponent } from './cis-table.component';

describe('CisTableComponent', () => {
  let component: CisTableComponent;
  let fixture: ComponentFixture<CisTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CisTableComponent ],
      imports: [ MatTableModule ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
