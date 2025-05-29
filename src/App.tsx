// App.tsx
import "./App.css"; // Mantém os teus estilos globais
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/Router"; // Renomeado para AppRouter para clareza, ou mantém Router se preferires
import { AuthProvider } from "./api/AuthContext"; // Ajusta o caminho para o teu AuthContext

function App() {
  return (
    <AuthProvider> {/* AuthProvider envolve tudo que precisa do contexto de autenticação */}
      <BrowserRouter>
        <AppRouter /> {/* O teu componente Router que contém as definições de <Routes> */}
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;