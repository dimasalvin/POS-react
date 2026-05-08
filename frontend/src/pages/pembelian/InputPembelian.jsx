import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSupplier, getBarang, createPembelian } from '../../utils/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function InputPembelian() {
  const [suppliers, setSuppliers] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [form, setForm] = useState({
    no_faktur: '', tanggal: format(new Date(), 'yyyy-MM-dd'), supplier_id: ''
  });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchBarang, setSearchBarang] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    getSupplier().then(res => setSuppliers(res.data.data)).catch(() => {});
    getBarang({ limit: 500 }).then(res => setBarangList(res.data.data)).catch(() => {});
  }, []);

  const handleFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const addItem = (barang) => {
    const exists = items.find(i => i.barang_id === barang.id);
    if (exists) {
      toast.error('Barang sudah ada di daftar');
      return;
    }
    setItems(prev => [...prev, {
      barang_id: barang.id, nama_barang: barang.nama_barang, satuan: barang.satuan,
      jumlah: 1, harga_hna: barang.harga_beli, diskon_persen: 0, diskon_nominal: 0,
      harga_netto: barang.harga_beli, jumlah_harga: barang.harga_beli
    }]);
    setShowSearch(false);
    setSearchBarang('');
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      // Recalculate
      const hna = parseFloat(updated.harga_hna) || 0;
      const diskonPersen = parseFloat(updated.diskon_persen) || 0;
      updated.diskon_nominal = hna * (diskonPersen / 100);
      updated.harga_netto = hna - updated.diskon_nominal;
      updated.jumlah_harga = (parseInt(updated.jumlah) || 0) * updated.harga_netto;
      return updated;
    }));
  };

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const total = items.reduce((sum, item) => sum + (item.jumlah_harga || 0), 0);

  const handleSubmit = async () => {
    if (!form.no_faktur || !form.supplier_id || items.length === 0) {
      toast.error('Lengkapi no faktur, supplier, dan minimal 1 item');
      return;
    }
    setSaving(true);
    try {
      await createPembelian({ ...form, items });
      toast.success('Pembelian berhasil disimpan');
      setForm({ no_faktur: '', tanggal: format(new Date(), 'yyyy-MM-dd'), supplier_id: '' });
      setItems([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const filteredBarang = barangList.filter(b =>
    b.nama_barang.toLowerCase().includes(searchBarang.toLowerCase()) ||
    b.kode.toLowerCase().includes(searchBarang.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Input Pembelian</h2>

      {/* Header Form */}
      <div className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="No. Faktur" name="no_faktur" value={form.no_faktur} onChange={handleFormChange} required />
        <Input label="Tanggal" name="tanggal" type="date" value={form.tanggal} onChange={handleFormChange} required />
        <Select label="Supplier" name="supplier_id" value={form.supplier_id} onChange={handleFormChange} required
          options={[{ value: '', label: '-- Pilih Supplier --' }, ...suppliers.map(s => ({ value: s.id, label: s.nama_pbf }))]} />
      </div>

      {/* Add Item */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Daftar Item</h3>
          <div className="relative">
            <Button size="sm" onClick={() => setShowSearch(!showSearch)}><Plus size={14} /> Tambah Item</Button>
            {showSearch && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-lg z-10 p-2">
                <input type="text" placeholder="Cari barang..." value={searchBarang}
                  onChange={(e) => setSearchBarang(e.target.value)} autoFocus
                  className="w-full px-3 py-2 border rounded text-sm mb-2" />
                <div className="max-h-48 overflow-y-auto">
                  {filteredBarang.map(b => (
                    <button key={b.id} onClick={() => addItem(b)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm">
                      <span className="font-medium">{b.kode}</span> - {b.nama_barang}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="py-2">Barang</th>
                  <th className="py-2 w-20">Jumlah</th>
                  <th className="py-2 w-28">HNA</th>
                  <th className="py-2 w-20">Diskon %</th>
                  <th className="py-2 w-28">Netto</th>
                  <th className="py-2 w-32">Jumlah Harga</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">{item.nama_barang} <span className="text-gray-400">({item.satuan})</span></td>
                    <td className="py-2">
                      <input type="number" value={item.jumlah} min="1"
                        onChange={(e) => updateItem(i, 'jumlah', e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="py-2">
                      <input type="number" value={item.harga_hna}
                        onChange={(e) => updateItem(i, 'harga_hna', e.target.value)}
                        className="w-24 px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="py-2">
                      <input type="number" value={item.diskon_persen} min="0" max="100"
                        onChange={(e) => updateItem(i, 'diskon_persen', e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="py-2 text-gray-600">{formatRupiah(item.harga_netto)}</td>
                    <td className="py-2 font-medium">{formatRupiah(item.jumlah_harga)}</td>
                    <td className="py-2">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada item. Klik "Tambah Item" untuk menambahkan.</p>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-lg font-bold text-gray-800">Total: Rp {formatRupiah(total)}</p>
            <Button onClick={handleSubmit} loading={saving}>Simpan Pembelian</Button>
          </div>
        )}
      </div>
    </div>
  );
}
