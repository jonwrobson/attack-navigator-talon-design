import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';

/**
 * Campaign data structure for popup display
 */
export interface CampaignData {
    id: string;
    name: string;
    description: string;
    firstSeen: string;
    lastSeen: string;
    techniqueCount: number;
}

/**
 * Position for popup placement
 */
export interface PopupPosition {
    x: number;
    y: number;
}

/**
 * Campaign details popup component
 * 
 * Displays detailed campaign information when hovering over campaign badges.
 * Shows campaign name, description, dates, technique count, and link to MITRE ATT&CK.
 * Supports keyboard accessibility with Escape key to close.
 */
@Component({
    selector: 'app-campaign-popup',
    templateUrl: './campaign-popup.component.html',
    styleUrls: ['./campaign-popup.component.scss']
})
export class CampaignPopupComponent implements OnInit, OnDestroy {
    @Input() campaign: CampaignData | null = null;
    @Input() position: PopupPosition = { x: 0, y: 0 };
    @Output() closed = new EventEmitter<void>();

    constructor() {}

    ngOnInit(): void {
        // Component initialization
    }

    ngOnDestroy(): void {
        // Cleanup
    }

    /**
     * Handle keyboard events for accessibility
     */
    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.campaign) {
            this.close();
        }
    }

    /**
     * Close the popup
     */
    close(): void {
        this.closed.emit();
    }

    /**
     * Get the MITRE ATT&CK campaign URL
     */
    getCampaignUrl(): string {
        if (!this.campaign) {
            return '';
        }
        return `https://attack.mitre.org/campaigns/${this.campaign.id}`;
    }

    /**
     * Format date string or return N/A if empty
     */
    formatDate(date: string): string {
        return date && date.trim() !== '' ? date : 'N/A';
    }

    /**
     * Get popup style based on position
     */
    getPopupStyle(): { [key: string]: string } {
        return {
            left: `${this.position.x}px`,
            top: `${this.position.y}px`
        };
    }

    /**
     * Check if popup should be visible
     */
    isVisible(): boolean {
        return this.campaign !== null;
    }
}
