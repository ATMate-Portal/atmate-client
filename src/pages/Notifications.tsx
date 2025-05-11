import React, { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
import './Notifications.css';
import Select, { MultiValue, SingleValue } from 'react-select';
import axios, { AxiosError } from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faSpinner, faSyncAlt, faUser, faBell, faClock, faToggleOn, faToggleOff,
    faEdit, faTrashAlt, faSearch, faTimesCircle, faExclamationTriangle, faCheckCircle,
    faFilter, faUsers, faGlobe, faList,
    faChevronLeft, faChevronRight, faRedo
} from '@fortawesome/free-solid-svg-icons';
import useApi from '../hooks/useApi';

const FULL_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const frequencies: string[] = ['Diário', 'Semanal', 'Mensal', 'Trimestral'];
const ITEMS_PER_PAGE = 10;

const allNotificationTypes: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Telefone/SMS' }
];

type SelectOption = { value: number; label: string };
const frequencyUnits: Record<string, string> = { 'Diário': 'dias', 'Semanal': 'semanas', 'Mensal': 'meses', 'Trimestral': 'trimestres' };

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
    active: boolean; // Novas são criadas como ativas
    startPeriod: number;
}

interface UpdateNotificationRequestPayload {
    notificationTypeId: number; // Fixo do grupo, não editável no form
    taxTypeId: number;      // Fixo do grupo, não editável no form
    frequency: string;      // Editável no form
    startPeriod: number;    // Editável no form
    active: boolean;        // CORREÇÃO: Readicionado - backend espera este campo com o valor original do grupo
}

interface ApiResponseData { message?: string; data?: ApiNotificationConfig | any; }
type ClientSelectionMode = 'all' | 'individual';

const Notifications: React.FC = () => {
    const initialFormData: FormDataState = {
        selectedNotificationTypeIds: [], selectedTaxTypeIds: [],
        frequency: frequencies[0], startPeriod: 1,
    };
    const [formData, setFormData] = useState<FormDataState>(initialFormData);
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>('individual');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [createLoading, setCreateLoading] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
    const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);
    const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientsToShowInModal, setClientsToShowInModal] = useState<Array<ApiClient | null>>([]);
    const [modalGroupInfo, setModalGroupInfo] = useState<{ tax?: string, freq?: string, period?: number } | null>(null);

    const { data: allClientsData, loading: clientsLoading } = useApi<Client[]>(`atmate-gateway/clients/getClients?refresh=${refreshTrigger}`, { enabled: true });
    const allClients = useMemo(() => allClientsData || [], [allClientsData]);

    const { data: taxTypesData, loading: taxTypesLoading } = useApi<TaxType[]>(`atmate-gateway/tax/getTypes?refresh=${refreshTrigger}`, { enabled: true });
    const taxTypes = useMemo(() => (taxTypesData || []).map(t => ({ id: t.id, name: t.description || t.name || `Imposto ID ${t.id}`, description: t.description })), [taxTypesData]);

    const { data: existingConfigsResponse, loading: configsLoading, error: configsError } = useApi<ApiNotificationConfig[]>(`atmate-gateway/notification/getNotificationConfig?refresh=${refreshTrigger}`, { enabled: true });
    const originalConfigs = useMemo(() => existingConfigsResponse || [], [existingConfigsResponse]);

    const groupedConfigs = useMemo<GroupedConfig[]>(() => {
        const groups: Record<string, GroupedConfig> = {};
        originalConfigs.forEach((config) => {
            if (!config.notificationType?.id || !config.taxType?.id || !config.frequency || config.startPeriod === undefined || config.active === undefined) {
                return;
            }
            const groupKey = `${config.notificationType.id}-${config.taxType.id}-${config.frequency}-${config.startPeriod}-${config.active}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    key: groupKey, notificationType: config.notificationType, taxType: config.taxType,
                    frequency: config.frequency, startPeriod: config.startPeriod, active: config.active,
                    clients: [], originalIds: [], hasGlobalConfig: false,
                };
            }
            groups[groupKey].clients.push(config.client);
            groups[groupKey].originalIds.push(config.id);
            if (config.client === null) groups[groupKey].hasGlobalConfig = true;
        });
        return Object.values(groups);
    }, [originalConfigs]);

    const filteredGroupedConfigs = useMemo<GroupedConfig[]>(() => {
        return filterStatus === 'all' ? groupedConfigs : groupedConfigs.filter(g => g.active === (filterStatus === 'active'));
    }, [groupedConfigs, filterStatus]);

    const paginatedConfigs = useMemo<GroupedConfig[]>(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroupedConfigs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroupedConfigs, currentPage]);

    const totalPages = useMemo(() => Math.ceil(filteredGroupedConfigs.length / ITEMS_PER_PAGE), [filteredGroupedConfigs]);
    const taxTypeOptions = useMemo<SelectOption[]>(() => taxTypes.map(tax => ({ value: tax.id, label: tax.name })), [taxTypes]);
    const notificationTypeOptions = useMemo<SelectOption[]>(() => allNotificationTypes.map(type => ({ value: type.id, label: type.name })), []);

    const getSubmitBody = useCallback((): CreateNotificationRequestPayload | UpdateNotificationRequestPayload | null => {
        if (!editingGroupKey) { // CRIAÇÃO
            const clientIdsToSend = clientSelectionMode === 'all' ? allClients.map(c => c.id) : selectedClients.map(c => c.id);
            return {
                clientsIDs: clientIdsToSend, taxTypeIDs: formData.selectedTaxTypeIds, notificationTypeList: formData.selectedNotificationTypeIds,
                frequency: formData.frequency, active: true, startPeriod: formData.startPeriod,
            };
        } else { // EDIÇÃO DE GRUPO/CONFIG INDIVIDUAL
            const groupBeingEdited = groupedConfigs.find(g => g.key === editingGroupKey);
            if (!groupBeingEdited) { console.error("Erro: Grupo para edição não encontrado em getSubmitBody."); return null; }
            return {
                notificationTypeId: groupBeingEdited.notificationType.id,
                taxTypeId: groupBeingEdited.taxType.id,
                frequency: formData.frequency,
                startPeriod: formData.startPeriod,
                active: groupBeingEdited.active, // CORREÇÃO: Enviar o estado 'active' original do grupo
            };
        }
    }, [editingGroupKey, formData, clientSelectionMode, selectedClients, allClients, groupedConfigs]);

    useEffect(() => {
        if (!clientsLoading && !taxTypesLoading && !configsLoading) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`);
            setIsRefreshingData(false);
        }
    }, [clientsLoading, taxTypesLoading, configsLoading]);

    const resetFormAndState = useCallback(() => {
        setFormData(initialFormData); setSelectedClients([]); setClientSelectionMode('individual');
        setEditingGroupKey(null); setClientSearchTerm(''); setShowClientDropdown(false);
        setCreateLoading(false); setIsDeleting(false); setIsTogglingStatus(false); setProcessingGroupId(null);
    }, [initialFormData]);

    useEffect(() => {
        let timer: NodeJS.Timeout; if (notificationMessage) timer = setTimeout(() => setNotificationMessage(null), 7000);
        return () => clearTimeout(timer);
    }, [notificationMessage]);

    useEffect(() => { setCurrentPage(1); }, [filterStatus]);

    const handleStandardChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'startPeriod' ? (Math.max(1, parseInt(value, 10)) || 1) : value }));
    }, []);

    const handleSelectChange = useCallback((fieldName: 'selectedNotificationTypeIds' | 'selectedTaxTypeIds', options: MultiValue<SelectOption> | SingleValue<SelectOption>) => {
        let selectedIds: number[] = [];
        if (options) {
            if (Array.isArray(options)) selectedIds = options.map(option => option.value);
            else selectedIds = [(options as SelectOption).value];
        }
        setFormData(prev => ({ ...prev, [fieldName]: selectedIds }));
    }, []);

    const handleClientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value; setClientSearchTerm(term);
        setShowClientDropdown(term.length > 0 && !editingGroupKey);
    }, [editingGroupKey]);

    const handleAddClient = useCallback((client: Client) => {
        if (!selectedClients.some(c => c.id === client.id)) setSelectedClients(prev => [...prev, client]);
        setClientSearchTerm(''); setShowClientDropdown(false);
    }, [selectedClients]);

    const handleRemoveClient = useCallback((clientId: number) => {
        if (editingGroupKey) return;
        setSelectedClients(prev => prev.filter(c => c.id !== clientId));
    }, [editingGroupKey]);

    const handleClientModeChange = useCallback((mode: ClientSelectionMode) => {
        if (editingGroupKey) return;
        setClientSelectionMode(mode);
        if (mode === 'all') { setSelectedClients([]); setClientSearchTerm(''); setShowClientDropdown(false); }
    }, [editingGroupKey]);

    const performCreateNotification = useCallback(async () => {
        setCreateLoading(true); setNotificationMessage(null);
        const payload = getSubmitBody() as CreateNotificationRequestPayload | null;
        const clientsValid = (payload?.clientsIDs?.length ?? 0) > 0 || clientSelectionMode === 'all';
        if (!payload || !clientsValid || (payload.taxTypeIDs?.length ?? 0) === 0 || (payload.notificationTypeList?.length ?? 0) === 0) {
            setNotificationMessage({ type: 'error', text: 'Dados inválidos. Verifique Clientes, Tipos de Notificação e Impostos.' });
            setCreateLoading(false); return;
        }
        try {
            const response = await axios.post<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/create`, payload);
            setNotificationMessage({ type: 'success', text: response.data?.message || `Configuração(ões) criada(s)!` });
            resetFormAndState(); setRefreshTrigger(p => p + 1);
        } catch (err) {
            let msg = "Erro ao criar."; if (axios.isAxiosError(err)) msg = err.response?.data?.message || err.response?.data?.error || err.message; else if (err instanceof Error) msg = err.message;
            setNotificationMessage({ type: 'error', text: `Erro: ${msg}` });
        } finally { setCreateLoading(false); }
    }, [getSubmitBody, resetFormAndState, clientSelectionMode, FULL_API_BASE_URL]);

    const performUpdateNotification = useCallback(async () => {
        if (!editingGroupKey) { setNotificationMessage({ type: 'error', text: "Erro: Nenhuma config para edição." }); return; }
        const groupBeingEdited = groupedConfigs.find(g => g.key === editingGroupKey);
        if (!groupBeingEdited) { setNotificationMessage({ type: 'error', text: "Erro: Grupo para edição não encontrado." }); return; }

        setCreateLoading(true); setNotificationMessage(null);
        const payloadBasis = getSubmitBody() as UpdateNotificationRequestPayload | null;

        // CORREÇÃO: Adicionar verificação para 'active' no payloadBasis, pois foi readicionado
        if (!payloadBasis || !payloadBasis.frequency || payloadBasis.startPeriod == null || 
            payloadBasis.notificationTypeId == null || payloadBasis.taxTypeId == null ||
            typeof payloadBasis.active !== 'boolean' ) {
            setNotificationMessage({ type: 'error', text: 'Dados inválidos para atualização (base).' });
            setCreateLoading(false); return;
        }
        
        const idsToUpdate = groupBeingEdited.originalIds;
        const isSingleConfigEditContext = idsToUpdate.length === 1;
        let successCount = 0; let errorCount = 0; let lastErrorMessage = "";

        for (const originalId of idsToUpdate) {
            // O payload é construído com os valores do formulário (frequency, startPeriod)
            // e os IDs de tipo/imposto + o estado 'active' original do grupo
            const finalPayload: UpdateNotificationRequestPayload = {
                notificationTypeId: payloadBasis.notificationTypeId,
                taxTypeId: payloadBasis.taxTypeId,
                frequency: payloadBasis.frequency,
                startPeriod: payloadBasis.startPeriod,
                active: payloadBasis.active, // Envia o estado 'active' original do grupo
            };
            try {
                await axios.put<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/update/${originalId}`, finalPayload);
                successCount++;
            } catch (err) {
                errorCount++;
                let msg = "Erro ao atualizar."; if (axios.isAxiosError(err)) msg = err.response?.data?.message || err.message; else if (err instanceof Error) msg = err.message;
                lastErrorMessage = `ID ${originalId}: ${msg}`; console.error(lastErrorMessage, err);
            }
        }
        setCreateLoading(false);

        if (successCount > 0 && errorCount === 0) setNotificationMessage({ type: 'success', text: isSingleConfigEditContext ? `Configuração atualizada!` : `${successCount} configuração(ões) do grupo atualizada(s)!` });
        else if (successCount > 0 && errorCount > 0) setNotificationMessage({ type: 'error', text: `${successCount} atualizada(s), ${errorCount} falharam. Erro: ${lastErrorMessage}` });
        else if (errorCount > 0) setNotificationMessage({ type: 'error', text: isSingleConfigEditContext ? `Erro ao atualizar: ${lastErrorMessage}` : `Erro ao atualizar configs do grupo. Erro: ${lastErrorMessage}` });
        
        if (successCount > 0) { resetFormAndState(); setRefreshTrigger(p => p + 1); }
    }, [editingGroupKey, getSubmitBody, resetFormAndState, FULL_API_BASE_URL, groupedConfigs]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault(); setNotificationMessage(null);
        if (formData.selectedNotificationTypeIds.length === 0 && !editingGroupKey) { setNotificationMessage({ type: 'error', text: 'Selecione Tipo Notificação.' }); return; }
        if (formData.selectedTaxTypeIds.length === 0 && !editingGroupKey) { setNotificationMessage({ type: 'error', text: 'Selecione Imposto.' }); return; }
        if (!formData.frequency) { setNotificationMessage({ type: 'error', text: 'Selecione Frequência.' }); return; }
        if (!formData.startPeriod || formData.startPeriod < 1) { setNotificationMessage({ type: 'error', text: 'Antecedência >= 1.' }); return; }
        if (!editingGroupKey) {
            if (!(selectedClients.length > 0 || clientSelectionMode === 'all')) { setNotificationMessage({ type: 'error', text: 'Selecione Clientes ou "Todos".' }); return; }
            performCreateNotification();
        } else { performUpdateNotification(); }
    }, [formData, selectedClients, clientSelectionMode, editingGroupKey, performCreateNotification, performUpdateNotification]);

    const handleRefresh = useCallback(() => { setIsRefreshingData(true); setRefreshTrigger(p => p + 1); }, []);

    const handleEdit = useCallback((group: GroupedConfig) => {
        if (!group?.notificationType || !group?.taxType) { setNotificationMessage({ type: 'error', text: 'Não é possível editar: dados essenciais do grupo em falta.' }); return; }
        setEditingGroupKey(group.key);
        setFormData({
            selectedNotificationTypeIds: [group.notificationType.id], selectedTaxTypeIds: [group.taxType.id],
            frequency: group.frequency, startPeriod: group.startPeriod,
        });
        // O estado 'active' não é mais editado no formulário, o toggle na tabela trata disso.
        setClientSelectionMode(group.hasGlobalConfig && group.clients.filter(c=>c===null).length > 0 ? 'all' : 'individual'); // Ajuste na lógica
        setSelectedClients(group.clients.filter((c): c is ApiClient => c !== null).map(c => ({id: c.id, name:c.name, nif: c.nif})));
        setClientSearchTerm(''); setShowClientDropdown(false); window.scrollTo(0, 0); setNotificationMessage(null);
    }, []);

    const handleCancelEdit = useCallback(() => { resetFormAndState(); }, [resetFormAndState]);

    const handleTableAction = useCallback(async (action: 'delete' | 'toggle', group: GroupedConfig) => {
        const idsToProcess = group.originalIds;
        const currentGroupStatus = group.active;
        if (idsToProcess.length === 0) { setNotificationMessage({ type: 'error', text: 'Nenhuma config selecionada.' }); return; }
        setNotificationMessage(null); setProcessingGroupId(group.key);
        let s = 0, e = 0; let lastErr = ""; 

        if (action === 'delete') {
            if (!window.confirm(`Apagar ${idsToProcess.length > 1 ? `${idsToProcess.length} configs agrupadas` : `a config`}? Afeta todas no grupo.`)) { setProcessingGroupId(null); return; }
            setIsDeleting(true);
            for (const id of idsToProcess) {
                try { await axios.delete<ApiResponseData>(`${FULL_API_BASE_URL}atmate-gateway/notification/delete/${id}`); s++; }
                catch (err) { e++; if (axios.isAxiosError(err)) lastErr = err.response?.data?.message || err.message; else if (err instanceof Error) lastErr = err.message; console.error(`Erro ao apagar ID ${id}:`, err); }
            }
            setIsDeleting(false);
        } else if (action === 'toggle') {
            setIsTogglingStatus(true); const newActiveState = !currentGroupStatus;
            for (const id of idsToProcess) {
                const url = `${FULL_API_BASE_URL}atmate-gateway/notification/update/${id}/status?active=${newActiveState}`;
                try { await axios.put<ApiResponseData>(url, null); s++; }
                catch (err) { e++; if (axios.isAxiosError(err)) lastErr = err.response?.data?.message || err.message; else if (err instanceof Error) lastErr = err.message; console.error(`Erro ao alternar estado ID ${id}:`, err); }
            }
            setIsTogglingStatus(false);
        }
        setProcessingGroupId(null);
        if (s > 0 && e === 0) setNotificationMessage({ type: 'success', text: `${s} config(s) ${action === 'delete' ? 'apagada(s)' : 'atualizada(s)'} com sucesso!` });
        else if (s > 0 && e > 0) setNotificationMessage({ type: 'error', text: `${s} ok, ${e} falharam. Erro: ${lastErr}` });
        else if (e > 0) setNotificationMessage({ type: 'error', text: `Erro ${action}. Erro: ${lastErr}` });
        
        setRefreshTrigger(p => p + 1);
        if (editingGroupKey === group.key && action === 'delete') resetFormAndState();
        // Se uma config editada teve seu estado alterado pelo toggle da tabela,
        // o formulário já não depende de 'activeEdit', então não precisa resetar/alterar 'activeEdit'.
    }, [FULL_API_BASE_URL, resetFormAndState, editingGroupKey]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive');
    const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
    const handleShowClients = useCallback((clients: Array<ApiClient | null>, group: GroupedConfig) => {
        setClientsToShowInModal(clients);
        setModalGroupInfo({ tax: group.taxType.description, freq: group.frequency, period: group.startPeriod });
        setIsClientModalOpen(true);
    }, []);
    const filteredClients = useMemo(() => {
        if (!clientSearchTerm || editingGroupKey) return [];
        const selectedIds = new Set(selectedClients.map(c => c.id));
        const termLower = clientSearchTerm.toLowerCase();
        return allClients.filter(c => !selectedIds.has(c.id) && (c.name.toLowerCase().includes(termLower) || c.nif.toString().includes(termLower))).slice(0, 10);
    }, [clientSearchTerm, allClients, selectedClients, editingGroupKey]);

    const isSubmittingForm = createLoading;
    const isAnyLoading = isSubmittingForm || isTogglingStatus || isDeleting;

    if (clientsLoading || taxTypesLoading || (configsLoading && !isRefreshingData && !originalConfigs.length)) {
        return <div id="notif-loading-initial"><FontAwesomeIcon icon={faSpinner} spin size="2x" /> A carregar...</div>;
    }
    if (configsError && !originalConfigs.length) {
        return <div id="notif-msg-standalone-error" className="notification-message error"><FontAwesomeIcon icon={faExclamationTriangle} /> Erro configs: {String(configsError)}. <button onClick={() => window.location.reload()} style={{ marginLeft: '15px' }}>Atualizar</button> </div>;
    }
    
    const currentEditingGroupObject = editingGroupKey ? groupedConfigs.find(g => g.key === editingGroupKey) : null;
    const isEditingSingleOriginalConfig = !!(currentEditingGroupObject && currentEditingGroupObject.originalIds.length === 1);

    const formTitle = editingGroupKey ?
        (isEditingSingleOriginalConfig ? 'Editar Configuração Individual' : 'Editar Parâmetros do Grupo') :
        'Configurar Novas Notificações';

    const submitButtonLabel = isSubmittingForm ? 'A guardar...' :
        (editingGroupKey ?
            (isEditingSingleOriginalConfig ? 'Atualizar Configuração' : 'Atualizar Grupo') :
            'Guardar Nova Configuração');

    return (
        <Fragment>
            <div id="notif-header"><h1>{formTitle}</h1><div id="notif-last-updated" onClick={handleRefresh} title="Clique para atualizar" role="button" tabIndex={0}><FontAwesomeIcon icon={faSyncAlt} spin={isRefreshingData} /><span>{isRefreshingData ? ' Atualizando...' : (lastUpdated ? ` Última atualização: ${lastUpdated}` : ' Atualizar')}</span></div></div>
            {notificationMessage && (<div id="notif-message-container" className={`notification-message ${notificationMessage.type}`} role="alert"><FontAwesomeIcon icon={notificationMessage.type === 'success' ? faCheckCircle : faTimesCircle} /><span className="message-text">{notificationMessage.text}</span><button onClick={() => setNotificationMessage(null)} className="close-message" aria-label="Fechar">&times;</button></div>)}
            <div id="notifications-layout">
                <div id="notif-form-column" className="layout-column">
                    <div id="notif-form-card" className={`notification-card ${editingGroupKey ? 'editing-mode' : ''}`}>
                        <form onSubmit={handleSubmit} noValidate>
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading || !!editingGroupKey}>
                                <legend><FontAwesomeIcon icon={faUsers} /> Destinatário(s)</legend>
                                {editingGroupKey && currentEditingGroupObject ? (
                                    <div className="info-edit-group-clients">
                                        <strong>Aplicável a: </strong>
                                        {currentEditingGroupObject.hasGlobalConfig && currentEditingGroupObject.clients.filter(c => c === null).length > 0 ? "Todos os clientes (Configuração Global)"
                                            : currentEditingGroupObject.clients.filter(c => c !== null).length === 1 && currentEditingGroupObject.clients.find(c => c !== null)
                                                ? `${currentEditingGroupObject.clients.find(c => c !== null)?.name} (NIF: ${currentEditingGroupObject.clients.find(c => c !== null)?.nif})`
                                                : `${currentEditingGroupObject.clients.filter(c => c !== null).length} clientes (Configuração Agrupada)`}
                                    </div>
                                ) : ( <div id="notif-client-group"><div id="notif-client-mode-selector" className="segmented-control"><button type="button" className={clientSelectionMode === 'individual' ? 'active' : ''} onClick={() => handleClientModeChange('individual')} disabled={isAnyLoading}> <FontAwesomeIcon icon={faUser} /> Individual </button><button type="button" className={clientSelectionMode === 'all' ? 'active' : ''} onClick={() => handleClientModeChange('all')} disabled={isAnyLoading}> <FontAwesomeIcon icon={faGlobe} /> Todos</button></div>{clientSelectionMode === 'individual' && (<><div className="autocomplete-wrapper form-group"><FontAwesomeIcon icon={faSearch} className="search-icon" /><input type="text" id="notif-client-search-input" placeholder="Pesquisar e adicionar cliente..." value={clientSearchTerm} onChange={handleClientSearchChange} onFocus={() => clientSearchTerm.length > 0 && setShowClientDropdown(true)} autoComplete="off" disabled={isAnyLoading} />{showClientDropdown && filteredClients.length > 0 && (<ul className="autocomplete-dropdown">{filteredClients.map((client) => (<li key={client.id} onClick={() => handleAddClient(client)} tabIndex={0} role="option">{client.name} ({client.nif})</li>))}</ul>)}</div><div id="notif-selected-clients-list"><label>Clientes Selecionados:</label>{selectedClients.map(client => (<span key={client.id} className="selected-item-pill">{client.name}<button type="button" onClick={() => handleRemoveClient(client.id)} className="remove-item-button" disabled={isAnyLoading}>&times;</button></span>))}{selectedClients.length === 0 && (<small className="no-selection info-edit">Nenhum cliente.</small>)}</div></>)}{clientSelectionMode === 'all' && (<div className="info-all-selected"><FontAwesomeIcon icon={faCheckCircle} /> Aplicar a <strong>todos ({allClients.length})</strong> clientes.</div>)}</div>)}
                            </fieldset>
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                <legend><FontAwesomeIcon icon={faBell} /> Detalhes da Configuração</legend>
                                <div className="form-group">
                                    <label id="label-notif-type" htmlFor="notif-type-select-react">Tipo Notificação <span className="required-indicator">*</span></label>
                                    <Select inputId='notif-type-select-react' isMulti={!editingGroupKey} name="selectedNotificationTypeIds" options={notificationTypeOptions} className={!editingGroupKey ? "basic-multi-select" : "basic-single-select"} classNamePrefix="select" placeholder={editingGroupKey ? (formData.selectedNotificationTypeIds.length > 0 ? notificationTypeOptions.find(o=>o.value === formData.selectedNotificationTypeIds[0])?.label : "Tipo (Fixo)") : "Selecione tipo(s)..."} aria-labelledby="label-notif-type" onChange={(options) => handleSelectChange('selectedNotificationTypeIds', options as MultiValue<SelectOption> | SingleValue<SelectOption>)} value={!editingGroupKey ? notificationTypeOptions.filter(o => formData.selectedNotificationTypeIds.includes(o.value)) : (notificationTypeOptions.find(o => formData.selectedNotificationTypeIds[0] === o.value) || null) } isClearable={!editingGroupKey} isDisabled={!!editingGroupKey || isAnyLoading} />
                                    {editingGroupKey && <small className="info-edit">Tipo não pode ser alterado na edição.</small>}
                                </div>
                                <div className="form-group">
                                    <label id="label-tax-type" htmlFor="tax-type-select-react">Imposto <span className="required-indicator">*</span></label>
                                    <Select inputId='tax-type-select-react' isMulti={!editingGroupKey} name="selectedTaxTypeIds" options={taxTypeOptions} className={!editingGroupKey ? "basic-multi-select" : "basic-single-select"} classNamePrefix="select" placeholder={editingGroupKey ? (formData.selectedTaxTypeIds.length > 0 ? taxTypeOptions.find(o=>o.value === formData.selectedTaxTypeIds[0])?.label : "Imposto (Fixo)") : "Selecione imposto(s)..."} aria-labelledby="label-tax-type" onChange={(options) => handleSelectChange('selectedTaxTypeIds', options as MultiValue<SelectOption> | SingleValue<SelectOption>)} value={!editingGroupKey ? taxTypeOptions.filter(o => formData.selectedTaxTypeIds.includes(o.value)) : (taxTypeOptions.find(o => formData.selectedTaxTypeIds[0] === o.value) || null)} isClearable={!editingGroupKey} isDisabled={!!editingGroupKey || isAnyLoading} />
                                    {editingGroupKey && <small className="info-edit">Imposto não pode ser alterado na edição.</small>}
                                </div>
                            </fieldset>
                            <fieldset className="fieldset-bordered" disabled={isAnyLoading}>
                                <legend><FontAwesomeIcon icon={faClock} /> Periodicidade</legend>
                                <div className="form-row">
                                    <div className="form-group"><label htmlFor="notif_frequency_select">Frequência <span className="required-indicator">*</span></label><select id="notif_frequency_select" name="frequency" value={formData.frequency} onChange={handleStandardChange} required disabled={isAnyLoading}>{frequencies.map((freq) => (<option key={freq} value={freq}>{freq}</option>))}</select></div>
                                    <div className="form-group"><label htmlFor="notif_start_period_input">Antecedência ({frequencyUnits[formData.frequency] || 'períodos'}) <span className="required-indicator">*</span></label><input id="notif_start_period_input" type="number" name="startPeriod" value={formData.startPeriod} min="1" onChange={handleStandardChange} required disabled={isAnyLoading} /><small id="startPeriodHelp" className="input-description">Nº de {frequencyUnits[formData.frequency] || 'períodos'} antes.</small></div>
                                </div>
                            </fieldset>
                            <div id="notif-form-actions"><button id="notif-submit-button" type="submit" className="button-primary" disabled={isAnyLoading || (!editingGroupKey && clientSelectionMode === 'individual' && selectedClients.length === 0) || (formData.selectedNotificationTypeIds.length === 0 && !editingGroupKey) || (formData.selectedTaxTypeIds.length === 0 && !editingGroupKey) || !formData.frequency || formData.startPeriod < 1}><FontAwesomeIcon icon={isSubmittingForm ? faSpinner : faSave} spin={isSubmittingForm} /> {submitButtonLabel}</button>{editingGroupKey && (<button id="notif-cancel-edit-button" type="button" className="button-secondary" onClick={handleCancelEdit} disabled={isAnyLoading}>Cancelar Edição</button>)}</div>
                        </form>
                    </div>
                </div>
                <div id="notif-table-column" className="layout-column">
                    <div id="notif-list-card" className="notification-card">
                        <div id="notif-table-controls"><h2><FontAwesomeIcon icon={faList} /> Configurações ({filteredGroupedConfigs.length})</h2><div id="notif-filter-group"><label htmlFor="notif-filterStatus-select"><FontAwesomeIcon icon={faFilter} /> Filtrar:</label><select id="notif-filterStatus-select" value={filterStatus} onChange={handleFilterChange} disabled={isAnyLoading}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></div></div>
                        {configsLoading && isRefreshingData && (<div id="notif-loading-placeholder"><FontAwesomeIcon icon={faSpinner} spin /> Atualizando...</div>)}
                        {configsError && !configsLoading && (<div id="notif-error-placeholder" className="notification-message error"><span><FontAwesomeIcon icon={faExclamationTriangle} /> Erro: {String(configsError)}</span><button id="notif-retry-button" onClick={handleRefresh} disabled={isRefreshingData || isAnyLoading}><FontAwesomeIcon icon={isRefreshingData ? faSpinner : faRedo} spin={isRefreshingData} /> Tentar Novamente</button></div>)}
                        {!configsError && (<>
                            <div id="notif-table-responsive">
                                <table id="notifications-table-element" className="notifications-table">
                                    <thead><tr><th>Destinatário(s)</th><th>Tipo Notif.</th><th>Imposto</th><th>Frequência</th><th>Antecedência</th><th>Estado</th><th>Ações</th></tr></thead>
                                    <tbody>
                                        {!configsLoading && paginatedConfigs.length === 0 && (<tr><td colSpan={7} className="no-data">Nenhuma configuração encontrada{filterStatus !== 'all' ? ` com estado '${filterStatus === 'active' ? 'Ativo' : 'Inativo'}'` : ''}. {groupedConfigs.length > 0 && <button onClick={() => setFilterStatus('all')} className="link-button">Mostrar todos</button>}</td></tr>)}
                                        {paginatedConfigs.map((group) => {
                                            const specificClients = group.clients.filter((c): c is ApiClient => c !== null);
                                            const isGlobalForDisplay = group.hasGlobalConfig && specificClients.length === 0;
                                            let clientDisplay: React.ReactNode = '';
                                            if (isGlobalForDisplay) clientDisplay = <span title="Global"><FontAwesomeIcon icon={faGlobe} /> Todos</span>;
                                            else if (specificClients.length === 1) clientDisplay = `${specificClients[0].name} (${specificClients[0].nif})`;
                                            else if (specificClients.length > 1) clientDisplay = (<button type="button" className="link-button" onClick={() => handleShowClients(group.clients, group)} title={`Ver ${specificClients.length} clientes`} disabled={isAnyLoading}>{specificClients.length} Clientes <FontAwesomeIcon icon={faUsers} size="xs" style={{ marginLeft: '4px' }} /></button>);
                                            else clientDisplay = <span className="error">Inválido</span>;
                                            const unitAbbreviation = (frequencyUnits[group.frequency] || 'dias').substring(0, 1);
                                            const isCurrentlyProcessingThisGroup = processingGroupId === group.key;
                                            const isThisGroupCurrentlyBeingEdited = editingGroupKey === group.key;
                                            return (
                                                <tr key={group.key} className={`${group.active ? '' : 'inactive-row'} ${isThisGroupCurrentlyBeingEdited ? 'editing-row-highlight' : ''}`}>
                                                    <td data-label="Destinatário(s)">{clientDisplay}</td>
                                                    <td data-label="Tipo">{group.notificationType?.description || '?'}</td>
                                                    <td data-label="Imposto">{group.taxType?.description || '?'}</td>
                                                    <td data-label="Freq.">{group.frequency}</td>
                                                    <td data-label="Antec." className="cell-center">{group.startPeriod} {unitAbbreviation}.</td>
                                                    <td data-label="Estado" className="cell-center"><span className={`status ${group.active ? 'active' : 'inactive'}`}>{group.active ? 'Ativo' : 'Inativo'}</span></td>
                                                    <td data-label="Ações" className="action-buttons">
                                                        <button onClick={() => handleEdit(group)} title="Editar este grupo/configuração" disabled={isAnyLoading || !!editingGroupKey} className="action-button edit"><FontAwesomeIcon icon={faEdit} /></button>
                                                        <button onClick={() => handleTableAction('toggle', group)} title={group.active ? 'Desativar' : 'Ativar'} disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited} className={`action-button toggle ${group.active ? 'toggle-off' : 'toggle-on'}`}>{(isTogglingStatus && isCurrentlyProcessingThisGroup) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={group.active ? faToggleOff : faToggleOn} />}</button>
                                                        <button onClick={() => handleTableAction('delete', group)} title="Apagar" disabled={isAnyLoading || isThisGroupCurrentlyBeingEdited} className="action-button delete">{(isDeleting && isCurrentlyProcessingThisGroup) ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrashAlt} />}</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (<div className="pagination-controls"><span>Pág. {currentPage} de {totalPages}</span><div className="pagination-buttons"><button onClick={handlePrevPage} disabled={currentPage === 1 || isAnyLoading}><FontAwesomeIcon icon={faChevronLeft} /> Ant</button><button onClick={handleNextPage} disabled={currentPage === totalPages || isAnyLoading}>Próx <FontAwesomeIcon icon={faChevronRight} /></button></div><span>{filteredGroupedConfigs.length} Grupo(s)</span></div>)}
                        </>)}
                    </div>
                </div>
            </div>
            {isClientModalOpen && (<div className="modal-overlay" onClick={() => setIsClientModalOpen(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><div className="modal-header"><h2><FontAwesomeIcon icon={faUsers} /> Clientes Associados{modalGroupInfo && (<small style={{ display: 'block', fontWeight: 'normal', fontSize: '0.8em' }}>({modalGroupInfo.tax} / {modalGroupInfo.freq} / {modalGroupInfo.period} {frequencyUnits[modalGroupInfo.freq ?? '']?.substring(0,1)}.)</small>)}</h2><button onClick={() => setIsClientModalOpen(false)} className="modal-close-button">&times;</button></div><div className="modal-body">{clientsToShowInModal.filter(c => c !== null).length > 0 ? (<ul className="client-modal-list">{clientsToShowInModal.filter((c): c is ApiClient => c !== null).map((client) => (<li key={client.id}>{client.name} (NIF: {client.nif})</li>))}</ul>) : (<p>Não há clientes específicos.</p>)}</div></div></div>)}
        </Fragment>
    );
};
export default Notifications;