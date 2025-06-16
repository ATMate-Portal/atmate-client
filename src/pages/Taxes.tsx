import React, { useState, useEffect, useCallback } from 'react';
import useApi from '../hooks/useApi';
// Importa o componente de apresentação que irá renderizar a tabela.
import TaxesTable from '../components/TaxesTable';

/**
 * @interface ObrigacaoFiscal
 * Define a estrutura de dados para uma obrigação fiscal
 */
interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
    json: string;
}

/**
 * @component Taxes
 * Esta página serve como um "container component". A sua principal responsabilidade
 * é obter os dados das obrigações fiscais da API e gerir o estado relacionado
 * (como loading, erro e atualização), passando depois esses dados para o componente
 * de apresentação `TaxesTable`.
 */
const Taxes = () => {
    // --- ESTADOS DO COMPONENTE ---
    // Estado para guardar a data e hora da última atualização bem-sucedida.
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    // Estado para controlar a animação do ícone de atualização.
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Alterar este valor força a re-execução do hook 'useApi',
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Constrói a URL para a chamada à API, incluindo o trigger
    const apiUrl = `atmate-gateway/tax/getTaxes?refresh=${refreshTrigger}`;

    // Utiliza o hook 'useApi' para obter os dados.
    const { data: obrigações, loading, error } = useApi<ObrigacaoFiscal[]>(apiUrl);

    // Executado sempre que a lista de muda.
    useEffect(() => {
        // Se os dados foram recebidos com sucesso...
        if (obrigações && obrigações.length > 0) {
            const now = new Date();
            // ...atualiza a data e hora da "Última atualização".
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setIsRefreshing(false);
    }, [obrigações]);

    /**
     * @function handleRefresh
     * Função para ser chamada quando o utilizador clica no botão de atualizar.
     * Utiliza `useCallback` para otimizar a performance, garantindo que a função
     * não é recriada em cada renderização, a menos que as suas dependências mudem.
     */
    const handleRefresh = useCallback(() => {
        // Ativa o estado de 'refreshing' para iniciar a animação do ícone.
        setIsRefreshing(true);
        // Incrementa o 'refreshTrigger' para forçar uma nova chamada à API.
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // RENDERIZAÇÃO
    // Renderiza o componente de apresentação 'TaxesTable', passando todos os dados
    // e funções necessários como propriedades (props).
    return (
        <TaxesTable
            obrigações={obrigações}
            loading={loading}
            error={error ? 'Erro ao carregar' : ''}
            onRefresh={handleRefresh}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onModalOpen={() => {}} 
            onModalClose={() => {}}
        />
    );
};

export default Taxes;
