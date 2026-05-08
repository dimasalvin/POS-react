import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DaftarBarang from './pages/stock/DaftarBarang';
import SettingHarga from './pages/stock/SettingHarga';
import StockOpname from './pages/stock/StockOpname';
import DaftarSupplier from './pages/pembelian/DaftarSupplier';
import InputPembelian from './pages/pembelian/InputPembelian';
import HistoriPembelian from './pages/pembelian/HistoriPembelian';
import ReturPembelian from './pages/pembelian/ReturPembelian';
import KasirHV from './pages/penjualan/KasirHV';
import KasirResep from './pages/penjualan/KasirResep';
import LaporanPenjualan from './pages/penjualan/LaporanPenjualan';
import ClosingKasir from './pages/penjualan/ClosingKasir';
import KasApotek from './pages/laporan/KasApotek';
import AuditLog from './pages/laporan/AuditLog';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stock/daftar-barang" element={<DaftarBarang />} />
        <Route path="/stock/setting-harga" element={<SettingHarga />} />
        <Route path="/stock/stock-opname" element={<StockOpname />} />
        <Route path="/pembelian/supplier" element={<DaftarSupplier />} />
        <Route path="/pembelian/input" element={<InputPembelian />} />
        <Route path="/pembelian/histori" element={<HistoriPembelian />} />
        <Route path="/pembelian/retur" element={<ReturPembelian />} />
        <Route path="/penjualan/kasir-hv" element={<KasirHV />} />
        <Route path="/penjualan/kasir-resep" element={<KasirResep />} />
        <Route path="/penjualan/laporan" element={<LaporanPenjualan />} />
        <Route path="/penjualan/closing" element={<ClosingKasir />} />
        <Route path="/laporan/kas" element={<KasApotek />} />
        <Route path="/laporan/audit-log" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
