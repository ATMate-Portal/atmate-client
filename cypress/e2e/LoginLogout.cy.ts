/**
 * @file cypress/e2e/LoginLogout.cy.ts
 * Este ficheiro contém um teste simples para validar o fluxo completo
 * de uma sessão de utilizador: login e logout.
 */

describe('Gestão de Sessão do Utilizador', () => {

  /**
   * Teste de login e logout
   */
  it('deve permitir que um utilizador faça login e logout com sucesso', () => {
    
    // --- PASSO 1: Fazer Login ---
    //Chama o comando personalidado para iniciar sessão
    cy.login();

    // --- PASSO 2: Verificar o Estado Autenticado ---
    cy.visit('/');

    // Pelo browser foi obtido manualmente o xpath do elemento da side bar "Página Principal"
    // Valida ainda assim se tem a classe de active 
    cy.xpath('/html/body/div/div/div/ul[1]/li[1]/a').should('have.class', 'active');
    
    // --- PASSO 3: Fazer Logout ---
    // Chama o comando personalizado de terminar sessão
    cy.logout();

    // --- PASSO 4: Verificar o Estado Não Autenticado ---
    cy.contains('button', 'Entrar').should('be.visible');
  });

});
