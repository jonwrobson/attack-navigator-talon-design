import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { ControlFrameworkImportComponent } from './control-framework-import.component'

describe('ControlFrameworkImportComponent', () => {
  let component: ControlFrameworkImportComponent;
  let fixture: ComponentFixture<ControlFrameworkImportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ControlFrameworkImportComponent ],
      imports: [MatFormFieldModule, MatSelectModule, MatOptionModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ControlFrameworkImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    (expect(component) as any).toBeTruthy();
  });
});
