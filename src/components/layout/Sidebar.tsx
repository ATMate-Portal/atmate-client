import React, { useState, useEffect, useContext } from "react";
// Componentes de layout da biblioteca 'reactstrap' para criar a estrutura da navegação.
import { Nav, NavItem } from "reactstrap";
// Componentes do 'react-router-dom' para navegação e para detetar a rota ativa.
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Sidebar.css";
import { AuthContext } from '../../api/AuthContext';


/**
 * @component Sidebar
 * A barra de navegação lateral da aplicação.
 * É responsável por apresentar os links de navegação principais, o logo,
 * e as opções de utilizador como 'Definições' e 'Sair'.
 * A barra pode ser expandida ou recolhida.
 */
const Sidebar: React.FC = () => {
    // O hook 'useLocation' obtém o objeto da localização atual,
    // que é usado para saber qual a rota ativa e destacá-la no menu.
    const location = useLocation();

    // Estado para controlar se a barra lateral está recolhida ou expandida.
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Efeito que é executado sempre que o estado 'isCollapsed' muda.
    // Adiciona ou remove uma classe no 'body' do documento, permitindo que os estilos
    // CSS globais se adaptem quando a barra lateral está recolhida.
    useEffect(() => {
        document.body.classList.toggle("sidebar-collapsed", isCollapsed);
    }, [isCollapsed]);

    /**
     * @function toggleSidebar
     * Inverte o estado 'isCollapsed', expandindo ou recolhendo a barra lateral.
     */
    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    // Obtém AuthContext poder chamar a função de logout.
    const authContext = useContext(AuthContext);

    /**
     * @function handleLogout
     * Chamada quando o link 'Sair' é clicado.
     * Invoca a função 'logout' do AuthContext para terminar a sessão.
     */
    const handleLogout = () => {
        if (authContext) {
            authContext.logout();
        } else {
            // Fallback caso o contexto, por algum motivo, não esteja disponível.
            console.error("AuthContext não encontrado para efetuar o logout.");
        }
    };

    return (
        // A classe do contentor principal muda dinamicamente com o estado 'isCollapsed'.
        <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {/* O logo é um link para a página inicial. */}
                <Link to="/">
                    <div className="profile-container">
                        {/* O logo exibido muda se a barra está recolhida ou expandida. */}
                        <img
                            src={isCollapsed ? "/logo_azul_cut.svg" : "/logo_azul.svg"}
                            alt="Logótipo da Aplicação"
                            className={isCollapsed ? "profile-pic-collapse" : "profile-pic-expand"}
                        />
                    </div>
                </Link>

                {/* Botão para alternar o estado da barra lateral. */}
                <button
                    className="collapse-toggle"
                    onClick={toggleSidebar}
                    aria-label="Alternar Barra Lateral"
                >
                    {/* O ícone do botão muda para indicar a ação (abrir/fechar). */}
                    <i className={`fas ${isCollapsed ? "fa-chevron-right" : "fa-chevron-left"}`} />
                </button>
            </div>

            {/* Menu de navegação principal */}
            <Nav vertical className="nav-menu">
                {/* Cada NavItem contém um Link para uma rota específica. */}
                <NavItem>
                    {/* A classe 'active' é aplicada se o 'pathname' atual corresponder à rota do link. */}
                    <Link
                        to="/"
                        className={`nav-link-custom ${location.pathname === "/" ? "active" : ""}`}
                    >
                        <i className="fas fa-home"></i>
                        {/* O texto do link só é renderizado se a barra não estiver recolhida. */}
                        {!isCollapsed && <span>PÁGINA INICIAL</span>}
                    </Link>
                </NavItem>
                <hr className="nav-divider" />
                <NavItem>
                    <Link
                        to="/taxes"
                        className={`nav-link-custom ${location.pathname.startsWith("/taxes") ? "active" : ""}`}
                    >
                        <i className="fas fa-money-bill"></i>
                        {!isCollapsed && <span>OBRIG. FISCAIS</span>}
                    </Link>
                </NavItem>
                <hr className="nav-divider" />
                <NavItem>
                    <Link
                        to="/clients"
                        className={`nav-link-custom ${location.pathname.startsWith("/clients") ? "active" : ""}`}
                    >
                        <i className="fas fa-user"></i>
                        {!isCollapsed && <span>CLIENTES</span>}
                    </Link>
                </NavItem>
            </Nav>

            {/* Menu de navegação inferior, geralmente para opções secundárias. */}
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
                {/* Link de Logout */}
                <NavItem>
                    {/* Usar uma tag <a> com um onClick é uma abordagem comum para ações que não são de navegação direta. */}
                    <a
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleLogout(); }} // Previne o comportamento padrão do link.
                        className="nav-link-custom"
                        role="button" // Melhora a acessibilidade, indicando que é um elemento interativo.
                        title="Terminar Sessão"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        {!isCollapsed && <span style={{ marginLeft: '0.5rem' }}>SAIR</span>}
                    </a>
                </NavItem>
            </Nav>
        </div>
    );
};

export default Sidebar;
