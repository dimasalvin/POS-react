import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Request interceptor: inject Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('apotek_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto logout on 401/403
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('apotek_token');
      localStorage.removeItem('apotek_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ==================== AUTH ====================
export const loginApi = (data) => api.post('/auth/login', data);
export const changePassword = (data) => api.post('/auth/change-password', data);

// ==================== DASHBOARD ====================
export const getDashboard = () => api.get('/dashboard');

// ==================== BARANG ====================
export const getBarang = (params) => api.get('/barang', { params });
export const getBarangById = (id) => api.get(`/barang/${id}`);
export const createBarang = (data) => api.post('/barang', data);
export const updateBarang = (id, data) => api.put(`/barang/${id}`, data);
export const deleteBarang = (id) => api.delete(`/barang/${id}`);
export const submitStockOpname = (data) => api.post('/barang/stock-opname/submit', data);

// ==================== KELAS TERAPI ====================
export const getKelasTerapi = () => api.get('/kelas-terapi');

// ==================== SUPPLIER ====================
export const getSupplier = () => api.get('/pembelian/supplier/list');
export const createSupplier = (data) => api.post('/pembelian/supplier/create', data);
export const updateSupplier = (id, data) => api.put(`/pembelian/supplier/${id}`, data);

// ==================== PEMBELIAN ====================
export const getPembelian = (params) => api.get('/pembelian', { params });
export const getPembelianById = (id) => api.get(`/pembelian/${id}`);
export const createPembelian = (data) => api.post('/pembelian', data);
export const getHistoriBarang = (barangId, params) => api.get(`/pembelian/histori/barang/${barangId}`, { params });

// ==================== RETUR ====================
export const getReturList = () => api.get('/pembelian/retur/list');
export const createRetur = (data) => api.post('/pembelian/retur/create', data);

// ==================== PENJUALAN ====================
export const getPenjualan = (params) => api.get('/penjualan', { params });
export const getPenjualanById = (id) => api.get(`/penjualan/${id}`);
export const createPenjualan = (data) => api.post('/penjualan', data);
export const voidPenjualan = (id) => api.post(`/penjualan/${id}/void`);

// ==================== LAPORAN ====================
export const getLaporanPerBarang = (params) => api.get('/penjualan/laporan/per-barang', { params });
export const getClosingSummary = (params) => api.get('/penjualan/closing/summary', { params });

// ==================== KAS ====================
export const getKasList = (params) => api.get('/penjualan/kas/list', { params });
export const createKas = (data) => api.post('/penjualan/kas/create', data);

// ==================== PELANGGAN ====================
export const getPelanggan = (params) => api.get('/pelanggan', { params });
export const createPelanggan = (data) => api.post('/pelanggan', data);

// ==================== AUDIT LOG ====================
export const getAuditLog = (params) => api.get('/audit-log', { params });

export default api;
