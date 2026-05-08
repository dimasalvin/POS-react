import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getReturList, createRetur, getSupplier, getBarang } from '../../utils/api';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function ReturPembelian() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    no_retur: '', tanggal: format(new Date(), 'yyyy-MM-dd'), supplier_id: '', keterangan: ''
  });
  const [items, setItems] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getReturList();
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    getSupplier().then(res => setSuppliers(res.data.data)).catch(() => {});
    getBarang({ limit: 500 }).then(res => setBarangList(res.data.data)).catch(() => {});
  }, []);

  const handleFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const addItem = () => {
    setItems(prev => [...prev, { barang_id: '', jumlah: 1, harga_satuan: 0, jumlah_harga: 0 }]);
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'barang_id') {
        const barang = barangList.find(b => b.id === parseInt(value));
        if (barang) updated.harga_satuan = barang.harga_beli;
      }
      updated.jumlah_harga = (parseInt(updated.jumlah) || 0) * (parseFloat(updated.harga_satuan) || 0);
      return updated;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.no_retur || !form.supplier_id || items.length === 0) {
      toast.error('Lengkapi data retur');
      return;
    }
    setSaving(true);
    try {
      await createRetur({ ...form, items });
      toast.success('Retur berhasil disimpan');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'No. Retur', accessor: 'no_retur' },
    { header: 'Tanggal', render: (row) => format(new Date(row.created_at || row.tanggal), 'dd-MM-yyyy HH:mm:ss') },
    { header: 'Supplier', accessor: 'supplier_nama' },
    { header: 'Total', render: (row) => `Rp ${formatRupiah(row.total)}` },
    { header: 'Keterangan', accessor: 'keterangan' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Retur Pembelian</h2>
        <Button onClick={() => { setShowModal(true); setItems([]); }}><Plus size={16} /> Buat Retur</Button>
      </div>

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Retur Pembelian" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="No. Retur" name="no_retur" value={form.no_retur} onChange={handleFormChange} required />
            <Input label="Tanggal" name="tanggal" type="date" value={form.tanggal} onChange={handleFormChange} required />
            <Select label="Supplier" name="supplier_id" value={form.supplier_id} onChange={handleFormChange} required
              options={[{ value: '', label: '-- Pilih --' }, ...suppliers.map(s => ({ value: s.id, label: s.nama_pbf }))]} />
            <Input label="Keterangan" name="keterangan" value={form.keterangan} onChange={handleFormChange} />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">Item Retur</h4>
              <Button size="sm" type="button" onClick={addItem}><Plus size={14} /> Item</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end mb-2">
                <Select label={i === 0 ? 'Barang' : ''} value={item.barang_id}
                  onChange={(e) => updateItem(i, 'barang_id', e.target.value)} className="flex-1"
                  options={[{ value: '', label: '-- Pilih --' }, ...barangList.map(b => ({ value: b.id, label: `${b.kode} - ${b.nama_barang}` }))]} />
                <Input label={i === 0 ? 'Qty' : ''} type="number" value={item.jumlah} className="w-20"
                  onChange={(e) => updateItem(i, 'jumlah', e.target.value)} />
                <Input label={i === 0 ? 'Harga' : ''} type="number" value={item.harga_satuan} className="w-28"
                  onChange={(e) => updateItem(i, 'harga_satuan', e.target.value)} />
                <span className="text-sm pb-2 w-28">Rp {formatRupiah(item.jumlah_harga)}</span>
                <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 pb-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan Retur</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
