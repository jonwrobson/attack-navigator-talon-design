describe('Visual Regression Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    // Ensure a layer/matrix is present
    cy.waitForNavigatorLoad();
  });

  const hasCompare = () => typeof (cy as any).compareSnapshot === 'function';

  it('should match matrix layout baseline', function () {
    if (!hasCompare()) {
      cy.log('compareSnapshot not available; skipping');
      this.skip();
    }
    // Hide dynamic elements that might cause false positives (if present)
    cy.get('body').then($body => {
      const toHide = $body.find('.timestamp, .version, .last-modified');
      if (toHide.length) {
        cy.wrap(toHide).invoke('hide');
      }
    });
    
    // Ensure matrix is fully loaded
    cy.get('.technique-cell, .cell').should('have.length.greaterThan', 0);
    
    // Take screenshot for comparison
    ;(cy as any).compareSnapshot('matrix-default-view', {
      threshold: 0.1,
      thresholdType: 'percent'
    });
  });

  it('should match technique tooltip appearance', function () {
    if (!hasCompare()) {
      cy.log('compareSnapshot not available; skipping');
      this.skip();
    }
    // Trigger tooltip on first technique
    cy.get('.technique-cell, .cell').first().trigger('mouseover');
    cy.wait(500);
    
    // Hide dynamic content if present
    cy.get('body').then($body => {
      const toHide = $body.find('.timestamp, .version');
      if (toHide.length) {
        cy.wrap(toHide).invoke('hide');
      }
    });
    
    ;(cy as any).compareSnapshot('technique-tooltip', {
      threshold: 0.15,
      thresholdType: 'percent'
    });
  });

  it('should match sidebar appearance if present', function () {
    if (!hasCompare()) {
      cy.log('compareSnapshot not available; skipping');
      this.skip();
    }
    cy.get('body').then($body => {
      if ($body.find('app-sidebar').length > 0) {
        cy.get('app-sidebar').should('be.visible');
        ;(cy as any).compareSnapshot('sidebar-view', {
          threshold: 0.1,
          thresholdType: 'percent'
        });
      }
    });
  });

  it('should match mobile responsive layout', function () {
    if (!hasCompare()) {
      cy.log('compareSnapshot not available; skipping');
      this.skip();
    }
    cy.viewport('iphone-x');
    cy.wait(1000);
    
    // Hide dynamic elements if present
    cy.get('body').then($body => {
      const toHide = $body.find('.timestamp, .version');
      if (toHide.length) {
        cy.wrap(toHide).invoke('hide');
      }
    });
    
    ;(cy as any).compareSnapshot('matrix-mobile-view', {
      threshold: 0.2,
      thresholdType: 'percent'
    });
  });

  it('should match tablet responsive layout', function () {
    if (!hasCompare()) {
      cy.log('compareSnapshot not available; skipping');
      this.skip();
    }
    cy.viewport('ipad-2');
    cy.wait(1000);
    
    // Hide dynamic elements if present
    cy.get('body').then($body => {
      const toHide = $body.find('.timestamp, .version');
      if (toHide.length) {
        cy.wrap(toHide).invoke('hide');
      }
    });
    
    ;(cy as any).compareSnapshot('matrix-tablet-view', {
      threshold: 0.15,
      thresholdType: 'percent'
    });
  });
});
