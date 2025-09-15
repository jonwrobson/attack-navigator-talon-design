// Cypress support file for E2E tests
// You can import custom commands or set global hooks here.
// This file is intentionally minimal.

import './commands';
// Add visual regression command (provides cy.compareSnapshot)
// The package exports the command registrar at dist/command
declare const require: any;
try {
	const compareSnapshotCommand = require('cypress-visual-regression/dist/command');
	// Register the cy.compareSnapshot command
	compareSnapshotCommand();
} catch (e) {
	// If the plugin isn't available, visual regression tests can be skipped safely
}
