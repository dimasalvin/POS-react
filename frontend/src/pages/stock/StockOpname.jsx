import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getBarang, submitStockOpname } from '../../utils/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { format } from 'date-fns';

export default function StockOpname() {
  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [periode, setPeriode] = useState(format(new Date(), 'yyyy-MM'));
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBarang = async () => {
      try {
        const res = await getBarang({ limit: 500 });
        const list = res.data.data;
        setBarangList(list);
        setItems(list.map(b => ({
          barang_id: b.id,
          kode: b.kode,
          nama_barang: b.nama_barang,
          satuan: b.satuan,
          stock_sistem: b.stock_saat_ini,
          stock_fisik: b.stock_saat_ini,
          keterangan: ''
        })));
      } catch (err) {
        toast.error('Gagal memuat data barang');
      } finally {
        setLoading(false);
      }
    };
    fetchBarang();
  }, []);

  const handleFisikChange = (index, value) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, stock_fisik: parseInt(value) || 0 } : item
    ));
  };

  const handleKeteranganChange = (index, value) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, keterangan: value } : item
    ));
  };

  const handleSubmit = async () => {
    const changedItems = items.filter(i => i.stock_fisik !== i.stock_sistem);
    if (changedItems.length === 0) {
      toast.error('Tidak ada perubahan stok');
      return;
    }

    setSaving(true);
    try {
      await submitStockOpname({ periode, tanggal, items: changedItems });
      toast.success('Stock opname berhasil disimpan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Stock Opname</h2>
        <Button onClick={handleSubmit} loading={saving}>Simpan Opname</Button>
      </div>

      <div className="flex gap-4">
        <Input label="Periode" type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
        <Input label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="px-3 py-2 text-left text-xs">Kode</th>
              <th className="px-3 py-2 text-left text-xs">Nama Barang</th>
              <th className="px-3 py-2 text-left text-xs">Satuan</th>
              <th className="px-3 py-2 text-center text-xs">Stok Sistem</th>
              <th className="px-3 py-2 text-center text-xs">Stok Fisik</th>
              <th className="px-3 py-2 text-center text-xs">Selisih</th>
              <th className="px-3 py-2 text-left text-xs">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => {
              const selisih = item.stock_fisik - item.stock_sistem;
              return (
                <tr key={item.barang_id} className={selisih !== 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2 text-sm">{item.kode}</td>
                  <td className="px-3 py-2 text-sm">{item.nama_barang}</td>
                  <td className="px-3 py-2 text-sm">{item.satuan}</td>
                  <td className="px-3 py-2 text-sm text-center">{item.stock_sistem}</td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" value={item.stock_fisik}
                      onChange={(e) => handleFisikChange(i, e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-sm text-center" />
                  </td>
                  <td className={`px-3 py-2 text-sm text-center font-semibold ${selisih < 0 ? 'text-red-600' : selisih > 0 ? 'text-green-600' : ''}`}>
                    {selisih !== 0 ? (selisih > 0 ? `+${selisih}` : selisih) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={item.keterangan}
                      onChange={(e) => handleKeteranganChange(i, e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm" placeholder="..." />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
