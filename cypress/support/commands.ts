/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }



/**
 * Adiciona um novo comando personalizado 'cy.login()' ao Cypress.
 * Este comando executa todo o processo de login
 * @param email - O email do utilizador. Usa um valor do cypress.env.json como fallback.
 * @param password - A password do utilizador. Usa um valor do cypress.env.json como fallback.
 */
Cypress.Commands.add('login', (
  email = Cypress.env('userEmail'), 
  password = Cypress.env('userPassword')
) => {
  // O Cypress irá guardar e restaurar os cookies e o localStorage automaticamente
  // entre os passos do mesmo teste. Para manter a sessão entre *diferentes testes*,
  // usamos cy.session().
  cy.session([email, password], () => {
    // 1. Visita a página de login
    cy.visit('/login');

    // 2. Preenche as credenciais
    cy.get('#email').type(email);
    cy.get('#password').type(password);

    // 3. Submete o formulário
    cy.get('.login-form').submit();

    // 4. Verifica se o login foi bem-sucedido e se fomos redirecionados
    cy.url().should('not.include', '/login'); // Garante que saímos da página de login.
    cy.url().should('include', '/'); // Garante que fomos para a página principal.
  });
});


/**
 * Clica no botão/link de logout e verifica se o utilizador foi redirecionado
 * para a página de login.
 */
Cypress.Commands.add('logout', () => {
  // Encontra o botão/link de logout pelo seu título e clica nele.
  cy.get('a[title="Terminar Sessão"]').click();

  // Verifica se o logout foi bem-sucedido, confirmando que o URL mudou
  // para a página de login.
  cy.url().should('include', '/login');

  // Adicionalmente, verifica se um elemento da página de login está visível.
  cy.get('.login-form').should('be.visible');
});
