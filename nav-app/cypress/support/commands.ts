/// <reference types="cypress" />
// Custom commands for ATT&CK Navigator testing
export {};

Cypress.Commands.add('getByDataCy', (selector: string) => {
  return cy.get(`[data-cy="${selector}"]`);
});

Cypress.Commands.add('findByDataCy', { prevSubject: 'element' }, (subject: any, selector: string) => {
  return cy.wrap(subject).find(`[data-cy="${selector}"]`);
});

Cypress.Commands.add('waitForNavigatorLoad', () => {
  // Wait for the main application to load
  cy.get('app-root', { timeout: 30000 }).should('be.visible');

  // Wait for any global spinners to disappear if present on the active view
  cy.get('body', { timeout: 1000 }).then($body => {
    if ($body.find('.spinner').length) {
      cy.get('.spinner', { timeout: 30000 }).should('not.exist');
    }
  });

  // Ensure a data table (layer) is opened so the matrix renders.
  cy.get('body').then($body => {
    const hasMatrix = $body.find('.matrix, .matrices').length > 0;
    if (!hasMatrix) {
      // Click Start button if visible to open the new tab UI
      if ($body.find('button').filter((_, el) => /Start/i.test(el.textContent || '')).length) {
        cy.contains('button', /Start/i).scrollIntoView().click({ force: true });
      }
      // Expand the Create New Layer panel and click a domain button
      cy.contains('mat-expansion-panel-header', /Create New Layer/i, { timeout: 30000 })
        .scrollIntoView()
        .click({ force: true });
      cy.contains('button', /Enterprise|Mobile|ICS/i, { timeout: 30000 })
        .scrollIntoView()
        .click({ force: true });
    }
  });

  // Wait for matrix to be present
  cy.get('.matrix, .matrices', { timeout: 60000 }).should('be.visible');

  // Wait for techniques to load
  cy.get('.technique-cell, .cell', { timeout: 60000 }).should('have.length.greaterThan', 0);
});

Cypress.Commands.add('selectTechnique', (techniqueId?: string) => {
  if (techniqueId) {
    cy.get(`.technique-cell[data-technique-id="${techniqueId}"] > div, .cell[data-technique-id="${techniqueId}"] > div`)
      .first()
      .click({ force: true });
  } else {
    cy.get('.technique-cell > div, .cell > div')
      .first()
      .click({ force: true });
  }
  // Ensure we have at least one technique selected (editing mode) for controls to enable
  cy.get('.technique-cell.editing, .cell.editing', { timeout: 20000 }).should('exist');
  cy.get('[mattooltip="scoring"]', { timeout: 20000 })
    .should('be.visible')
    .and(($el) => {
      expect($el).to.not.have.class('disabled');
    });
});

Cypress.Commands.add('addTechniqueComment', (comment: string) => {
  // Ensure a technique is selected for editing
  cy.selectTechnique();
  // Open comment dropdown
  cy.get('[mattooltip="comment"]').should('be.visible').click({ force: true });
  
  // Type comment
  cy.get('textarea[placeholder="comment"]', { timeout: 15000 }).should('be.visible').clear().type(comment);
  
  // Close dropdown by clicking outside
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('setTechniqueScore', (score: number | string) => {
  // Ensure a technique is selected for editing
  cy.selectTechnique();
  // Open score dropdown
  cy.get('[mattooltip="scoring"]').should('be.visible').click({ force: true });
  
  // Type score
  cy.get('input[placeholder="score"]', { timeout: 15000 }).should('be.visible').clear().type(score.toString());
  
  // Close dropdown by clicking outside
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('switchMatrixLayout', (layout: 'side' | 'flat' | 'mini') => {
  // Open layout dropdown
  cy.get('[mattooltip="matrix configuration"]').should('be.visible').click({ force: true });
  
  // Select layout
  cy.get('.dropdown-container.layout select')
    .first()
    .select(layout);
  
  // Close dropdown
  cy.get('body').click(0, 0);
  // Wait for matrix to re-render to the selected layout
  cy.assertMatrixLayout(layout);
});

Cypress.Commands.add('createNewLayer', () => {
  // Look for new layer button (can have various forms)
  cy.get('body').then($body => {
    // If on a data table tab, open a new blank tab first
    if ($body.find('nav.tabs a.addTab').length) {
      cy.get('nav.tabs a.addTab').first().click({ force: true });
    }
    // Prefer the New Tab + Create New Layer flow on the start screen
    if ($body.find('mat-expansion-panel-header:contains("Create New Layer")').length) {
      cy.contains('mat-expansion-panel-header', 'Create New Layer').click({ force: true });
      cy.contains('button', /Enterprise|Mobile|ICS/i).first().click({ force: true });
    } else if ($body.find('[data-cy="new-layer-btn"]').length > 0) {
      cy.get('[data-cy="new-layer-btn"]').click();
    } else if ($body.find('button:contains("new layer")').length > 0) {
      cy.get('button:contains("new layer")').click();
    } else if ($body.find('[mattooltip*="new"]').length > 0) {
      cy.get('[mattooltip*="new"]').first().click();
    } else {
      // Fallback: look for any button that might create a new layer
      cy.get('button').contains(/new|create|add/i).first().click({ force: true });
    }
  });
});

Cypress.Commands.add('searchTechniques', (searchTerm: string) => {
  // Open search
  cy.get('[mattooltip="search & multiselect"], [alt="search"]').first().click({ force: true });
  
  // Type in search field
  cy.get('input[placeholder="Search"], input[type="search"], input[placeholder*="Load from URL"], input[placeholder*="search"], .search-input', { timeout: 15000 })
    .filter(':visible')
    .first()
    .clear()
    .type(searchTerm);
});

Cypress.Commands.add('exportLayer', (format: 'json' | 'excel' | 'svg') => {
  switch (format) {
    case 'json':
      cy.get('[mattooltip="download layer as json"], [alt="save layer"]').first().click();
      break;
    case 'excel':
      cy.get('[mattooltip="export to excel"]').click();
      break;
    case 'svg':
      // In v4, exporter panel uses "download SVG" within Exporter component
      cy.get('[mattooltip="download SVG"], [mattooltip="render layer to SVG"]').first().click();
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
      cy.get('.matrix.side, matrix-side', { timeout: 25000 }).should('exist');
      break;
    case 'flat':
      cy.get('.matrix.flat, matrix-flat', { timeout: 25000 }).should('exist');
      break;
    case 'mini':
      cy.get('.matrix.mini, matrix-mini', { timeout: 25000 }).should('exist');
      break;
  }
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      getByDataCy(selector: string): Cypress.Chainable;
      findByDataCy(selector: string): Cypress.Chainable;
      waitForNavigatorLoad(): Cypress.Chainable;
      selectTechnique(techniqueId?: string): Cypress.Chainable;
      addTechniqueComment(comment: string): Cypress.Chainable;
      setTechniqueScore(score: number | string): Cypress.Chainable;
      switchMatrixLayout(layout: 'side' | 'flat' | 'mini'): Cypress.Chainable;
      createNewLayer(): Cypress.Chainable;
      searchTechniques(searchTerm: string): Cypress.Chainable;
      exportLayer(format: 'json' | 'excel' | 'svg'): Cypress.Chainable;
      toggleFeature(feature: string): Cypress.Chainable;
      verifyTechniqueTooltip(techniqueId?: string): Cypress.Chainable;
      assertMatrixLayout(layout: 'side' | 'flat' | 'mini'): Cypress.Chainable;
    }
  }
}
