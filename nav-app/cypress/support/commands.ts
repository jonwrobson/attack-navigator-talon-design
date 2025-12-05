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
      cy.log('waitForNavigatorLoad: no matrix detected, invoking createNewLayer helper');
      return cy.createNewLayer();
    }
    cy.log('waitForNavigatorLoad: matrix already present, continuing');
    return undefined;
  });

  // Wait for the matrix and some technique cells to render (data load + parse can be slow)
  cy.get('.matrix, .matrices', { timeout: 60000 }).should('be.visible');
  cy.get('.technique-cell, .cell', { timeout: 90000 }).should('have.length.greaterThan', 10);

});

Cypress.Commands.add('selectTechnique', (techniqueId?: string) => {
  const baseSelector = techniqueId
    ? `.technique-cell[data-technique-id="${techniqueId}"] > div, .cell[data-technique-id="${techniqueId}"] > div`
    : '.technique-cell > div, .cell > div';

  cy.get(baseSelector)
    .first()
    .as('selectedTechniqueElement')
    .click({ force: true });

  cy.get('@selectedTechniqueElement')
    .parents('.technique-cell, .cell')
    .first()
    .as('selectedTechniqueCell');

  cy.get('@selectedTechniqueCell')
    .invoke('attr', 'data-technique-id')
    .then((techniqueId) => {
      if (techniqueId) {
        cy.wrap(techniqueId).as('selectedTechniqueId');
      }
    });

  // Ensure we have at least one technique selected (editing mode) for controls to enable
  cy.get('@selectedTechniqueCell', { timeout: 20000 })
    .should('exist')
    .and('have.class', 'editing');

  cy.get('[mattooltip="scoring"]', { timeout: 20000 })
    .should('be.visible')
    .and(($el) => {
      expect($el).to.not.have.class('disabled');
    });
});

Cypress.Commands.add('addTechniqueComment', (comment: string) => {
  // Open comment dropdown
  cy.get('[mattooltip="comment"]').should('be.visible').click({ force: true });
  
  // Type comment
  cy.get('textarea[placeholder="comment"]', { timeout: 15000 }).should('be.visible').clear().type(comment);
  
  // Close dropdown by clicking outside
  cy.get('body').click(0, 0);
});

Cypress.Commands.add('setTechniqueScore', (score: number | string) => {
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
  cy.log('createNewLayer: evaluating page state for new layer creation');

  // If on a data table tab, open a new blank tab first (only when the control exists)
  cy.get('body', { timeout: 15000 }).then($body => {
    const $addTabs = $body.find('nav.tabs a.addTab');
    if ($addTabs.length) {
      cy.log('createNewLayer: addTab control found, opening new blank tab');
      cy.wrap($addTabs.first()).click({ force: true });
    }
  });

  // Prefer the New Tab + Create New Layer flow on the start screen
  cy.get('body').then($body => {
    if ($body.find('mat-expansion-panel-header:contains("Create New Layer")').length) {
      cy.log('createNewLayer: expanding Create New Layer panel');
      cy.contains('mat-expansion-panel-header', 'Create New Layer', { timeout: 15000 })
        .should('be.visible')
        .click({ force: true });

      const preferredDomains = ['Enterprise', 'Mobile', 'ICS'];

      return cy.get('table.btn-group button', { timeout: 60000 }).then($buttons => {
        const buttonArray = Array.from($buttons) as HTMLButtonElement[];
        const domainButton = buttonArray.find(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return preferredDomains.some(domain => text.includes(domain.toLowerCase())) && !btn.disabled;
        });

        if (domainButton) {
          cy.log(`createNewLayer: selecting domain button labeled "${domainButton.textContent?.trim() ?? ''}"`);
          cy.wrap(domainButton).scrollIntoView().click({ force: true });
          return;
        }

        const firstButton = buttonArray.find(btn => !btn.disabled);
        if (firstButton) {
          cy.log('createNewLayer: no preferred domain found; using first available domain button');
          cy.wrap(firstButton).scrollIntoView().click({ force: true });
          return;
        }

        throw new Error('No enabled domain buttons available after expanding Create New Layer panel');
      });
    }

    if ($body.find('[data-cy="new-layer-btn"]').length > 0) {
      cy.log('createNewLayer: using data-cy="new-layer-btn" shortcut');
      cy.get('[data-cy="new-layer-btn"]').click();
      return;
    }

    if ($body.find('button:contains("new layer")').length > 0) {
      cy.log('createNewLayer: using generic "new layer" button');
      cy.get('button:contains("new layer")').click();
      return;
    }

    if ($body.find('[mattooltip*="new"]').length > 0) {
      cy.log('createNewLayer: using mattooltip *new* control');
      cy.get('[mattooltip*="new"]').first().click();
      return;
    }

    cy.log('createNewLayer: resorting to first generic button matching /(new|create|add)/i');
    cy.get('button').contains(/new|create|add/i).first().click({ force: true });
  });

  // After initiating creation, wait for matrix to appear and populate
  cy.get('.matrix, .matrices', { timeout: 60000 }).should('be.visible');
  cy.get('.technique-cell, .cell', { timeout: 90000 }).should('have.length.greaterThan', 10);
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
