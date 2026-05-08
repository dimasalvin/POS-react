import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSupplier, createSupplier, updateSupplier } from '../../utils/api';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Plus } from 'lucide-react';

export default function DaftarSupplier() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kode: '', nama_pbf: '', alamat: '', kota: '', no_telp: '', jatuh_tempo: '30' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getSupplier();
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTambah = () => {
    setSelected(null);
    setForm({ kode: '', nama_pbf: '', alamat: '', kota: '', no_telp: '', jatuh_tempo: '30' });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setForm({
      kode: item.kode, nama_pbf: item.nama_pbf, alamat: item.alamat || '',
      kota: item.kota || '', no_telp: item.no_telp || '', jatuh_tempo: String(item.jatuh_tempo || 30)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selected) {
        await updateSupplier(selected.id, form);
        toast.success('Supplier berhasil diupdate');
      } else {
        await createSupplier(form);
        toast.success('Supplier berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'Kode', accessor: 'kode' },
    { header: 'Nama PBF', accessor: 'nama_pbf' },
    { header: 'Kota', accessor: 'kota' },
    { header: 'No. Telp', accessor: 'no_telp' },
    { header: 'Jatuh Tempo', render: (row) => `${row.jatuh_tempo} hari` },
    { header: 'Aksi', render: (row) => (
      <button onClick={() => handleEdit(row)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">Edit</button>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Daftar Supplier / PBF</h2>
        <Button onClick={handleTambah}><Plus size={16} /> Tambah Supplier</Button>
      </div>

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selected ? 'Edit Supplier' : 'Tambah Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kode" name="kode" value={form.kode} onChange={handleChange} required disabled={!!selected} />
            <Input label="Nama PBF" name="nama_pbf" value={form.nama_pbf} onChange={handleChange} required />
            <Input label="Kota" name="kota" value={form.kota} onChange={handleChange} className="col-span-2" />
            <Input label="No. Telp" name="no_telp" value={form.no_telp} onChange={handleChange} />
            <Input label="Jatuh Tempo (hari)" name="jatuh_tempo" type="number" value={form.jatuh_tempo} onChange={handleChange} />
          </div>
          <Input label="Alamat" name="alamat" value={form.alamat} onChange={handleChange} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" loading={saving}>{selected ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
