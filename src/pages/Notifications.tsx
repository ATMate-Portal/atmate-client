import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
// Importar o CSS
import './Notifications.css'; // !! Certifique-se que tem estilos necessários !!
// Importar react-select
import Select, { MultiValue } from 'react-select';
// Importar Axios para chamadas diretas
import axios, { AxiosError } from 'axios'; // Axios já estava importado
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faSpinner, faSyncAlt, faUser, faBell, faMoneyBill, faClock, faToggleOn, faToggleOff,
    faEdit, faTrashAlt, faPlusCircle, faSearch, faTimesCircle, faExclamationTriangle, faCheckCircle,
    faFilter, faRedo, faUsers, faCheckSquare, faSquare, faGlobe, faList, faCheck,
    faChevronLeft, faChevronRight, faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
// Ajuste o caminho para o seu hook useApi (usado apenas para GETs agora)
import useApi from '../hooks/useApi'; // Assume que este hook lida com FULL_API_BASE_URL internamente

const FULL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log("API Base URL:", FULL_API_BASE_URL);

const frequencies: string[] = ['Diário', 'Semanal', 'Mensal', 'Trimestral'];
const ITEMS_PER_PAGE = 10;

const allNotificationTypes: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Telefone/SMS' }
];

type SelectOption = { value: number; label: string };

const frequencyUnits: Record<string, string> = { 'Diário': 'dias', 'Semanal': 'semanas', 'Mensal': 'meses', 'Trimestral': 'trimestres' };

// --- Interfaces ---
interface ApiClient { id: number; name: string; nif: number; }
interface ApiNotificationType { id: number; description: string; }
interface ApiTaxType { id: number; description: string; }
interface ApiNotificationConfig {
    id: number;
    client: ApiClient | null;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface GroupedConfig {
    key: string;
    notificationType: ApiNotificationType;
    taxType: ApiTaxType;
    frequency: string;
    startPeriod: number;
    active: boolean;
    clients: Array<ApiClient | null>;
    originalIds: number[];
    hasGlobalConfig: boolean;
}

interface Client { id: number; name: string; nif: number; }
interface TaxType { id: number; name: string; description?: string; }

interface FormDataState {
    selectedNotificationTypeIds: number[];
    selectedTaxTypeIds: number[];
    frequency: string;
    startPeriod: number;
}

interface CreateNotificationRequestPayload {
    clientsIDs: number[];
    taxTypeIDs: number[];
    notificationTypeList: number[];
    frequency: string;
    active: boolean;
    startPeriod: number;
}

// Interface para o payload de Update (usado para a edição completa e para o status toggle)
// O backend parece exigir os campos não nulos mesmo para o /status endpoint
interface UpdateNotificationRequestPayload {
    notificationTypeId?: number | null;
    taxTypeId?: number | null;
    frequency?: string;
    startPeriod?: number;
    active?: boolean; // Este é o campo crucial para o /status endpoint
}


interface ApiResponseData {
    message?: string;
    data?: ApiNotificationConfig | any;
}

type ClientSelectionMode = 'all' | 'individual';

// --- Componente Principal ---
const Notifications: React.FC = () => {
    // --- Estados ---
    const initialFormData: FormDataState = {
        selectedNotificationTypeIds: [],
        selectedTaxTypeIds: [],
        frequency: frequencies[0],
        startPeriod: 1,
    };
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [activeEdit, setActiveEdit] = useState<boolean>(true);
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>('individual');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [createLoading, setCreateLoading] = useState<boolean>(false); // Loading de Create/Update do formulário (Axios)
    const [isDeleting, setIsDeleting] = useState<boolean>(false); // Loading do delete via Axios
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false); // Loading do toggle status via Axios
    const [togglingItemId, setTogglingItemId] = useState<number | null>(null); // ** NOVO: Track which item is toggling **
    const [deletingItemId, setDeletingItemId] = useState<number | null>(null); // ** NOVO: Track which item is deleting **
    const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientsToShowInModal, setClientsToShowInModal] = useState<Array<ApiClient | null>>([]);
    const [modalGroupInfo, setModalGroupInfo] = useState<{ tax?: string, freq?: string, period?: number } | null>(null);

    // --- API Hooks (Apenas GET) ---
    const { data: allClientsData, loading: clientsLoading, error: clientsError } = useApi<Client[]>(`atmate-gateway/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
    const allClients = useMemo(() => allClientsData || [], [allClientsData]);

    const { data: taxTypesData, loading: taxTypesLoading, error: taxTypesError } = useApi<TaxType[]>(`atmate-gateway/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
    const taxTypes = useMemo(() => (taxTypesData || []).map(t => ({
        id: t.id,
        name: t.description || t.name || `Imposto ID ${t.id}`,
        description: t.description
    })), [taxTypesData]);

    const { data: existingConfigsResponse, loading: configsLoading, error: configsError } = useApi<ApiNotificationConfig[]>(`atmate-gateway/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
    const originalConfigs = useMemo(() => existingConfigsResponse || [], [existingConfigsResponse]);

    // --- Processamento de Dados ---
    const groupedConfigs = useMemo<GroupedConfig[]>(() => {
        const groups: Record<string, GroupedConfig> = {};
        originalConfigs.forEach((config) => {
            const notificationTypeId = config.notificationType?.id;
            const taxTypeId = config.taxType?.id;
            const freq = config.frequency;
            const startP = config.startPeriod;
            const active = config.active;

             if (notificationTypeId === undefined || taxTypeId === undefined || !freq || startP === undefined || active === undefined) {
                 console.warn("Ignorando config incompleta para agrupamento:", config);
                 return;
             }
             if (!config.notificationType || !config.taxType) {
                  console.warn("Configuração com tipo de notificação ou imposto inválido, ignorando:", config);
                  return;
             }

            const groupKey = `${notificationTypeId}-${taxTypeId}-${freq}-${startP}-${active}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey,
                    notificationType: config.notificationType,
                    taxType: config.taxType,
                    frequency: freq,
                    startPeriod: startP,
                    active: active,
                    clients: [],
                    originalIds: [],
                    hasGlobalConfig: false
                };
            }
            groups[groupKey].clients.push(config.client);
            groups[groupKey].originalIds.push(config.id);
            if (config.client === null) {
                groups[groupKey].hasGlobalConfig = true;
            }
        });
        return Object.values(groups);
    }, [originalConfigs]);

    const filteredGroupedConfigs = useMemo<GroupedConfig[]>(() => {
        let configs = [...groupedConfigs];
        if (filterStatus !== 'all') {
            const activeFilter = filterStatus === 'active';
            configs = configs.filter(group => group.active === activeFilter);
        }
        return configs;
    }, [groupedConfigs, filterStatus]);

    const paginatedConfigs = useMemo<GroupedConfig[]>(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroupedConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroupedConfigs, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredGroupedConfigs.length / ITEMS_PER_PAGE), [filteredGroupedConfigs]);

    // --- Formatação para React Select ---
    const taxTypeOptions = useMemo<SelectOption[]>(() => taxTypes.map(tax => ({ value: tax.id, label: tax.name })), [taxTypes]);
    const notificationTypeOptions = useMemo<SelectOption[]>(() => allNotificationTypes.map(type => ({ value: type.id, label: type.name })), []);

    // --- Lógica de Submissão ---
    const getSubmitBody = useCallback((): CreateNotificationRequestPayload | UpdateNotificationRequestPayload | null => {
        if (!editingConfigId) { // CRIAÇÃO
            const clientIdsToSend = clientSelectionMode === 'all'
                ? allClients.map(c => c.id)
                : selectedClients.map(c => c.id);

            const payload: CreateNotificationRequestPayload = {
                clientsIDs: clientIdsToSend,
                taxTypeIDs: formData.selectedTaxTypeIds,
                notificationTypeList: formData.selectedNotificationTypeIds,
                frequency: formData.frequency,
                active: true, // Sempre cria ativo
                startPeriod: formData.startPeriod,
            };
            console.log("Payload para /create:", JSON.stringify(payload));
            return payload;
        } else { // EDIÇÃO (Formulário Completo)
             const updatePayload: UpdateNotificationRequestPayload = {
                 // Campos editáveis no formulário
                 frequency: formData.frequency,
                 startPeriod: formData.startPeriod,
                 active: activeEdit, // Usa o estado 'activeEdit' do toggle do form
                 // Campos não editáveis mas necessários (se o backend exigir no DTO genérico)
                 notificationTypeId: formData.selectedNotificationTypeIds[0] ?? null,
                 taxTypeId: formData.selectedTaxTypeIds[0] ?? null,
             };
             console.log("Payload para /update/{id}:", JSON.stringify(updatePayload));
             return updatePayload;
        }
    }, [editingConfigId, formData, activeEdit, clientSelectionMode, selectedClients, allClients]);

    // --- Efeitos ---
    useEffect(() => {
        if (!clientsLoading && !taxTypesLoading && !configsLoading) {
            const now = new Date();
            const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
            setLastUpdated(`${now.toLocaleDateString('pt-PT', dateOptions)} ${now.toLocaleTimeString('pt-PT', timeOptions)}`);
            setIsRefreshingData(false);
        }
    }, [clientsLoading, taxTypesLoading, configsLoading]);

    const resetFormAndState = useCallback(() => {
        setFormData(initialFormData);
        setActiveEdit(true);
        setSelectedClients([]);
        setClientSelectionMode('individual');
        setEditingConfigId(null);
        setClientSearchTerm('');
        setShowClientDropdown(false);
        setNotificationMessage(null);
        setCreateLoading(false);
        setIsDeleting(false);
        setIsTogglingStatus(false);
        setTogglingItemId(null); // Reset item ID tracking
        setDeletingItemId(null); // Reset item ID tracking
    }, [initialFormData]);

    // useEffect para limpar mensagens (sem alterações)
    useEffect(() => {
        let timerId: NodeJS.Timeout | null = null;
        if (notificationMessage) {
            timerId = setTimeout(() => setNotificationMessage(null), 5000);
        }
        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [notificationMessage]);

    // useEffect para resetar página ao mudar filtro (sem alterações)
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);


    // --- Handlers ---
    const handleStandardChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const processedValue = name === 'startPeriod' ? (Math.max(1, parseInt(value, 10)) || 1) : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    }, []);

    const handleReactSelectChange = useCallback((fieldName: 'selectedNotificationTypeIds' | 'selectedTaxTypeIds') => {
        return (selectedOptions: MultiValue<SelectOption>) => {
            const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
            if (editingConfigId && selectedIds.length > 1) {
                console.warn("Tentativa de selecionar múltiplos valores em modo de edição. Ignorando seleção extra.");
                setFormData(prev => ({ ...prev, [fieldName]: prev[fieldName].length > 0 ? [prev[fieldName][0]] : [] }));
            } else {
                setFormData(prev => ({ ...prev, [fieldName]: selectedIds }));
            }
        };
    }, [editingConfigId]);

    // Handlers de Cliente (sem alterações)
    const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setClientSearchTerm(term);
        setShowClientDropdown(term.length > 0 && !editingConfigId);
    }, [editingConfigId]);

    const handleAddClient = useCallback((client: Client) => {
        if (!selectedClients.some(c => c.id === client.id)) {
            setSelectedClients(prev => [...prev, client]);
        }
        setClientSearchTerm('');
        setShowClientDropdown(false);
    }, [selectedClients]);

    const handleRemoveClient = useCallback((clientId: number) => {
        if(editingConfigId) return;
        setSelectedClients(prev => prev.filter(c => c.id !== clientId));
    }, [editingConfigId]);

    const handleClientModeChange = useCallback((mode: ClientSelectionMode) => {
        if (editingConfigId) return;
        setClientSelectionMode(mode);
        if (mode === 'all') {
            setSelectedClients([]);
            setClientSearchTerm('');
            setShowClientDropdown(false);
        }
    }, [editingConfigId]);

    // Função para CRIAR notificações (Axios POST - sem alterações)
    const performCreateNotification = useCallback(async () => {
        setCreateLoading(true);
        setNotificationMessage(null);
        const payload = getSubmitBody() as CreateNotificationRequestPayload | null;

        const clientsValid = (payload?.clientsIDs?.length ?? 0) > 0 || clientSelectionMode === 'all';
        const taxesValid = (payload?.taxTypeIDs ?? []).length > 0;
        const notifsValid = (payload?.notificationTypeList ?? []).length > 0;

        if (!payload || !clientsValid || !taxesValid || !notifsValid) {
             setNotificationMessage({ type: 'error', text: 'Dados inválidos para criação. Verifique seleções (Clientes, Tipos, Impostos).' });
             setCreateLoading(false);
             return;
        }

        const apiUrl = `${FULL_API_BASE_URL}atmate-gateway/notification/create`;
        console.log("Attempting POST to:", apiUrl, "with payload:", JSON.stringify(payload));

        try {
            const response = await axios.post<ApiResponseData>(apiUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            setNotificationMessage({ type: 'success', text: response.data?.message || `Configuração(ões) criada(s) com sucesso!` });
            resetFormAndState();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Erro ao criar notificação (Axios):", err);
            let errorMsg = "Erro desconhecido ao criar notificação.";
            if (axios.isAxiosError(err)) {
                errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Erro na comunicação com a API.";
                console.error("Axios error response:", err.response?.data);
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            setNotificationMessage({ type: 'error', text: `Erro ao criar: ${errorMsg}` });
        } finally {
            setCreateLoading(false);
        }
    }, [getSubmitBody, resetFormAndState, clientSelectionMode, FULL_API_BASE_URL]);

    // Função para ATUALIZAR notificações (Formulário Completo - Axios PUT - sem alterações)
    const performUpdateNotification = useCallback(async () => {
        if (!editingConfigId) {
            console.error("Tentativa de update sem editingConfigId!");
            setNotificationMessage({ type: 'error', text: 'Erro interno: ID de edição não encontrado.' });
            return;
        }

        setCreateLoading(true);
        setNotificationMessage(null);
        const payload = getSubmitBody() as UpdateNotificationRequestPayload | null;

        // Validação do payload de update genérico
        if (!payload || payload.notificationTypeId == null || payload.taxTypeId == null || !payload.frequency || payload.startPeriod == null || typeof payload.active !== 'boolean') {
              setNotificationMessage({ type: 'error', text: 'Dados inválidos para atualização. Verifique todos os campos.' });
              setCreateLoading(false);
              return;
        }

        const apiUrl = `${FULL_API_BASE_URL}atmate-gateway/notification/update/${editingConfigId}`;
        console.log("Attempting PUT to:", apiUrl, "with payload:", JSON.stringify(payload));

        try {
            const response = await axios.put<ApiResponseData>(apiUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            setNotificationMessage({ type: 'success', text: response.data?.message || `Configuração ID ${editingConfigId} atualizada com sucesso!` });
            resetFormAndState();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Erro ao atualizar notificação (Axios):", err);
            let errorMsg = "Erro desconhecido ao atualizar notificação.";
            if (axios.isAxiosError(err)) {
                errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Erro na comunicação com a API.";
                console.error("Axios error response:", err.response?.data);
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }
            setNotificationMessage({ type: 'error', text: `Erro ao atualizar: ${errorMsg}` });
        } finally {
            setCreateLoading(false);
        }
    }, [editingConfigId, getSubmitBody, resetFormAndState, FULL_API_BASE_URL]);

    // handleSubmit (sem alterações, chama as funções corretas)
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setNotificationMessage(null);

        // Validações comuns (campos do form)
        if (formData.selectedNotificationTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione pelo menos um Tipo de Notificação.' }); return; }
        if (formData.selectedTaxTypeIds.length === 0) { setNotificationMessage({ type: 'error', text: 'Selecione pelo menos um Imposto.' }); return; }
        if (!formData.frequency) { setNotificationMessage({ type: 'error', text: 'Selecione a Frequência.' }); return; }
        if (!formData.startPeriod || formData.startPeriod < 1) { setNotificationMessage({ type: 'error', text: 'A Antecedência deve ser 1 ou maior.' }); return; }

        if (!editingConfigId) { // CRIAÇÃO
            // Validação específica de criação (cliente)
            const isClientSelected = selectedClients.length > 0 || clientSelectionMode === 'all';
             if (!isClientSelected) {
                 setNotificationMessage({ type: 'error', text: 'Selecione pelo menos um cliente ou escolha "Todos".' }); return;
             }
             if (clientSelectionMode === 'all' && allClients.length === 0) {
                 console.warn('Tentando criar para "Todos", mas a lista de clientes está vazia.');
             }
             performCreateNotification(); // Chama Axios POST

        } else { // EDIÇÃO (FORMULÁRIO)
             performUpdateNotification(); // Chama Axios PUT genérico
        }
    }, [formData, selectedClients, clientSelectionMode, editingConfigId, allClients, performCreateNotification, performUpdateNotification]);

    // Handler para botão de refresh manual (sem alterações)
    const handleRefresh = useCallback(() => {
        setIsRefreshingData(true);
        setRefreshTrigger((prev) => prev + 1);
    }, []);

    // handleEdit (sem alterações)
    const handleEdit = useCallback((config: ApiNotificationConfig) => {
        console.log("handleEdit - Config recebida:", config);
        if (!config || !config.notificationType || !config.taxType) {
          console.error("Tentativa de editar configuração inválida:", config);
          setNotificationMessage({type: 'error', text:'Não é possível editar esta entrada (dados em falta).'});
          return;
        }

        setEditingConfigId(config.id);
        const initialNotifIds = config.notificationType ? [config.notificationType.id] : [];
        const initialTaxIds = config.taxType ? [config.taxType.id] : [];

        setFormData({
            selectedNotificationTypeIds: initialNotifIds,
            selectedTaxTypeIds: initialTaxIds,
            frequency: config.frequency,
            startPeriod: config.startPeriod,
        });
        setActiveEdit(config.active); // Define o estado inicial do toggle do formulário

        if (config.client) {
            setClientSelectionMode('individual');
            setSelectedClients([{ id: config.client.id, name: config.client.name, nif: config.client.nif }]);
        } else {
            setClientSelectionMode('all');
            setSelectedClients([]);
        }

        setClientSearchTerm('');
        setShowClientDropdown(false);
        window.scrollTo(0, 0);
        setNotificationMessage(null);
    }, []);

    // Handler para cancelar edição (sem alterações)
    const handleCancelEdit = useCallback(() => {
        resetFormAndState();
    }, [resetFormAndState]);

    // *** Handler para ações na tabela (DELETE via Axios, TOGGLE via Axios para /status com payload completo) ***
    const handleTableAction = useCallback(async (action: 'delete' | 'toggle', originalConfigId: number, currentStatus?: boolean) => {
        console.log(`Ação: ${action}, ID: ${originalConfigId}, Status Atual: ${currentStatus}`);
        setNotificationMessage(null);

        const deleteUrlRelative = `atmate-gateway/notification/delete/${originalConfigId}`;
        const statusUpdateUrlRelative = `atmate-gateway/notification/update/${originalConfigId}/status`;

        if (action === 'delete') {
            if (!window.confirm(`Tem a certeza que quer apagar a configuração ID ${originalConfigId}?`)) return;

            setDeletingItemId(originalConfigId); // Track which item is deleting
            setIsDeleting(true);
            const deleteUrl = `${FULL_API_BASE_URL}${deleteUrlRelative}`;
            console.log("Attempting DELETE to:", deleteUrl);

            try {
                const response = await axios.delete<ApiResponseData>(deleteUrl);
                setNotificationMessage({ type: 'success', text: response.data?.message || `Configuração ID ${originalConfigId} apagada com sucesso!` });
                setRefreshTrigger(prev => prev + 1);
                if(editingConfigId === originalConfigId) {
                    resetFormAndState();
                }
            } catch (err) {
                console.error("Erro ao apagar notificação (Axios):", err);
                let errorMsg = "Erro desconhecido ao apagar notificação.";
                if (axios.isAxiosError(err)) {
                    errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Erro na comunicação com a API.";
                    console.error("Axios error response:", err.response?.data);
                } else if (err instanceof Error) {
                    errorMsg = err.message;
                }
                setNotificationMessage({ type: 'error', text: `Erro ao apagar ID ${originalConfigId}: ${errorMsg}` });
            } finally {
                setIsDeleting(false);
                setDeletingItemId(null);
            }

        } else if (action === 'toggle') {
            if (typeof currentStatus !== 'boolean') {
                 console.error("Status inválido para toggle.");
                 setNotificationMessage({ type: 'error', text: 'Erro interno: Status atual inválido para alternar.' });
                 return;
            }

            // *** ACHAR A CONFIG ORIGINAL PARA PEGAR OS DADOS NECESSÁRIOS ***
            const originalConfig = originalConfigs.find(c => c.id === originalConfigId);

            if (!originalConfig) {
                console.error(`Could not find original config with ID ${originalConfigId} for status toggle.`);
                setNotificationMessage({ type: 'error', text: `Erro interno: Configuração original ID ${originalConfigId} não encontrada.` });
                return; // Não continua se não achar a config original
            }
            // Verifica se os tipos existem na config original (necessários para o payload)
            if (!originalConfig.notificationType || !originalConfig.taxType) {
                 console.error(`Original config ID ${originalConfigId} is missing type information for payload.`);
                 setNotificationMessage({ type: 'error', text: `Erro interno: Dados (tipo/imposto) incompletos na configuração original ID ${originalConfigId}. Não é possível alternar estado.` });
                 return;
            }

            setTogglingItemId(originalConfigId); // Track which item is toggling
            setIsTogglingStatus(true);
            const statusUpdateUrl = `${FULL_API_BASE_URL}${statusUpdateUrlRelative}`+'?active='+(!currentStatus); // Adiciona o parâmetro de status na URL (opcional, mas pode ser útil para depuração)

            // *** CONSTRUIR PAYLOAD COMPLETO CONFORME EXIGIDO PELO BACKEND ***
            const payload: UpdateNotificationRequestPayload = {
                active: !currentStatus, // O único campo que realmente queremos mudar
                // Campos adicionais exigidos pelo backend (obtidos da config original)
                notificationTypeId: originalConfig.notificationType.id,
                taxTypeId: originalConfig.taxType.id,
                frequency: originalConfig.frequency,
                startPeriod: originalConfig.startPeriod,
            };

            console.log("Attempting PUT to (status):", statusUpdateUrl, "with FULL payload:", JSON.stringify(payload));

             try {
                 const response = await axios.put<ApiResponseData>(statusUpdateUrl, payload, {
                     headers: { 'Content-Type': 'application/json' },
                 });
                 setNotificationMessage({ type: 'success', text: response.data?.message || `Estado da configuração ID ${originalConfigId} atualizado com sucesso!` });
                 setRefreshTrigger(prev => prev + 1);
                 if(editingConfigId === originalConfigId) {
                    setActiveEdit(!currentStatus);
                 }
             } catch (err) {
                 console.error(`Erro ao atualizar estado da notificação ID ${originalConfigId} (Axios /status):`, err);
                 let errorMsg = "Erro desconhecido ao atualizar estado.";
                 if (axios.isAxiosError(err)) {
                     // Tenta extrair uma mensagem mais específica, se disponível
                     const backendError = err.response?.data?.error || err.response?.data?.message;
                     const cause = err.response?.data?.cause?.message; // Tenta ver se há uma causa específica
                     errorMsg = backendError || cause || err.message || "Erro na comunicação com a API.";
                     console.error("Axios error response data:", err.response?.data);
                 } else if (err instanceof Error) {
                     errorMsg = err.message;
                 }
                 // Mostra a mensagem de erro detalhada, se possível
                 setNotificationMessage({ type: 'error', text: `Erro ao atualizar estado ID ${originalConfigId}: ${errorMsg}` });
             } finally {
                 setIsTogglingStatus(false);
                 setTogglingItemId(null);
             }
        }
    // Dependencies: added originalConfigs to find the data needed for the payload
    }, [FULL_API_BASE_URL, resetFormAndState, editingConfigId, originalConfigs]);


    // Handler para o filtro de status da tabela (sem alterações)
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterStatus(e.target.value as 'all' | 'active' | 'inactive');
    };

    // Handlers de Paginação (sem alterações)
    const handleNextPage = () => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); };
    const handlePrevPage = () => { setCurrentPage(prev => Math.max(prev - 1, 1)); };

     // Handler para mostrar modal de clientes (sem alterações)
     const handleShowClients = useCallback((clients: Array<ApiClient | null>, group: GroupedConfig) => {
         console.log("Showing clients for group:", group.key, clients);
        setClientsToShowInModal(clients);
        setModalGroupInfo({
             tax: group.taxType.description || `ID ${group.taxType.id}`,
             freq: group.frequency,
             period: group.startPeriod
        });
        setIsClientModalOpen(true);
     }, []);

    // --- Filtros e Mapeamentos para Renderização ---
    const filteredClients = useMemo(() => {
        if (!clientSearchTerm || clientSelectionMode === 'all' || editingConfigId) return [];
        const selectedIds = new Set(selectedClients.map(c => c.id));
        const termLower = clientSearchTerm.toLowerCase();
        return allClients.filter(client =>
            !selectedIds.has(client.id) &&
            (client.name.toLowerCase().includes(termLower) || client.nif.toString().includes(termLower))
        ).slice(0, 10);
    }, [clientSearchTerm, allClients, selectedClients, clientSelectionMode, editingConfigId]);

    const isSubmitting = createLoading; // Loading do formulário (Create/Update)
    const isAnyLoading = isSubmitting || isTogglingStatus || isDeleting; // Estado combinado de loading

    // --- Renderização ---
    if (clientsLoading || taxTypesLoading || (configsLoading && !isRefreshingData)) {
         return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> A carregar notificações...</div>;
    }
     const initialDataError = clientsError || taxTypesError;
    if (initialDataError && allClients.length === 0 && taxTypes.length === 0) {
         return <div id="notif-msg-standalone-error" className="notification-message error">
                   <FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar dados essenciais: {initialDataError || 'Erro desconhecido'}. Tente atualizar a página.
                   <button onClick={() => window.location.reload()} style={{ marginLeft: '15px' }}>Atualizar</button>
                 </div>;
    }

    return (
        <Fragment>
            {/* Header */}
            <div id="notif-header">
                <h1>{editingConfigId ? 'Editar Configuração de Notificação' : 'Configurar Novas Notificações'}</h1>
                <div id="notif-last-updated" onClick={handleRefresh} title="Clique para atualizar os dados" role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} />
                    <span>{isRefreshingData ? ' Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : ' Atualizar dados')}</span>
                </div>
            </div>
             {/* Mensagens */}
             {notificationMessage && (
                 <div id="notif-message-container" className={`notification-message ${notificationMessage.type}`} role="alert">
                     <FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} />
                     <span className="message-text">{notificationMessage.text}</span>
                     <button onClick={() => setNotificationMessage(null)} className="close-message" aria-label="Fechar">&times;</button>
                 </div>
              )}

             {/* Layout Principal */}
            <div id="notifications-layout">
                 {/* Coluna Esquerda: Formulário */}
                 <div id="notif-form-column" className="layout-column">
                     <div id="notif-form-card" className={`notification-card ${editingConfigId ? 'editing-mode' : ''}`}>
                         <form onSubmit={handleSubmit} noValidate>
                             {/* Fieldset: Destinatário(s) */}
                             <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                 <legend><FontAwesomeIcon icon={faUsers} /> Destinatário(s)</legend>
                                 <div id="notif-client-group">
                                     {/* Seletor de Modo: Individual / Todos */}
                                     <div id="notif-client-mode-selector" className="segmented-control">
                                         <button
                                             type="button"
                                             className={clientSelectionMode === 'individual' ? 'active' : ''}
                                             onClick={() => handleClientModeChange('individual')}
                                             disabled={!!editingConfigId || isAnyLoading}
                                             title={editingConfigId ? "Modo bloqueado durante edição" : "Selecionar clientes individualmente"}
                                         >
                                             <FontAwesomeIcon icon={faUser} /> Individualmente
                                         </button>
                                         <button
                                             type="button"
                                             className={clientSelectionMode === 'all' ? 'active' : ''}
                                             onClick={() => handleClientModeChange('all')}
                                             disabled={!!editingConfigId || isAnyLoading}
                                             title={editingConfigId ? "Modo bloqueado durante edição" : "Aplicar a todos os clientes"}
                                         >
                                             <FontAwesomeIcon icon={faGlobe} /> Todos
                                         </button>
                                     </div>

                                     {/* Seleção Individual */}
                                     {clientSelectionMode === 'individual' && (
                                         <Fragment>
                                             <div className="autocomplete-wrapper form-group">
                                                 <label htmlFor="notif-client-search-input" className="sr-only">Pesquisar Cliente por Nome ou NIF</label>
                                                 <FontAwesomeIcon icon={faSearch} className="search-icon" />
                                                 <input
                                                     type="text"
                                                     id="notif-client-search-input"
                                                     placeholder="Pesquisar e adicionar cliente..."
                                                     value={clientSearchTerm}
                                                     onChange={handleClientSearchChange}
                                                     onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)}
                                                     autoComplete="off"
                                                     disabled={!!editingConfigId || isAnyLoading}
                                                  />
                                                  {showClientDropdown && filteredClients.length > 0 && (
                                                      <ul className="autocomplete-dropdown">
                                                          {filteredClients.map((client) => (
                                                              <li key={client.id} onClick={() => handleAddClient(client)} tabIndex={0}>
                                                                  {client.name} ({client.nif})
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  )}
                                                  {clientSearchTerm.length > 0 && filteredClients.length === 0 && !clientsLoading && !editingConfigId}
                                              </div>

                                              {/* Lista de Clientes Selecionados */}
                                              <div id="notif-selected-clients-list">
                                                  <label>Clientes Selecionados:</label>
                                                  {selectedClients.map(client => (
                                                      <span key={client.id} className="selected-item-pill">
                                                          {client.name}
                                                          {!editingConfigId && (
                                                              <button
                                                                  type="button"
                                                                  onClick={() => handleRemoveClient(client.id)}
                                                                  className="remove-item-button"
                                                                  aria-label={`Remover ${client.name}`}
                                                                  title={`Remover ${client.name}`}
                                                                  disabled={isAnyLoading}
                                                              >
                                                                  &times;
                                                              </button>
                                                          )}
                                                      </span>
                                                  ))}
                                                  {selectedClients.length === 0 && !editingConfigId && (
                                                      <small className="no-selection info-edit">Nenhum cliente selecionado.</small>
                                                  )}
                                                  {editingConfigId && selectedClients.length === 1 && clientSelectionMode === 'individual' && (
                                                      <div className="info-edit">Editando configuração para: <strong>{selectedClients[0].name}</strong> (NIF: {selectedClients[0].nif})</div>
                                                  )}
                                                   {editingConfigId && selectedClients.length === 0 && clientSelectionMode === 'individual' && (
                                                      <div className="info-edit error">Erro: Cliente original não carregado para edição.</div>
                                                  )}
                                              </div>
                                          </Fragment>
                                      )}

                                      {/* Seleção Todos */}
                                      {clientSelectionMode === 'all' && (
                                          <div className="info-all-selected">
                                              <FontAwesomeIcon icon={faCheckCircle} /> Aplicar a <strong>todos ({allClients.length})</strong> os clientes existentes.
                                              {editingConfigId && (
                                                  <div className="info-edit">Editando configuração global (aplicada a todos).</div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </fieldset>

                              {/* Fieldset: Configuração da Notificação */}
                              <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                  <legend><FontAwesomeIcon icon={faBell} /> Configuração da Notificação</legend>
                                  {/* Tipo(s) de Notificação (Select) */}
                                  <div className="form-group">
                                      <label id="label-notif-type" htmlFor="notif-type-select-react">Tipo(s) de Notificação <span className="required-indicator">*</span></label>
                                      <Select<SelectOption, true>
                                          inputId='notif-type-select-react'
                                          isMulti={!editingConfigId as true}
                                          name="selectedNotificationTypeIds"
                                          options={notificationTypeOptions}
                                          className="basic-multi-select"
                                          classNamePrefix="select"
                                          placeholder={editingConfigId ? "Tipo (não editável)" : "Selecione um ou mais tipos..."}
                                          aria-labelledby="label-notif-type"
                                          onChange={handleReactSelectChange('selectedNotificationTypeIds')}
                                          value={notificationTypeOptions.filter(o => formData.selectedNotificationTypeIds.includes(o.value))}
                                          isClearable={!editingConfigId}
                                          closeMenuOnSelect={!editingConfigId}
                                          isDisabled={!!editingConfigId || isAnyLoading}
                                       />
                                       {editingConfigId && <small className="info-edit">O tipo de notificação não pode ser alterado.</small>}
                                   </div>
                                   {/* Imposto(s) (Select) */}
                                   <div className="form-group">
                                       <label id="label-tax-type" htmlFor="tax-type-select-react">Imposto(s) <span className="required-indicator">*</span></label>
                                       <Select<SelectOption, true>
                                           inputId='tax-type-select-react'
                                           isMulti={!editingConfigId as true}
                                           name="selectedTaxTypeIds"
                                           options={taxTypeOptions}
                                           className="basic-multi-select"
                                           classNamePrefix="select"
                                           placeholder={editingConfigId ? "Imposto (não editável)" : "Selecione um ou mais impostos..."}
                                           aria-labelledby="label-tax-type"
                                           onChange={handleReactSelectChange('selectedTaxTypeIds')}
                                           value={taxTypeOptions.filter(o => formData.selectedTaxTypeIds.includes(o.value))}
                                           isClearable={!editingConfigId}
                                           closeMenuOnSelect={!editingConfigId}
                                           isDisabled={!!editingConfigId || isAnyLoading}
                                        />
                                        {taxTypesLoading && <small>Carregando impostos...</small>}
                                        {taxTypesError && <small className="error">Erro ao carregar impostos.</small>}
                                         {editingConfigId && <small className="info-edit">O imposto não pode ser alterado.</small>}
                                    </div>
                                </fieldset>

                                {/* Fieldset: Periodicidade */}
                                <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                    <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend>
                                    <div className="form-row">
                                        {/* Frequência */}
                                        <div className="form-group">
                                            <label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label>
                                            <select
                                                id="notif_frequency_select"
                                                name="frequency"
                                                value={formData.frequency}
                                                onChange={handleStandardChange}
                                                required
                                                disabled={isAnyLoading}
                                            >
                                                {frequencies.map((freq) => (
                                                    <option key={freq} value={freq}>{freq}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Antecedência */}
                                        <div className="form-group">
                                            <label htmlFor="notif_start_period_input">
                                                 Antecedência ({frequencyUnits[formData.frequency] || 'períodos'}) <span className="required-indicator">*</span>
                                            </label>
                                            <input
                                                id="notif_start_period_input"
                                                type="number"
                                                name="startPeriod"
                                                value={formData.startPeriod}
                                                min="1"
                                                onChange={handleStandardChange}
                                                required
                                                aria-describedby="startPeriodHelp"
                                                disabled={isAnyLoading}
                                             />
                                             <small id="startPeriodHelp" className="input-description">
                                                 Nº de {frequencyUnits[formData.frequency] || 'períodos'} antes do prazo.
                                             </small>
                                         </div>
                                     </div>
                                     {/* Toggle Ativo/Inativo (APENAS EM EDIÇÃO no Formulário) */}
                                     {editingConfigId && (
                                         <div className="form-group toggle-group">
                                             <label htmlFor="notif-active-toggle">Estado da Configuração:</label>
                                             <button
                                                 type="button"
                                                 id="notif-active-toggle"
                                                 onClick={() => setActiveEdit(prev => !prev)}
                                                 className={`toggle-button ${activeEdit ? 'active' : 'inactive'}`}
                                                 aria-pressed={activeEdit}
                                                 title={activeEdit ? "Clique para desativar" : "Clique para ativar"}
                                                 disabled={isAnyLoading}
                                             >
                                                 <FontAwesomeIcon icon={activeEdit ? faToggleOn : faToggleOff} />
                                                 {activeEdit ? ' Ativo' : ' Inativo'}
                                             </button>
                                         </div>
                                     )}
                                 </fieldset>

                                 {/* Ações do Formulário */}
                                 <div id="notif-form-actions">
                                     <button
                                         id="notif-submit-button"
                                         type="submit"
                                         className="button-primary"
                                         disabled={
                                             isAnyLoading ||
                                             (!editingConfigId && clientSelectionMode === 'individual' && selectedClients.length === 0) ||
                                             (formData.selectedNotificationTypeIds.length === 0) ||
                                             (formData.selectedTaxTypeIds.length === 0) ||
                                             !formData.frequency || formData.startPeriod < 1
                                         }
                                     >
                                         <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} spin={isSubmitting} />
                                         {isSubmitting ? 'A guardar...' : (editingConfigId ? 'Atualizar Configuração' : 'Guardar Nova Configuração')}
                                     </button>
                                     {editingConfigId && (
                                          <button
                                             id="notif-cancel-edit-button"
                                             type="button"
                                             className="button-secondary"
                                             onClick={handleCancelEdit}
                                             disabled={isAnyLoading}
                                         >
                                             Cancelar Edição
                                         </button>
                                      )}
                                  </div>
                              </form>
                          </div>
                      </div>

                      {/* Coluna Direita: Tabela */}
                      <div id="notif-table-column" className="layout-column">
                          <div id="notif-list-card" className="notification-card">
                              {/* Controles da Tabela */}
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

                              {/* Estados Loading/Erro/Tabela */}
                              {configsLoading && isRefreshingData && (
                                   <div id="notif-loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Atualizando configurações...</div>
                              )}
                              {configsError && !configsLoading && (
                                   <div id="notif-error-placeholder" className="notification-message error">
                                       <span><FontAwesomeIcon icon={faExclamationTriangle} /> Erro ao carregar configurações: {configsError || 'Erro desconhecido'}</span>
                                       <button id="notif-retry-button" onClick={handleRefresh} disabled={isRefreshingData || isAnyLoading}>
                                           <FontAwesomeIcon icon={isRefreshingData ? faSpinner : faRedo} spin={isRefreshingData} /> Tentar Novamente
                                       </button>
                                   </div>
                              )}

                              {!configsError && (
                                  <Fragment>
                                      <div id="notif-table-responsive">
                                          <table id="notifications-table-element" className="notifications-table">
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
                                                  {!configsLoading && paginatedConfigs.length === 0 && (
                                                      <tr><td colSpan={7} className="no-data">
                                                           Nenhuma configuração encontrada{filterStatus !== 'all' ? ` com estado '${filterStatus === 'active' ? 'Ativo' : 'Inativo'}'` : ''}.
                                                           {groupedConfigs.length > 0 && <button onClick={() => setFilterStatus('all')} className="link-button">Mostrar todos</button> }
                                                      </td></tr>
                                                  )}
                                                  {paginatedConfigs.map((group) => {
                                                      const specificClients = group.clients.filter((c): c is ApiClient => c !== null);
                                                      const isGlobalDisplay = specificClients.length === 0 && group.hasGlobalConfig;
                                                      const isSingleOriginalConfig = group.originalIds.length === 1;
                                                      const singleOriginalId = isSingleOriginalConfig ? group.originalIds[0] : undefined;
                                                      const originalConfigForEdit = singleOriginalId ? originalConfigs.find(c => c.id === singleOriginalId) : undefined;

                                                      let clientDisplay: React.ReactNode = '';
                                                      if (isGlobalDisplay) {
                                                          clientDisplay = <span title="Configuração global"><FontAwesomeIcon icon={faGlobe} /> Todos</span>;
                                                      } else if (specificClients.length === 1) {
                                                          clientDisplay = `${specificClients[0].name} (${specificClients[0].nif})`;
                                                      } else if (specificClients.length > 1) {
                                                          clientDisplay = (
                                                              <button
                                                                  type="button"
                                                                  className="link-button"
                                                                  onClick={() => handleShowClients(group.clients, group)}
                                                                  title={`Ver os ${specificClients.length} clientes associados`}
                                                                  disabled={isAnyLoading}
                                                              >
                                                                  {specificClients.length} Clientes <FontAwesomeIcon icon={faUsers} size="xs" style={{ marginLeft: '4px' }} />
                                                              </button>
                                                          );
                                                      } else {
                                                          clientDisplay = <span className="error">Dados cliente?</span>;
                                                      }

                                                      const typeDisplay = group.notificationType?.description || `ID:${group.notificationType?.id || '?'}`;
                                                      const taxDisplay = group.taxType?.description || `ID:${group.taxType?.id || '?'}`;
                                                      const antecendenciaUnit = frequencyUnits[group.frequency] || 'dias';
                                                      const unitAbbreviation = antecendenciaUnit.substring(0, 1);

                                                      // ** Define se o spinner de toggle/delete deve aparecer NESTA linha **
                                                      const showToggleSpinner = isTogglingStatus && togglingItemId === singleOriginalId;
                                                      const showDeleteSpinner = isDeleting && deletingItemId === singleOriginalId;

                                                      return (
                                                          <tr key={group.key} className={`${group.active ? '' : 'inactive-row'} ${singleOriginalId === editingConfigId ? 'editing-row-highlight' : ''}`}>
                                                              <td data-label="Destinatário(s)">{clientDisplay}</td>
                                                              <td data-label="Tipo">{typeDisplay}</td>
                                                              <td data-label="Imposto">{taxDisplay}</td>
                                                              <td data-label="Freq.">{group.frequency}</td>
                                                              <td data-label="Antec." className="cell-center">{group.startPeriod} {unitAbbreviation}.</td>
                                                              <td data-label="Estado" className="cell-center">
                                                                  <span className={`status ${group.active ? 'active' : 'inactive'}`}>
                                                                       {group.active ? 'Ativo' : 'Inativo'}
                                                                  </span>
                                                              </td>
                                                              <td data-label="Ações" className="action-buttons">
                                                                  {/* Botão Editar */}
                                                                  <button
                                                                      onClick={() => originalConfigForEdit && handleEdit(originalConfigForEdit)}
                                                                      title={!isSingleOriginalConfig ? "Edição disponível apenas para configurações individuais" : "Editar esta configuração"}
                                                                      disabled={!isSingleOriginalConfig || isAnyLoading || (!!editingConfigId && singleOriginalId !== editingConfigId)}
                                                                      className="action-button edit"
                                                                  >
                                                                      <FontAwesomeIcon icon={faEdit} />
                                                                  </button>
                                                                  {/* Botão Ativar/Desativar */}
                                                                  <button
                                                                      onClick={() => singleOriginalId && handleTableAction('toggle', singleOriginalId, group.active)}
                                                                      title={!isSingleOriginalConfig ? "Ação disponível apenas para configurações individuais" : (group.active ? 'Desativar' : 'Ativar')}
                                                                      // Disable if any action is happening OR if this specific item is deleting
                                                                      disabled={!isSingleOriginalConfig || isAnyLoading || (isDeleting && deletingItemId === singleOriginalId)}
                                                                      className={`action-button toggle ${group.active ? 'toggle-off' : 'toggle-on'}`}
                                                                  >
                                                                      {showToggleSpinner ? <FontAwesomeIcon icon={faSpinner} spin/> : <FontAwesomeIcon icon={group.active ? faToggleOff : faToggleOn} />}
                                                                  </button>
                                                                  {/* Botão Apagar */}
                                                                  <button
                                                                      onClick={() => singleOriginalId && handleTableAction('delete', singleOriginalId)}
                                                                      title={!isSingleOriginalConfig ? "Ação disponível apenas para configurações individuais" : "Apagar esta configuração"}
                                                                       // Disable if any action is happening OR if this specific item is toggling
                                                                      disabled={!isSingleOriginalConfig || isAnyLoading || (isTogglingStatus && togglingItemId === singleOriginalId) }
                                                                      className="action-button delete"
                                                                  >
                                                                      {showDeleteSpinner ? <FontAwesomeIcon icon={faSpinner} spin/> : <FontAwesomeIcon icon={faTrashAlt} />}
                                                                  </button>
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>

                                      {/* Controles de Paginação */}
                                      {totalPages > 1 && (
                                          <div className="pagination-controls">
                                              <span>Pág. {currentPage} de {totalPages}</span>
                                              <div className="pagination-buttons">
                                                  <button onClick={handlePrevPage} disabled={currentPage === 1 || isAnyLoading} aria-label="Página Anterior">
                                                      <FontAwesomeIcon icon={faChevronLeft} /> Ant
                                                  </button>
                                                  <button onClick={handleNextPage} disabled={currentPage === totalPages || isAnyLoading} aria-label="Próxima Página">
                                                      Próx <FontAwesomeIcon icon={faChevronRight} />
                                                  </button>
                                              </div>
                                               <span>{filteredGroupedConfigs.length} Grupo(s) encontrado(s)</span>
                                           </div>
                                       )}
                                   </Fragment>
                               )}

                           </div>
                       </div> {/* Fim Coluna Tabela */}
                   </div> {/* Fim layout */}

                   {/* Modal para Mostrar Clientes (sem alterações) */}
                  {isClientModalOpen && (
                      <div className="modal-overlay" onClick={() => setIsClientModalOpen(false)}>
                          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                              <div className="modal-header">
                                  <h2>
                                      <FontAwesomeIcon icon={faUsers} /> Clientes Associados
                                      {modalGroupInfo && (
                                           <small style={{ display: 'block', fontWeight: 'normal', fontSize: '0.8em' }}>
                                               ({modalGroupInfo.tax} / {modalGroupInfo.freq} / {modalGroupInfo.period} {frequencyUnits[modalGroupInfo.freq ?? '']?.substring(0,1)}.)
                                           </small>
                                       )}
                                   </h2>
                                   <button onClick={() => setIsClientModalOpen(false)} className="modal-close-button" aria-label="Fechar Modal">&times;</button>
                               </div>
                               <div className="modal-body">
                                   {clientsToShowInModal.filter(c => c !== null).length > 0 ? (
                                       <ul className="client-modal-list">
                                           {clientsToShowInModal.filter((c): c is ApiClient => c !== null).map((client) => (
                                               <li key={client.id}>
                                                   {client.name} (NIF: {client.nif})
                                               </li>
                                           ))}
                                       </ul>
                                   ) : (
                                       <p>Não há clientes específicos associados a este grupo de configuração.</p>
                                   )}
                               </div>
                           </div>
                       </div>
                   )}
               </Fragment>
           );
       };

       export default Notifications;