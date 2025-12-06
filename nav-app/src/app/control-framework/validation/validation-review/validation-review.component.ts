import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { CtidValidationService } from '../ctid-validation.service';
import { MappingValidationResult, ValidationSummary } from '../ctid-stix.models';
import { ControlFramework } from '../../control-framework';
import { DataService } from '../../../services/data.service';
import { ViewModel } from '../../../classes';

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
  
  loading = false;
  reviewMode = false;
  currentReviewIndex = 0;
  currentReviewItem: MappingValidationResult | null = null;
  currentFilter: string = 'all';
  
  displayedColumns = ['status', 'mitigationId', 'coverage', 'yourMappings', 'ctidControls', 'actions'];
  
  constructor(
    private ctidService: CtidValidationService,
    private dataService: DataService
  ) {}

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
}
