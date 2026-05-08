import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getDashboard } from '../utils/api';
import { ShoppingCart, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';
import Badge from '../components/ui/Badge';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDashboard();
        setData(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Penjualan Hari Ini',
      value: `Rp ${formatRupiah(data?.penjualan_hari_ini?.total_penjualan)}`,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: 'Total Transaksi',
      value: data?.penjualan_hari_ini?.total_transaksi || 0,
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Stok Kritis',
      value: data?.stok_kritis?.length || 0,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50'
    },
    {
      label: 'Saldo Kas',
      value: `Rp ${formatRupiah((data?.kas?.total_debit || 0) - (data?.kas?.total_kredit || 0))}`,
      icon: Wallet,
      color: 'text-teal-600 bg-teal-50'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stok Kritis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Peringatan Stok Kritis</h3>
          {data?.stok_kritis?.length > 0 ? (
            <div className="space-y-3">
              {data.stok_kritis.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.nama_barang}</p>
                    <p className="text-xs text-gray-400">{item.kode}</p>
                  </div>
                  <Badge color="amber">
                    Sisa: {item.stock_saat_ini} / Min: {item.stock_minimum}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Semua stok aman</p>
          )}
        </div>

        {/* Produk Terlaris */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Produk Terlaris Hari Ini</h3>
          {data?.produk_terlaris?.length > 0 ? (
            <div className="space-y-3">
              {data.produk_terlaris.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-700">{item.nama_barang}</p>
                  </div>
                  <span className="text-sm text-gray-500">{item.total_terjual} terjual</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Belum ada penjualan hari ini</p>
          )}
        </div>
      </div>
    </div>
  );
}
