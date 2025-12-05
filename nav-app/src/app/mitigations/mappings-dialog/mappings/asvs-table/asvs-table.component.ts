import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { AsvsOwaspItem } from '../../../../control-framework/control-frameworks/asvs-owasp-item';

@Component({
  selector: 'asvs-table',
  templateUrl: './asvs-table.component.html',
  styleUrls: ['./asvs-table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AsvsTableComponent implements OnInit {
  @Input() data: AsvsOwaspItem[];
  
  constructor() { }

  ngOnInit() {
  }

}
