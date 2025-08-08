// Frontend API configuration
// Provide a default for local dev; allow override via Vite env
const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
export const API_BASE_URL = rawBase.replace(/\/+$/, '');


