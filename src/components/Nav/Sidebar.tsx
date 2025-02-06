import React from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Sidebar.css'; // Importe o arquivo CSS

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <Nav vertical>
        <NavItem>
          <NavLink href="#" className="nav-link-custom">
            <i className="fas fa-home" style={{ marginRight: '0.5rem' }}></i> Página Principal
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" className="nav-link-custom">
            <i className="fas fa-money-bill" style={{ marginRight: '0.5rem' }}></i> Consultar Impostos
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" className="nav-link-custom">
            <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i> Gerir Clientes
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" className="nav-link-custom">
            <i className="fas fa-cog" style={{ marginRight: '0.5rem' }}></i> Definições
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink href="#" className="nav-link-custom">
            <i className="fas fa-cog" style={{ marginRight: '0.5rem' }}></i> Sair
          </NavLink>
        </NavItem>
      </Nav>
    </div>
  );
};

export default Sidebar;