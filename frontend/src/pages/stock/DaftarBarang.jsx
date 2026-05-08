import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getBarang, createBarang, updateBarang, deleteBarang, getKelasTerapi } from '../../utils/api';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Search } from 'lucide-react';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function DaftarBarang() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grupFilter, setGrupFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [kelasTerapi, setKelasTerapi] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [form, setForm] = useState({
    kode: '', nama_barang: '', satuan: '', pabrik: '', grup: 'hijau',
    kelas_terapi_id: '', stock_minimum: '0', harga_beli: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBarang({ search, grup: grupFilter, low_stock: lowStock || undefined, page, limit: 25 });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, grupFilter, lowStock, page]);

  useEffect(() => {
    getKelasTerapi().then(res => setKelasTerapi(res.data.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTambah = () => {
    setSelected(null);
    setForm({ kode: '', nama_barang: '', satuan: '', pabrik: '', grup: 'hijau', kelas_terapi_id: '', stock_minimum: '0', harga_beli: '' });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setForm({
      kode: item.kode, nama_barang: item.nama_barang, satuan: item.satuan,
      pabrik: item.pabrik || '', grup: item.grup, kelas_terapi_id: item.kelas_terapi_id || '',
      stock_minimum: String(item.stock_minimum), harga_beli: String(item.harga_beli)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selected) {
        await updateBarang(selected.id, form);
        toast.success('Barang berhasil diupdate');
      } else {
        await createBarang(form);
        toast.success('Barang berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBarang(confirmDelete.id);
      toast.success('Barang berhasil dihapus');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  // Price preview
  const hargaBeli = parseFloat(form.harga_beli) || 0;
  const previewJual = Math.round(hargaBeli * 1.10);
  const previewHv = Math.round(previewJual * 1.10);
  const previewResep = Math.round(previewHv * 1.08);

  const columns = [
    { header: 'Kode', accessor: 'kode' },
    { header: 'Nama Barang', accessor: 'nama_barang' },
    { header: 'Satuan', accessor: 'satuan' },
    { header: 'Grup', render: (row) => <Badge color={row.grup}>{row.grup}</Badge> },
    { header: 'Stok', render: (row) => (
      <span className={row.stock_saat_ini <= row.stock_minimum ? 'text-red-600 font-semibold' : ''}>
        {row.stock_saat_ini}
      </span>
    )},
    { header: 'Harga Beli', render: (row) => formatRupiah(row.harga_beli) },
    { header: 'Harga HV', render: (row) => formatRupiah(row.harga_hv) },
    { header: 'Aksi', render: (row) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(row)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">Edit</button>
        <button onClick={() => setConfirmDelete(row)} className="text-red-600 hover:text-red-800 text-xs font-medium">Hapus</button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Daftar Barang</h2>
        <Button onClick={handleTambah}><Plus size={16} /> Tambah Barang</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama/kode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={grupFilter}
          onChange={(e) => { setGrupFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Semua Grup</option>
          <option value="hijau">Hijau</option>
          <option value="merah">Merah</option>
          <option value="biru">Biru</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} className="rounded" />
          Stok Kritis
        </label>
      </div>

      {/* Table */}
      <Table columns={columns} data={data} loading={loading} />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Menampilkan {data.length} dari {meta.total} data</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="px-3 py-1">Hal {meta.page} / {meta.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selected ? 'Edit Barang' : 'Tambah Barang'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kode" name="kode" value={form.kode} onChange={handleChange} required disabled={!!selected} />
            <Input label="Nama Barang" name="nama_barang" value={form.nama_barang} onChange={handleChange} required />
            <Input label="Satuan" name="satuan" value={form.satuan} onChange={handleChange} required placeholder="Tablet, Kapsul, Botol..." />
            <Input label="Pabrik" name="pabrik" value={form.pabrik} onChange={handleChange} />
            <Select label="Grup" name="grup" value={form.grup} onChange={handleChange} required
              options={[{ value: 'hijau', label: 'Hijau (Bebas)' }, { value: 'merah', label: 'Merah (Keras)' }, { value: 'biru', label: 'Biru (Konsinyasi)' }]} />
            <Select label="Kelas Terapi" name="kelas_terapi_id" value={form.kelas_terapi_id} onChange={handleChange}
              options={[{ value: '', label: '-- Pilih --' }, ...kelasTerapi.map(k => ({ value: k.id, label: k.nama }))]} />
            <Input label="Stok Minimum" name="stock_minimum" type="number" value={form.stock_minimum} onChange={handleChange} />
            <Input label="Harga Beli (HNA)" name="harga_beli" type="number" value={form.harga_beli} onChange={handleChange} required />
          </div>

          {/* Price Preview */}
          {hargaBeli > 0 && (
            <div className="bg-teal-50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-teal-800">Preview Harga Otomatis:</p>
              <p>Harga Jual (HNA+PPN 10%): <strong>{formatRupiah(previewJual)}</strong></p>
              <p>Harga HV (+margin 10%): <strong>{formatRupiah(previewHv)}</strong></p>
              <p>Harga Resep (+margin 8%): <strong>{formatRupiah(previewResep)}</strong></p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" loading={saving}>{selected ? 'Update' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        message={`Yakin ingin menghapus "${confirmDelete?.nama_barang}"?`}
      />
    </div>
  );
}
