import api from "./axios";

/* PARA JÁ NÃO SE UTILIZA POIS USAMOS O HOOK
   DEIXO AQUI COMENTADO PORQUE MAIS TARDE PODE SER NECESSÁRIO TER CHAMADAS MAIS CONTROLADAS
export const getUrgentTaxes = async (days: number) => {
  try {
    const response = await api.get(`atmate-gateway/tax/getUrgentTaxes?days=${days}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao obter impostos:", error);
    throw error;
  }
};
*/