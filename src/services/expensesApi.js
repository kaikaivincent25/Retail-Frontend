import api from "./api";

export const listExpenses = () => api.get("/expenses").then((response) => response.data);

export const createExpense = (expense) =>
  api.post("/expenses", expense).then((response) => response.data);
