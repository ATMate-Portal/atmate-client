// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

require('cypress-xpath');

// Este bloco declara os seus comandos personalizados para o TypeScript,
// permitindo o autocompletar e a verificação de tipos.
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Comando personalizado para efetuar o login na aplicação.
       * @example cy.login('email@exemplo.com', 'password123')
       */
      login(email?: string, password?: string): Chainable<void>;

      /**
       * Comando personalizado para efetuar o logout da aplicação.
       * @example cy.logout()
       */
      logout(): Chainable<void>;
    }
  }
}
