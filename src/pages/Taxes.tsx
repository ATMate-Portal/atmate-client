import React, { useState, useEffect, useCallback } from 'react';
import useApi from '../hooks/useApi';
import TaxesTable from '../components/TaxesTable';

interface ObrigacaoFiscal {
    identificadorUnico: string;
    tipo: string;
    dataLimite: string;
    clientName: string;
    valor: string;
    estado: string;
    json: string;
}

const Taxes = () => {
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const apiUrl = `atmate-gateway/tax/getTaxes?refresh=${refreshTrigger}`;
    const { data: obrigações, loading, error } = useApi<ObrigacaoFiscal[]>(apiUrl);

    useEffect(() => {
        if (obrigações && obrigações.length > 0) {
            const now = new Date();
            setLastUpdated(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        }
        setIsRefreshing(false);
    }, [obrigações]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <TaxesTable
            obrigações={obrigações}
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
        />
    );
};

export default Taxes;