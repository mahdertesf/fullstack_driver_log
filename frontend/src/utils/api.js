const rawBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = rawBase.replace(/\/+$/, '');
console.log('ENV:', import.meta.env.VITE_API_BASE_URL);
