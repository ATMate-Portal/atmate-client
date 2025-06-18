/**
 * @file cypress/e2e/GetClients.cy.ts
 * Este ficheiro contém um teste simples para navegar para /clients e pesquisar por um nome
 * de uma sessão de utilizador: login e logout.
 */
describe('Fluxo de Clientes', () => {

  // O bloco 'beforeEach' é executado uma vez antes de cada teste ('it') neste ficheiro.
  beforeEach(() => {
    // --- PASSO 1: Fazer Login ---
    //Chama o comando personalidado para iniciar sessão
    cy.login();

    // --- PASSO 2: Navegar para a página de clientes ---
    cy.visit('/clients');
  });

  it('deve exibir a tabela de clientes após o carregamento da página', () => {
    // --- PASSO 3: Verificar se estamos na página correta ---
    // Verifica se existe o botão "Adiciona cliente"
    cy.contains('Adicionar cliente').should('be.visible');

    // Verifica se a tabela de clientes existe
    cy.get('.table').should('be.visible');
  });

  it('deve permitir pesquisar por um cliente e encontrar o resultado correto', () => {
    // --- PASSO 4: Pesquisar cliente por nome ---
    const clientName = 'Tiago Manuel';

    // Encontra a barra de pesquisa e digita o nome do cliente.
    cy.get('input[placeholder*="Pesquisar por nome"]').type(clientName);

    // Faz uma pausa para dar tempo que o request termine
    cy.wait(1000);

    // Verifica se o nome do cliente pesquisado está visível na primeira linha.
    cy.get('.table tbody tr').first().contains(clientName, { matchCase: false }).should('be.visible');
  });

});
