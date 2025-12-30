import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignPopupComponent } from './campaign-popup.component';

describe('CampaignPopupComponent', () => {
    let component: CampaignPopupComponent;
    let fixture: ComponentFixture<CampaignPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CampaignPopupComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(CampaignPopupComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Campaign Information Display', () => {
        it('should display campaign name', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const nameElement = fixture.nativeElement.querySelector('.campaign-name');
            expect(nameElement).toBeTruthy();
            expect(nameElement.textContent).toContain('Operation Dream Job');
        });

        it('should display campaign description', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const descElement = fixture.nativeElement.querySelector('.campaign-description');
            expect(descElement).toBeTruthy();
            expect(descElement.textContent).toContain('A campaign targeting defense contractors');
        });

        it('should display first seen date', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const firstSeenElement = fixture.nativeElement.querySelector('.first-seen');
            expect(firstSeenElement).toBeTruthy();
            expect(firstSeenElement.textContent).toContain('2020-01-01');
        });

        it('should display last seen date', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const lastSeenElement = fixture.nativeElement.querySelector('.last-seen');
            expect(lastSeenElement).toBeTruthy();
            expect(lastSeenElement.textContent).toContain('2021-12-31');
        });

        it('should display technique count', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const countElement = fixture.nativeElement.querySelector('.technique-count');
            expect(countElement).toBeTruthy();
            expect(countElement.textContent).toContain('15');
        });

        it('should generate correct MITRE ATT&CK campaign link', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const linkElement = fixture.nativeElement.querySelector('.campaign-link');
            expect(linkElement).toBeTruthy();
            expect(linkElement.href).toContain('https://attack.mitre.org/campaigns/C0001');
        });

        it('should open MITRE link in new tab', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const linkElement = fixture.nativeElement.querySelector('.campaign-link');
            expect(linkElement.target).toBe('_blank');
            expect(linkElement.rel).toContain('noopener');
        });
    });

    describe('Positioning', () => {
        it('should position popup near provided coordinates', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            component.position = { x: 100, y: 200 };
            fixture.detectChanges();

            const popup = fixture.nativeElement.querySelector('.campaign-popup');
            expect(popup).toBeTruthy();
            expect(popup.style.left).toBeTruthy();
            expect(popup.style.top).toBeTruthy();
        });

        it('should have visible class when campaign is set', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const popup = fixture.nativeElement.querySelector('.campaign-popup');
            expect(popup.classList.contains('visible')).toBe(true);
        });

        it('should not have visible class when campaign is null', () => {
            component.campaign = null;
            fixture.detectChanges();

            const popup = fixture.nativeElement.querySelector('.campaign-popup');
            expect(popup.classList.contains('visible')).toBe(false);
        });
    });

    describe('Keyboard Accessibility', () => {
        it('should close popup when Escape key is pressed', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            spyOn(component.closed, 'emit');

            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            window.dispatchEvent(event);

            expect(component.closed.emit).toHaveBeenCalled();
        });

        it('should not close popup when other keys are pressed', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            spyOn(component.closed, 'emit');

            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            window.dispatchEvent(event);

            expect(component.closed.emit).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing description gracefully', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: '',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            
            expect(() => fixture.detectChanges()).not.toThrow();
        });

        it('should handle null campaign gracefully', () => {
            component.campaign = null;
            
            expect(() => fixture.detectChanges()).not.toThrow();
        });

        it('should display N/A for missing dates', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign',
                firstSeen: '',
                lastSeen: '',
                techniqueCount: 15
            };
            fixture.detectChanges();

            const firstSeenElement = fixture.nativeElement.querySelector('.first-seen');
            const lastSeenElement = fixture.nativeElement.querySelector('.last-seen');
            
            expect(firstSeenElement.textContent).toContain('N/A');
            expect(lastSeenElement.textContent).toContain('N/A');
        });
    });

    describe('Event Emissions', () => {
        it('should emit closed event when close button clicked', () => {
            component.campaign = {
                id: 'C0001',
                name: 'Operation Dream Job',
                description: 'A campaign targeting defense contractors',
                firstSeen: '2020-01-01',
                lastSeen: '2021-12-31',
                techniqueCount: 15
            };
            fixture.detectChanges();

            spyOn(component.closed, 'emit');

            const closeButton = fixture.nativeElement.querySelector('.close-button');
            closeButton?.click();

            expect(component.closed.emit).toHaveBeenCalled();
        });
    });
});
