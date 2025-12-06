import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CisItem } from '../../../../control-framework/control-frameworks/cis-item';

@Component({
  selector: 'cis-table',
  templateUrl: './cis-table.component.html',
  styleUrls: ['./cis-table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CisTableComponent implements OnInit {
  @Input() data: CisItem[];

  constructor() { }

  ngOnInit() {
  }

}
