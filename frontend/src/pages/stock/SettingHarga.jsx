import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getBarang, updateBarang } from '../../utils/api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Search } from 'lucide-react';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function SettingHarga() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editHarga, setEditHarga] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBarang({ search, limit: 100 });
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleSave = async (item) => {
    setSaving(true);
    try {
      await updateBarang(item.id, {
        nama_barang: item.nama_barang,
        satuan: item.satuan,
        grup: item.grup,
        harga_beli: editHarga
      });
      toast.success('Harga berhasil diupdate');
      setEditId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal update harga');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'Kode', accessor: 'kode' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Harga Beli', render: (row) => (
      editId === row.id ? (
        <input type="number" value={editHarga} onChange={(e) => setEditHarga(e.target.value)}
          className="w-24 px-2 py-1 border rounded text-sm" autoFocus />
      ) : formatRupiah(row.harga_beli)
    )},
    { header: 'Harga Jual', render: (row) => formatRupiah(row.harga_jual) },
    { header: 'Harga HV', render: (row) => formatRupiah(row.harga_hv) },
    { header: 'Harga Resep', render: (row) => formatRupiah(row.harga_resep) },
    { header: 'Aksi', render: (row) => (
      editId === row.id ? (
        <div className="flex gap-2">
          <Button size="sm" loading={saving} onClick={() => handleSave(row)}>Simpan</Button>
          <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Batal</Button>
        </div>
      ) : (
        <button onClick={() => { setEditId(row.id); setEditHarga(String(row.harga_beli)); }}
          className="text-teal-600 hover:text-teal-800 text-xs font-medium">Ubah Harga</button>
      )
    )}
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Setting Harga</h2>
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Cari barang..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <Table columns={columns} data={data} loading={loading} />
    </div>
  );
}
