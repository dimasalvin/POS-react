import { Navigate } from 'react-router-dom';

// Kasir Resep sudah digabung ke KasirHV sebagai modal "Input Resep"
// Semua transaksi (resep maupun non-resep) masuk ke satu kasir
export default function KasirResep() {
  return <Navigate to="/penjualan/kasir-hv" replace />;
}
