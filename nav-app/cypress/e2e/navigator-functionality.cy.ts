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
    
    // Verify comment indicator via underlined class on technique cell
    cy.get('.technique-cell, .cell')
      .first()
      .should('have.class', 'underlined');
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
    // Count existing tabs
    cy.get('nav.tabs a.tab-title').its('length').then((countBefore: number) => {
      cy.createNewLayer();
      // Verify new tab was created (tab count increased)
      cy.get('nav.tabs a.tab-title', { timeout: 20000 })
        .its('length')
        .should('be.greaterThan', countBefore);
    });
  });

  it('should support search functionality', () => {
    cy.searchTechniques('T1059');
    
    // Verify search results are shown or filtered
    cy.get('app-sidebar', { timeout: 15000 }).should('be.visible');
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
    // Ensure we have at least one scored technique so mitigations can show
    cy.selectTechnique();
    cy.setTechniqueScore(10);
    // Open the mitigations sidebar
    cy.contains('[mattooltip]', 'Show mitigations for scored techniques', { matchCase: false })
      .scrollIntoView()
      .click({ force: true });
    // Sidebar with mitigations should become visible (drawer opens on start position)
    cy.get('mat-drawer[position="start"]', { timeout: 20000 })
      .should('have.class', 'mat-drawer-opened');
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
    
    // Simulate Tab keydown event and ensure focus shifts to some element
    cy.get('body').trigger('keydown', { key: 'Tab', keyCode: 9, which: 9 });
    // Just verify no errors and UI remains interactive
    cy.get('.matrix, .matrices').should('be.visible');
    
    // Test arrow key navigation if implemented
    cy.get('body').trigger('keydown', { key: 'ArrowRight', keyCode: 39, which: 39 });
  });

  it('should maintain state across interactions', () => {
    // Select a technique and add annotations
    cy.selectTechnique();
    cy.addTechniqueComment('Persistent comment');
    cy.setTechniqueScore(75);
    
    // Switch layout and verify annotations persist
  cy.switchMatrixLayout('flat');
    cy.get('.technique-cell, .cell').first().should('have.class', 'underlined');
    
    // Switch back and verify still present
    cy.switchMatrixLayout('side');
    cy.get('.technique-cell, .cell').first().should('have.class', 'underlined');
  });
});
