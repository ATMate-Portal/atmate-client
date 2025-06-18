// cypress.config.cjs

// Use 'require' em vez de 'import'
const { defineConfig } = require("cypress");

// Use 'module.exports' em vez de 'export default'
module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implemente aqui os seus 'event listeners' de node, se necessário
    },
    // É uma boa prática definir a URL base aqui
    // para que nos testes possa usar cy.visit('/') em vez do URL completo.
    baseUrl: 'http://localhost:5173', // Altere para a porta do seu servidor de desenvolvimento React
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});