import React from "react";
import { Nav, NavItem } from "reactstrap";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      {/* Título da aplicação */}
      <h1 className="sidebar-title">ATMATE</h1>

      {/* Imagem de perfil */}
      <div className="profile-container">
        <img src="/profile_pic.png" alt="Perfil" className="profile-pic" />
      </div>

      {/* Navegação principal */}
      <Nav vertical className="nav-menu">
        <NavItem>
          <Link to="/" className={`nav-link-custom ${location.pathname === "/" ? "active" : ""}`}>
            <i className="fas fa-home"></i> Página Principal
          </Link>
        </NavItem>
        <NavItem>
          <Link to="/taxes" className={`nav-link-custom ${location.pathname === "/taxes" ? "active" : ""}`}>
            <i className="fas fa-money-bill"></i> Consultar Impostos
          </Link>
        </NavItem>
        <NavItem>
          <Link to="/clients" className={`nav-link-custom ${location.pathname === "/clients" ? "active" : ""}`}>
            <i className="fas fa-user"></i> Gerir Clientes
          </Link>
        </NavItem>
      </Nav>

      {/* Opções no fundo */}
      <Nav vertical className="bottom-options">
        <NavItem>
          <Link to="/settings" className={`nav-link-custom ${location.pathname === "/settings" ? "active" : ""}`}>
            <i className="fas fa-cog"></i> Definições
          </Link>
        </NavItem>
        <NavItem>
          <Link to="/logout" className={`nav-link-custom ${location.pathname === "/logout" ? "active" : ""}`}>
            <i className="fas fa-sign-out-alt"></i> Sair
          </Link>
        </NavItem>
      </Nav>
    </div>
  );
};

export default Sidebar;
