describe('Enterprise matrix selection from start view', () => {
  beforeEach(() => {
    cy.visit('/');

    // Ensure start view and domain controls are ready
    cy.contains('mat-expansion-panel-header', 'Create New Layer', { timeout: 60000 }).should('be.visible');
  });

  it('loads the Enterprise matrix and renders techniques', () => {
    cy.intercept({ method: 'GET', url: /enterprise-attack\.json/ }).as('enterpriseDomain');

    // Open a fresh start tab if a data table is active and the add tab control exists
    cy.get('body').then(($body) => {
      const addTab = $body.find('nav.tabs a.addTab');
      if (addTab.length) {
        cy.wrap(addTab.first()).click({ force: true });
      }
    });

    cy.contains('mat-expansion-panel-header', 'Create New Layer', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains('table.btn-group button', /enterprise/i, { timeout: 60000 })
      .should('be.enabled')
      .scrollIntoView()
      .click({ force: true });

    cy.wait('@enterpriseDomain', { timeout: 120000 });

    cy.get('.matrix, .matrices', { timeout: 60000 }).should('be.visible');
    cy.get('.technique-cell, .cell', { timeout: 90000 }).should('have.length.greaterThan', 50);
  });
});
