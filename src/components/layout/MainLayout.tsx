// src/components/layout/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // O teu componente Sidebar
// import Navbar from './Navbar'; // Se tiveres uma Navbar também

const MainLayout: React.FC = () => {
  return (
    <div className="app-wrapper"> {/* Podes manter ou ajustar esta classe */}
      <Sidebar />
      <main className="app-main"> {/* Esta classe pode vir do teu App.css */}
        <Outlet /> {/* As rotas filhas serão renderizadas aqui */}
      </main>
    </div>
  );
};

export default MainLayout;