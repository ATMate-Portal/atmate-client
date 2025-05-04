import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi'; // Assumindo hook existente
import TaxesTable from '../components/TaxesTable'; // Assumindo componente existente
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faMapMarkerAlt, faPhone, faFileInvoiceDollar,
  faUser, faIdCard, faCalendar, faGlobe, faBuilding, faSpinner,
  faExclamationTriangle, faSyncAlt,
  faChevronDown // Ícone exemplo para futuro dropdown
} from '@fortawesome/free-solid-svg-icons';

// Importar o CSS encapsulado
import './ClientProfilePage.css';

// --- Interfaces (mantidas) ---
interface AddressDTO { id: number; street: string; doorNumber: string; zipCode: string; city: string; county: string; district: string; parish: string; country: string; addressTypeName: string; }
interface ContactDTO { id: number; contactTypeName: string; contact: string; description: string; }
interface TaxDTO { identificadorUnico: string; tipo: string; dataLimite: string; clientName: string; valor: string; estado: string; json: string; }
interface ClientDetails { id: number; name: string; nif: number; gender: string; nationality: string; associatedColaborator: string; birthDate: string; addresses: AddressDTO[]; contacts: ContactDTO[]; taxes: TaxDTO[]; }

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Hook API sem refetch
  const { data: client, loading, error } = useApi<ClientDetails>(id ? `atmate-gateway/clients/${id}` : '');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('#pessoal');
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(60); // Estimativa inicial

  // --- Calcular altura do Header ---
  useEffect(() => {
      if (headerRef.current) {
          // Adiciona um pequeno buffer para garantir
          setHeaderHeight(headerRef.current.offsetHeight + 5);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Dependência apenas em client para recalcular quando o header pode mudar

  // --- Efeito para Intersection Observer (destacar link ativo na nav superior) ---
  useEffect(() => {
    // Só executa se tivermos um cliente carregado (para garantir que as seções existem)
    if (!client) return;

    const observerOptions = {
      root: null, // Observa intersecção com o viewport
      rootMargin: `-${headerHeight}px 0px -40% 0px`, // Ajusta a margem superior com base na altura real do header
      threshold: 0, // Ativa assim que qualquer parte entra/sai da margem
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(`#${entry.target.id}`);
        }
      });
       // Fallback: Se nenhuma estiver 'intersecting' (ex: no fundo da página),
       // mantém a última ativa ou vai para a última seção visível (lógica mais complexa opcional)
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = document.querySelectorAll('.profile-content section[id]');
    sections.forEach(section => observer.observe(section));

    // Limpeza ao desmontar
    return () => sections.forEach(section => observer.unobserve(section));
    // Depende de headerHeight para re-observar se a altura mudar
  }, [client, headerHeight]);


  // --- Efeito para atualizar timestamp ---
  useEffect(() => {
    if (client && !loading && !error) {
      setLastUpdated(new Date().toISOString()); // Usar ISO string para consistência
    }
  }, [client, loading, error]);

  // --- Função de Refresh (sem refetch) ---
  const handleRefresh = useCallback(async () => {
    if (!id || isRefreshing) return;
    setIsRefreshing(true);
    console.log("A tentar atualizar (sem refetch, recarregando a página)...");
    // Adiciona um pequeno delay para o feedback visual do spinner
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        // Força o reload da página como única opção sem refetch
        window.location.reload();
        // Nota: Isto irá perder qualquer estado local da aplicação React não persistido.
    } catch (reloadError) {
         console.error("Erro ao tentar recarregar a página:", reloadError);
         setIsRefreshing(false); // Garante que o estado de refresh é limpo em caso de erro no reload
    }
    // O setIsRefreshing(false) não será alcançado se o reload for bem sucedido
  }, [id, isRefreshing]);

  // --- Função Auxiliar para Classes Ativas na Nav Superior ---
  const getNavLinkClass = (hash: string): string => {
    return `profile-nav-link ${activeSection === hash ? 'active' : ''}`;
  };

  // --- Função para Scroll Suave ---
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      event.preventDefault();
      const sectionElement = document.getElementById(sectionId.substring(1)); // Remove o '#'
      if (sectionElement) {
          // Calcula a posição correta considerando a altura do header fixo
          const sectionTop = sectionElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({ top: sectionTop, behavior: 'smooth' });
          // Atualiza o estado ativo imediatamente para feedback visual rápido (opcional)
          // setActiveSection(sectionId);
      }
  };


  // --- Renderização Condicional Inicial ---
  if (!id) {
    // Envolve a mensagem no container principal
    return (
        <div className="client-profile-main-container">
            <div className="client-profile-page centered-message">
                <div className="message-card error">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                    <p>ID do cliente não fornecido na URL.</p>
                    <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm"> Voltar à Lista </button>
                </div>
            </div>
        </div>
      );
  }
  if (loading && !client) {
    return (
         <div className="client-profile-main-container">
             <div className="client-profile-page centered-message">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" color="var(--primary-color)" />
                <p>A carregar...</p>
             </div>
         </div>
     );
  }
  if (error && !loading && !client) {
    // Exibe o erro convertido para string
    return (
        <div className="client-profile-main-container">
             <div className="client-profile-page centered-message">
                <div className="message-card error">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                    <p>Erro ao carregar o perfil.</p>
                    <p className="error-details">{error ? String(error) : 'Verifique a sua ligação ou tente mais tarde.'}</p>
                    <button onClick={handleRefresh} className="btn btn-primary btn-sm" disabled={isRefreshing}> <FontAwesomeIcon icon={isRefreshing ? faSpinner : faSyncAlt} spin={isRefreshing} /> Tentar Novamente </button>
                    <button onClick={() => navigate('/clients')} className="btn btn-secondary btn-sm mt-2"> Voltar à Lista </button>
                </div>
            </div>
        </div>
    );
  }

  // --- Layout Principal com Novo Wrapper ---
  return (
    // Wrapper principal que contém todos os estilos e variáveis
    <div className="client-profile-main-container">
        {/* Container interno para layout (max-width, etc.) */}
        <div className="client-profile-page">

            {/* Header Fixo */}
            <header className="profile-header sticky-top" ref={headerRef}>
                 <div className="header-main-content">
                     <button
                        onClick={() => navigate('/clients')}
                        className="btn btn-tertiary back-button"
                        aria-label="Voltar à lista de clientes"
                     >
                         <FontAwesomeIcon icon={faArrowLeft} />
                         <span>Lista de Clientes</span>
                     </button>
                     <nav className="profile-nav-links">
                        {client && (
                            <>
                                <a href="#pessoal" onClick={(e) => scrollToSection(e, '#pessoal')} className={getNavLinkClass('#pessoal')}>Pessoal</a>
                                <a href="#moradas" onClick={(e) => scrollToSection(e, '#moradas')} className={getNavLinkClass('#moradas')}>Moradas</a>
                                <a href="#contactos" onClick={(e) => scrollToSection(e, '#contactos')} className={getNavLinkClass('#contactos')}>Contactos</a>
                                <a href="#impostos" onClick={(e) => scrollToSection(e, '#impostos')} className={getNavLinkClass('#impostos')}>Impostos</a>
                            </>
                        )}
                     </nav>
                     <div className="header-actions-info">
                        {lastUpdated && !isRefreshing && (
                            <span className="last-updated-info" title={`Atualizado em ${new Date(lastUpdated).toLocaleString('pt-PT')}`}>
                                Atualizado {new Date(lastUpdated).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        )}
                        {isRefreshing && (
                            <span className="last-updated-info">
                                <FontAwesomeIcon icon={faSpinner} spin /> Atualizando...
                            </span>
                        )}
                        <button
                            onClick={handleRefresh}
                            className="btn btn-icon btn-tertiary"
                            aria-label="Atualizar"
                            disabled={isRefreshing}
                            title="Atualizar Dados"
                        >
                            <FontAwesomeIcon icon={faSyncAlt} />
                        </button>
                     </div>
                 </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="profile-content" style={{ paddingTop: `${headerHeight}px` }} key={id}>
                {/* Sub-Cabeçalho */}
                {client && (
                    <div className="profile-subheader">
                        <h1>{client.name}</h1>
                        <span className="client-nif">NIF: {client.nif}</span>
                    </div>
                )}

                {/* Mensagens Inline */}
                {loading && client && (
                    <div className="inline-message loading">
                        <FontAwesomeIcon icon={faSpinner} spin /> A atualizar dados...
                    </div>
                )}
                {error && !loading && client && (
                    <div className="inline-message error">
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                        {/* Exibe o erro convertido para string */}
                        Erro ao carregar atualizações ({error ? String(error) : 'Tente novamente'}).
                        <button onClick={handleRefresh} className="btn btn-danger btn-xs ml-2" disabled={isRefreshing}> Tentar Novamente </button>
                    </div>
                )}
                {!loading && !error && !client && (
                    <div className="message-card info">
                        <p>Os dados do cliente não estão disponíveis no momento.</p>
                    </div>
                )}

                 {/* Secções de Conteúdo */}
                 {client && (
                    <>
                        {/* --- Informações Pessoais --- */}
                        <section id="pessoal" className="profile-section">
                            <div className="section-content personal-info-list">
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faIdCard} /> Nome</span>
                                    <span className="info-value">{client.name}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faIdCard} /> NIF</span>
                                    <span className="info-value">{client.nif}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faUser} /> Género</span>
                                    <span className="info-value">{client.gender}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faGlobe} /> Nacionalidade</span>
                                    <span className="info-value">{client.nationality}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faCalendar} /> Data Nasc.</span>
                                    <span className="info-value">{client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-PT') : '-'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label"><FontAwesomeIcon icon={faBuilding} /> Colaborador</span>
                                    <span className="info-value">{client.associatedColaborator || '-'}</span>
                                </div>
                            </div>
                        </section>

                        {/* --- Moradas --- */}
                        <section id="moradas" className="profile-section">
                            <header className="section-header">
                                <h2><FontAwesomeIcon icon={faMapMarkerAlt} /> Moradas</h2>
                            </header>
                            <div className="section-content content-no-padding">
                                {client.addresses && client.addresses.length > 0 ? (
                                    <div className="table-responsive-wrapper">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Tipo</th>
                                                    <th>Morada</th>
                                                    <th>Localidade</th>
                                                    <th>Código Postal</th>
                                                    <th>País</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {client.addresses.map(addr => (
                                                    <tr key={addr.id}>
                                                        <td><span className="badge badge-subtle">{addr.addressTypeName}</span></td>
                                                        <td>{addr.street}, {addr.doorNumber}</td>
                                                        <td>{addr.city}</td>
                                                        <td>{addr.zipCode}</td>
                                                        <td>{addr.country}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} size="3x" className="empty-state-icon"/>
                                        <p>Sem moradas registadas.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* --- Contactos --- */}
                        <section id="contactos" className="profile-section">
                            <header className="section-header">
                                <h2><FontAwesomeIcon icon={faPhone} /> Contactos</h2>
                            </header>
                            <div className="section-content content-no-padding">
                                {client.contacts && client.contacts.length > 0 ? (
                                    <div className="table-responsive-wrapper">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Tipo</th>
                                                    <th>Contacto</th>
                                                    <th>Descrição</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {client.contacts.map(contact => (
                                                    <tr key={contact.id}>
                                                        <td><span className="badge badge-subtle">{contact.contactTypeName}</span></td>
                                                        <td>{contact.contact}</td>
                                                        <td>{contact.description || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <FontAwesomeIcon icon={faPhone} size="3x" className="empty-state-icon"/>
                                        <p>Sem contactos registados.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* --- Impostos --- */}
                        <section id="impostos" className="profile-section">
                            <header className="section-header">
                                <h2><FontAwesomeIcon icon={faFileInvoiceDollar} /> Impostos e Obrigações</h2>
                            </header>
                            <div className="section-content">
                                <div className="table-responsive-wrapper">
                                    <TaxesTable
                                        obrigações={client.taxes || []}
                                        loading={loading && !!client}
                                        error={error ? 'Erro ao carregar' : ''}
                                        onRefresh={handleRefresh}
                                        lastUpdated={lastUpdated}
                                        isRefreshing={isRefreshing}
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
                    </>
                 )}
            </main>
        </div>
    </div>
  );
}