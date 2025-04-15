import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Settings.css';
import axios from 'axios'; // Importe o axios diretamente

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Settings() {
  const [nif, setNif] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const nifMaxLength = 9;

  const handleNifChange = (event: any) => {
    const onlyDigits = event.target.value.replace(/\D/g, '');
    if (onlyDigits.length <= nifMaxLength) {
      setNif(onlyDigits);
    }
  };

  const handlePasswordChange = (event: any) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: any) => {
    setConfirmPassword(event.target.value);
  };

  const handleAddClient = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const apiUrl = `${BASE_URL}atmate-gateway/clients/create`;
      const clientData = { nif, password };

      if (password.length == 0) {
        setError('A palavra-passe não pode ser vazia!');
        setIsLoading(false);
        return;
      }


      if (password !== confirmPassword) {
        setError('As palavras-passe não coincidem!');
        setIsLoading(false);
        return;
      }

      if (nif.length != 9) {
        setError('NIF tem que ter pelo menos 9 digitos!');
        setIsLoading(false);
        return;
      }

      // Faz a chamada à API com axios diretamente
      const response = await axios.post(apiUrl, clientData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setIsLoading(false);
      setSuccessMessage('Cliente adicionado com sucesso!');
      setNif('');
      setPassword('');
      setConfirmPassword('');
      console.log('Cliente adicionado:', response.data);
    } catch (err: any) {
      setIsLoading(false);
      setError('Ocorreu um erro ao comunicar com o servidor: ' + err.message);
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
              {/* Coluna 2: Definições de Segurança e Conta */}
              <div className="mb-4">
                <h5 className="mb-3"><i className="bi bi-shield-lock me-2"></i> Novo cliente</h5>
                <div className="mb-3">
                  <label htmlFor="nif" className="form-label">NIF</label>
                  <input
                    type="text"
                    className="form-control shadow-sm"
                    id="nif"
                    value={nif}
                    onChange={handleNifChange}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Palavra-passe</label>
                  <input
                    type="password"
                    className="form-control shadow-sm"
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label">Confirmar palavra-passe</label>
                  <input
                    type="password"
                    className="form-control shadow-sm"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                  />
                </div>
                <div className="d-flex justify-content-center">
                  <button
                    type="button" // Alterado para 'button' para evitar a submissão padrão do formulário
                    className="btn btn-primary shadow"
                    onClick={handleAddClient} // Adiciona o handler de clique
                    disabled={isLoading} // Desabilita o botão durante o carregamento
                  >
                    {isLoading ? 'A adicionar...' : 'Adicionar cliente'}
                  </button>
                </div>
              </div>

              {error && <div className="alert alert-danger mt-3">{error}</div>}
              {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
            </div>
          </div>

          <hr className="mt-4 border-primary" />
        </div>
      </div>
    </div>
  );
}

export default Settings;