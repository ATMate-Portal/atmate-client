import React from "react";
import { Nav, NavItem } from "reactstrap";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      {/* Imagem de perfil */}
      <div className="profile-container">
        <img src="/logo_azul.svg" alt="Perfil"  />
      </div>

      {/* Título da aplicação 
      <h1 className="sidebar-title">ATMATE</h1>*/}

      {/* Barra decorativa 
      <div className="divider"></div>*/}

      {/* Navegação principal */}
      <Nav vertical className="nav-menu">
        <NavItem>
          <Link
            to="/"
            className={`nav-link-custom ${
              location.pathname === "/" ? "active" : ""
            }`}
          >
            <i className="fas fa-home"></i> PÁGINA INICIAL
          </Link>
        </NavItem>
        <hr className="nav-divider" />
        <NavItem>
          <Link
            to="/taxes"
            className={`nav-link-custom ${
              location.pathname === "/taxes" ? "active" : ""
            }`}
          >
            <i className="fas fa-money-bill"></i> OBRIGAÇÕES FISCAIS
          </Link>
        </NavItem>
        <hr className="nav-divider" />
        <NavItem>
          <Link
            to="/clients"
            className={`nav-link-custom ${
              location.pathname === "/clients" ? "active" : ""
            }`}
          >
            <i className="fas fa-user"></i> CLIENTES
          </Link>
        </NavItem>
      </Nav>

      {/* Opções no fundo */}
      <Nav vertical className="bottom-options">
        <NavItem>
          <Link
            to="/settings"
            className={`nav-link-custom ${
              location.pathname === "/settings" ? "active" : ""
            }`}
          >
            <i className="fas fa-cog"></i> DEFINIÇÕES
          </Link>
        </NavItem>
        <NavItem>
          <Link
            to="/logout"
            className={`nav-link-custom ${
              location.pathname === "/logout" ? "active" : ""
            }`}
          >
            <i className="fas fa-sign-out-alt"></i> SAIR
          </Link>
        </NavItem>
      </Nav>
    </div>
  );
};

export default Sidebar;
