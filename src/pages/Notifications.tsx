import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
import './Notifications.css'; // Certifique-se que este CSS existe e contém os estilos adicionados
import Select, { MultiValue, SingleValue } from 'react-select';
import axios, { AxiosError } from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faSpinner, faSyncAlt, faUser, faBell, faClock, faToggleOn, faToggleOff,
    faEdit, faTrashAlt, faSearch, faTimesCircle, faExclamationTriangle, faCheckCircle,
    faFilter, faUsers, faGlobe, faList,
    faChevronLeft, faChevronRight, faRedo,
    faEnvelopeOpen, // Icone adicionado para ver mensagens
    faPaperPlane // Icone adicionado para forçar envio
} from '@fortawesome/free-solid-svg-icons';
import useApi from '../hooks/useApi'; // Assume que este hook existe e funciona como esperado

// Assumindo que VITE_API_BASE_URL está definido no seu ambiente .env
const FULL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/'; // Fallback para desenvolvimento local

const frequencies: string[] = ['Diário', 'Semanal', 'Mensal', 'Trimestral'];
const ITEMS_PER_PAGE = 10;

// Tipos de notificação disponíveis no frontend (pode ser dinâmico se vier da API)
const allNotificationTypes: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Telefone/SMS' }
];

// Tipos auxiliares
type SelectOption = { value: number; label: string };
const frequencyUnits: Record<string, string> = { 'Diário': 'dias', 'Semanal': 'semanas', 'Mensal': 'meses', 'Trimestral': 'trimestres' };

// --- Interfaces API & Internas ---

// Cliente (combinando campos de diferentes respostas para simplicidade)
interface ApiClient {
    id: number;
    name: string;
    nif: number;
    clientType?: { id: number; description: string; createdAt?: string; updatedAt?: string };
    birthDate?: string;
    gender?: string;
    nationality?: string;
    associatedColaborator?: string;
    lastRefreshDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// Tipo de Notificação (API)
interface ApiNotificationType {
    id: number;
    description: string;
    createdAt?: string;
    updatedAt?: string;
}

// Tipo de Imposto (API)
interface ApiTaxType {
    id: number;
    description: string;
    createdAt?: string;
    updatedAt?: string;
}

// Configuração de Notificação (resposta de /getNotificationConfig)
interface ApiNotificationConfig {
    id: number;
    client: ApiClient | null; // Pode ser null para configurações globais
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Estrutura interna para agrupar configurações na Tabela
interface GroupedConfig {
    key: string; // Chave única para o grupo (ex: typeId-taxId-freq-period-active)
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean;
    clients: Array<ApiClient | null>; // Lista de clientes associados (null se for config global no meio)
    originalIds: number[]; // IDs das ApiNotificationConfig originais neste grupo
    hasGlobalConfig: boolean; // Indica se existe uma config com client=null neste grupo
}

// Cliente (usado nos selects/frontend)
interface Client { id: number; name: string; nif: number; }

// Tipo de Imposto (usado nos selects/frontend)
interface TaxType { id: number; name: string; description?: string; }

// Estado do Formulário
interface FormDataState {
    selectedNotificationTypeIds: number[];
    selectedTaxTypeIds: number[];
    frequency: string;
    startPeriod: number;
}

// Payload para Criar Notificação
interface CreateNotificationRequestPayload {
    clientsIDs: number[];
    taxTypeIDs: number[];
    notificationTypeList: number[];
    frequency: string;
    active: boolean; // Novas são criadas como ativas
    startPeriod: number;
}

// Payload para Atualizar Notificação (parâmetros do grupo)
interface UpdateNotificationRequestPayload {
    notificationTypeId: number; // Fixo do grupo
    taxTypeId: number;         // Fixo do grupo
    frequency: string;         // Editável
    startPeriod: number;       // Editável
    active: boolean;           // Estado original do grupo (necessário pelo backend)
}

// Resposta genérica da API
interface ApiResponseData { message?: string; data?: ApiNotificationConfig | any; error?: string; }

// Modo de seleção de cliente no formulário
type ClientSelectionMode = 'all' | 'individual';

// --- Interface para a resposta do endpoint /getNotifications ---
interface ClientNotification {
    id: number; // ID da *mensagem* de notificação enviada
    client: ApiClient | null; // Pode ser null? A API parece retornar sempre, mas por segurança
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    clientNotificationConfig: ApiNotificationConfig | null; // A config que originou esta notificação (pode ser null?)
    status: string; // Ex: "ENVIADA", "PENDENTE", "FALHOU"
    title: string;
    message: string;
    createDate: string; // Data de criação (YYYY-MM-DD)
    sendDate: string | null; // Data/Hora de envio (ISO String ou null)
}
// ----------------------------------------------------------------------

// Coloque esta função no topo do seu ficheiro Notifications.js
const normalize = (str: string) => {
    if (!str) return ""; // Garante que não tenta normalizar null/undefined
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const Notifications: React.FC = () => {
    // --- Estados ---
    const initialFormData: FormDataState = useMemo(() => ({ // Usar useMemo para garantir objeto estável
        selectedNotificationTypeIds: [], selectedTaxTypeIds: [],
        frequency: frequencies[0], startPeriod: 1,
    }), []); // Dependência vazia, criado uma vez

    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>('individual');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Para forçar re-fetch dos useApi
    const [createLoading, setCreateLoading] = useState<boolean>(false); // Loading do submit (criar/editar)
    const [isDeleting, setIsDeleting] = useState<boolean>(false); // Loading de apagar
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false); // Loading de ativar/desativar
    const [isForcingSend, setIsForcingSend] = useState<boolean>(false); // *** NOVO ESTADO: Loading para forçar envio ***
    const [processingGroupId, setProcessingGroupId] = useState<string | null>(null); // ID do grupo em processamento (delete/toggle/forceSend)
    const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false); // Modal de lista de clientes
    const [clientsToShowInModal, setClientsToShowInModal] = useState<Array<ApiClient | null>>([]);
    const [modalGroupInfo, setModalGroupInfo] = useState<{ tax?: string, freq?: string, period?: number } | null>(null);

    // Estados para o histórico de mensagens
    const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
    const [messagesToShowInModal, setMessagesToShowInModal] = useState<ClientNotification[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Loading específico das mensagens
    const [messageFetchError, setMessageFetchError] = useState<string | null>(null);
    const [modalGroupInfoForMessages, setModalGroupInfoForMessages] = useState<{ tax?: string, freq?: string, period?: number, type?: string } | null>(null);
    const [groupBeingViewed, setGroupBeingViewed] = useState<GroupedConfig | null>(null); // Para referência no modal de mensagens

    // --- Hooks de Fetch de Dados ---
    const { data: allClientsData, loading: clientsLoading, error: clientsError } = useApi<Client[]>(`atmate-gateway/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
    const allClients = useMemo(() => allClientsData || [], [allClientsData]);

    const { data: taxTypesData, loading: taxTypesLoading, error: taxTypesError } = useApi<TaxType[]>(`atmate-gateway/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
    // Mapeia a resposta da API para o formato esperado, tratando nomes/descrições em falta
    const taxTypes = useMemo(() => (taxTypesData || []).map(t => ({ id: t.id, name: t.description || t.name || `Imposto ID ${t.id}`, description: t.description })), [taxTypesData]);

    const { data: existingConfigsResponse, loading: configsLoading, error: configsError } = useApi<ApiNotificationConfig[]>(`atmate-gateway/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
    const originalConfigs = useMemo(() => existingConfigsResponse || [], [existingConfigsResponse]);

    // --- Processamento e Agrupamento de Dados ---
    const groupedConfigs = useMemo<GroupedConfig[]>(() => {
        const groups: Record<string, GroupedConfig> = {};
        originalConfigs.forEach((config) => {
            // Validação mais robusta para evitar erros com dados incompletos da API
            if (!config?.notificationType?.id || !config?.taxType?.id || !config.frequency || config.startPeriod == null || config.active == null) {
                console.warn("Configuração inválida ou incompleta da API ignorada:", config);
                return; // Ignora configs que não podem ser agrupadas corretamente
            }
            const groupKey = `${config.notificationType.id}-${config.taxType.id}-${config.frequency}-${config.startPeriod}-${config.active}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey, notificationType: config.notificationType, taxType: config.taxType,
                    frequency: config.frequency, startPeriod: config.startPeriod, active: config.active,
                    clients: [], originalIds: [], hasGlobalConfig: false,
                };
            }
            groups[groupKey].clients.push(config.client); // Adiciona o cliente (pode ser null)
            groups[groupKey].originalIds.push(config.id); // Adiciona o ID da configuração original
            if (config.client === null) {
                groups[groupKey].hasGlobalConfig = true; // Marca se alguma config global existe neste grupo
            }
        });
        // Ordenar grupos talvez? (Ex: por tipo de imposto, depois tipo notificação) - Opcional
        return Object.values(groups);
    }, [originalConfigs]);

    // Filtragem baseada no estado (Ativo/Inativo/Todos)
    const filteredGroupedConfigs = useMemo<GroupedConfig[]>(() => {
        if (filterStatus === 'all') return groupedConfigs;
        return groupedConfigs.filter(g => g.active === (filterStatus === 'active'));
    }, [groupedConfigs, filterStatus]);

    // Paginação dos grupos filtrados
    const paginatedConfigs = useMemo<GroupedConfig[]>(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroupedConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroupedConfigs, currentPage]);

    // Cálculo do total de páginas
    const totalPages = useMemo(() => Math.ceil(filteredGroupedConfigs.length / ITEMS_PER_PAGE), [filteredGroupedConfigs]);

    // Opções para os Selects (React-Select)
    const taxTypeOptions = useMemo<SelectOption[]>(() => taxTypes.map(tax => ({ value: tax.id, label: tax.name })), [taxTypes]);
    const notificationTypeOptions = useMemo<SelectOption[]>(() => allNotificationTypes.map(type => ({ value: type.id, label: type.name })), []);

    // --- Callbacks de Lógica e Ações ---

    // Gera o corpo (payload) para as requisições POST (criar) ou PUT (atualizar)
    const getSubmitBody = useCallback((): CreateNotificationRequestPayload | UpdateNotificationRequestPayload | null => {
        if (!editingGroupKey) { // MODO CRIAÇÃO
            const clientIdsToSend = clientSelectionMode === 'all'
                ? [] // Backend deve interpretar lista vazia como "todos" - se precisar de todos os IDs: allClients.map(c => c.id)
                : selectedClients.map(c => c.id);

            // Validação básica antes de retornar
            if ((clientSelectionMode === 'individual' && clientIdsToSend.length === 0) || formData.selectedTaxTypeIds.length === 0 || formData.selectedNotificationTypeIds.length === 0) {
                console.error("Tentativa de criar payload inválido (Criação)");
                return null; // Retorna null se dados essenciais faltarem
            }

            return {
                clientsIDs: clientIdsToSend, // Vazio se 'all', ou lista de IDs
                taxTypeIDs: formData.selectedTaxTypeIds,
                notificationTypeList: formData.selectedNotificationTypeIds,
                frequency: formData.frequency,
                active: true, // Novas configurações são sempre ativas
                startPeriod: formData.startPeriod,
            };
        } else { // MODO EDIÇÃO (Atualizar grupo)
            const groupBeingEdited = groupedConfigs.find(g => g.key === editingGroupKey);
            if (!groupBeingEdited) {
                console.error("Erro: Grupo para edição não encontrado em getSubmitBody.");
                return null;
            }
            // Validação básica antes de retornar
            if (!formData.frequency || formData.startPeriod == null || formData.startPeriod < 1) {
                console.error("Tentativa de criar payload inválido (Edição)");
                return null;
            }

            return {
                // IDs fixos do grupo, não vêm do formulário de edição
                notificationTypeId: groupBeingEdited.notificationType.id,
                taxTypeId: groupBeingEdited.taxType.id,
                // Campos editáveis do formulário
                frequency: formData.frequency,
                startPeriod: formData.startPeriod,
                // Estado 'active' original do grupo (backend precisa dele na atualização)
                active: groupBeingEdited.active,
            };
        }
    }, [editingGroupKey, formData, clientSelectionMode, selectedClients, groupedConfigs]); // Removido allClients se backend trata lista vazia

    // Atualiza o timestamp da última atualização quando todos os dados carregam
    useEffect(() => {
        if (!clientsLoading && !taxTypesLoading && !configsLoading && !isRefreshingData) {
            const now = new Date();
            setLastUpdated(
                `${now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`
            );
            setIsRefreshingData(false); // Garante que volta a false
        }
    }, [clientsLoading, taxTypesLoading, configsLoading, isRefreshingData]);

    // Reseta o formulário e estados relacionados
    const resetFormAndState = useCallback(() => {
        setFormData(initialFormData);
        setSelectedClients([]);
        setClientSelectionMode('individual');
        setEditingGroupKey(null);
        setClientSearchTerm('');
        setShowClientDropdown(false);
        setCreateLoading(false);
        setIsDeleting(false);
        setIsTogglingStatus(false);
        setIsForcingSend(false); // *** NOVO: Resetar estado de 'force send' ***
        setProcessingGroupId(null);
        // Resetar também os estados do modal de mensagens
        setIsMessagesModalOpen(false);
        setMessagesToShowInModal([]);
        setMessageFetchError(null);
        setModalGroupInfoForMessages(null);
        setGroupBeingViewed(null);
        setCurrentPage(1); // Voltar para a primeira página
        setFilterStatus('all'); // Resetar filtro
    }, [initialFormData]); // Dependência do objeto estável initialFormData

    // Timer para esconder mensagens de notificação (sucesso/erro)
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (notificationMessage) {
            timer = setTimeout(() => setNotificationMessage(null), 7000);
        }
        return () => clearTimeout(timer);
    }, [notificationMessage]);

    // Reseta a página para 1 quando o filtro muda
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);

    // --- Handlers de Eventos do Formulário ---

    // Handler para inputs normais (text, number, select nativo)
    const handleStandardChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'startPeriod' ? (Math.max(1, parseInt(value, 10)) || 1) : value
        }));
    }, []);

    // Handler para os selects múltiplos/single (React-Select)
    const handleSelectChange = useCallback((fieldName: 'selectedNotificationTypeIds' | 'selectedTaxTypeIds', options: MultiValue<SelectOption> | SingleValue<SelectOption>) => {
        let selectedIds: number[] = [];
        if (options) {
            if (Array.isArray(options)) { // Multi select
                selectedIds = options.map(option => option.value);
            } else { // Single select (ou clear)
                selectedIds = [(options as SelectOption).value];
            }
        }
        setFormData(prev => ({ ...prev, [fieldName]: selectedIds }));
    }, []);

    // Handler para pesquisa de clientes
    const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setClientSearchTerm(term);
        // Mostra dropdown apenas se houver termo e não estiver editando (campo desabilitado na edição)
        setShowClientDropdown(term.length > 0 && !editingGroupKey);
    }, [editingGroupKey]);

    // Adiciona um cliente da lista de pesquisa aos selecionados
    const handleAddClient = useCallback((client: Client) => {
        if (!selectedClients.some(c => c.id === client.id)) {
            setSelectedClients(prev => [...prev, client]);
        }
        setClientSearchTerm(''); // Limpa pesquisa
        setShowClientDropdown(false); // Esconde dropdown
    }, [selectedClients]);

    // Remove um cliente da lista de selecionados (apenas no modo de criação)
    const handleRemoveClient = useCallback((clientId: number) => {
        if (editingGroupKey) return; // Não permite remover na edição
        setSelectedClients(prev => prev.filter(c => c.id !== clientId));
    }, [editingGroupKey]);

    // Muda o modo de seleção de cliente (Individual/Todos) (apenas no modo de criação)
    const handleClientModeChange = useCallback((mode: ClientSelectionMode) => {
        if (editingGroupKey) return; // Não permite mudar na edição
        setClientSelectionMode(mode);
        if (mode === 'all') { // Se mudar para "Todos", limpa seleção individual
            setSelectedClients([]);
            setClientSearchTerm('');
            setShowClientDropdown(false);
        }
    }, [editingGroupKey]);

    // --- Funções de Submissão (API Calls) ---

    // Executa a criação de novas configurações
    const performCreateNotification = useCallback(async () => {
        setCreateLoading(true);
        setNotificationMessage(null);
        const payload = getSubmitBody() as CreateNotificationRequestPayload | null;

        // Validação robusta do payload antes de enviar
        const clientsValid = clientSelectionMode === 'all' || (payload?.clientsIDs?.length ?? 0) > 0;
        if (!payload || !clientsValid || (payload.taxTypeIDs?.length ?? 0) === 0 || (payload.notificationTypeList?.length ?? 0) === 0) {
            let errorMsg = 'Dados inválidos para criação. Verifique:';
            if (!clientsValid) errorMsg += ' Destinatários (selecione clientes ou "Todos"),';
            if ((payload?.notificationTypeList?.length ?? 0) === 0) errorMsg += ' Tipos de Notificação,';
            if ((payload?.taxTypeIDs?.length ?? 0) === 0) errorMsg += ' Impostos.';
            setNotificationMessage({ type: 'error', text: errorMsg });
            setCreateLoading(false);
            return;
        }

        try {
            // Ajuste URL se necessário (ex: /createMany ou o backend trata múltiplos no /create)
            const response = await axios.post<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/create`, payload);
            setNotificationMessage({ type: 'success', text: response.data?.message || `Configuração(ões) criada(s) com sucesso!` });
            resetFormAndState(); // Limpa form e estados
            setRefreshTrigger(p => p + 1); // Força refresh da lista de configs
        } catch (err) {
            console.error("Erro ao criar notificação:", err);
            let msg = "Ocorreu um erro ao criar as configurações.";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.response?.data?.error || err.message;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setNotificationMessage({ type: 'error', text: `Erro: ${msg}` });
        } finally {
            setCreateLoading(false);
        }
    }, [getSubmitBody, resetFormAndState, clientSelectionMode]); // Removido FULL_API_BASE_URL (é constante)

    // Função auxiliar para extrair o HTML do elemento <div class="details"> e seus filhos
    const extractDetailsDivHtml = (fullHtmlString: string): string | null => {
        if (!fullHtmlString || typeof fullHtmlString !== 'string') {
            return null;
        }
        try {
            // 1. Criar um elemento temporário para parsear o HTML
            const tempElement = document.createElement('div');
            tempElement.innerHTML = fullHtmlString;

            // 2. Encontrar o elemento <div class="details">
            const detailsDiv = tempElement.querySelector('div.details');

            // 3. Se encontrado, retornar o seu HTML externo (a própria div e seu conteúdo)
            if (detailsDiv) {
                return detailsDiv.outerHTML;
            }
            return null; // Retorna null se a div.details não for encontrada
        } catch (error) {
            console.error("Erro ao parsear ou extrair HTML dos detalhes:", error);
            return null; // Retorna null em caso de erro
        }
    };

    // Executa a atualização das configurações de um grupo
    const performUpdateNotification = useCallback(async () => {
        if (!editingGroupKey) {
            setNotificationMessage({ type: 'error', text: "Erro interno: Nenhuma configuração selecionada para edição." });
            return;
        }
        const groupBeingEdited = groupedConfigs.find(g => g.key === editingGroupKey);
        if (!groupBeingEdited) {
            setNotificationMessage({ type: 'error', text: "Erro interno: Grupo para edição não encontrado." });
            return;
        }

        setCreateLoading(true); // Usa o mesmo loading state do 'create'
        setNotificationMessage(null);
        const payloadBasis = getSubmitBody() as UpdateNotificationRequestPayload | null;

        // Validação do payload base gerado
        if (!payloadBasis || !payloadBasis.frequency || payloadBasis.startPeriod == null || payloadBasis.startPeriod < 1 ||
            payloadBasis.notificationTypeId == null || payloadBasis.taxTypeId == null || typeof payloadBasis.active !== 'boolean') {
            setNotificationMessage({ type: 'error', text: 'Dados inválidos para atualização. Verifique Frequência e Antecedência.' });
            setCreateLoading(false);
            return;
        }

        // IDs das configurações originais a serem atualizadas (todas do grupo)
        const idsToUpdate = groupBeingEdited.originalIds;
        const isSingleConfigEditContext = idsToUpdate.length === 1; // Para mensagens mais específicas
        let successCount = 0;
        let errorCount = 0;
        let lastErrorMessage = "";

        for (const originalId of idsToUpdate) {
            const finalPayload: UpdateNotificationRequestPayload = { ...payloadBasis };
            try {
                await axios.put<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/update/${originalId}`, finalPayload);
                successCount++;
            } catch (err) {
                errorCount++;
                console.error(`Erro ao atualizar config ID ${originalId}:`, err);
                let msg = "Erro desconhecido ao atualizar.";
                if (axios.isAxiosError(err)) {
                    msg = err.response?.data?.message || err.response?.data?.error || err.message;
                } else if (err instanceof Error) {
                    msg = err.message;
                }
                lastErrorMessage = `ID ${originalId}: ${msg}`; // Guarda a última mensagem de erro
            }
        }
        setCreateLoading(false);

        // Feedback ao utilizador baseado nos resultados
        if (successCount > 0 && errorCount === 0) {
            setNotificationMessage({ type: 'success', text: isSingleConfigEditContext ? `Configuração atualizada com sucesso!` : `${successCount} configuração(ões) do grupo atualizada(s) com sucesso!` });
        } else if (successCount > 0 && errorCount > 0) {
            setNotificationMessage({ type: 'error', text: `${successCount} atualizada(s), ${errorCount} falharam. Último erro: ${lastErrorMessage}` });
        } else if (errorCount > 0) {
            setNotificationMessage({ type: 'error', text: isSingleConfigEditContext ? `Erro ao atualizar: ${lastErrorMessage}` : `Erro ao atualizar configurações do grupo. Último erro: ${lastErrorMessage}` });
        }

        // Se houve sucesso, reseta o form e atualiza a lista
        if (successCount > 0) {
            resetFormAndState();
            setRefreshTrigger(p => p + 1);
        }
    }, [editingGroupKey, getSubmitBody, resetFormAndState, groupedConfigs]); // Removido FULL_API_BASE_URL

    // Handler principal do submit do formulário
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setNotificationMessage(null); // Limpa notificações anteriores

        // Validações básicas do formulário antes de chamar create/update
        if (!editingGroupKey) { // Validações extras na Criação
            if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione pelo menos um Tipo de Notificação.' }); return; }
            if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione pelo menos um Imposto.' }); return; }
            if (!(selectedClients.length > 0 || clientSelectionMode === 'all')) { setNotificationMessage({ type: 'error', text: 'Selecione Clientes ou marque "Todos".' }); return; }
        }
        // Validações comuns a Criação e Edição
        if (!formData.frequency) { setNotificationMessage({ type: 'error', text: 'Selecione a Frequência.' }); return; }
        if (!formData.startPeriod || formData.startPeriod < 1) { setNotificationMessage({ type: 'error', text: 'A Antecedência deve ser de pelo menos 1.' }); return; }

        // Chama a função apropriada (criar ou atualizar)
        if (!editingGroupKey) {
            performCreateNotification();
        } else {
            performUpdateNotification();
        }
    }, [formData, selectedClients, clientSelectionMode, editingGroupKey, performCreateNotification, performUpdateNotification]);

    // Handler para o botão de refresh manual da lista
    const handleRefresh = useCallback(() => {
        setIsRefreshingData(true);
        setRefreshTrigger(p => p + 1); // Incrementa para ativar os useApi
    }, []);

    // --- Handlers de Ações da Tabela ---

    // Preenche o formulário para edição de um grupo
    const handleEdit = useCallback((group: GroupedConfig) => {
        // Validação essencial antes de editar
        if (!group?.notificationType?.id || !group?.taxType?.id || !group.frequency || group.startPeriod == null) {
            setNotificationMessage({ type: 'error', text: 'Não é possível editar: dados essenciais do grupo estão em falta.' });
            return;
        }
        setEditingGroupKey(group.key);
        setFormData({
            // Os IDs de tipo e imposto são preenchidos mas desabilitados no form
            selectedNotificationTypeIds: [group.notificationType.id],
            selectedTaxTypeIds: [group.taxType.id],
            // Frequência e período são preenchidos para edição
            frequency: group.frequency,
            startPeriod: group.startPeriod,
        });
        // Define o modo de cliente visualmente (desabilitado), mas não permite alteração
        const hasOnlyGlobal = group.hasGlobalConfig && group.clients.filter(c => c !== null).length === 0;
        setClientSelectionMode(hasOnlyGlobal ? 'all' : 'individual');
        setSelectedClients(group.clients.filter((c): c is ApiClient => c !== null).map(c => ({ id: c.id, name: c.name, nif: c.nif })));

        setClientSearchTerm('');
        setShowClientDropdown(false);
        window.scrollTo(0, 0); // Rola a página para o topo onde está o formulário
        setNotificationMessage(null); // Limpa notificações
    }, []);

    // Cancela o modo de edição, resetando o formulário
    const handleCancelEdit = useCallback(() => {
        resetFormAndState();
    }, [resetFormAndState]);

    // Executa ações da tabela (Apagar ou Ativar/Desativar)
    const handleTableAction = useCallback(async (action: 'delete' | 'toggle', group: GroupedConfig) => {
        const idsToProcess = group.originalIds;
        if (!idsToProcess || idsToProcess.length === 0) {
            setNotificationMessage({ type: 'error', text: 'Nenhuma configuração associada a este grupo para processar.' });
            return;
        }

        // Confirmação para apagar
        if (action === 'delete') {
            const clientCount = group.clients.filter(c => c !== null).length;
            const globalText = group.hasGlobalConfig ? 'e a configuração global' : '';
            const confirmation = window.confirm(`Tem a certeza que deseja apagar ${idsToProcess.length > 1 ? `as ${idsToProcess.length} configurações agrupadas` : `esta configuração`}?\nA ação é irreversível e afetará ${clientCount} cliente(s) ${globalText}.`);
            if (!confirmation) {
                return; // Cancela se o utilizador não confirmar
            }
        }

        setNotificationMessage(null);
        setProcessingGroupId(group.key); // Marca o grupo como em processamento para feedback visual
        let successCount = 0;
        let errorCount = 0;
        let lastErrorMessage = "";

        if (action === 'delete') {
            setIsDeleting(true);
            for (const id of idsToProcess) {
                try {
                    await axios.delete<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/delete/${id}`);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    console.error(`Erro ao apagar config ID ${id}:`, err);
                    let msg = "Erro ao apagar."; if (axios.isAxiosError(err)) msg = err.response?.data?.message || err.response?.data?.error || err.message; else if (err instanceof Error) msg = err.message;
                    lastErrorMessage = `ID ${id}: ${msg}`;
                }
            }
            setIsDeleting(false);
        } else if (action === 'toggle') {
            setIsTogglingStatus(true);
            const newActiveState = !group.active; // O novo estado é o oposto do atual do grupo
            for (const id of idsToProcess) {
                const url = `${FULL_API_BASE_URL}atmate-gateway/notification/update/${id}/status?active=${newActiveState}`;
                try {
                    await axios.put<ApiResponseData>(url, null);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    console.error(`Erro ao alternar estado da config ID ${id}:`, err);
                    let msg = "Erro ao alternar estado."; if (axios.isAxiosError(err)) msg = err.response?.data?.message || err.response?.data?.error || err.message; else if (err instanceof Error) msg = err.message;
                    lastErrorMessage = `ID ${id}: ${msg}`;
                }
            }
            setIsTogglingStatus(false);
        }

        setProcessingGroupId(null); // Liberta o grupo do estado de processamento

        // Feedback final
        if (successCount > 0 && errorCount === 0) {
            setNotificationMessage({ type: 'success', text: `${successCount} configuração(ões) ${action === 'delete' ? 'apagada(s)' : 'atualizada(s)'} com sucesso!` });
        } else if (successCount > 0 && errorCount > 0) {
            setNotificationMessage({ type: 'error', text: `Operação parcialmente concluída: ${successCount} sucesso(s), ${errorCount} falha(s). Último erro: ${lastErrorMessage}` });
        } else if (errorCount > 0) {
            setNotificationMessage({ type: 'error', text: `Falha ao ${action === 'delete' ? 'apagar' : 'atualizar'} configuração(ões). Último erro: ${lastErrorMessage}` });
        }

        // Se algo mudou (sucesso total ou parcial), atualiza a lista
        if (successCount > 0) {
            setRefreshTrigger(p => p + 1);
            if (editingGroupKey === group.key && action === 'delete') {
                resetFormAndState();
            }
        }
    }, [resetFormAndState, editingGroupKey, groupedConfigs]); // Removido FULL_API_BASE_URL

    // *** NOVA FUNÇÃO: Forçar Envio de Notificações ***
    const handleForceSend = useCallback(async (group: GroupedConfig) => {
        const idsToProcess = group.originalIds;
        if (!idsToProcess || idsToProcess.length === 0) {
            setNotificationMessage({ type: 'error', text: 'Nenhuma configuração associada a este grupo para processar.' });
            return;
        }

        const confirmation = window.confirm(`Tem a certeza que deseja forçar o envio imediato para ${idsToProcess.length > 1 ? `as ${idsToProcess.length} configurações deste grupo` : `esta configuração`}? Esta ação pode enviar múltiplas notificações.`);
        if (!confirmation) {
            return;
        }

        setNotificationMessage(null);
        setProcessingGroupId(group.key);
        setIsForcingSend(true);
        let successCount = 0;
        let errorCount = 0;
        let lastErrorMessage = "";

        for (const id of idsToProcess) {
            try {
                // Usando POST conforme assumido. Ajuste se o método for PUT ou outro.
                await axios.post<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/forceSend/${id}`, null); // Envia POST sem corpo
                successCount++;
            } catch (err) {
                errorCount++;
                console.error(`Erro ao forçar envio para config ID ${id}:`, err);
                let msg = "Erro ao forçar envio.";
                if (axios.isAxiosError(err)) {
                    const errorResponse = err.response?.data;
                    msg = errorResponse?.message || errorResponse?.error || err.message;
                } else if (err instanceof Error) {
                    msg = err.message;
                }
                lastErrorMessage = `ID ${id}: ${msg}`;
            }
        }

        setIsForcingSend(false);
        setProcessingGroupId(null);

        // Feedback final
        if (successCount > 0 && errorCount === 0) {
            setNotificationMessage({ type: 'success', text: `${successCount} notificação(ões) enviada(s) para processamento com sucesso!` });
            // Pode ser útil abrir o modal de mensagens aqui, ou dar refresh, mas mantendo simples por agora.
        } else if (successCount > 0 && errorCount > 0) {
            setNotificationMessage({ type: 'error', text: `Envio parcialmente concluído: ${successCount} sucesso(s), ${errorCount} falha(s). Último erro: ${lastErrorMessage}` });
        } else if (errorCount > 0) {
            setNotificationMessage({ type: 'error', text: `Falha ao forçar envio. Último erro: ${lastErrorMessage}` });
        }

        // Não força refresh, mas o utilizador pode querer ver o histórico.
    }, []); // Removido FULL_API_BASE_URL


    // Handler para mudar o filtro de status da tabela
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterStatus(e.target.value as 'all' | 'active' | 'inactive');
        // A paginação é resetada pelo useEffect que observa filterStatus
    };

    // Handlers da Paginação
    const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

    // Abre o modal para mostrar a lista de clientes de um grupo
    const handleShowClients = useCallback((clients: Array<ApiClient | null>, group: GroupedConfig) => {
        setClientsToShowInModal(clients);
        setModalGroupInfo({ tax: group.taxType.description, freq: group.frequency, period: group.startPeriod });
        setIsClientModalOpen(true);
    }, []);

    // --- Nova Função para buscar e mostrar mensagens ---
    const handleShowMessages = useCallback(async (group: GroupedConfig) => {
        if (!group || !group.originalIds || group.originalIds.length === 0) {
            setNotificationMessage({ type: 'error', text: 'Grupo inválido ou sem IDs de configuração associados.' });
            return;
        }

        setGroupBeingViewed(group); // Guarda o grupo para referência (ex: botão Tentar Novamente)
        setIsMessagesModalOpen(true);
        setIsLoadingMessages(true);
        setMessageFetchError(null);
        setMessagesToShowInModal([]); // Limpa mensagens anteriores
        setModalGroupInfoForMessages({ // Define info para o título do modal
            tax: group.taxType?.description,
            freq: group.frequency,
            period: group.startPeriod,
            type: group.notificationType?.description
        });

        try {
            // O endpoint /getNotifications espera os IDs das *configurações* (ClientNotificationConfig)
            const configIds = group.originalIds;
            const params = new URLSearchParams();
            configIds.forEach(id => params.append('ids', id.toString())); // Cria ?ids=1&ids=2&ids=3...

            // Faz a chamada GET
            const response = await axios.get<ClientNotification[]>(`${FULL_API_BASE_URL}atmate-gateway/notification/getNotifications`, { params });

            // Ordena as mensagens por data de envio (mais recentes primeiro), tratando datas nulas
            const sortedMessages = response.data.sort((a, b) => {
                // Datas podem ser string ISO ou null. Converter para timestamp ou 0 se null.
                const timeA = a.sendDate ? new Date(a.sendDate).getTime() : 0;
                const timeB = b.sendDate ? new Date(b.sendDate).getTime() : 0;
                // Se as datas forem iguais (ou ambas 0), pode ordenar por ID (ou data de criação) como secundário
                if (timeB === timeA) {
                    const createTimeA = a.createDate ? new Date(a.createDate).getTime() : 0;
                    const createTimeB = b.createDate ? new Date(b.createDate).getTime() : 0;
                    if (createTimeB === createTimeA) {
                        return b.id - a.id; // ID descendente como último critério
                    }
                    return createTimeB - createTimeA; // Data criação descendente
                }
                return timeB - timeA; // Data envio descendente
            });

            setMessagesToShowInModal(sortedMessages);

        } catch (err) {
            console.error("Erro ao buscar histórico de mensagens:", err);
            let msg = "Erro ao carregar histórico de mensagens.";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.response?.data?.error || err.message;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setMessageFetchError(msg);
        } finally {
            setIsLoadingMessages(false); // Termina o loading, quer sucesso ou erro
        }
    }, []); // Removido FULL_API_BASE_URL

    // --- Estados Derivados e Cálculos Auxiliares ---

    // Filtra clientes para o autocomplete (excluindo já selecionados)
    const filteredClients = useMemo(() => {
        if (!clientSearchTerm || editingGroupKey) return []; // Não filtra se não houver termo ou estiver editando

        const selectedIds = new Set(selectedClients.map(c => c.id));

        const normalizedSearchTerm = normalize(clientSearchTerm);

        return allClients
            .filter(c => {
                const normalizedClientName = normalize(c.name);
                return (
                    !selectedIds.has(c.id) && // Exclui já selecionados
                    (
                        normalizedClientName.includes(normalizedSearchTerm) || // Compara nomes normalizados
                        c.nif.toString().includes(normalizedSearchTerm) // Mantém pesquisa por NIF
                    )
                );
            })
            .slice(0, 10); // Limita a 10 resultados
    }, [clientSearchTerm, allClients, selectedClients, editingGroupKey]); // normalize é estável

    // Indica se alguma operação assíncrona principal está em andamento
    const isSubmittingForm = createLoading; // Alias para clareza
    // *** ATUALIZADO: Adicionar isForcingSend ***
    const isAnyLoading = isSubmittingForm || isDeleting || isTogglingStatus || isLoadingMessages || isRefreshingData || isForcingSend;

    // --- Funções Auxiliares de Formatação ---
    const formatDateTime = (isoString: string | null): string => {
        if (!isoString) return 'N/D';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return 'Data Inválida'; // Verifica se a data é válida
            // Usar hourCycle para garantir formato 24h consistente
            return `${date.toLocaleDateString('pt-PT')} ${date.toLocaleTimeString('pt-PT', { hourCycle: 'h23' })}`;
        } catch (e) {
            console.error("Erro ao formatar data/hora:", isoString, e);
            return isoString; // Retorna original se falhar
        }
    };
    const formatDate = (dateString: string | null): string => {
        if (!dateString) return 'N/D';
        try {
            // Tenta criar data a partir de YYYY-MM-DD ou outros formatos ISO
            const date = new Date(dateString);
            // Verifica se é uma data válida e não o início da época (que indica possível erro de parse)
            if (isNaN(date.getTime()) || date.getTime() === 0) {
                // Tentar parse manual para YYYY-MM-DD se falhou
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // Mês é 0-indexado
                    const day = parseInt(parts[2]);
                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                        const utcDate = new Date(Date.UTC(year, month, day));
                        if (!isNaN(utcDate.getTime())) {
                            return utcDate.toLocaleDateString('pt-PT', { timeZone: 'UTC' });
                        }
                    }
                }
                return 'Data Inválida'; // Retorna se inválido
            }
            // Se a data for válida, formata em UTC para evitar problemas de fuso horário apenas com data
            return date.toLocaleDateString('pt-PT', { timeZone: 'UTC' });
        } catch (e) {
            console.error("Erro ao formatar data:", dateString, e);
            return dateString; // Retorna original se falhar
        }
    }

    // --- Renderização Condicional Inicial (Loading/Error Global) ---
    // Mostra loading inicial se dados essenciais ainda não carregaram
    if ((clientsLoading || taxTypesLoading || configsLoading) && !originalConfigs.length && !isRefreshingData) {
        return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> A carregar dados iniciais...</div>;
    }
    // Mostra erro grave se a busca inicial de configs falhou e não há dados
    if (configsError && !originalConfigs.length && !configsLoading) {
        // Verifica se o erro é de autenticação (401 ou 403) - pode necessitar ajuste consoante a API
        const statusCode = (configsError as unknown as AxiosError)?.response?.status;
        const errorMsg = statusCode === 401 || statusCode === 403
            ? "Não autorizado. Verifique a sua sessão."
            : String(configsError);

        return (
            <div id="notif-msg-standalone-error" className="notification-message error">
                <FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar configurações: {errorMsg}.
                <button onClick={() => window.location.reload()} style={{ marginLeft: '15px' }} title="Recarregar a página">
                    <FontAwesomeIcon icon={faRedo} /> Recarregar Página
                </button>
            </div>
        );
    }
    // Pode adicionar tratamento similar para clientsError e taxTypesError se forem críticos

    // --- Cálculo de Títulos e Labels Dinâmicos ---
    const currentEditingGroupObject = editingGroupKey ? groupedConfigs.find(g => g.key === editingGroupKey) : null;
    const isEditingSingleOriginalConfig = !!(currentEditingGroupObject && currentEditingGroupObject.originalIds.length === 1);

    const formTitle = editingGroupKey
        ? (isEditingSingleOriginalConfig ? 'Editar Configuração Individual' : 'Editar Parâmetros do Grupo')
        : 'Configurar Novas Notificações';

    const submitButtonLabel = isSubmittingForm ? 'A guardar...' :
        (editingGroupKey ?
            (isEditingSingleOriginalConfig ? 'Atualizar Configuração' : 'Atualizar Grupo') :
            'Guardar Nova Configuração');

    // --- JSX de Renderização Principal ---
    return (
        <Fragment>
            {/* Cabeçalho da Página */}
            <div id="notif-header">
                <h1>{formTitle}</h1>
                <div
                    id="notif-last-updated"
                    onClick={!isRefreshingData ? handleRefresh : undefined} // Só permite clique se não estiver atualizando
                    title={isRefreshingData ? "Atualizando..." : "Clique para atualizar os dados"}
                    role="button"
                    tabIndex={isRefreshingData ? -1 : 0} // Remove de tabulação se estiver atualizando
                    aria-busy={isRefreshingData}
                    style={{ cursor: isRefreshingData ? 'default' : 'pointer' }}
                >
                    <FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} />
                    <span>{isRefreshingData ? ' Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : ' Atualizar Dados')}</span>
                </div>
            </div>

            {/* Container para Mensagens de Notificação (Sucesso/Erro global) */}
            {notificationMessage && (
                <div id="notif-message-container" className={`notification-message ${notificationMessage.type}`} role="alert">
                    <FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} />
                    <span className="message-text">{notificationMessage.text}</span>
                    <button onClick={() => setNotificationMessage(null)} className="close-message" aria-label="Fechar mensagem">&times;</button>
                </div>
            )}

            {/* Layout Principal (Formulário à esquerda, Tabela à direita) */}
            <div id="notifications-layout">

                {/* Coluna do Formulário */}
                <div id="notif-form-column" className="layout-column">
                    <div id="notif-form-card" className={`notification-card ${editingGroupKey ? 'editing-mode' : ''}`}>
                        <form onSubmit={handleSubmit} noValidate>
                            {/* Fieldset: Destinatários */}
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading || !!editingGroupKey}>
                                <legend><FontAwesomeIcon icon={faUsers} /> Destinatário(s)</legend>
                                {editingGroupKey && currentEditingGroupObject ? (
                                    // Mostra informação do destinatário no modo de edição (não editável)
                                    <div className="info-edit-group-clients">
                                        <strong>Aplicável a: </strong>
                                        {currentEditingGroupObject.hasGlobalConfig && currentEditingGroupObject.clients.filter(c => c === null).length > 0 ? "Todos os clientes (Configuração Global)"
                                            : currentEditingGroupObject.clients.filter(c => c !== null).length === 1 && currentEditingGroupObject.clients.find(c => c !== null)
                                                ? `${currentEditingGroupObject.clients.find(c => c !== null)?.name} (NIF: ${currentEditingGroupObject.clients.find(c => c !== null)?.nif}) (Configuração Individual)`
                                                : `${currentEditingGroupObject.clients.filter(c => c !== null).length} clientes específicos (Configuração Agrupada)`}
                                        <small className="info-edit" style={{ display: 'block', marginTop: '5px' }}>Os destinatários não podem ser alterados na edição de grupo/configuração.</small>
                                    </div>
                                ) : (
                                    // Interface de seleção de cliente no modo de criação
                                    <div id="notif-client-group">
                                        <div id="notif-client-mode-selector" className="segmented-control">
                                            <button type="button" className={clientSelectionMode === 'individual' ? 'active' : ''} onClick={() => handleClientModeChange('individual')} disabled={isAnyLoading}><FontAwesomeIcon icon={faUser} /> Individual</button>
                                            <button type="button" className={clientSelectionMode === 'all' ? 'active' : ''} onClick={() => handleClientModeChange('all')} disabled={isAnyLoading}><FontAwesomeIcon icon={faGlobe} /> Todos</button>
                                        </div>
                                        {clientSelectionMode === 'individual' && (
                                            <>
                                                <div className="autocomplete-wrapper form-group">
                                                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                                    <input
                                                        type="text"
                                                        id="notif-client-search-input"
                                                        placeholder="Pesquisar cliente por nome ou NIF..."
                                                        value={clientSearchTerm}
                                                        onChange={handleClientSearchChange}
                                                        onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)} // Pequeno delay para permitir clique no dropdown
                                                        autoComplete="off"
                                                        disabled={isAnyLoading}
                                                        aria-label="Pesquisar e adicionar cliente"
                                                    />
                                                    {showClientDropdown && filteredClients.length > 0 && (
                                                        <ul className="autocomplete-dropdown" role="listbox">
                                                            {filteredClients.map((client) => (
                                                                <li key={client.id} onClick={() => handleAddClient(client)} onMouseDown={(e) => e.preventDefault()} /* Evita blur antes do click */ tabIndex={0} role="option" aria-selected="false">{client.name} ({client.nif})</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {showClientDropdown && clientSearchTerm.length > 0 && filteredClients.length === 0 && !clientsLoading && (
                                                        <div className="autocomplete-no-results">Nenhum cliente encontrado.</div>
                                                    )}
                                                </div>
                                                <div id="notif-selected-clients-list">
                                                    <label>Clientes Selecionados ({selectedClients.length}):</label>
                                                    {selectedClients.map(client => (
                                                        <span key={client.id} className="selected-item-pill">
                                                            {client.name}
                                                            <button type="button" onClick={() => handleRemoveClient(client.id)} className="remove-item-button" disabled={isAnyLoading} aria-label={`Remover ${client.name}`}>&times;</button>
                                                        </span>
                                                    ))}
                                                    {selectedClients.length === 0 && (<small className="no-selection info-edit">Nenhum cliente selecionado.</small>)}
                                                </div>
                                            </>
                                        )}
                                        {clientSelectionMode === 'all' && (
                                            <div className="info-all-selected">
                                                <FontAwesomeIcon icon={faCheckCircle} /> Aplicar a <strong>todos ({allClients.length})</strong> os clientes existentes.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </fieldset>

                            {/* Fieldset: Detalhes da Configuração */}
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                <legend><FontAwesomeIcon icon={faBell} /> Detalhes da Configuração</legend>
                                <div className="form-group">
                                    <label id="label-notif-type" htmlFor="notif-type-select-react">Tipo Notificação <span className="required-indicator">*</span></label>
                                    <Select
                                        inputId='notif-type-select-react'
                                        isMulti={!editingGroupKey} // Permite múltiplos na criação
                                        name="selectedNotificationTypeIds"
                                        options={notificationTypeOptions}
                                        className={!editingGroupKey ? "basic-multi-select" : "basic-single-select"} // Estilo diferente se single/multi
                                        classNamePrefix="select"
                                        placeholder={editingGroupKey ? (formData.selectedNotificationTypeIds.length > 0 ? notificationTypeOptions.find(o => o.value === formData.selectedNotificationTypeIds[0])?.label : "Tipo (Fixo)") : "Selecione o(s) tipo(s)..."}
                                        aria-labelledby="label-notif-type"
                                        onChange={(options) => handleSelectChange('selectedNotificationTypeIds', options as MultiValue<SelectOption> | SingleValue<SelectOption>)}
                                        value={!editingGroupKey
                                            ? notificationTypeOptions.filter(o => formData.selectedNotificationTypeIds.includes(o.value))
                                            : (notificationTypeOptions.find(o => formData.selectedNotificationTypeIds[0] === o.value) || null) // Apenas o primeiro ID na edição
                                        }
                                        isClearable={!editingGroupKey} // Permite limpar na criação
                                        isDisabled={!!editingGroupKey || isAnyLoading} // Desabilitado na edição
                                        noOptionsMessage={() => 'Nenhuma opção'}
                                    />
                                    {editingGroupKey && <small className="info-edit">O Tipo de Notificação não pode ser alterado na edição.</small>}
                                </div>
                                <div className="form-group">
                                    <label id="label-tax-type" htmlFor="tax-type-select-react">Imposto <span className="required-indicator">*</span></label>
                                    <Select
                                        inputId='tax-type-select-react'
                                        isMulti={!editingGroupKey} // Permite múltiplos na criação
                                        name="selectedTaxTypeIds"
                                        options={taxTypeOptions}
                                        isLoading={taxTypesLoading && taxTypeOptions.length === 0} // Mostra loading se estiver carregando e não houver opções ainda
                                        className={!editingGroupKey ? "basic-multi-select" : "basic-single-select"}
                                        classNamePrefix="select"
                                        placeholder={editingGroupKey ? (formData.selectedTaxTypeIds.length > 0 ? taxTypeOptions.find(o => o.value === formData.selectedTaxTypeIds[0])?.label : "Imposto (Fixo)") : "Selecione o(s) imposto(s)..."}
                                        aria-labelledby="label-tax-type"
                                        onChange={(options) => handleSelectChange('selectedTaxTypeIds', options as MultiValue<SelectOption> | SingleValue<SelectOption>)}
                                        value={!editingGroupKey
                                            ? taxTypeOptions.filter(o => formData.selectedTaxTypeIds.includes(o.value))
                                            : (taxTypeOptions.find(o => formData.selectedTaxTypeIds[0] === o.value) || null) // Apenas o primeiro ID na edição
                                        }
                                        isClearable={!editingGroupKey} // Permite limpar na criação
                                        isDisabled={!!editingGroupKey || isAnyLoading || taxTypesLoading} // Desabilitado na edição ou enquanto carrega
                                        noOptionsMessage={() => taxTypesLoading ? 'A carregar impostos...' : 'Nenhum imposto encontrado'}
                                    />
                                    {taxTypesError && !taxTypesLoading && <small className="error">Erro ao carregar impostos.</small>}
                                    {editingGroupKey && <small className="info-edit">O Imposto não pode ser alterado na edição.</small>}
                                </div>
                            </fieldset>

                            {/* Fieldset: Periodicidade */}
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label>
                                        <select
                                            id="notif_frequency_select"
                                            name="frequency"
                                            value={formData.frequency}
                                            onChange={handleStandardChange}
                                            required
                                            disabled={isAnyLoading}
                                            aria-required="true"
                                        >
                                            {frequencies.map((freq) => (<option key={freq} value={freq}>{freq}</option>))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="notif_start_period_input">Antecedência ({frequencyUnits[formData.frequency] || 'períodos'}) <span className="required-indicator">*</span></label>
                                        <input
                                            id="notif_start_period_input"
                                            type="number"
                                            name="startPeriod"
                                            value={formData.startPeriod}
                                            min="1"
                                            step="1" // Garante apenas inteiros
                                            onChange={handleStandardChange}
                                            required
                                            disabled={isAnyLoading}
                                            aria-required="true"
                                            aria-describedby="startPeriodHelp"
                                        />
                                        <small id="startPeriodHelp" className="input-description">Nº de {frequencyUnits[formData.frequency] || 'períodos'} antes do evento/prazo.</small>
                                    </div>
                                </div>
                            </fieldset>

                            {/* Ações do Formulário (Botões) */}
                            <div id="notif-form-actions">
                                <button
                                    id="notif-submit-button"
                                    type="submit"
                                    className="button-primary"
                                    disabled={isAnyLoading ||
                                        (!editingGroupKey && clientSelectionMode === 'individual' && selectedClients.length === 0) ||
                                        (!editingGroupKey && formData.selectedNotificationTypeIds.length === 0) ||
                                        (!editingGroupKey && formData.selectedTaxTypeIds.length === 0) ||
                                        !formData.frequency || formData.startPeriod < 1
                                    }
                                >
                                    <FontAwesomeIcon icon={isSubmittingForm ? faSpinner : faSave} spin={isSubmittingForm} /> {submitButtonLabel}
                                </button>
                                {editingGroupKey && (
                                    <button
                                        id="notif-cancel-edit-button"
                                        type="button"
                                        className="button-secondary"
                                        onClick={handleCancelEdit}
                                        disabled={isAnyLoading} // Desabilitado se qualquer operação estiver em curso
                                    >
                                        Cancelar Edição
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div> {/* Fim Coluna Formulário */}

                {/* Coluna da Tabela de Configurações */}
                <div id="notif-table-column" className="layout-column">
                    <div id="notif-list-card" className="notification-card">
                        {/* Controles da Tabela (Título, Filtro) */}
                        <div id="notif-table-controls">
                            <h2><FontAwesomeIcon icon={faList} /> Configurações Existentes ({filteredGroupedConfigs.length})</h2>
                            <div id="notif-filter-group">
                                <label htmlFor="notif-filterStatus-select"><FontAwesomeIcon icon={faFilter} /> Filtrar por Estado:</label>
                                <select id="notif-filterStatus-select" value={filterStatus} onChange={handleFilterChange} disabled={isAnyLoading}>
                                    <option value="all">Todos</option>
                                    <option value="active">Ativos</option>
                                    <option value="inactive">Inativos</option>
                                </select>
                            </div>
                        </div>

                        {/* Placeholder de Loading/Erro para a tabela */}
                        {configsLoading && isRefreshingData && (
                            <div id="notif-loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Atualizando lista de configurações...</div>
                        )}
                        {configsError && !configsLoading && !isRefreshingData && ( // Mostrar erro apenas se não estiver ativamente recarregando
                            <div id="notif-error-placeholder" className="notification-message error">
                                <span><FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar lista: {String(configsError)}</span>
                                <button id="notif-retry-button" onClick={handleRefresh} disabled={isRefreshingData || isAnyLoading} title="Tentar carregar novamente">
                                    <FontAwesomeIcon icon={isRefreshingData ? faSpinner : faRedo} spin={isRefreshingData} /> Tentar Novamente
                                </button>
                            </div>
                        )}

                        {/* Tabela e Paginação (mostrados apenas se não houver erro grave inicial) */}
                        {!configsError && ( // Não renderiza tabela se houve erro fatal no carregamento inicial (tratado acima)
                            <>
                                <div id="notif-table-responsive">
                                    <table id="notifications-table-element" className="notifications-table" aria-live="polite" aria-relevant="all">
                                        <thead>
                                            <tr>
                                                <th>Destinatário(s)</th>
                                                <th>Tipo Notif.</th>
                                                <th>Imposto</th>
                                                <th>Frequência</th>
                                                <th>Antecedência</th>
                                                <th>Estado</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Mensagem se não houver dados após o carregamento */}
                                            {!configsLoading && !isRefreshingData && paginatedConfigs.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="no-data">
                                                        Nenhuma configuração encontrada
                                                        {filterStatus !== 'all' ? ` com o estado '${filterStatus === 'active' ? 'Ativo' : 'Inativo'}'` : ''}.
                                                        {groupedConfigs.length > 0 && filterStatus !== 'all' &&
                                                            <button onClick={() => setFilterStatus('all')} className="link-button" style={{ marginLeft: '10px' }}>Mostrar todos</button>
                                                        }
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Linhas da Tabela */}
                                            {paginatedConfigs.map((group) => {
                                                const specificClients = group.clients.filter((c): c is ApiClient => c !== null);
                                                const isOnlyGlobal = group.hasGlobalConfig && specificClients.length === 0;
                                                const isMixed = group.hasGlobalConfig && specificClients.length > 0;

                                                let clientDisplay: React.ReactNode = '';
                                                if (isOnlyGlobal) {
                                                    clientDisplay = <span title="Configuração Global"><FontAwesomeIcon icon={faGlobe} /> Todos Clientes</span>;
                                                } else if (specificClients.length === 1 && !isMixed) {
                                                    clientDisplay = `${specificClients[0].name} (${specificClients[0].nif})`;
                                                } else {
                                                    const countText = `${specificClients.length} Cliente${specificClients.length !== 1 ? 's' : ''}`;
                                                    const titleText = `Ver ${countText}${isMixed ? ' (e configuração Global)' : ''}`;
                                                    clientDisplay = (
                                                        <button type="button" className="link-button" onClick={() => handleShowClients(group.clients, group)} title={titleText} disabled={isAnyLoading}>
                                                            {countText} {isMixed && <>(+ <FontAwesomeIcon icon={faGlobe} size="xs" />)</>}
                                                            <FontAwesomeIcon icon={faUsers} size="xs" style={{ marginLeft: '4px' }} />
                                                        </button>
                                                    );
                                                }

                                                const unitAbbreviation = (frequencyUnits[group.frequency] || 'dias').substring(0, 1);
                                                const isCurrentlyProcessingThisGroup = processingGroupId === group.key;
                                                const isThisGroupCurrentlyBeingEdited = editingGroupKey === group.key;

                                                return (
                                                    <tr
                                                        key={group.key}
                                                        className={`${group.active ? '' : 'inactive-row'} ${isThisGroupCurrentlyBeingEdited ? 'editing-row-highlight' : ''}`}
                                                        aria-rowindex={paginatedConfigs.indexOf(group) + 1 + (currentPage - 1) * ITEMS_PER_PAGE}
                                                    >
                                                        <td data-label="Destinatário(s)">{clientDisplay}</td>
                                                        <td data-label="Tipo">{group.notificationType?.description || '?'}</td>
                                                        <td data-label="Imposto">{group.taxType?.description || '?'}</td>
                                                        <td data-label="Freq.">{group.frequency}</td>
                                                        <td data-label="Antec." className="cell-center">{group.startPeriod} {unitAbbreviation}.</td>
                                                        <td data-label="Estado" className="cell-center">
                                                            <span className={`status ${group.active ? 'active' : 'inactive'}`}>{group.active ? 'Ativo' : 'Inativo'}</span>
                                                        </td>
                                                        <td data-label="Ações" className="action-buttons">
                                                            {/* Botão Editar */}
                                                            <button onClick={() => handleEdit(group)} title="Editar Frequência/Antecedência deste grupo/configuração" disabled={isAnyLoading || !!editingGroupKey} className="action-button edit" aria-label={`Editar configuração para ${group.taxType?.description}`}>
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </button>
                                                            {/* Botão Toggle Ativo/Inativo */}
                                                            <button onClick={() => handleTableAction('toggle', group)} title={group.active ? 'Desativar este grupo/configuração' : 'Ativar este grupo/configuração'} disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited} className={`action-button toggle ${group.active ? 'toggle-off' : 'toggle-on'}`} aria-label={`${group.active ? 'Desativar' : 'Ativar'} configuração para ${group.taxType?.description}`}>
                                                                {(isTogglingStatus && isCurrentlyProcessingThisGroup) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={group.active ? faToggleOff : faToggleOn} />}
                                                            </button>
                                                            {/* Botão Ver Histórico */}
                                                            <button onClick={() => handleShowMessages(group)} title="Ver histórico de mensagens enviadas para este grupo/configuração" disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited} className="action-button view-messages" aria-label={`Ver histórico de mensagens para ${group.taxType?.description}`}>
                                                                {(isLoadingMessages && groupBeingViewed?.key === group.key) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faEnvelopeOpen} />}
                                                            </button>
                                                            {/* *** NOVO BOTÃO: Forçar Envio *** */}
                                                            <button onClick={() => handleForceSend(group)} title="Forçar envio imediato das notificações deste grupo" disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited || !group.active} className="action-button force-send" aria-label={`Forçar envio para ${group.taxType?.description}`}>
                                                                {(isForcingSend && isCurrentlyProcessingThisGroup) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                                                            </button>
                                                            {/* Botão Apagar */}
                                                            <button onClick={() => handleTableAction('delete', group)} title="Apagar este grupo/configuração" disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited} className="action-button delete" aria-label={`Apagar configuração para ${group.taxType?.description}`}>
                                                                {(isDeleting && isCurrentlyProcessingThisGroup) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrashAlt} />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div> {/* Fim #notif-table-responsive */}

                                {/* Controles de Paginação */}
                                {totalPages > 1 && (
                                    <div className="pagination-controls">
                                        <span>Pág. {currentPage} de {totalPages}</span>
                                        <div className="pagination-buttons">
                                            <button onClick={handlePrevPage} disabled={currentPage === 1 || isAnyLoading} aria-label="Página anterior"><FontAwesomeIcon icon={faChevronLeft} /> Ant</button>
                                            <button onClick={handleNextPage} disabled={currentPage === totalPages || isAnyLoading} aria-label="Próxima página">Próx <FontAwesomeIcon icon={faChevronRight} /></button>
                                        </div>
                                        <span>Total: {filteredGroupedConfigs.length} Grupo(s)</span>
                                    </div>
                                )}
                            </>
                        )} {/* Fim da condição !configsError */}
                    </div> {/* Fim #notif-list-card */}
                </div> {/* Fim #notif-table-column */}
            </div> {/* Fim #notifications-layout */}

            {/* --- Modais --- */}

            {/* Modal: Lista de Clientes Específicos */}
            {isClientModalOpen && (
                <div className="modal-overlay" onClick={() => setIsClientModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
                        <div className="modal-header">
                            <h2 id="client-modal-title"><FontAwesomeIcon icon={faUsers} /> Clientes Associados</h2>
                            {modalGroupInfo && (
                                <small style={{ display: 'block', fontWeight: 'normal', fontSize: '0.8em' }}>
                                    (Config: {modalGroupInfo.tax} / {modalGroupInfo.freq} / {modalGroupInfo.period}{frequencyUnits[modalGroupInfo.freq ?? '']?.substring(0, 1)}.)
                                </small>
                            )}
                            <button onClick={() => setIsClientModalOpen(false)} className="modal-close-button" aria-label="Fechar modal de clientes">&times;</button>
                        </div>
                        <div className="modal-body">
                            {clientsToShowInModal.filter(c => c !== null).length > 0 ? (
                                <ul className="client-modal-list">
                                    {clientsToShowInModal.filter((c): c is ApiClient => c !== null).map((client) => (
                                        <li key={client.id}>{client.name} (NIF: {client.nif})</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Não há clientes específicos associados a esta configuração (pode ser apenas Global).</p>
                            )}
                            {clientsToShowInModal.some(c => c === null) &&
                                <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '0.9em' }}>
                                    <FontAwesomeIcon icon={faGlobe} /> Esta configuração também se aplica globalmente a todos os outros clientes.
                                </p>
                            }
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsClientModalOpen(false)} className="button-secondary">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Histórico de Mensagens Enviadas */}
            {isMessagesModalOpen && (
                <div className="modal-overlay" onClick={() => setIsMessagesModalOpen(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="messages-modal-title">
                        <div className="modal-header">
                            <h2 id="messages-modal-title"><FontAwesomeIcon icon={faEnvelopeOpen} /> Histórico de Mensagens Enviadas</h2>
                            {modalGroupInfoForMessages && (
                                <small style={{ display: 'block', fontWeight: 'normal', fontSize: '0.8em' }}>
                                    Config: {modalGroupInfoForMessages.type} / {modalGroupInfoForMessages.tax} / {modalGroupInfoForMessages.freq} / {modalGroupInfoForMessages.period}{frequencyUnits[modalGroupInfoForMessages.freq ?? '']?.substring(0, 1)}.
                                </small>
                            )}
                            <button onClick={() => setIsMessagesModalOpen(false)} className="modal-close-button" aria-label="Fechar histórico de mensagens">&times;</button>
                        </div>
                        <div className="modal-body messages-modal-body">
                            {/* Estado de Loading */}
                            {isLoadingMessages && (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <FontAwesomeIcon icon={faSpinner} spin size="2x" /> Carregando histórico de mensagens...
                                </div>
                            )}
                            {/* Estado de Erro */}
                            {messageFetchError && !isLoadingMessages && (
                                <div className="notification-message error" style={{ margin: '10px 0' }} role="alert">
                                    <FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar: {messageFetchError}
                                    {groupBeingViewed &&
                                        <button onClick={() => handleShowMessages(groupBeingViewed)} style={{ marginLeft: '15px' }} className="button-secondary">
                                            <FontAwesomeIcon icon={faRedo} /> Tentar Novamente
                                        </button>
                                    }
                                </div>
                            )}
                            {/* Estado Vazio */}
                            {!isLoadingMessages && !messageFetchError && messagesToShowInModal.length === 0 && (
                                <p style={{ textAlign: 'center', padding: '20px' }}>Nenhuma mensagem encontrada no histórico para esta configuração.</p>
                            )}
                            {/* Tabela de Mensagens */}
                            {!isLoadingMessages && !messageFetchError && messagesToShowInModal.length > 0 && (
                                <div className="messages-history-table-container">
                                    <table className="messages-history-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Data Envio</th>
                                                <th>Status</th>
                                                <th>Título</th>
                                                <th>Mensagem</th>
                                                <th>Data Criação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {messagesToShowInModal.map(msg => (
                                                <tr key={msg.id}>
                                                    <td data-label="Cliente">{msg.client ? `${msg.client.name} (${msg.client.nif})` : 'Cliente Global/N/D'}</td>
                                                    <td data-label="Data Envio">{formatDateTime(msg.sendDate)}</td>
                                                    <td data-label="Status"><span className={`status-message ${msg.status?.toLowerCase()}`}>{msg.status || 'N/D'}</span></td>
                                                    <td data-label="Título">{msg.title || '-'}</td>
                                                    <td data-label="Mensagem" className="message-content-cell">
                                                        {msg.notificationType?.description?.toLowerCase() === 'email' ? (
                                                            (() => {
                                                                const detailsHtmlContent = extractDetailsDivHtml(msg.message);
                                                                if (detailsHtmlContent) {
                                                                    return <div dangerouslySetInnerHTML={{ __html: detailsHtmlContent }} />;
                                                                } else {
                                                                    const fallbackText = msg.message?.replace(/<[^>]+>/g, '') || ''; // Remove tags HTML
                                                                    return fallbackText.length > 150 ? `${fallbackText.substring(0, 147)}...` : fallbackText;
                                                                }
                                                            })()
                                                        ) : (
                                                            msg.message?.length > 150 ? `${msg.message.substring(0, 147)}...` : msg.message
                                                        )}
                                                    </td>
                                                    <td data-label="Data Criação">{formatDate(msg.createDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsMessagesModalOpen(false)} className="button-secondary">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

        </Fragment>
    );
};

export default Notifications;