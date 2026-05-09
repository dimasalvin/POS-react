import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, Tags, ClipboardList,
  Truck, ShoppingCart, FileText,
  Calculator, RotateCcw, BarChart3, Wallet
} from 'lucide-react';

const menuGroups = [
  {
    label: 'MENU',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['apoteker', 'apoteker_pendamping', 'admin', 'asisten_apoteker'] }
    ]
  },
  {
    label: 'STOK',
    items: [
      { path: '/stock/daftar-barang', label: 'Daftar Barang', icon: Package, roles: ['apoteker', 'apoteker_pendamping', 'admin', 'asisten_apoteker'] },
      { path: '/stock/setting-harga', label: 'Setting Harga', icon: Tags, roles: ['apoteker', 'apoteker_pendamping'] },
      { path: '/stock/stock-opname', label: 'Stock Opname', icon: ClipboardList, roles: ['apoteker', 'apoteker_pendamping'] }
    ]
  },
  {
    label: 'PEMBELIAN',
    items: [
      { path: '/pembelian/supplier', label: 'Daftar Supplier', icon: Truck, roles: ['apoteker', 'apoteker_pendamping', 'admin'] },
      { path: '/pembelian/input', label: 'Input Pembelian', icon: ShoppingCart, roles: ['apoteker', 'apoteker_pendamping', 'admin'] },
      { path: '/pembelian/histori', label: 'Histori Pembelian', icon: FileText, roles: ['apoteker', 'apoteker_pendamping', 'admin'] },
      { path: '/pembelian/retur', label: 'Retur Pembelian', icon: RotateCcw, roles: ['apoteker', 'apoteker_pendamping'] }
    ]
  },
  {
    label: 'PENJUALAN',
    items: [
      { path: '/penjualan/kasir-hv', label: 'Kasir', icon: Calculator, roles: ['apoteker', 'apoteker_pendamping', 'admin', 'asisten_apoteker'] },
      { path: '/penjualan/laporan', label: 'Laporan Penjualan', icon: BarChart3, roles: ['apoteker', 'apoteker_pendamping', 'admin', 'asisten_apoteker'] },
      { path: '/penjualan/closing', label: 'Closing Kasir', icon: FileText, roles: ['apoteker', 'apoteker_pendamping', 'admin'] }
    ]
  },
  {
    label: 'LAPORAN',
    items: [
      { path: '/laporan/kas', label: 'Kas Apotek', icon: Wallet, roles: ['apoteker', 'apoteker_pendamping', 'admin'] },
      { path: '/laporan/audit-log', label: 'Audit Log', icon: FileText, roles: ['apoteker', 'admin'] }
    ]
  }
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-60 bg-teal-800 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-teal-700 flex items-center gap-3">
        <img src="/logo.svg" alt="Pos Apotek" className="w-10 h-10" />
        <div>
          <h2 className="text-lg font-bold">Pos Apotek</h2>
          <p className="text-xs text-teal-300 mt-0.5">Sistem Manajemen Farmasi</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(user?.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-4">
              <p className="px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
                {group.label}
              </p>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-teal-900 text-white border-r-3 border-white'
                        : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>


    </aside>
  );
}
