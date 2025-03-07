import api from "./axios";

export async function getUrgentTaxes() {
  const response = await api.get("/impostos");
  return response.data;
}
