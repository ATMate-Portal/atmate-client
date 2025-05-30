import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi'; // Assumindo hook existente
import TaxesTable from '../components/TaxesTable'; // Assumindo componente existente
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faMapMarkerAlt, faPhone, faFileInvoiceDollar,
    faUser, faIdCard, faCalendar, faGlobe, faBuilding, faSpinner,
    faExclamationTriangle, faSyncAlt, faTrashAlt,
    faChevronDown, faBell
} from '@fortawesome/free-solid-svg-icons';

// Importar o CSS encapsulado
import './ClientProfilePage.css';

// --- Interfaces (mantidas) ---
interface AddressDTO { id: number; street: string; doorNumber: string; zipCode: string; city: string; county: string; district: string; parish: string; country: string; addressTypeName: string; }
interface ContactDTO { id: number; contactTypeName: string; contact: string; description: string; }
interface TaxDTO { identificadorUnico: string; tipo: string; dataLimite: string; clientName: string; valor: string; estado: string; json: string; }
interface NotificationDTO { clientId: number; notificationType: string; taxType: string; status: string; title: string; message: string; sendDate: string; }
interface ClientDetails { id: number; name: string; nif: number; gender: string; nationality: string; associatedColaborator: string; birthDate: string; addresses: AddressDTO[]; contacts: ContactDTO[]; taxes: TaxDTO[]; notifications: NotificationDTO[];}

// --- Configuração ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ClientProfilePage() {
    console.log("ClientProfilePage RENDERED"); // Log para depuração

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: client, loading, error } = useApi<ClientDetails>(id ? `atmate-gateway/clients/${id}` : '');


    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('#pessoal');
    const headerRef = useRef<HTMLElement>(null);
    const [headerHeight, setHeaderHeight] = useState(65);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Refs para controlar o scroll e observer
    const isScrollingProgrammatically = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

    // Callbacks memoizadas para passar ao TaxesTable
    const handleModalOpen = useCallback(() => setIsTaxModalOpen(true), []);
    const handleModalClose = useCallback(() => setIsTaxModalOpen(false), []);

    // Função para formatar data e hora (similar ao seu formatDateTime)
    const formatDateTimeForTable = (dateString: string | null): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('pt-PT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            });
        } catch (e) {
            return dateString;
        }
    };

    // Função para extrair a <div class="details"> do HTML de um email
    const extractDetailsDivHtml = (fullHtmlString: string): string | null => {
        if (!fullHtmlString || typeof fullHtmlString !== 'string') {
            return null;
        }
        try {
            const tempElement = document.createElement('div');
            tempElement.innerHTML = fullHtmlString;
            const detailsDiv = tempElement.querySelector('div.details');
            if (detailsDiv) {
            return detailsDiv.outerHTML;
            }
            return null;
        } catch (error) {
            console.error("Erro ao parsear ou extrair HTML dos detalhes:", error);
            return null;
        }
    };

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight + 5);
        }
    }, [client, loading]);

    // useEffect do Observer (ATIVO, mas com lógica de desativação)
    useEffect(() => {
        if (isTaxModalOpen || !client || loading) {
            if (observerRef.current) {
                console.log("Disconnecting observer..."); // Log
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            return;
        }

        if (observerRef.current) { observerRef.current.disconnect(); }

        console.log("Setting up observer..."); // Log
        const observerOptions = {
            root: null,
            rootMargin: `-${headerHeight}px 0px -35% 0px`,
            threshold: 0.01,
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingProgrammatically.current || isTaxModalOpen) return;

            let currentVisibleEntry: IntersectionObserverEntry | null = null;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    if (!currentVisibleEntry || entry.intersectionRatio > currentVisibleEntry.intersectionRatio) {
                        currentVisibleEntry = entry;
                    }
                }
            }

            if (currentVisibleEntry) {
                const newActiveSection = `#${(currentVisibleEntry.target as Element).id}`;
                setActiveSection(prev => prev !== newActiveSection ? newActiveSection : prev);
            }
        };

        const newObserver = new IntersectionObserver(observerCallback, observerOptions);
        const sections = document.querySelectorAll('.profile-content section[id]');
        sections.forEach(section => newObserver.observe(section));
        observerRef.current = newObserver;

        return () => {
            console.log("Cleaning up observer effect..."); // Log
            newObserver.disconnect();
            if (scrollTimeoutRef.current) { clearTimeout(scrollTimeoutRef.current); }
        };
    }, [client, headerHeight, loading, isTaxModalOpen]);


    // useRef para rastrear o estado de loading anterior
    const prevLoading = useRef(loading);

    // useEffect para `lastUpdated` corrigido para evitar loop
    useEffect(() => {
        if (prevLoading.current === true && loading === false && client && !error) {
            console.log("Setting lastUpdated because loading finished."); // Log
            setLastUpdated(new Date().toISOString());
        }
        prevLoading.current = loading;
    }, [client, loading, error]);

    const handleRefresh = useCallback(async () => {
        if (!id || isRefreshing) return;
        setIsRefreshing(true);
        setDeleteError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            window.location.reload();
        } catch (reloadError) {
            console.error("Erro ao tentar recarregar a página:", reloadError);
            setIsRefreshing(false);
        }
    }, [id, isRefreshing]);

    const handleDeleteClient = useCallback(async () => {
        const confirmation = window.confirm(`Tem a certeza que deseja apagar o cliente "${client?.name}" (ID: ${id})? Esta ação não pode ser revertida.`);
        if (confirmation && id) {
            setIsDeleting(true);
            setDeleteError(null);
            try {
                const response = await fetch(`${API_BASE_URL}atmate-gateway/clients/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', },
                });
                if (!response.ok) {
                    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
                    try {
                        const errorBody = await response.json();
                        errorMsg = errorBody.message || errorBody.error || JSON.stringify(errorBody) || errorMsg;
                    } catch (e) { /* Ignora */ }
                    throw new Error(errorMsg);
                }
                alert(`Cliente "${client?.name}" apagado com sucesso.`);
                navigate('/clients');
            } catch (err: any) {
                console.error("Erro ao apagar cliente:", err);
                setDeleteError(err.message || 'Ocorreu um erro desconhecido ao apagar o cliente.');
            } finally {
                setIsDeleting(false);
            }
        }
    }, [id, navigate, client?.name]);

    const getNavLinkClass = (hash: string): string => {
        return `profile-nav-link ${activeSection === hash ? 'active' : ''}`;
    };

    const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
        event.preventDefault();

        setActiveSection(sectionId);
        isScrollingProgrammatically.current = true;

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        const sectionElement = document.getElementById(sectionId.substring(1));
        if (sectionElement) {
            const sectionTop = sectionElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: sectionTop, behavior: 'smooth' });

            scrollTimeoutRef.current = setTimeout(() => {
                isScrollingProgrammatically.current = false;
            }, 700);
        } else {
            isScrollingProgrammatically.current = false;
        }
    };

    // useMemo para estabilizar a prop `lastUpdated` formatada
    const formattedLastUpdated = useMemo(() => {
        return lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
            : null;
    }, [lastUpdated]);

    // --- Renderização Condicional Inicial ---
    if (!id) {
        return (
            <div className="client-profile-state-container">
                <div className="no-id-content">
                    <div className="message-card error">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <p>ID do cliente não fornecido na URL.</p>
                        <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm">
                            Voltar à Lista
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading && !client) {
        return (
            <div className="client-profile-state-container">
                <div className="loading-content">
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" color="var(--primary-color)" />
                    <p>A carregar perfil do cliente...</p>
                </div>
            </div>
        );
    }

    if (error && !loading && !client) {
        return (
            <div className="client-profile-state-container">
                <div className="error-content">
                    <div className="message-card error">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <p>Erro ao carregar o perfil.</p>
                        <p className="error-details">{error ? String(error) : 'Verifique a sua ligação ou tente mais tarde.'}</p>
                        <button onClick={handleRefresh} className="btn btn-primary btn-sm" disabled={isRefreshing}>
                            <FontAwesomeIcon icon={isRefreshing ? faSpinner : faSyncAlt} spin={isRefreshing} /> Tentar Novamente
                        </button>
                        <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm mt-2">
                            Voltar à Lista
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Layout Principal ---
    return (
        <div className="client-profile-main-container">
            <div className="client-profile-page">
                <header className="profile-header sticky-top" ref={headerRef}>
                    <div className="header-main-content">
                        <button onClick={() => navigate('/clients')} className="btn btn-tertiary back-button" aria-label="Voltar à lista de clientes">
                            <FontAwesomeIcon icon={faArrowLeft} /> <span>Lista de Clientes</span>
                        </button>
                        <nav className="profile-nav-links">
                            {client && (
                                <>
                                    <a href="#pessoal" onClick={(e) => scrollToSection(e, '#pessoal')} className={getNavLinkClass('#pessoal')}>Pessoal</a>
                                    <a href="#moradas" onClick={(e) => scrollToSection(e, '#moradas')} className={getNavLinkClass('#moradas')}>Moradas</a>
                                    <a href="#contactos" onClick={(e) => scrollToSection(e, '#contactos')} className={getNavLinkClass('#contactos')}>Contactos</a>
                                    <a href="#impostos" onClick={(e) => scrollToSection(e, '#impostos')} className={getNavLinkClass('#impostos')}>Impostos</a>
                                    <a href="#notifications" onClick={(e) => scrollToSection(e, '#notifications')} className={getNavLinkClass('#notifications')}>Notificações</a>
                                </>
                            )}
                        </nav>
                        <div className="header-actions-info">
                            {lastUpdated && !isRefreshing && (
                                <span className="last-updated-info" title={`Atualizado em ${new Date(lastUpdated).toLocaleString('pt-PT')}`}>
                                    Atualizado {formattedLastUpdated}
                                </span>
                            )}
                            {isRefreshing && (
                                <span className="last-updated-info">
                                    <FontAwesomeIcon icon={faSpinner} spin /> Atualizando...
                                </span>
                            )}
                            <button onClick={handleRefresh} className="btn btn-icon btn-tertiary" aria-label="Atualizar" disabled={isRefreshing || isDeleting} title="Atualizar Dados">
                                <FontAwesomeIcon icon={faSyncAlt} />
                            </button>
                            <button
                                onClick={handleDeleteClient}
                                className="btn btn-icon btn-danger-subtle"
                                aria-label="Apagar Cliente"
                                disabled={isDeleting || isRefreshing || !client}
                                title="Apagar Cliente"
                            >
                                <FontAwesomeIcon icon={isDeleting ? faSpinner : faTrashAlt} spin={isDeleting} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="profile-content" style={{ paddingTop: `${headerHeight}px` }} key={id}>
                    {client && (
                        <div className="profile-subheader">
                            <h1>{client.name}</h1>
                            <span className="client-nif">NIF: {client.nif}</span>
                        </div>
                    )}

                    {loading && client && ( // Loading de atualização, não o inicial
                        <div className="inline-message loading">
                            <FontAwesomeIcon icon={faSpinner} spin /> A atualizar dados...
                        </div>
                    )}
                    {error && !loading && client && (
                        <div className="inline-message error">
                            <FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar atualizações ({error ? String(error) : 'Tente novamente'}).
                            <button onClick={handleRefresh} className="btn btn-danger btn-xs ml-2" disabled={isRefreshing || isDeleting}>
                                Tentar Novamente
                            </button>
                        </div>
                    )}
                    {deleteError && (
                        <div className="inline-message error">
                            <FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao apagar: {deleteError}
                        </div>
                    )}
                    {!loading && !error && !client && !deleteError && (
                        <div className="message-card info">
                            <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                            <p>Os dados do cliente não foram encontrados ou não estão disponíveis.</p>
                            <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm mt-2"> Voltar à Lista </button>
                        </div>
                    )}

                    {client && (
                        <>
                            <section id="pessoal" className="profile-section">
                                <div className="section-content personal-info-list">
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faIdCard} /> Nome</span> <span className="info-value">{client.name}</span> </div>
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faIdCard} /> NIF</span> <span className="info-value">{client.nif}</span> </div>
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faUser} /> Género</span> <span className="info-value">{client.gender}</span> </div>
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faGlobe} /> Nacionalidade</span> <span className="info-value">{client.nationality}</span> </div>
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faCalendar} /> Data Nasc.</span> <span className="info-value">{client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-PT') : '-'}</span> </div>
                                    <div className="info-item"> <span className="info-label"><FontAwesomeIcon icon={faBuilding} /> Colaborador</span> <span className="info-value">{client.associatedColaborator || '-'}</span> </div>
                                </div>
                            </section>

                            <section id="moradas" className="profile-section">
                                <header className="section-header"> <h2><FontAwesomeIcon icon={faMapMarkerAlt} /> Moradas</h2> </header>
                                <div className="section-content content-no-padding">
                                    {client.addresses && client.addresses.length > 0 ? (
                                        <div className="table-responsive-wrapper">
                                            <table className="data-table">
                                                <thead><tr><th>Tipo</th><th>Morada</th><th>Localidade</th><th>Código Postal</th><th>País</th></tr></thead>
                                                <tbody>{client.addresses.map(addr => (<tr key={addr.id}><td><span className="badge badge-subtle">{addr.addressTypeName}</span></td><td>{addr.street}, {addr.doorNumber}</td><td>{addr.city}</td><td>{addr.zipCode}</td><td>{addr.country}</td></tr>))}</tbody>
                                            </table>
                                        </div>
                                    ) : ( <div className="empty-state"><FontAwesomeIcon icon={faMapMarkerAlt} size="3x" className="empty-state-icon"/><p>Sem moradas registadas.</p></div> )}
                                </div>
                            </section>

                            <section id="contactos" className="profile-section">
                                <header className="section-header"> <h2><FontAwesomeIcon icon={faPhone} /> Contactos</h2> </header>
                                <div className="section-content content-no-padding">
                                    {client.contacts && client.contacts.length > 0 ? (
                                        <div className="table-responsive-wrapper">
                                            <table className="data-table">
                                                <thead><tr><th>Tipo</th><th>Contacto</th><th>Descrição</th></tr></thead>
                                                <tbody>{client.contacts.map(contact => (<tr key={contact.id}><td><span className="badge badge-subtle">{contact.contactTypeName}</span></td><td>{contact.contact}</td><td>{contact.description || '-'}</td></tr>))}</tbody>
                                            </table>
                                        </div>
                                    ) : ( <div className="empty-state"><FontAwesomeIcon icon={faPhone} size="3x" className="empty-state-icon"/><p>Sem contactos registados.</p></div> )}
                                </div>
                            </section>

                            <section id="impostos" className="profile-section">
                                <header className="section-header"> <h2><FontAwesomeIcon icon={faFileInvoiceDollar} /> Impostos e Obrigações</h2> </header>
                                <div className="section-content">
                                    <div className="table-responsive-wrapper">
                                        <TaxesTable
                                            obrigações={client.taxes || []}
                                            loading={loading && !!client}
                                            error={error ? 'Erro ao carregar' : ''}
                                            onRefresh={handleRefresh}
                                            lastUpdated={formattedLastUpdated} // <-- Usa a prop memoizada
                                            isRefreshing={isRefreshing}
                                            onModalOpen={handleModalOpen}
                                            onModalClose={handleModalClose}
                                        />
                                    </div>
                                    {!loading && client.taxes?.length === 0 && (
                                        <div className="empty-state">
                                            <FontAwesomeIcon icon={faFileInvoiceDollar} size="3x" className="empty-state-icon"/>
                                            <p>Sem impostos ou obrigações registadas.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section id="notifications" className="profile-section">
                                    <header className="section-header"> <h2><FontAwesomeIcon icon={faBell} /> Notificações</h2> </header>
                                        <div className="messages-history-table-container"> {/* Usando classes do seu exemplo */}
                                            <table className="messages-history-table">
                                            <thead>
                                                <tr>
                                                <th>Cliente (ID)</th>
                                                <th>Data Envio</th>
                                                <th>Status</th>
                                                <th>Título</th>
                                                <th>Mensagem</th>
                                                {/* Coluna "Tipo Notif." e "Tipo Imposto" podem ser adicionadas se desejado */}
                                                {/* Ex: <th>Tipo Notificação</th> */}
                                                {/* Ex: <th>Tipo Imposto</th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {client.notifications.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center' }}> {/* Ajuste colSpan conforme o nº de colunas */}
                                                    Não existem notificações para apresentar.
                                                    </td>
                                                </tr>
                                                ) : (
                                                client.notifications.map((notification, index) => {
                                                    let messageContent: React.ReactNode;
                                                    // Assume-se que notification.notificationType será algo como "Email", "SMS", etc.
                                                    if (notification.notificationType?.toLowerCase().includes('email')) {
                                                    const detailsHtml = extractDetailsDivHtml(notification.message);
                                                    if (detailsHtml) {
                                                        messageContent = <div dangerouslySetInnerHTML={{ __html: detailsHtml }} />;
                                                    } else {
                                                        const fallbackText = notification.message?.replace(/<[^>]+>/g, '').trim() || '';
                                                        messageContent = (
                                                        fallbackText.length > 150
                                                            ? `${fallbackText.substring(0, 147)}...`
                                                            : fallbackText || "Conteúdo do email indisponível."
                                                        );
                                                    }
                                                    } else {
                                                    const plainMessage = notification.message || '';
                                                    messageContent = (
                                                        plainMessage.length > 150
                                                        ? `${plainMessage.substring(0, 147)}...`
                                                        : plainMessage
                                                    );
                                                    }

                                                    return (
                                                    <tr key={notification.clientId + '-' + index}> {/* Chave pode precisar ser mais robusta se houver IDs de notificação */}
                                                        <td data-label="Cliente (ID)">{notification.clientId}</td>
                                                        <td data-label="Data Envio">{formatDateTimeForTable(notification.sendDate)}</td>
                                                        <td data-label="Status">
                                                        <span className={`status-message ${notification.status?.toLowerCase()}`}>
                                                            {notification.status || 'N/D'}
                                                        </span>
                                                        </td>
                                                        <td data-label="Título">{notification.title || '-'}</td>
                                                        <td data-label="Mensagem" className="message-content-cell">
                                                        {messageContent}
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                                )}
                                            </tbody>
                                            </table>
                                        </div>
                            </section>            

                        </>
                    )}
                </main>
            </div>
        </div>
    );
}