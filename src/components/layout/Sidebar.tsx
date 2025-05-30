import React, { useState, useEffect, useContext} from "react";
import { Nav, NavItem } from "reactstrap";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Sidebar.css";
import { AuthContext } from '../../api/AuthContext'; 


const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const authContext = useContext(AuthContext);
  const handleLogout = () => {
    if (authContext) {
      authContext.logout(); // Chama a função de logout do seu contexto
      // Se a sua função auth.logout() não redirecionar automaticamente,
      // você pode adicionar o redirecionamento aqui:
      // navigate('/login');
    } else {
      // Fallback caso o contexto não esteja disponível
      console.error("Contexto de autenticação não encontrado para logout.");
      // Implemente uma lógica de logout manual aqui se necessário
      // localStorage.removeItem('authToken');
      // window.location.href = '/login'; // Redirecionamento forçado
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link to="/">
          <div className="profile-container">
            <img 
              src={isCollapsed ? "/logo_azul_cut.svg" : "/logo_azul.svg"} 
              alt="Perfil" 
              className={isCollapsed ? "profile-pic-collapse" : "profile-pic-expand"}
              />
          </div>
        </Link>

        <button
          className="collapse-toggle"
          onClick={toggleSidebar}
          aria-label="Alternar Sidebar"
        >
          <i className={`fas ${isCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
        </button>
      </div>

      <Nav vertical className="nav-menu">
        <NavItem>
          <Link
            to="/"
            className={`nav-link-custom ${location.pathname === "/" ? "active" : ""}`}
          >
            <i className="fas fa-home"></i>
            {!isCollapsed && <span>PÁGINA INICIAL</span>}
          </Link>
        </NavItem>
        <hr className="nav-divider" />
        <NavItem>
          <Link
            to="/taxes"
            className={`nav-link-custom ${location.pathname === "/taxes" ? "active" : ""}`}
          >
            <i className="fas fa-money-bill"></i>
            {!isCollapsed && <span>OBRIG. FISCAIS</span>}
          </Link>
        </NavItem>
        <hr className="nav-divider" />
        <NavItem>
          <Link
            to="/clients"
            className={`nav-link-custom ${location.pathname === "/clients" ? "active" : ""}`}
          >
            <i className="fas fa-user"></i>
            {!isCollapsed && <span>CLIENTES</span>}
          </Link>
        </NavItem>
      </Nav>

      <Nav vertical className="bottom-options">
        <NavItem>
          <Link
            to="/notifications"
            className={`nav-link-custom ${location.pathname === "/notifications" ? "active" : ""}`}
          >
            <i className="fas fa-bell"></i>
            {!isCollapsed && <span>NOTIFICAÇÕES</span>}
          </Link>
        </NavItem>
        <NavItem>
          <Link
            to="/history"
            className={`nav-link-custom ${location.pathname === "/history" ? "active" : ""}`}
          >
            <i className="fas fa-history"></i>
            {!isCollapsed && <span>HISTÓRICO</span>}
          </Link>
        </NavItem>
        <NavItem>
          <Link
            to="/settings"
            className={`nav-link-custom ${location.pathname === "/settings" ? "active" : ""}`}
          >
            <i className="fas fa-cog"></i>
            {!isCollapsed && <span>DEFINIÇÕES</span>}
          </Link>
        </NavItem>
        <NavItem>
          <a
            href="#" // Necessário para que se pareça e seja tratado como um link por alguns estilos/navegadores
            onClick={handleLogout}
            className="nav-link-custom" // Mantém a classe para estilo consistente
            role="button" // Para acessibilidade, indica que é um elemento interativo como um botão
            title="Terminar Sessão"
            style={{ textDecoration: 'none' }} // Garante que não há sublinhado de link padrão se não desejado
          >
            <i className="fas fa-sign-out-alt"></i> {/* Ícone de logout no formato <i> */}
            {!isCollapsed && <span style={{ marginLeft: '0.5rem' }}>SAIR</span>}
          </a>
        </NavItem>
      </Nav>
    </div>
  );
};

export default Sidebar;
