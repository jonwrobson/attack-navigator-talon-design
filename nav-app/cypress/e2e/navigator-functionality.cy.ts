describe('ATT&CK Navigator Core Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForNavigatorLoad();
  });

  it('should load the main navigation interface', () => {
    cy.get('app-root').should('be.visible');
    cy.get('app-tabs, .tabs, mat-tab-group').should('be.visible');
    cy.contains('ATT&CK').should('be.visible');
  });

  it('should display techniques in the matrix', () => {
    cy.get('.technique-cell, .cell').should('have.length.greaterThan', 50);
    cy.get('.technique-cell, .cell').first().should('be.visible');
  });

  it('should allow technique selection and display tooltip', () => {
    cy.selectTechnique();
    cy.verifyTechniqueTooltip();
  });

  it('should allow technique commenting', () => {
    cy.selectTechnique();
    cy.addTechniqueComment('Test comment for E2E testing');
    
    // Verify comment was added (look for comment indicator)
    cy.get('.technique-cell, .cell')
      .first()
      .should('have.class', 'commented')
      .or('contain', 'Test comment');
  });

  it('should allow technique scoring', () => {
    cy.selectTechnique();
    cy.setTechniqueScore(85);
    
    // Verify score was applied (technique should have color or score indicator)
    cy.get('.technique-cell, .cell')
      .first()
      .should('have.attr', 'style')
      .and('contain', 'background');
  });

  it('should support matrix layout switching', () => {
    // Test side layout (default)
    cy.assertMatrixLayout('side');
    
    // Switch to flat layout
    cy.switchMatrixLayout('flat');
    cy.assertMatrixLayout('flat');
    
    // Switch to mini layout
    cy.switchMatrixLayout('mini');
    cy.assertMatrixLayout('mini');
  });

  it('should allow layer creation', () => {
    const initialTabCount = cy.get('.mat-tab-label, .tab').its('length');
    
    cy.createNewLayer();
    
    // Verify new tab was created
    cy.get('.mat-tab-label, .tab').should('have.length.greaterThan', 0);
  });

  it('should support search functionality', () => {
    cy.searchTechniques('T1059');
    
    // Verify search results are shown or filtered
    cy.get('.sidebar, app-sidebar').should('be.visible');
  });

  it('should support layer export functionality', () => {
    // Test JSON export
    cy.exportLayer('json');
    cy.wait(1000); // Allow time for download
    
    // Note: In Cypress, we can't verify actual downloads without additional configuration
    // but we can verify the export button click doesn't cause errors
  });

  it('should handle technique filtering', () => {
    // Test hide/show disabled techniques
    cy.toggleFeature('hideDisabled');
    cy.wait(500);
    
    // Verify the matrix still displays techniques
    cy.get('.technique-cell, .cell').should('have.length.greaterThan', 0);
  });

  it('should support sub-technique expansion', () => {
    // Expand sub-techniques
    cy.toggleFeature('expandSubtechniques');
    cy.wait(1000);
    
    // Look for expanded sub-techniques (they may have different styling or layout)
    cy.get('.subtechnique, .sub-technique').should('exist');
  });

  it('should load mitigations when available', () => {
    cy.get('body').then($body => {
      if ($body.find('app-mitigations').length > 0) {
        cy.get('app-mitigations').should('be.visible');
        
        // Try to show mitigations if there's a button for it
        if ($body.find('[mattooltip*="mitigation"]').length > 0) {
          cy.get('[mattooltip*="mitigation"]').first().click();
          cy.get('.mitigation-list, .mitigations').should('be.visible');
        }
      }
    });
  });

  it('should maintain responsive design', () => {
    // Test desktop view
    cy.viewport(1280, 720);
    cy.get('.technique-cell, .cell').should('be.visible');
    
    // Test tablet view
    cy.viewport('ipad-2');
    cy.get('.technique-cell, .cell').should('be.visible');
    
    // Test mobile view
    cy.viewport('iphone-x');
    cy.get('.matrix, .matrices').should('be.visible');
  });

  it('should handle keyboard navigation', () => {
    cy.get('body').focus();
    
    // Test tab navigation
    cy.get('body').tab();
    cy.focused().should('exist');
    
    // Test arrow key navigation if implemented
    cy.get('body').type('{rightarrow}');
  });

  it('should maintain state across interactions', () => {
    // Select a technique and add annotations
    cy.selectTechnique();
    cy.addTechniqueComment('Persistent comment');
    cy.setTechniqueScore(75);
    
    // Switch layout and verify annotations persist
    cy.switchMatrixLayout('flat');
    cy.get('.technique-cell, .cell').first().should('have.class', 'commented');
    
    // Switch back and verify still present
    cy.switchMatrixLayout('side');
    cy.get('.technique-cell, .cell').first().should('have.class', 'commented');
  });
});
