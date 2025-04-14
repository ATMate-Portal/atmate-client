import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Settings.css'; // Importa o ficheiro CSS personalizado

function Settings() {
  return (
    <div className="container-fluid d-flex justify-content-center align-items-center mt-2">
      <div className="card shadow-lg w-100 animate-fade-in"> {/* Added animation class */}
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
                  <input disabled className="form-check-input shadow-sm" type="checkbox" id="notificacoesEmail" defaultChecked />
                  <label className="form-check-label" htmlFor="notificacoesEmail">
                    Receber notificações por email
                  </label>
                </div>
                <div className="form-check mb-2 custom-checkbox">
                  <input disabled className="form-check-input shadow-sm" type="checkbox" id="notificacoesPush" />
                  <label className="form-check-label" htmlFor="notificacoesPush">
                    Receber notificações push
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
                <h5 className="mb-3"><i className="bi bi-shield-lock me-2"></i> Novo utilizador</h5>
                <div className="mb-3">
                  <label htmlFor="novaPassword" className="form-label">NIF</label>
                  <input type="text" className="form-control shadow-sm" id="novaPassword" />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmarPassword" className="form-label">Palavra-passe</label>
                  <input type="password" className="form-control shadow-sm" id="confirmarPassword" />
                </div>
                <div className="mb-4">
                  <label htmlFor="confirmarPassword2" className="form-label">Confirmar palavra-passe</label>
                  <input type="password" className="form-control shadow-sm" id="confirmarPassword2" />
                </div>
                <div className="d-flex justify-content-center">
                  <button type="submit" className="btn btn-primary shadow">Adicionar utilizador</button>
                </div>
              </div>
            </div>
          </div>

          <hr className="mt-4 border-primary" />
        </div>
      </div>
    </div>
  );
}

export default Settings;