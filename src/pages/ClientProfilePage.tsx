import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi';
import TaxesTable from '../components/TaxesTable'; // Assumindo que este componente existe
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faMapMarkerAlt, faPhone, faFileInvoiceDollar,
  faUser, faIdCard, faCalendar, faGlobe, faBuilding
} from '@fortawesome/free-solid-svg-icons';

import './ClientProfilePage.css';

// Interfaces (mantidas como no original)
interface AddressDTO {
  id: number;
  street: string;
  doorNumber: string; // Não usado na tabela, mas mantido na interface
  zipCode: string;
  city: string;
  county: string;
  district: string;
  parish: string;
  country: string;
  addressTypeName: string;
}

interface ContactDTO {
  id: number;
  contactTypeName: string;
  contact: string;
  description: string;
}

interface TaxDTO {
  identificadorUnico: string;
  tipo: string;
  dataLimite: string;
  clientName: string; // Não usado na tabela, mas mantido na interface
  valor: string;
  estado: string;
  json: string; // Não usado na tabela, mas mantido na interface
}

interface ClientDetails {
  id: number;
  name: string;
  nif: number;
  gender: string;
  nationality: string;
  associatedColaborator: string;
  birthDate: string;
  addresses: AddressDTO[];
  contacts: ContactDTO[];
  taxes: TaxDTO[];
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>(); // Tipagem explícita para id
  const navigate = useNavigate();
  // Use o tipo correto com useApi, assumindo que ele retorna { data, loading, error }
  const { data: client, loading, error } = useApi<ClientDetails>(id ? `atmate-gateway/clients/${id}` : null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null); // Não usado no código visível, mas mantido
  const [isRefreshing, setIsRefreshing] = useState(false); // Não usado no código visível, mas mantido

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Adiciona uma verificação para o ID antes de renderizar
  if (!id) {
    return <p className="error-message">ID do cliente não fornecido.</p>;
  }

  //setLastUpdated(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);

  return (
    // Classe principal para aplicar estilos gerais da página
    <div className="client-profile-page container-fluid mt-5 animate-fade-in">
      

      {/* Menu de navegação Sticky com novas classes */}
      <nav className="profile-nav">
        <a
          href="#" // Pode manter o '#' ou definir outro link se necessário
          className="nav-link"
          onClick={() => navigate('/clients')}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar à lista
        </a>
        <a href="#pessoal" className="nav-link">Informações Pessoais</a>
        <a href="#moradas" className="nav-link">Moradas</a>
        <a href="#contactos" className="nav-link">Contactos</a>
        <a href="#impostos" className="nav-link">Impostos</a>
      </nav>

      {/* Mensagens de Loading e Erro */}
      {loading && <p className="loading-message">A carregar dados do cliente...</p>}
      {error && <p className="error-message">Erro ao carregar os dados do cliente. Tente novamente mais tarde.</p>}

      {/* Conteúdo Principal - só renderiza se não houver erro e tiver dados */}
      {!loading && !error && client && (
        <>
          {/* Informacoes Pessoais com nova classe e estrutura */}
          <section id="pessoal" className="profile-section">
            <div className="card-header">
              <FontAwesomeIcon icon={faUser} /> Informações Pessoais
            </div>
            <div className="card-body personal-info-grid">
              {/* Usando divs com classe info-item para melhor controlo de estilo */}
              <div className="info-item">
                <FontAwesomeIcon icon={faIdCard} />
                <span><strong>Nome:</strong> {client.name}</span>
              </div>
              <div className="info-item">
                 <FontAwesomeIcon icon={faIdCard} /> {/* Ícone genérico para NIF */}
                 <span><strong>NIF:</strong> {client.nif}</span>
              </div>
               <div className="info-item">
                 <FontAwesomeIcon icon={faUser} /> {/* Ícone genérico para Género */}
                 <span><strong>Género:</strong> {client.gender}</span>
              </div>
              <div className="info-item">
                <FontAwesomeIcon icon={faGlobe} />
                <span><strong>Nacionalidade:</strong> {client.nationality}</span>
              </div>
              <div className="info-item">
                <FontAwesomeIcon icon={faBuilding} />
                <span><strong>Colaborador Associado:</strong> {client.associatedColaborator || '-'}</span>
              </div>
              <div className="info-item">
                <FontAwesomeIcon icon={faCalendar} />
                <span><strong>Data de Nascimento:</strong> {client.birthDate ? new Date(client.birthDate).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </section>

          {/* Moradas com tabela moderna */}
          <section id="moradas" className="profile-section">
            <div className="card-header">
              <FontAwesomeIcon icon={faMapMarkerAlt} /> Moradas
            </div>
            <div className="card-body p-0"> {/* Remove padding do card-body para a tabela ocupar todo o espaço */}
              {client.addresses && client.addresses.length > 0 ? (
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Rua</th><th>Código Postal</th><th>Localidade</th>
                        <th>Concelho</th><th>Distrito</th><th>Freguesia</th><th>País</th><th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.addresses.map(addr => (
                        <tr key={addr.id}>
                          <td>{addr.street} {addr.doorNumber}</td> {/* Combina Rua e Nº Porta */}
                          <td>{addr.zipCode}</td>
                          <td>{addr.city}</td>
                          <td>{addr.county}</td>
                          <td>{addr.district}</td>
                          <td>{addr.parish}</td>
                          <td>{addr.country}</td>
                          <td>{addr.addressTypeName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data-message">Sem moradas registadas.</p>
              )}
            </div>
          </section>

          {/* Contactos com tabela moderna */}
          <section id="contactos" className="profile-section">
            <div className="card-header">
              <FontAwesomeIcon icon={faPhone} /> Contactos
            </div>
            <div className="card-body p-0"> {/* Remove padding do card-body */}
              {client.contacts && client.contacts.length > 0 ? (
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Tipo</th><th>Contacto</th><th>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.contacts.map(contact => (
                        <tr key={contact.id}>
                          <td>{contact.contactTypeName}</td>
                          <td>{contact.contact}</td>
                          <td>{contact.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data-message">Sem contactos registados.</p>
              )}
            </div>
          </section>

          {/* Secção de Impostos usando o componente TaxesTable */}
          {/* Adiciona o ID aqui para a navegação funcionar */}
          <section id="impostos" className="profile-section">
             {/* O componente TaxesTable pode precisar de um cabeçalho similar ou pode já ter o seu */}
             {/* Exemplo de como adicionar um cabeçalho se TaxesTable não tiver: */}
             {/*
             <div className="card-header">
               <FontAwesomeIcon icon={faFileInvoiceDollar} /> Impostos e Obrigações
             </div>
             */}
            <TaxesTable
              obrigações={client.taxes || []} // Garante que é sempre um array
              loading={loading} // Passa o estado de loading
              error={error ? 'Erro ao carregar impostos' : null} // Passa mensagem de erro
              onRefresh={handleRefresh} // Passa a função de refresh
              lastUpdated={lastUpdated} // Passa lastUpdated
              isRefreshing={isRefreshing} // Passa isRefreshing
            />
            {/* Se TaxesTable não tiver a sua própria mensagem "sem dados", pode adicionar aqui */}
             {!loading && client.taxes?.length === 0 && (
                 <div className="card-body">
                    <p className="no-data-message">Sem impostos ou obrigações registadas.</p>
                 </div>
             )}
          </section>
        </>
      )}

      {/* Mensagem caso não haja cliente e não esteja a carregar nem com erro */}
       {!loading && !error && !client && (
            <p className="no-data-message">Não foi possível encontrar os dados do cliente.</p>
       )}

    </div>
  );
}