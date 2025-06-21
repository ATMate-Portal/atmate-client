import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Settings.css';
import useApi from '../hooks/useApi';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Importar FontAwesomeIcon
import { faSpinner, faUsers } from '@fortawesome/free-solid-svg-icons'; // Importar ícones necessários

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * @interface ParamsDTO
 * Define a estrutura de dados para os parâmetros de configuração recebidos da API.
 */
interface ParamsDTO {
    warningDays: string;
    urgencyDays: string;
}

// Obtém o token de autenticação diretamente do localStorage.
const token = localStorage.getItem('authToken');

/**
 * @component Settings
 * Página para a configuração de parâmetros da aplicação, como os dias
 * para os estados de aviso e urgência.
 */
function Settings() {
    // --- ESTADOS DO COMPONENTE ---
    // Estados para os valores dos campos de input.
    const [warningDays, setWarningDays] = useState('');
    const [urgencyDays, setUrgencyDays] = useState('');

    // Estados para gerir erros, sucesso, carregamento.
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [isScrapingAllClients, setIsScrapingAllClients] = useState(false); // NOVO ESTADO para scraping global
    const [scrapeError, setScrapeError] = useState<string | null>(null); // NOVO ESTADO para erros de scraping
    const [scrapeSuccess, setScrapeSuccess] = useState<string | null>(null); // NOVO ESTADO para sucesso de scraping

    // --- OBTENÇÃO DE DADOS ---
    // Utiliza o hook 'useApi' para ir buscar os parâmetros de configuração atuais da API.
    const { data: params, loading: paramsLoading, error: paramsError } = useApi<ParamsDTO>('atmate-gateway/config/getParams');

    // É executado quando os dados dos parâmetros ('params') chegam da API.
    // Popula os campos do formulário com os valores obtidos.
    useEffect(() => {
        if (params) {
            // Valida se os valores recebidos são numéricos antes de os definir no estado.
            if (params.warningDays && /^\d+$/.test(params.warningDays)) {
                setWarningDays(params.warningDays);
            }
            if (params.urgencyDays && /^\d+$/.test(params.urgencyDays)) {
                setUrgencyDays(params.urgencyDays);
            }
        }
    }, [params]);

    // Atualiza o estado 'warningDays'.
    const handleWarningDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (/^\d*$/.test(value)) { // Apenas números inteiros
            setWarningDays(value);
            validateInputs(value, urgencyDays);
        }
    };

    // Atualiza o estado 'urgencyDays'.
    const handleUrgencyDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (/^\d*$/.test(value)) { // Apenas números inteiros
            setUrgencyDays(value);
            validateInputs(warningDays, value);
        }
    };

    /**
     * @function validateInputs
     * Valida a lógica entre os dois campos de input (aviso vs. urgência)
     * e se os valores são maiores que zero.
     */
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

    /**
     * @function handleSaveSettings
     * Função assíncrona chamada para guardar os novos parametros.
     */
    const handleSaveSettings = async () => {
        if (!warningDays || !urgencyDays) {
            setError('Por favor, preencha ambos os campos.');
            return;
        }
        if (error) return; // Não envia se já existir um erro de validação.

        setSaveLoading(true);
        setError(null);
        setSaveSuccess(null);

        try {
            // Executa a requisição POST com o axios.
            const response = await axios.post(`${BASE_URL}atmate-gateway/config/setParams`, {
                warningDays,
                urgencyDays,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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

    /**
     * @function handleForceScrapeAllClients
     * Função assíncrona para iniciar o scraping de todos os clientes.
     */
    const handleForceScrapeAllClients = async () => {
        const confirmation = window.confirm(
            `Tem a certeza que deseja forçar o scraping de dados para TODOS os clientes? Esta é uma operação que pode demorar bastante tempo e consumir recursos.`
        );

        if (confirmation) {
            setIsScrapingAllClients(true);
            setScrapeError(null);
            setScrapeSuccess(null);

            try {
                const response = await axios.post(`${BASE_URL}atmate-gateway/clients/force`, {}, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                if (response.status === 200 || response.status === 202) { // 200 OK ou 202 Accepted
                    setScrapeSuccess(`Scraping de dados para TODOS os clientes iniciado com sucesso!`);
                } else {
                    throw new Error(response.data?.message || `Erro ${response.status}: ${response.statusText}`);
                }
            } catch (err: any) {
                console.error("Erro ao forçar scraping de todos os clientes:", err);
                const errorMessage = err.response?.data?.message || err.message || 'Ocorreu um erro desconhecido ao forçar o scraping de todos os clientes.';
                setScrapeError(errorMessage);
            } finally {
                setIsScrapingAllClients(false);
            }
        }
    };

    // --- RENDERIZAÇÃO DO COMPONENTE ---
    return (
        <div className="container-fluid d-flex justify-content-center align-items-center mt-2">
            <div className="card shadow-lg animate-fade-in">
                <div className="card-body p-5 p-md-4">
                    <h1 className="mb-4 text-primary text-center">Definições</h1>
                    <hr className="mb-4 border-primary" />

                    <div className="row">
                        {/* Coluna da esquerda com definições gerais e o novo botão de scraping */}
                        <div className="col-md-6">
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
                            {/* NOVA SECÇÃO: Scraping de Clientes */}
                            <div className="mb-4">
                                <h5 className="mb-3"><i className="bi bi-cloud-download me-2"></i> Operações de Dados</h5>
                                <div className="d-grid gap-2"> {/* d-grid gap-2 para um botão maior e espaçado */}
                                    <button
                                        type="button"
                                        className="btn btn-warning shadow" // Botão amarelo para ação de scraping
                                        onClick={handleForceScrapeAllClients}
                                        disabled={isScrapingAllClients || paramsLoading || saveLoading} // Desabilita enquanto scraping, carregamento de parâmetros ou salvamento estão ativos
                                    >
                                        {isScrapingAllClients ? (
                                            <>
                                                <FontAwesomeIcon icon={faSpinner} spin className="me-2" /> A Iniciar Scraping de Todos os Clientes...
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faUsers} className="me-2" /> Forçar Scraping de Todos os Clientes
                                            </>
                                        )}
                                    </button>
                                </div>
                                {scrapeError && <div className="alert alert-danger mt-3">{scrapeError}</div>}
                                {scrapeSuccess && <div className="alert alert-success mt-3">{scrapeSuccess}</div>}
                            </div>
                        </div>

                        {/* Divisor vertical para ecrãs maiores. */}
                        <div className="col-md-1 d-none d-md-flex justify-content-center">
                            <div className="vertical-divider"></div>
                        </div>

                        {/* Coluna da direita com as parametrizações editáveis. */}
                        <div className="col-md-5">
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
                                        disabled={paramsLoading || saveLoading || isScrapingAllClients} // Desabilita também durante o scraping
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
                                        disabled={paramsLoading || saveLoading || isScrapingAllClients} // Desabilita também durante o scraping
                                    />
                                </div>
                                <div className="d-flex justify-content-center">
                                    <button
                                        type="button"
                                        className="btn btn-primary shadow"
                                        onClick={handleSaveSettings}
                                        disabled={paramsLoading || saveLoading || isScrapingAllClients} // Desabilita também durante o scraping
                                    >
                                        {saveLoading ? 'A salvar...' : 'Salvar Configurações'}
                                    </button>
                                </div>
                            </div>

                            {/* Renderização condicional das mensagens de erro e sucesso para salvar configurações. */}
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