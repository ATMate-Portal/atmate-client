import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Settings.css';
import useApi from '../hooks/useApi';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ParamsDTO {
  warningDays: string;
  urgencyDays: string;
}

function Settings() {
  const [warningDays, setWarningDays] = useState('');
  const [urgencyDays, setUrgencyDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Fetch current parameters from API
  const { data: params, loading: paramsLoading, error: paramsError } = useApi<ParamsDTO>('atmate-gateway/config/getParams');

  // Update state with fetched parameters
  useEffect(() => {
    if (params) {
      if (params.warningDays && /^\d+$/.test(params.warningDays)) {
        setWarningDays(params.warningDays);
      }
      if (params.urgencyDays && /^\d+$/.test(params.urgencyDays)) {
        setUrgencyDays(params.urgencyDays);
      }
    }
  }, [params]);

  const handleWarningDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) { // Apenas números inteiros
      setWarningDays(value);
      validateInputs(value, urgencyDays);
    }
  };

  const handleUrgencyDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) { // Apenas números inteiros
      setUrgencyDays(value);
      validateInputs(warningDays, value);
    }
  };

  const validateInputs = (warning: string, urgency: string) => {
    setError(null);
    const warningNum = parseInt(warning);
    const urgencyNum = parseInt(urgency);

    if (warning && urgency && warningNum < urgencyNum) {
      setError('O número de dias para urgência deve ser menor ou igual ao número de dias para aviso.');
    }
    if (warning && warningNum <= 0) {
      setError('O número de dias para aviso deve ser maior que zero.');
    }
    if (urgency && urgencyNum <= 0) {
      setError('O número de dias para urgência deve ser maior que zero.');
    }
  };

  const handleSaveSettings = async () => {
    if (!warningDays || !urgencyDays) {
      setError('Por favor, preencha ambos os campos.');
      return;
    }
    if (error) return;

    setSaveLoading(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const response = await axios.post(`${BASE_URL}atmate-gateway/config/setParams`, {
        warningDays,
        urgencyDays,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSaveSuccess(response.data); // Expecting "Parameters updated successfully"
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data || 'Erro ao salvar configurações';
      setError(errorMessage);
      setSaveSuccess(null);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center mt-2">
      <div className="card shadow-lg animate-fade-in">
        <div className="card-body p-5 p-md-4">
          <h1 className="mb-4 text-primary text-center">Definições</h1>
          <hr className="mb-4 border-primary" />

          <div className="row">
            <div className="col-md-6">
              {/* Coluna 1: Definições Gerais e Notificações */}
              <div className="mb-4">
                <h5 className="mb-3"><i className="bi bi-gear me-2"></i> Geral</h5>
                <div className="mb-3">
                  <label htmlFor="tema" className="form-label">Tema da Aplicação</label>
                  <select disabled className="form-select shadow-sm" id="tema">
                    <option value="claro">Claro</option>
                    <option value="escuro">Escuro</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="idioma" className="form-label">Idioma</label>
                  <select disabled className="form-select shadow-sm" id="idioma">
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <h5 className="mb-3"><i className="bi bi-bell me-2"></i> Notificações</h5>
                <div className="form-check mb-2 custom-checkbox">
                  <input disabled className="form-check-input shadow-sm" type="checkbox" id="notificacoesEmail" />
                  <label className="form-check-label" htmlFor="notificacoesEmail">
                    Receber notificações por email
                  </label>
                </div>
                <div className="form-check mb-2 custom-checkbox">
                  <input disabled className="form-check-input shadow-sm" type="checkbox" id="notificacoesPush" />
                  <label className="form-check-label" htmlFor="notificacoesPush">
                    Receber notificações mensagem
                  </label>
                </div>
              </div>
            </div>

            {/* Divider Column */}
            <div className="col-md-1 d-none d-md-flex justify-content-center">
              <div className="vertical-divider"></div>
            </div>

            <div className="col-md-5">
              {/* Coluna 2: Parametrização de Avisos e Urgências */}
              <div className="mb-4">
                <h5 className="mb-3"><i className="bi bi-exclamation-triangle me-2"></i> Parametrização de Prazos</h5>
                <div className="mb-3">
                  <label htmlFor="warningDays" className="form-label">Dias para Aviso</label>
                  <input
                    type="number"
                    className="form-control shadow-sm"
                    id="warningDays"
                    value={warningDays}
                    onChange={handleWarningDaysChange}
                    min="1"
                    placeholder="Ex.: 7"
                    disabled={paramsLoading || saveLoading}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="urgencyDays" className="form-label">Dias para Urgência</label>
                  <input
                    type="number"
                    className="form-control shadow-sm"
                    id="urgencyDays"
                    value={urgencyDays}
                    onChange={handleUrgencyDaysChange}
                    min="1"
                    placeholder="Ex.: 2"
                    disabled={paramsLoading || saveLoading}
                  />
                </div>
                <div className="d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-primary shadow"
                    onClick={handleSaveSettings}
                    disabled={paramsLoading || saveLoading}
                  >
                    {saveLoading ? 'A salvar...' : 'Salvar Configurações'}
                  </button>
                </div>
              </div>

              {error && <div className="alert alert-danger mt-3">{error}</div>}
              {saveSuccess && <div className="alert alert-success mt-3">{saveSuccess}</div>}
              {paramsError && <div className="alert alert-danger mt-3">Erro ao carregar configurações: {paramsError}</div>}
            </div>
          </div>

          <hr className="mt-4 border-primary" />
        </div>
      </div>
    </div>
  );
}

export default Settings;