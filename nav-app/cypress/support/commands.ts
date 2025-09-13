// Custom commands for ATT&CK Navigator testing

Cypress.Commands.add('getByDataCy', (selector: string) => {
  return cy.get(`[data-cy="${selector}"]`);
});

Cypress.Commands.add('findByDataCy', { prevSubject: 'element' }, (subject: any, selector: string) => {
  return cy.wrap(subject).find(`[data-cy="${selector}"]`);
});

Cypress.Commands.add('waitForNavigatorLoad', () => {
  // Wait for the main application to load
  cy.get('app-root').should('be.visible');
  
  // Wait for data to load (spinner should disappear)
  cy.get('.spinner', { timeout: 30000 }).should('not.exist');
  
  // Wait for matrix to be present
  cy.get('.matrix, .matrices', { timeout: 20000 }).should('be.visible');
  
  // Wait for techniques to load
  cy.get('.technique-cell, .cell', { timeout: 15000 }).should('have.length.greaterThan', 0);
});

Cypress.Commands.add('selectTechnique', (techniqueId?: string) => {
  if (techniqueId) {
    cy.get(`.technique-cell[data-technique-id="${techniqueId}"], .cell[data-technique-id="${techniqueId}"]`)
      .first()
      .click();
  } else {
    cy.get('.technique-cell, .cell')
      .first()
      .click();
  }
});

Cypress.Commands.add('addTechniqueComment', (comment: string) => {
  // Open comment dropdown
  cy.get('[mattooltip="comment"]').click();
  
  // Type comment
  cy.get('textarea[placeholder="comment"]').clear().type(comment);
  
  // Close dropdown by clicking outside
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('setTechniqueScore', (score: number | string) => {
  // Open score dropdown
  cy.get('[mattooltip="scoring"]').click();
  
  // Type score
  cy.get('input[placeholder="score"]').clear().type(score.toString());
  
  // Close dropdown by clicking outside
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('switchMatrixLayout', (layout: 'side' | 'flat' | 'mini') => {
  // Open layout dropdown
  cy.get('[mattooltip="matrix configuration"]').click();
  
  // Select layout
  cy.get('select').first().select(`${layout} layout`);
  
  // Close dropdown
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('createNewLayer', () => {
  // Look for new layer button (can have various forms)
  cy.get('body').then($body => {
    if ($body.find('[data-cy="new-layer-btn"]').length > 0) {
      cy.get('[data-cy="new-layer-btn"]').click();
    } else if ($body.find('button:contains("new layer")').length > 0) {
      cy.get('button:contains("new layer")').click();
    } else if ($body.find('[mattooltip*="new"]').length > 0) {
      cy.get('[mattooltip*="new"]').first().click();
    } else {
      // Fallback: look for any button that might create a new layer
      cy.get('button').contains(/new|create|add/i).first().click();
    }
  });
});

Cypress.Commands.add('searchTechniques', (searchTerm: string) => {
  // Open search
  cy.get('[mattooltip="search & multiselect"], [alt="search"]').click();
  
  // Type in search field
  cy.get('input[type="search"], input[placeholder*="search"], .search-input')
    .first()
    .clear()
    .type(searchTerm);
});

Cypress.Commands.add('exportLayer', (format: 'json' | 'excel' | 'svg') => {
  switch (format) {
    case 'json':
      cy.get('[mattooltip="download layer as json"], [alt="save layer"]').click();
      break;
    case 'excel':
      cy.get('[mattooltip="export to excel"]').click();
      break;
    case 'svg':
      cy.get('[mattooltip="render layer to SVG"]').click();
      break;
  }
});

Cypress.Commands.add('toggleFeature', (feature: string) => {
  switch (feature) {
    case 'hideDisabled':
      cy.get('[mattooltip="show/hide disabled"]').click();
      break;
    case 'expandSubtechniques':
      cy.get('[mattooltip="expand sub-techniques"]').click();
      break;
    case 'collapseSubtechniques':
      cy.get('[mattooltip="collapse sub-techniques"]').click();
      break;
  }
});

Cypress.Commands.add('verifyTechniqueTooltip', (techniqueId?: string) => {
  const selector = techniqueId 
    ? `.technique-cell[data-technique-id="${techniqueId}"], .cell[data-technique-id="${techniqueId}"]`
    : '.technique-cell, .cell';
    
  cy.get(selector).first().trigger('mouseover');
  cy.get('.tooltip, app-tooltip, [role="tooltip"]').should('be.visible');
});

Cypress.Commands.add('assertMatrixLayout', (layout: 'side' | 'flat' | 'mini') => {
  switch (layout) {
    case 'side':
      cy.get('.matrix.side, matrix-side').should('be.visible');
      break;
    case 'flat':
      cy.get('.matrix.flat, matrix-flat').should('be.visible');
      break;
    case 'mini':
      cy.get('.matrix.mini, matrix-mini').should('be.visible');
      break;
  }
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      getByDataCy(selector: string): Chainable<JQuery<HTMLElement>>;
      findByDataCy(selector: string): Chainable<JQuery<HTMLElement>>;
      waitForNavigatorLoad(): Chainable<void>;
      selectTechnique(techniqueId?: string): Chainable<void>;
      addTechniqueComment(comment: string): Chainable<void>;
      setTechniqueScore(score: number | string): Chainable<void>;
      switchMatrixLayout(layout: 'side' | 'flat' | 'mini'): Chainable<void>;
      createNewLayer(): Chainable<void>;
      searchTechniques(searchTerm: string): Chainable<void>;
      exportLayer(format: 'json' | 'excel' | 'svg'): Chainable<void>;
      toggleFeature(feature: string): Chainable<void>;
      verifyTechniqueTooltip(techniqueId?: string): Chainable<void>;
      assertMatrixLayout(layout: 'side' | 'flat' | 'mini'): Chainable<void>;
    }
  }
}
