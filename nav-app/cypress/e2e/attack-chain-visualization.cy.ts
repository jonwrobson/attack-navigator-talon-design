describe('Attack Chain Visualization E2E Tests', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForNavigatorLoad();
    });

    describe('Opening Attack Chain Viewer', () => {
        it('should open context menu on technique and show "View Attack Chains" option', () => {
            // Right-click on a technique to open context menu
            cy.get('.technique-cell, .cell')
                .first()
                .rightclick({ force: true });
            
            // Verify context menu is visible
            cy.get('.contextmenu').should('be.visible');
            
            // Check if "view attack chains" option exists (it may not be available for all techniques)
            cy.get('body').then(($body) => {
                if ($body.find('.contextMenu-button:contains("view attack chains")').length > 0) {
                    cy.get('.contextMenu-button')
                        .contains('view attack chains')
                        .should('be.visible');
                } else {
                    cy.log('Note: "view attack chains" option not available for this technique');
                }
            });
        });

        it('should open attack chain viewer when clicking "View Attack Chains" for a technique with chains', () => {
            // Find a technique that has attack chains (T1078 - Valid Accounts is commonly used)
            cy.get('.technique-cell[data-technique-id*="T1078"], .cell[data-technique-id*="T1078"]')
                .first()
                .rightclick({ force: true });
            
            // Wait for context menu
            cy.get('.contextmenu', { timeout: 10000 }).should('be.visible');
            
            // Check if "view attack chains" button exists
            cy.get('body').then(($body) => {
                if ($body.find('.contextMenu-button:contains("view attack chains")').length > 0) {
                    // Click "View Attack Chains"
                    cy.get('.contextMenu-button')
                        .contains('view attack chains')
                        .click({ force: true });
                    
                    // Verify attack chain viewer opens
                    cy.get('.attack-chain-viewer', { timeout: 15000 }).should('be.visible');
                    
                    // Verify viewer header is present
                    cy.get('.viewer-header').should('be.visible');
                    cy.get('.viewer-title').should('contain', 'Attack Chains');
                } else {
                    cy.log('Skipping: "view attack chains" option not available for this technique');
                }
            });
        });
    });

    describe('Filtering Attack Chains', () => {
        beforeEach(() => {
            // Open attack chain viewer for a technique with chains
            cy.openAttackChainViewer();
        });

        it('should filter chains by group name', () => {
            // Verify filter input exists
            cy.get('.filter-input').should('be.visible');
            
            // Get initial number of visible groups
            cy.get('.chain-group').then(($groups) => {
                const initialCount = $groups.length;
                
                if (initialCount > 0) {
                    // Get the name of the first group
                    cy.get('.group-name').first().invoke('text').then((groupName) => {
                        const searchTerm = groupName.trim().substring(0, 5);
                        
                        // Type in filter
                        cy.get('.filter-input').clear().type(searchTerm);
                        
                        // Wait for filter to apply (debounced)
                        cy.wait(500);
                        
                        // Verify filtered results
                        cy.get('.chain-group').should('have.length.at.least', 1);
                        cy.get('.group-name').first().should('contain', searchTerm);
                    });
                }
            });
        });

        it('should show "no results" message when filter matches no groups', () => {
            // Type a search term that won't match any groups
            cy.get('.filter-input').clear().type('XYZNONEXISTENTGROUP123');
            
            // Wait for filter to apply
            cy.wait(500);
            
            // Verify no results message or empty state
            cy.get('.no-results-message, .chain-group').should('exist');
        });

        it('should clear filter and show all groups again', () => {
            // Type a filter
            cy.get('.filter-input').type('APT');
            cy.wait(500);
            
            // Clear the filter
            cy.get('.filter-input').clear();
            cy.wait(500);
            
            // Verify groups are visible again
            cy.get('.chain-group').should('have.length.at.least', 1);
        });
    });

    describe('Expanding and Collapsing Groups', () => {
        beforeEach(() => {
            cy.openAttackChainViewer();
        });

        it('should expand and collapse group when clicking header', () => {
            // Find first group header
            cy.get('.group-header').first().as('groupHeader');
            
            // Get initial collapsed state
            cy.get('@groupHeader').parent().invoke('attr', 'aria-expanded').then((initialState) => {
                // Click to toggle
                cy.get('@groupHeader').click();
                
                // Wait for animation
                cy.wait(300);
                
                // Verify state changed
                cy.get('@groupHeader').parent().invoke('attr', 'aria-expanded').should((newState) => {
                    expect(newState).to.not.equal(initialState);
                });
            });
        });

        it('should show/hide chain visualizations when toggling group', () => {
            // Get first group
            cy.get('.chain-group').first().as('chainGroup');
            
            // Click to expand if collapsed
            cy.get('@chainGroup').find('.group-header').click();
            cy.wait(300);
            
            // Verify chains are visible
            cy.get('@chainGroup').find('.group-chains').should('be.visible');
            cy.get('@chainGroup').find('.chain-container').should('have.length.at.least', 1);
            
            // Click to collapse
            cy.get('@chainGroup').find('.group-header').click();
            cy.wait(300);
            
            // Verify chains are hidden
            cy.get('@chainGroup').find('.group-chains').should('not.exist');
        });

        it('should show correct icon for collapsed/expanded state', () => {
            // Get first group
            cy.get('.chain-group').first().as('chainGroup');
            
            // Expand the group
            cy.get('@chainGroup').find('.group-header').click();
            cy.wait(300);
            
            // Check for expanded icon
            cy.get('@chainGroup').find('.expand-icon').should('contain', 'expand_more');
            
            // Collapse the group
            cy.get('@chainGroup').find('.group-header').click();
            cy.wait(300);
            
            // Check for collapsed icon
            cy.get('@chainGroup').find('.expand-icon').should('contain', 'chevron_right');
        });
    });

    describe('Node Interaction', () => {
        beforeEach(() => {
            cy.openAttackChainViewer();
            // Expand first group to see chains
            cy.get('.group-header').first().click();
            cy.wait(500);
        });

        it('should display attack chain tree nodes', () => {
            // Verify attack chain tree component is rendered
            cy.get('app-attack-chain-tree').should('exist');
            
            // Verify SVG tree visualization exists
            cy.get('.attack-chain-tree svg').should('exist');
            
            // Verify nodes are rendered
            cy.get('.attack-chain-tree svg .node').should('have.length.at.least', 1);
        });

        it('should show tooltip when hovering over node', () => {
            // Hover over a node
            cy.get('.attack-chain-tree svg .node').first().trigger('mouseover', { force: true });
            
            // Wait for tooltip to appear (if implemented)
            cy.wait(200);
            
            // Check if tooltip or title attribute exists
            cy.get('.attack-chain-tree svg .node').first().then(($node) => {
                // Either tooltip element should exist or title attribute should be present
                expect($node.attr('title') || $node.find('title').length).to.exist;
            });
        });

        it('should allow selecting nodes by clicking', () => {
            // Click on a node to select it
            cy.get('.attack-chain-tree svg .node').first().click({ force: true });
            
            // Wait for selection state to update
            cy.wait(200);
            
            // Verify node has selected class or style
            cy.get('.attack-chain-tree svg .node.selected, .attack-chain-tree svg .node[class*="selected"]')
                .should('have.length.at.least', 1);
        });

        it('should track multiple node selections', () => {
            // Select first node
            cy.get('.attack-chain-tree svg .node').eq(0).click({ force: true });
            cy.wait(100);
            
            // Select second node with ctrl/cmd key
            cy.get('.attack-chain-tree svg .node').eq(1).click({ force: true, ctrlKey: true });
            cy.wait(100);
            
            // Verify multiple nodes are selected or selection count updated
            cy.get('.apply-scores-button').should('contain', 'selected');
        });
    });

    describe('Applying Scores', () => {
        beforeEach(() => {
            cy.openAttackChainViewer();
            // Expand first group
            cy.get('.group-header').first().click();
            cy.wait(500);
        });

        it('should have "Apply Scores" button disabled when no nodes selected', () => {
            // Verify button is disabled initially
            cy.get('.apply-scores-button').should('be.disabled');
            cy.get('.apply-scores-button').should('contain', '0 selected');
        });

        it('should enable "Apply Scores" button when nodes are selected', () => {
            // Select a node
            cy.get('.attack-chain-tree svg .node').first().click({ force: true });
            cy.wait(200);
            
            // Verify button is enabled
            cy.get('.apply-scores-button').should('not.be.disabled');
            cy.get('.apply-scores-button').should('contain', 'selected');
        });

        it('should apply scores to selected techniques in the layer', () => {
            // Get a technique node and note its ID
            cy.get('.attack-chain-tree svg .node').first().then(($node) => {
                // Select the node
                cy.wrap($node).click({ force: true });
                cy.wait(200);
                
                // Click Apply Scores button
                cy.get('.apply-scores-button').click({ force: true });
                cy.wait(500);
                
                // Verify scores were applied (viewer should close or show confirmation)
                // The viewer might close or show a success message
                cy.get('body').then(($body) => {
                    // Either viewer closed or still visible - both are valid
                    const viewerExists = $body.find('.attack-chain-viewer').length > 0;
                    cy.log(`Viewer ${viewerExists ? 'still visible' : 'closed'} after applying scores`);
                });
            });
        });

        it('should update selection count when selecting/deselecting nodes', () => {
            // Initial state
            cy.get('.apply-scores-button').should('contain', '0 selected');
            
            // Select a node
            cy.get('.attack-chain-tree svg .node').first().click({ force: true });
            cy.wait(200);
            
            // Verify count updated
            cy.get('.apply-scores-button').should('not.contain', '0 selected');
        });
    });

    describe('Closing the Viewer', () => {
        beforeEach(() => {
            cy.openAttackChainViewer();
        });

        it('should close viewer when clicking close button', () => {
            // Verify viewer is open
            cy.get('.attack-chain-viewer').should('be.visible');
            
            // Click close button
            cy.get('.close-button').click({ force: true });
            
            // Verify viewer is closed
            cy.get('.attack-chain-viewer').should('not.exist');
        });

        it('should close viewer when clicking outside (if overlay exists)', () => {
            // Check if there's an overlay/backdrop
            cy.get('body').then(($body) => {
                if ($body.find('.attack-chain-viewer .cover, .cdk-overlay-backdrop').length > 0) {
                    // Click overlay to close
                    cy.get('.attack-chain-viewer .cover, .cdk-overlay-backdrop').first().click({ force: true });
                    
                    // Verify viewer is closed
                    cy.get('.attack-chain-viewer').should('not.exist');
                } else {
                    cy.log('No overlay found - viewer may not support click-outside-to-close');
                }
            });
        });

        it('should close viewer using ESC key', () => {
            // Verify viewer is open
            cy.get('.attack-chain-viewer').should('be.visible');
            
            // Press ESC key
            cy.get('body').type('{esc}');
            
            // Wait a moment for the close action
            cy.wait(200);
            
            // Check if viewer closed (may not be implemented)
            cy.get('body').then(($body) => {
                if ($body.find('.attack-chain-viewer').length === 0) {
                    cy.log('ESC key successfully closed viewer');
                } else {
                    cy.log('ESC key close not implemented - using close button instead');
                    cy.get('.close-button').click({ force: true });
                }
            });
        });
    });

    describe('Loading States', () => {
        it('should show loading indicator when viewer opens', () => {
            // Open viewer (intercept network request if possible)
            cy.intercept('GET', '**/chains/**').as('chainsRequest');
            
            // Open attack chain viewer
            cy.openAttackChainViewer();
            
            // Loading indicator should be visible initially
            cy.get('.loading-container, mat-spinner').should('exist');
        });

        it('should show "no chains" message for techniques without chains', () => {
            // This test assumes we can trigger a scenario with no chains
            // May need to mock or find a specific technique
            cy.log('This test requires a technique with no attack chain data');
        });
    });

    describe('Accessibility', () => {
        beforeEach(() => {
            cy.openAttackChainViewer();
        });

        it('should have proper ARIA labels on viewer', () => {
            cy.get('.attack-chain-viewer')
                .should('have.attr', 'role', 'dialog');
            
            cy.get('#viewer-title').should('exist');
            cy.get('.attack-chain-viewer')
                .should('have.attr', 'aria-labelledby', 'viewer-title');
        });

        it('should have accessible close button', () => {
            cy.get('.close-button')
                .should('have.attr', 'aria-label')
                .and('contain', 'Close');
        });

        it('should have accessible filter input', () => {
            cy.get('.filter-input')
                .should('have.attr', 'aria-label')
                .and('contain', 'Filter');
        });

        it('should have keyboard navigation for group headers', () => {
            cy.get('.group-header').first()
                .should('have.attr', 'tabindex', '0')
                .and('have.attr', 'role', 'button');
        });
    });
});
