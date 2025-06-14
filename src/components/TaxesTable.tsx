import React, { useState, useEffect, ChangeEvent, useCallback, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortUp, faSortDown, faInfoCircle, faSyncAlt, faTag, faUser, faCalendar, faEuroSign, faCheckCircle, faFileAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

// IMPORTS PARA REACT-DATEPICKER
import DatePicker, { registerLocale, setDefaultLocale } from 'react-datepicker';
import { pt } from 'date-fns/locale'; // Importa a localização portuguesa
import 'react-datepicker/dist/react-datepicker.css'; // Importa o CSS base


import '../pages/Taxes.css';

// Configura o 'react-datepicker' para usar a localização portuguesa por defeito em toda a aplicação.
registerLocale('pt', pt);
setDefaultLocale('pt');

// Declaração para permitir o acesso ao objeto 'bootstrap' na janela global, caso não existam tipos TypeScript definidos.
// @ts-ignore
declare var window: any;

// --- INTERFACES DE DADOS ---

/**
 * @interface ObrigacaoFiscal
 * Define a estrutura de dados para uma única obrigação fiscal.
 */
interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
    json: string; // Campo que contém dados adicionais e estruturados em formato JSON string.
}

/**
 * @interface TaxesTableProps
 * Define as propriedades (props) que o componente TaxesTable espera receber de um componente pai.
 */
interface TaxesTableProps {
    obrigações: ObrigacaoFiscal[] | null; // A lista de obrigações a ser exibida.
    loading: boolean;                     // Booleano que indica se os dados estão a ser carregados.
    error: string;                        // Mensagem de erro, se alguma ocorrer durante o fetch dos dados.
    onRefresh: () => void;                // Função callback para ser chamada quando o utilizador pede para atualizar os dados.
    lastUpdated: string | null;           // A hora da última atualização bem-sucedida.
    isRefreshing: boolean;                // Booleano que indica se uma atualização está em progresso (para o ícone de spin).
    onModalOpen: () => void;              // Callback para quando o modal de detalhes é aberto.
    onModalClose: () => void;             // Callback para quando o modal de detalhes é fechado.
}


// --- FUNÇÕES HELPER (AUXILIARES) ---

/**
 * @function getBadgeClassForEstado
 * Retorna uma classe CSS para o "badge" de estado, com base no valor do texto do estado.
 * Isto permite colorir os estados de forma diferente na tabela (ex: Pendente a amarelo, Pago a verde).
 */
const getBadgeClassForEstado = (estado?: string): string => {
    if (!estado) return 'badge-secondary';
    let currentEstado = estado;
    if (estado === "-") {
        currentEstado = "Pendente";
    }
    const lowerEstado = currentEstado.toLowerCase();
    if (currentEstado === "Pendente") return 'badge-pending';
    if (currentEstado === "Pago" || currentEstado === "Paga") return 'badge-paid';
    if (currentEstado === "Anulada") return 'badge-anulada';
    if (currentEstado === "Emitida") return 'badge-emitida';
    if (currentEstado === "Pendente de Emissão") return 'badge-pendente-emissao';
    if (lowerEstado.includes('pendente de emissão')) return 'badge-pendente-emissao';
    if (lowerEstado.includes('emitida')) return 'badge-emitida';
    if (lowerEstado.includes('anulada')) return 'badge-anulada';
    if (lowerEstado.includes('paga')) return 'badge-paid';
    if (lowerEstado.includes('pendente')) return 'badge-pending';
    return 'badge-secondary';
};

/**
 * @function formatFieldName
 * Formata os nomes das chaves (keys) vindas do campo JSON para uma apresentação mais legível na UI do modal.
 * Converte camelCase para Title Case e substitui abreviaturas por termos mais claros.
 */
const formatFieldName = (key: string): string => {
    if (key === 'categoriaIUC') return 'Categoria IUC';
    if (key === 'dataMatricula') return 'Data de Matrícula';
    if (key === 'data1Matricula') return 'Data da Primeira Matrícula';
    let formatted = key.replace(/^desc/i, '').replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    formatted = formatted.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    formatted = formatted.replace('Ambito Utilizacao', 'Âmbito de Utilização').replace('Tipo Susp Frente', 'Tipo Suspensão Frente')
        .replace('Tipo Susp Retaguarda', 'Tipo Suspensão Retaguarda').replace('Veiculo', 'Veículo').replace('Passageiros', 'de Passageiros')
        .replace('Pesado', 'Pesado').replace('Matree', 'Matrícula EEE').replace('Paisee', 'País EEE').replace('Cod Pais Eee', 'Código País EEE')
        .replace('Data Pais Eee', 'Data País EEE').replace('Quant Eixos', 'Quantidade de Eixos').replace('Quant Eixos Frente', 'Quantidade de Eixos Frente')
        .replace('Quant Eixos Retaguarda', 'Quantidade de Eixos Retaguarda').replace('Peso Conjunto', 'Peso do Conjunto')
        .replace('Peso Maximo Conjunto', 'Peso Máximo do Conjunto').replace('Transporte Go', 'Transporte GO').replace('Ind Transformacao', 'Indicação de Transformação');
    return formatted;
};

/**
 * @function formatValue
 * Formata os valores do JSON, convertendo 'true'/'false' para 'Sim'/'Não' para melhor leitura.
 */
const formatValue = (value: any): string => {
    const trimmedValue = String(value).trim();
    if (trimmedValue.toLowerCase() === 'true') return 'Sim';
    if (trimmedValue.toLowerCase() === 'false') return 'Não';
    return trimmedValue;
};

// Lista de campos a serem explicitamente excluídos da exibição no modal de detalhes,
// por serem redundantes ou informação sensível.
const fieldsToExclude = [
    'Nif', 'Nif Loc', 'Matricula', 'Data Pais E E E', 'Transporte G O',
    'Data da primeira matricula', 'Matricula Value', 'data1Matricula'
];

/**
 * @component TaxesTable
 * Componente principal que renderiza a tabela de obrigações fiscais.
 * Utiliza `React.memo` para otimizar a performance, evitando re-renderizações desnecessárias se as props não mudarem.
 */
const TaxesTable: React.FC<TaxesTableProps> = React.memo(({
    obrigações, loading, error, onRefresh, lastUpdated, isRefreshing, onModalOpen, onModalClose
}) => {
    // Estados para controlar os valores dos filtros e da pesquisa.
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('Todos');
    const [estadoFilter, setEstadoFilter] = useState<string>('Todos');
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);

    // Estados para controlar a ordenação da tabela.
    const [sortBy, setSortBy] = useState<keyof ObrigacaoFiscal>('dataLimite');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    
    // Estados para popular dinamicamente os menus de filtro.
    const [tiposDeObrigacao, setTiposDeObrigacao] = useState<string[]>(['Todos']);
    const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>(['Todos']);

    // Estados para controlar o modal de detalhes.
    const [selectedObrigacao, setSelectedObrigacao] = useState<ObrigacaoFiscal | null>(null);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    
    // Referência (useRef) para o elemento do modal, permitindo interagir com ele via JavaScript.
    const modalRef = useRef<HTMLDivElement>(null);

    // Este efeito é executado sempre que a lista de 'obrigações' (vinda das props) muda.
    // Extrai os tipos e estados únicos para popular os menus de filtro.
    useEffect(() => {
        if (obrigações) {
            const tiposUnicos = [...new Set(obrigações.map(o => o.tipo))];
            setTiposDeObrigacao(['Todos', ...tiposUnicos]);
            const estadosProcessadosParaFiltro = obrigações.map(o => o.estado === '-' ? 'Pendente' : o.estado);
            const estadosUnicos = [...new Set(estadosProcessadosParaFiltro)];
            setEstadosDisponiveis(['Todos', ...estadosUnicos]);
        }
    }, [obrigações]);

    // Este efeito adiciona e remove 'event listeners' para os eventos do modal do Bootstrap.
    // Permite que o componente pai saiba quando o modal é aberto ou fechado.
    useEffect(() => {
        const modalElement = modalRef.current;
        if (modalElement) {
            const handleModalShow = () => { if (onModalOpen) onModalOpen(); };
            const handleModalHide = () => { if (onModalClose) onModalClose(); };
            modalElement.addEventListener('shown.bs.modal', handleModalShow);
            modalElement.addEventListener('hidden.bs.modal', handleModalHide);
            return () => {
                modalElement.removeEventListener('shown.bs.modal', handleModalShow);
                modalElement.removeEventListener('hidden.bs.modal', handleModalHide);
            };
        }
    }, [onModalOpen, onModalClose]);

    // HANDLERS
    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);
    const handleFilterType = (event: ChangeEvent<HTMLSelectElement>) => setFilterType(event.target.value);
    const handleFilterEstado = (event: ChangeEvent<HTMLSelectElement>) => setEstadoFilter(event.target.value);

    // Lógica para alternar a ordenação da coluna clicada.
    const handleSort = (column: keyof ObrigacaoFiscal) => {
        setSortBy(prevSortBy => {
            if (prevSortBy === column) {
                // Se a coluna já é a de ordenação, inverte a direção.
                setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
                return prevSortBy;
            } else {
                setSortDirection('asc');
                return column;
            }
        });
    };

    // Define qual obrigação foi selecionada para ser exibida no modal de detalhes.
    const handleShowDetails = (obrigacao: ObrigacaoFiscal) => {
        setSelectedObrigacao(obrigacao);
        setShowVehicleDetails(false); // Reset on new selection
    };

    // Limpa a seleção e fecha o modal
    const handleCloseModal = () => {
        setSelectedObrigacao(null);
        setShowVehicleDetails(false);
    };

    // Alterna a visibilidade da secção de detalhes do veículo dentro do modal.
    const toggleVehicleDetails = () => setShowVehicleDetails(prev => !prev);

    // 1. Filtra a lista de obrigações com base em todos os filtros ativos.
    const filteredObrigações = (obrigações || []).filter((obrigacao) => {
        const typeMatch = filterType === 'Todos' || obrigacao.tipo === filterType;

        const obrigacaoDateStr = obrigacao.dataLimite;
        // Tenta criar a data. Adiciona 'T00:00:00' para ajudar a interpretar como local
        // e evitar problemas de timezone com datas YYYY-MM-DD.
        const obrigacaoDate = obrigacaoDateStr ? new Date(`${obrigacaoDateStr}T00:00:00`) : null;
        const validObrigacaoDate = obrigacaoDate && !isNaN(obrigacaoDate.getTime()) ? obrigacaoDate : null;

        const dateMatch =
            (!fromDate || (validObrigacaoDate && validObrigacaoDate >= fromDate)) &&
            (!toDate || (validObrigacaoDate && validObrigacaoDate <= toDate));

        // Lógica de correspondência de estado.
        const estadoParaFiltro = obrigacao.estado === '-' ? 'Pendente' : obrigacao.estado;
        const estadoMatch = estadoFilter === 'Todos' || estadoParaFiltro === estadoFilter;

        // Lógica de pesquisa por texto, normalizando strings para ser case-insensitive e ignorar acentos.
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const normalizedSearch = normalize(searchTerm);
        const searchFields = [
            obrigacao.identificadorUnico, obrigacao.tipo, obrigacao.dataLimite,
            obrigacao.clientName, String(obrigacao.valor), estadoParaFiltro
        ];
        const searchMatch = searchFields.some(field => normalize(String(field)).includes(normalizedSearch));

        return typeMatch && searchMatch && dateMatch && estadoMatch;
    });

    // 2. Ordena a lista já filtrada.
    const sortedObrigações = [...filteredObrigações].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'identificadorUnico': comparison = a.identificadorUnico.localeCompare(b.identificadorUnico); break;
            case 'tipo': comparison = a.tipo.localeCompare(b.tipo); break;
            case 'dataLimite':
                const dateA = a.dataLimite ? new Date(`${a.dataLimite}T00:00:00`) : null;
                const dateB = b.dataLimite ? new Date(`${b.dataLimite}T00:00:00`) : null;
                const validA = dateA && !isNaN(dateA.getTime()) ? dateA : null;
                const validB = dateB && !isNaN(dateB.getTime()) ? dateB : null;
                if (validA && validB) comparison = validA.getTime() - validB.getTime();
                else if (validA) comparison = 1;
                else if (validB) comparison = -1;
                break;
            case 'valor':
                const valorA = parseFloat(String(a.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                const valorB = parseFloat(String(b.valor).replace(' €', '').replace('.', '').replace(',', '.'));
                if (!isNaN(valorA) && !isNaN(valorB)) comparison = valorA - valorB;
                break;
            case 'estado':
                const estadoA = a.estado === '-' ? 'Pendente' : a.estado;
                const estadoB = b.estado === '-' ? 'Pendente' : b.estado;
                comparison = estadoA.localeCompare(estadoB);
                break;
            case 'clientName': comparison = a.clientName.localeCompare(b.clientName); break;
        }
        // Aplica a direção da ordenação (ascendente ou descendente).
        return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    // Estilo comum para alinhar verticalmente o conteúdo das células da tabela.
    const cellStyle = { verticalAlign: 'middle' };

    if (loading && !obrigações) return <div className="container mt-5 text-center">A carregar obrigações fiscais...</div>;
    if (error) return <div className="container mt-5 text-center alert alert-danger">Erro ao obter as obrigações fiscais: {error}</div>;

    return (
        <div className="container-fluid mt-5 animate-fade-in">
            {/* Cabeçalho da página com botão de atualização */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                {lastUpdated && (
                    <p className="text-muted mb-0" onClick={onRefresh} style={{ cursor: 'pointer' }}>
                        <FontAwesomeIcon icon={faSyncAlt} className="mr-2 me-2" spin={isRefreshing} />
                        Última atualização: {lastUpdated}
                    </p>
                )}
                {!lastUpdated && !loading && <p className="text-muted mb-0">Clique no ícone para atualizar.</p>}
            </div>

            {/* Painel de filtros */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="fromDate" className="form-label m-0 text-secondary small">De:</label>
                        <DatePicker
                            selected={fromDate}
                            onChange={(date: Date | null) => setFromDate(date)}
                            selectsStart
                            startDate={fromDate}
                            endDate={toDate}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="form-control form-control-sm"
                            locale="pt"
                            isClearable
                            id="fromDate"
                            autoComplete="off"
                        />
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <label htmlFor="toDate" className="form-label m-0 text-secondary small">Até:</label>
                        <DatePicker
                            selected={toDate}
                            onChange={(date: Date | null) => setToDate(date)}
                            selectsEnd
                            startDate={fromDate}
                            endDate={toDate}
                            minDate={fromDate ?? undefined}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="form-control form-control-sm"
                            locale="pt"
                            isClearable
                            id="toDate"
                            autoComplete="off"
                        />
                    </div>
                    <select className="form-select form-select-sm" value={estadoFilter} onChange={handleFilterEstado}>
                        <option value="Todos">Estados</option>
                        {estadosDisponiveis.filter(e => e !== "Todos").map(estado => (
                            <option key={estado} value={estado}>{estado}</option>
                        ))}
                    </select>
                    <select className="form-select form-select-sm" id="filterType" value={filterType} onChange={handleFilterType}>
                        <option value="Todos">Tipo</option>
                        {tiposDeObrigacao.filter(t => t !== "Todos").map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                    </select>
                </div>

                {/* Barra de pesquisa */}            
                <div className="d-flex justify-content-end">
                    <div className="position-relative d-flex align-items-center search-bar-container">
                        <div className="search-icon"> <FontAwesomeIcon icon={faSearch} className="text-gray-400" /> </div>
                        <input type="text" className="form-control form-control-sm" id="searchInput" placeholder="Pesquisar..." value={searchTerm} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            {/* Container da tabela */}            
            <div className="table-container">
                <div className="table-responsive w-100">
                    <table className="table table-borderless table-hover bg-white shadow-sm w-100">
                        <thead className="bg-light">
                            {/* Cabeçalhos da tabela clicáveis para ordenação */}
                            <tr>
                                <th style={cellStyle} onClick={() => handleSort('identificadorUnico')} className="cursor-pointer text-secondary">Referência <FontAwesomeIcon icon={sortBy === 'identificadorUnico' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} onClick={() => handleSort('tipo')} className="cursor-pointer text-secondary">Tipo <FontAwesomeIcon icon={sortBy === 'tipo' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} onClick={() => handleSort('dataLimite')} className="cursor-pointer text-secondary">Data Limite <FontAwesomeIcon icon={sortBy === 'dataLimite' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} onClick={() => handleSort('clientName')} className="cursor-pointer text-secondary">Cliente <FontAwesomeIcon icon={sortBy === 'clientName' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} onClick={() => handleSort('valor')} className="cursor-pointer text-end text-secondary">Valor a Pagar <FontAwesomeIcon icon={sortBy === 'valor' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} onClick={() => handleSort('estado')} className="cursor-pointer text-center text-secondary">Estado <FontAwesomeIcon icon={sortBy === 'estado' ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSortDown} size="sm" /></th>
                                <th style={cellStyle} className="text-center text-secondary">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Renderização condicional do corpo da tabela */}
                            {loading && sortedObrigações.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">A carregar dados...</td></tr>
                            ) : sortedObrigações.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">Nenhuma obrigação fiscal encontrada.</td></tr>
                            ) : (
                                sortedObrigações.map((obrigacao) => {
                                    const estadoTextParaExibir = obrigacao.estado === '-' ? 'Pendente' : obrigacao.estado;
                                    const classeDoBadge = getBadgeClassForEstado(obrigacao.estado);
                                    return (
                                        <tr key={obrigacao.identificadorUnico}>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.identificadorUnico}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.tipo}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.dataLimite}</td>
                                            <td style={cellStyle} className="text-secondary">{obrigacao.clientName}</td>
                                            <td style={cellStyle} className="text-end text-secondary">{obrigacao.valor}</td>
                                            <td style={cellStyle} className="text-center"><span className={`badge modern-badge ${classeDoBadge}`}>{estadoTextParaExibir}</span></td>
                                            <td style={cellStyle} className="text-center">
                                                <button className="btn btn-sm btn-outline-primary rounded-pill shadow-sm" onClick={() => handleShowDetails(obrigacao)} data-bs-toggle="modal" data-bs-target="#taxes-details-modal">
                                                    <FontAwesomeIcon icon={faInfoCircle} className="me-1" /> Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para exibir detalhes de uma obrigação fiscal */}
            <div ref={modalRef} className="modal fade" id="taxes-details-modal" tabIndex={-1} aria-labelledby="taxes-details-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content" id="taxes-modal-content">
                        <div className="modal-header" id="taxes-modal-header">
                            <h5 className="modal-title" id="taxes-details-modal-label">
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                                {selectedObrigacao?.tipo} - {selectedObrigacao?.identificadorUnico}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onClick={handleCloseModal}></button>
                        </div>
                        <div className="modal-body" id="taxes-modal-body">
                            {selectedObrigacao ? (
                                <div id="taxes-details-container">
                                    <div id="taxes-details-card">
                                        <h6 className="card-title" id="taxes-card-title">
                                            <FontAwesomeIcon icon={faTag} className="me-2" /> Detalhes da Obrigação Fiscal
                                        </h6>
                                        <div id="taxes-details-list">
                                            {/* Detalhes principais da obrigação */}
                                            <div className="detail-row" id="taxes-detail-row-tipo">
                                                <FontAwesomeIcon icon={faTag} className="detail-icon" />
                                                <span className="detail-label">Tipo:</span>
                                                <span className="detail-value">{selectedObrigacao.tipo}</span>
                                            </div>
                                            <div className="detail-row d-flex align-items-center" id="taxes-detail-row-referencia" style={{ cursor: selectedObrigacao.tipo === 'IUC' ? 'pointer' : 'default' }} onClick={selectedObrigacao.tipo === 'IUC' ? toggleVehicleDetails : undefined}>
                                                <FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" />
                                                <span className="detail-label">{selectedObrigacao.tipo === 'IMI' ? 'Nota Cobrança:' : selectedObrigacao.tipo === 'IUC' ? 'Matrícula:' : 'Referência:'}</span>
                                                <span className="detail-value flex-grow-1">{selectedObrigacao.identificadorUnico}</span>
                                                {selectedObrigacao.tipo === 'IUC' && (<FontAwesomeIcon icon={showVehicleDetails ? faChevronUp : faChevronDown} className="ms-2 text-muted" />)}
                                            </div>
                                            {selectedObrigacao.tipo === 'IUC' && showVehicleDetails && (
                                                <div className="detail-row ms-4 mt-2" id="taxes-detail-row-vehicle-details">
                                                    <div className="card p-3 bg-light">
                                                        <h6 className="mb-3">Detalhes do Veículo</h6>
                                                        {(() => {
                                                            try {
                                                                // PARCE JSON e renderiza os detalhes do veículo.
                                                                const jsonData = JSON.parse(selectedObrigacao.json);
                                                                const vehicleDetails = jsonData.detalhes_veiculo || {};
                                                                // Filtra para remover campos vazios, nulos ou da lista de exclusão.
                                                                const validEntries = Object.entries(vehicleDetails).filter(([key, value]) => !fieldsToExclude.includes(key) && !fieldsToExclude.includes(formatFieldName(key)) && value != null && String(value).trim() !== '' && String(value).toLowerCase() !== 'null' && String(value) !== '-');
                                                                if (validEntries.length === 0) {
                                                                    return (<div className="detail-row text-muted" id="taxes-detail-row-vehicle-empty"><FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" /><span className="detail-value">Nenhum detalhe de veículo disponível.</span></div>);
                                                                }
                                                                return validEntries.map(([key, value]) => {
                                                                    const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                                    const formattedKey = formatFieldName(key);
                                                                    const formattedValue = formatValue(value);
                                                                    return (<div className="detail-row mb-2" key={`vehicle-${safeKey}`} id={`taxes-detail-row-vehicle-${safeKey}`}><FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" /><span className="detail-label">{formattedKey}:</span><span className="detail-value">{formattedValue}</span></div>);
                                                                });
                                                            } catch (e) {
                                                                return (<div className="detail-row text-danger" id="taxes-detail-row-vehicle-error"><FontAwesomeIcon icon={faFileAlt} className="detail-icon me-2" /><span className="detail-value">Não foi possível carregar os detalhes do veículo.</span></div>);
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="detail-row" id="taxes-detail-row-cliente"><FontAwesomeIcon icon={faUser} className="detail-icon" /><span className="detail-label">Cliente:</span><span className="detail-value">{selectedObrigacao.clientName}</span></div>
                                            <div className="detail-row" id="taxes-detail-row-data"><FontAwesomeIcon icon={faCalendar} className="detail-icon" /><span className="detail-label">Data Limite:</span><span className="detail-value">{selectedObrigacao.dataLimite}</span></div>
                                            <div className="detail-row" id="taxes-detail-row-valor"><FontAwesomeIcon icon={faEuroSign} className="detail-icon" /><span className="detail-label">Valor:</span><span className="detail-value">{selectedObrigacao.valor}</span></div>
                                            <div className="detail-row" id="taxes-detail-row-estado"><FontAwesomeIcon icon={faCheckCircle} className="detail-icon" /><span className="detail-label">Estado:</span><span className={`badge modern-badge ${getBadgeClassForEstado(selectedObrigacao.estado)}`}>{selectedObrigacao.estado === '-' ? 'Pendente' : selectedObrigacao.estado}</span></div>
                                            {/* Renderização dos restantes detalhes gerais do JSON */}
                                            {(() => {
                                                try {
                                                    const jsonData = JSON.parse(selectedObrigacao.json);
                                                    const generalEntries = Object.entries(jsonData).filter(([key, value]) => key !== 'detalhes_veiculo' && !fieldsToExclude.includes(key) && !fieldsToExclude.includes(formatFieldName(key)) && key.toLowerCase() !== 'tipo' && key.toLowerCase() !== 'identificadorunico' && key.toLowerCase() !== 'datalimite' && key.toLowerCase() !== 'clientname' && key.toLowerCase() !== 'valor' && key.toLowerCase() !== 'estado' && key.toLowerCase() !== 'situação da nota' && key.toLowerCase() !== 'matrícula' && key.toLowerCase() !== 'nº nota cob.' && key.toLowerCase() !== 'valor base' && key.toLowerCase() !== 'data limite de pagamento' && value != null && String(value).trim() !== '' && String(value).toLowerCase() !== 'null' && String(value) !== '-');
                                                    if (generalEntries.length === 0 && !jsonData.detalhes_veiculo) { return null; }
                                                    return generalEntries.map(([key, value]) => {
                                                        const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                        const formattedKey = formatFieldName(key);
                                                        const formattedValue = formatValue(value);
                                                        return (<div className="detail-row" key={`general-${safeKey}`} id={`taxes-detail-row-${safeKey}`}><FontAwesomeIcon icon={faFileAlt} className="detail-icon" /><span className="detail-label">{formattedKey}:</span><span className="detail-value">{formattedValue}</span></div>);
                                                    });
                                                } catch (e) {
                                                    return (<div className="detail-row text-danger" id="taxes-detail-row-json-error"><FontAwesomeIcon icon={faFileAlt} className="detail-icon" /><span className="detail-value">Não foi possível carregar os detalhes adicionais.</span></div>);
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted">Nenhuma obrigação selecionada.</div>
                            )}
                        </div>
                        <div className="modal-footer" id="taxes-modal-footer">
                            <button type="button" className="btn btn-primary modern-btn rounded-pill" data-bs-dismiss="modal" onClick={handleCloseModal} id="taxes-close-button">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TaxesTable;