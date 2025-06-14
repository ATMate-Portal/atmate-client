const ENV = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8180",
  };

console.log("🔍 URL carregada dentro do config.ts:", ENV.API_BASE_URL);
  
export default ENV;

//O Vite usa variáveis de ambiente do ficheiro .env (VITE_API_BASE_URL).
//Se nenhuma variável for definida, usa http://localhost:8180 por padrão.


// COMANDOS PARA EXECUTAR APP
//  - EM DEV: npm run dev
//  - EM PRD: npm run build; npm run preview
// -----
//  - EM DEBUG: npx vite --debug