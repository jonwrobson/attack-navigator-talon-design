import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { CtidValidationService } from '../ctid-validation.service';
import { MappingValidationResult, ValidationSummary } from '../ctid-stix.models';
import { ControlFramework } from '../../control-framework';
import { DataService } from '../../../services/data.service';
import { ViewModel } from '../../../classes';
import * as Excel from 'exceljs/dist/exceljs.min.js';

@Component({
  selector: 'validation-review',
  templateUrl: './validation-review.component.html',
  styleUrls: ['./validation-review.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ValidationReviewComponent implements OnInit {
  @Input() viewModel: ViewModel;
  
  controlFramework = new ControlFramework();
  results: MappingValidationResult[] = [];
  filteredResults: MappingValidationResult[] = [];
  summary: ValidationSummary | null = null;
  
  // Track reviewed items (in-memory for now, could persist to localStorage)
  reviewedItems: Set<string> = new Set();
  ignoredItems: Set<string> = new Set();
  
  loading = false;
  reviewMode = false;
  currentReviewIndex = 0;
  currentReviewItem: MappingValidationResult | null = null;
  currentFilter: string = 'all';
  
  displayedColumns = ['status', 'mitigationId', 'coverage', 'yourMappings', 'ctidControls', 'actions'];
  
  constructor(
    private ctidService: CtidValidationService,
    private dataService: DataService
  ) {
    // Load persisted review state from localStorage
    this.loadReviewState();
  }

  ngOnInit() {}

  loadValidation() {
    if (!this.viewModel) {
      console.error('No viewModel provided');
      return;
    }
    
    this.loading = true;
    
    this.ctidService.validateMappings(
      this.controlFramework,
      this.dataService,
      this.viewModel.domainVersionID
    ).subscribe({
      next: (results) => {
        this.results = results;
        this.filteredResults = [...results];
        this.summary = this.ctidService.getValidationSummary(results);
        this.loading = false;
      },
      error: (err) => {
        console.error('Validation failed:', err);
        this.loading = false;
      }
    });
  }

  filterByStatus(event: MatTabChangeEvent) {
    const statusMap = ['all', 'gap', 'needs-review', 'validated', 'pending'];
    this.currentFilter = statusMap[event.index];
    
    if (this.currentFilter === 'all') {
      this.filteredResults = [...this.results];
    } else {
      this.filteredResults = this.results.filter(r => r.status === this.currentFilter);
    }
    
    // Reset review mode when filter changes
    this.reviewMode = false;
    this.currentReviewIndex = 0;
  }

  getCountByStatus(status: string): number {
    return this.results.filter(r => r.status === status).length;
  }

  getTotalCtidControls(item: MappingValidationResult): number {
    return [...new Set(item.ctidTechniques.flatMap(t => t.ctidControls))].length;
  }

  startReview() {
    if (this.filteredResults.length === 0) return;
    
    this.reviewMode = true;
    this.currentReviewIndex = 0;
    this.currentReviewItem = this.filteredResults[0];
  }

  reviewSingle(index: number) {
    this.reviewMode = true;
    this.currentReviewIndex = index;
    this.currentReviewItem = this.filteredResults[index];
  }

  previousReview() {
    if (this.currentReviewIndex > 0) {
      this.currentReviewIndex--;
      this.currentReviewItem = this.filteredResults[this.currentReviewIndex];
    }
  }

  nextReview() {
    if (this.currentReviewIndex < this.filteredResults.length - 1) {
      this.currentReviewIndex++;
      this.currentReviewItem = this.filteredResults[this.currentReviewIndex];
    }
  }

  markReviewed() {
    // For now, just move to next. Later we can persist review state.
    if (this.currentReviewItem) {
      console.log(`Marked ${this.currentReviewItem.mitigationId} as reviewed`);
    }
    this.nextReview();
  }

  exitReviewMode() {
    this.reviewMode = false;
  }

  // ============ EXPORT FUNCTIONALITY ============

  /**
   * Export validation results to Excel for offline analysis
   */
  exportToExcel() {
    if (this.results.length === 0) return;

    const workbook = new Excel.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    summarySheet.addRow({ metric: 'Total Mitigations', value: this.summary?.totalMitigations });
    summarySheet.addRow({ metric: 'Validated (≥80%)', value: this.summary?.validated });
    summarySheet.addRow({ metric: 'Needs Review (50-80%)', value: this.summary?.needsReview });
    summarySheet.addRow({ metric: 'Gaps (<50%)', value: this.summary?.gaps });
    summarySheet.addRow({ metric: 'Pending (No CTID data)', value: this.summary?.pending });
    summarySheet.addRow({ metric: 'Average Coverage', value: `${this.summary?.averageCoverage}%` });
    summarySheet.addRow({ metric: 'CTID ATT&CK Version', value: this.summary?.attackVersion });
    summarySheet.addRow({ metric: 'Export Date', value: new Date().toISOString() });

    // Detailed results sheet
    const detailSheet = workbook.addWorksheet('Validation Results');
    detailSheet.columns = [
      { header: 'Mitigation ID', key: 'mitigationId', width: 12 },
      { header: 'Mitigation Name', key: 'mitigationName', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Coverage %', key: 'coverage', width: 12 },
      { header: 'Your NIST CSF Mappings', key: 'yourCsf', width: 30 },
      { header: 'Your 800-53 Controls', key: 'your80053', width: 30 },
      { header: 'CTID Recommended Controls', key: 'ctidControls', width: 40 },
      { header: 'Matching Controls', key: 'matching', width: 30 },
      { header: 'Missing From Yours', key: 'missing', width: 40 },
      { header: 'Unique To Yours', key: 'unique', width: 30 },
      { header: 'Review Status', key: 'reviewStatus', width: 15 }
    ];

    this.results.forEach(r => {
      const allCtidControls = [...new Set(r.ctidTechniques.flatMap(t => t.ctidControls))];
      detailSheet.addRow({
        mitigationId: r.mitigationId,
        mitigationName: r.mitigationName,
        status: r.status,
        coverage: r.coveragePercent,
        yourCsf: r.yourNistCsfMappings.join(', '),
        your80053: r.your80053Controls.join(', '),
        ctidControls: allCtidControls.join(', '),
        matching: r.matchingControls.join(', '),
        missing: r.missingFromYours.join(', '),
        unique: r.uniqueToYours.join(', '),
        reviewStatus: this.reviewedItems.has(r.mitigationId) ? 'Reviewed' : 
                      this.ignoredItems.has(r.mitigationId) ? 'Ignored' : 'Pending'
      });
    });

    // Gaps sheet - actionable items
    const gapsSheet = workbook.addWorksheet('Gaps - Action Items');
    gapsSheet.columns = [
      { header: 'Mitigation ID', key: 'mitigationId', width: 12 },
      { header: 'Mitigation Name', key: 'mitigationName', width: 30 },
      { header: 'Coverage %', key: 'coverage', width: 12 },
      { header: 'Missing Controls (Add These)', key: 'missing', width: 50 },
      { header: 'Suggested NIST CSF to Add', key: 'suggestedCsf', width: 40 }
    ];

    this.results
      .filter(r => r.status === 'gap' || r.status === 'needs-review')
      .forEach(r => {
        gapsSheet.addRow({
          mitigationId: r.mitigationId,
          mitigationName: r.mitigationName,
          coverage: r.coveragePercent,
          missing: r.missingFromYours.join(', '),
          suggestedCsf: this.suggestCsfForControls(r.missingFromYours)
        });
      });

    // Technique mapping sheet - for reference
    const techSheet = workbook.addWorksheet('Technique-Control Details');
    techSheet.columns = [
      { header: 'Mitigation ID', key: 'mitigationId', width: 12 },
      { header: 'Technique ID', key: 'techniqueId', width: 15 },
      { header: 'Technique Name', key: 'techniqueName', width: 35 },
      { header: 'CTID Controls', key: 'controls', width: 50 }
    ];

    this.results.forEach(r => {
      r.ctidTechniques.forEach(t => {
        techSheet.addRow({
          mitigationId: r.mitigationId,
          techniqueId: t.techniqueId,
          techniqueName: t.techniqueName,
          controls: t.ctidControls.join(', ')
        });
      });
    });

    // Download
    workbook.xlsx.writeBuffer().then(data => {
      const blob = new Blob([data], { type: 'application/octet-stream' });
      this.saveBlob(blob, `validation-results-${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  }

  /**
   * Export just the gaps as a CSV for quick action
   */
  exportGapsCsv() {
    const gaps = this.results.filter(r => r.status === 'gap' || r.status === 'needs-review');
    
    let csv = 'Mitigation ID,Mitigation Name,Coverage %,Missing Controls\n';
    gaps.forEach(r => {
      csv += `"${r.mitigationId}","${r.mitigationName}",${r.coveragePercent},"${r.missingFromYours.join('; ')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    this.saveBlob(blob, `validation-gaps-${new Date().toISOString().split('T')[0]}.csv`);
  }

  // ============ ACTION FUNCTIONALITY ============

  /**
   * Add a NIST CSF mapping to the current mitigation
   * This is a suggestion action - user confirms which CSF subcategory to add
   */
  addSuggestedMapping(nistCsfId: string) {
    if (!this.currentReviewItem) return;
    
    // Add the mapping through the control framework
    this.controlFramework.addMapping(nistCsfId, this.currentReviewItem.mitigationId);
    
    // Mark as reviewed
    this.markItemReviewed(this.currentReviewItem.mitigationId);
    
    // Refresh the validation data for this item
    console.log(`Added mapping: ${this.currentReviewItem.mitigationId} → ${nistCsfId}`);
    
    // Note: To see updated coverage, user needs to reload validation
  }

  /**
   * Mark item as reviewed (no action needed)
   */
  markItemReviewed(mitigationId: string) {
    this.reviewedItems.add(mitigationId);
    this.ignoredItems.delete(mitigationId);
    this.saveReviewState();
    
    if (this.currentReviewItem?.mitigationId === mitigationId) {
      this.currentReviewItem.notes = 'Reviewed';
    }
  }

  /**
   * Mark item as ignored (intentionally different from CTID)
   */
  markItemIgnored(mitigationId: string) {
    this.ignoredItems.add(mitigationId);
    this.reviewedItems.delete(mitigationId);
    this.saveReviewState();
    
    if (this.currentReviewItem?.mitigationId === mitigationId) {
      this.currentReviewItem.notes = 'Ignored - intentional difference';
    }
  }

  /**
   * Clear review status for an item
   */
  clearItemStatus(mitigationId: string) {
    this.reviewedItems.delete(mitigationId);
    this.ignoredItems.delete(mitigationId);
    this.saveReviewState();
  }

  /**
   * Check if item is reviewed
   */
  isReviewed(mitigationId: string): boolean {
    return this.reviewedItems.has(mitigationId);
  }

  /**
   * Check if item is ignored
   */
  isIgnored(mitigationId: string): boolean {
    return this.ignoredItems.has(mitigationId);
  }

  // ============ PERSISTENCE ============

  private loadReviewState() {
    try {
      const reviewed = localStorage.getItem('ctid-validation-reviewed');
      const ignored = localStorage.getItem('ctid-validation-ignored');
      
      if (reviewed) this.reviewedItems = new Set(JSON.parse(reviewed));
      if (ignored) this.ignoredItems = new Set(JSON.parse(ignored));
    } catch (e) {
      console.warn('Could not load review state:', e);
    }
  }

  private saveReviewState() {
    try {
      localStorage.setItem('ctid-validation-reviewed', JSON.stringify([...this.reviewedItems]));
      localStorage.setItem('ctid-validation-ignored', JSON.stringify([...this.ignoredItems]));
    } catch (e) {
      console.warn('Could not save review state:', e);
    }
  }

  // ============ HELPERS ============

  /**
   * Suggest NIST CSF subcategories that might map to given 800-53 controls
   */
  private suggestCsfForControls(controls: string[]): string {
    // This is a reverse lookup - find CSF subcategories that reference these 800-53 controls
    const suggestions: string[] = [];
    
    for (const nistItem of this.controlFramework.nistItems) {
      const nist80053 = nistItem.mappings?.['NIST SP 800-53 Rev. 4'];
      if (nist80053) {
        const controlsList = Array.isArray(nist80053) ? nist80053 : [nist80053];
        const hasMatch = controls.some(c => controlsList.includes(c));
        if (hasMatch) {
          suggestions.push(nistItem.subcategory.id);
        }
      }
    }
    
    return [...new Set(suggestions)].slice(0, 5).join(', ') || 'Manual review needed';
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
