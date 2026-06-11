/**
 * api/axios.js — Re-exports the configured Axios instance from src/api.js
 * This shim exists so pages that import from "../api/axios" resolve correctly.
 */
export { default } from '../api.js';
