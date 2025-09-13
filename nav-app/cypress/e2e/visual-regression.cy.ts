describe('Visual Regression Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(3000); // Allow time for complete loading
  });

  it('should match matrix layout baseline', () => {
    // Hide dynamic elements that might cause false positives
    cy.get('.timestamp, .version, .last-modified').invoke('hide');
    
    // Ensure matrix is fully loaded
    cy.get('.technique-cell, .cell').should('have.length.greaterThan', 0);
    
    // Take screenshot for comparison
    cy.compareSnapshot('matrix-default-view', {
      threshold: 0.1,
      thresholdType: 'percent'
    });
  });

  it('should match technique tooltip appearance', () => {
    // Trigger tooltip on first technique
    cy.get('.technique-cell, .cell').first().trigger('mouseover');
    cy.wait(500);
    
    // Hide dynamic content
    cy.get('.timestamp, .version').invoke('hide');
    
    cy.compareSnapshot('technique-tooltip', {
      threshold: 0.15,
      thresholdType: 'percent'
    });
  });

  it('should match sidebar appearance if present', () => {
    cy.get('body').then($body => {
      if ($body.find('app-sidebar').length > 0) {
        cy.get('app-sidebar').should('be.visible');
        cy.compareSnapshot('sidebar-view', {
          threshold: 0.1,
          thresholdType: 'percent'
        });
      }
    });
  });

  it('should match mobile responsive layout', () => {
    cy.viewport('iphone-x');
    cy.wait(1000);
    
    // Hide dynamic elements
    cy.get('.timestamp, .version').invoke('hide');
    
    cy.compareSnapshot('matrix-mobile-view', {
      threshold: 0.2,
      thresholdType: 'percent'
    });
  });

  it('should match tablet responsive layout', () => {
    cy.viewport('ipad-2');
    cy.wait(1000);
    
    // Hide dynamic elements
    cy.get('.timestamp, .version').invoke('hide');
    
    cy.compareSnapshot('matrix-tablet-view', {
      threshold: 0.15,
      thresholdType: 'percent'
    });
  });
});
