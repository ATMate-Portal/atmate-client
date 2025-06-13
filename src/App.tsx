// Importa os estilos globais que serão aplicados em toda a aplicação.
import "./App.css";

// Importa os componentes necessários do React Router e do Contexto de Autenticação.
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/Router";
import { AuthProvider } from "./api/AuthContext"; 

/**
 * @component App
 * O componente raiz da aplicação.
 */
function App() {
  return (
    // O AuthProvider envolve toda a aplicação para se aceder ao estado de autenticação 
    <AuthProvider>
      {/* O BrowserRouter habilita a navegação do lado do cliente,
          permitindo que a aplicação mude de "página" sem recarregar o browser. */}
      <BrowserRouter>
        {/* O AppRouter é o componente que contém a lógica de todas as rotas da aplicação*/}
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

