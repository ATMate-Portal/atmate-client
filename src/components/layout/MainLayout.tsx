import React from 'react';
import { Outlet } from 'react-router-dom';
// Importa o componente da barra de navegação lateral.
import Sidebar from './Sidebar';

/**
 * @component MainLayout
 * Este componente define a estrutura visual principal para todas as páginas
 * protegidas (que requerem autenticação). 
 */
const MainLayout: React.FC = () => {
  return (
    // 'app-wrapper'= contentor principal
    <div className="app-wrapper">
      <Sidebar />
      <main className="app-main">
        {/* <Outlet> é onde React Router irá renderizar o componente da página correspondente à rota ativa.*/}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
