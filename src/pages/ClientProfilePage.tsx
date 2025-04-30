import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi';
import TaxesTable from '../components/TaxesTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faMapMarkerAlt, faPhone, faFileInvoiceDollar,
  faUser, faIdCard, faCalendar, faGlobe, faBuilding
} from '@fortawesome/free-solid-svg-icons';


interface AddressDTO {
  id: number;
  street: string;
  doorNumber: string;
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
  clientName: string;
  valor: string;
  estado: string;
  json: string;
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, loading, error } = useApi<ClientDetails>(`atmate-gateway/clients/${id}`);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
          setIsRefreshing(true);
      }, []);

  return (
    <div className="container-fluid px-5 py-4" style={{ maxWidth: '1600px' }}>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <button className="btn btn-outline-primary" onClick={() => navigate('/clients')}>
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
          Voltar à lista
        </button>
      </div>

      {/* Menu de navegação */}
      <div className="mb-4 sticky-top bg-white py-2 shadow-sm border rounded">
        <div className="d-flex flex-wrap gap-3 justify-content-start px-3">
          <a href="#pessoal" className="btn btn-light border">Informações Pessoais</a>
          <a href="#moradas" className="btn btn-light border">Moradas</a>
          <a href="#contactos" className="btn btn-light border">Contactos</a>
          <a href="#impostos" className="btn btn-light border">Impostos</a>
        </div>
      </div>

      {loading && <p className="text-center">A carregar cliente...</p>}
      {error && <p className="text-danger">Erro ao carregar cliente.</p>}

      {client && (
        <>
          {/* Informacoes Pessoais */}
          <section id="pessoal" className="card mb-5 shadow">
            <div className="card-header bg-primary text-white">
              <FontAwesomeIcon icon={faUser} className="me-2" /> Informações Pessoais
            </div>
            <div className="card-body row">
              <div className="col-md-6">
                <p><FontAwesomeIcon icon={faIdCard} className="me-2" /><strong>Nome:</strong> {client.name}</p>
                <p><strong>NIF:</strong> {client.nif}</p>
                <p><strong>Género:</strong> {client.gender}</p>
              </div>
              <div className="col-md-6">
                <p><FontAwesomeIcon icon={faGlobe} className="me-2" /><strong>Nacionalidade:</strong> {client.nationality}</p>
                <p><FontAwesomeIcon icon={faBuilding} className="me-2" /><strong>Colaborador:</strong> {client.associatedColaborator}</p>
                <p><FontAwesomeIcon icon={faCalendar} className="me-2" /><strong>Nascimento:</strong> {client.birthDate}</p>
              </div>
            </div>
          </section>

          {/* Moradas */}
          <section id="moradas" className="card mb-5 shadow">
            <div className="card-header bg-secondary text-white">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" /> Moradas
            </div>
            <div className="card-body table-responsive">
              {client.addresses.length > 0 ? (
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th>Rua</th><th>Código Postal</th><th>Cidade</th>
                      <th>Concelho</th><th>Distrito</th><th>Freguesia</th><th>País</th><th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.addresses.map(addr => (
                      <tr key={addr.id}>
                        <td>{addr.street}</td>
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
              ) : (
                <p className="text-muted">Sem moradas registadas.</p>
              )}
            </div>
          </section>

          {/* Contactos */}
          <section id="contactos" className="card mb-5 shadow">
            <div className="card-header bg-secondary text-white">
              <FontAwesomeIcon icon={faPhone} className="me-2" /> Contactos
            </div>
            <div className="card-body table-responsive">
              {client.contacts.length > 0 ? (
                <table className="table table-bordered table-sm">
                  <thead><tr><th>Tipo</th><th>Contacto</th><th>Descrição</th></tr></thead>
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
              ) : (
                <p className="text-muted">Sem contactos registados.</p>
              )}
            </div>
          </section>

          <TaxesTable
            obrigações={client.taxes}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
        />


         
        </>
      )}
    </div>
  );
}
