import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getKasList, createKas } from '../../utils/api';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function KasApotek() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({
    from: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [form, setForm] = useState({
    keterangan: '', jenis: 'debit', nominal: '', tanggal_transaksi: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getKasList(filter);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createKas(form);
      toast.success('Kas berhasil dicatat');
      setShowModal(false);
      setForm({ keterangan: '', jenis: 'debit', nominal: '', tanggal_transaksi: format(new Date(), 'yyyy-MM-dd') });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const totalDebit = data.filter(d => d.jenis === 'debit').reduce((s, r) => s + parseFloat(r.nominal), 0);
  const totalKredit = data.filter(d => d.jenis === 'kredit').reduce((s, r) => s + parseFloat(r.nominal), 0);
  const saldo = totalDebit - totalKredit;

  const columns = [
    { header: 'Tanggal', render: (row) => format(new Date(row.tanggal_transaksi), 'dd-MM-yyyy HH:mm:ss') },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Jenis', render: (row) => (
      <Badge color={row.jenis === 'debit' ? 'hijau' : 'merah'}>{row.jenis === 'debit' ? 'Masuk' : 'Keluar'}</Badge>
    )},
    { header: 'Nominal', render: (row) => `Rp ${formatRupiah(row.nominal)}` },
    { header: 'User', accessor: 'user_nama' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Kas Apotek</h2>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Catat Kas</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Input label="Dari" type="date" value={filter.from}
          onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} />
        <Input label="Sampai" type="date" value={filter.to}
          onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-700">Total Masuk (Debit)</p>
          <p className="text-xl font-bold text-green-800">Rp {formatRupiah(totalDebit)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-700">Total Keluar (Kredit)</p>
          <p className="text-xl font-bold text-red-800">Rp {formatRupiah(totalKredit)}</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4">
          <p className="text-sm text-teal-700">Saldo</p>
          <p className="text-xl font-bold text-teal-800">Rp {formatRupiah(saldo)}</p>
        </div>
      </div>

      <Table columns={columns} data={data} loading={loading} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Catat Kas">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Tanggal" name="tanggal_transaksi" type="date" value={form.tanggal_transaksi} onChange={handleChange} required />
          <Select label="Jenis" name="jenis" value={form.jenis} onChange={handleChange} required
            options={[{ value: 'debit', label: 'Kas Masuk (Debit)' }, { value: 'kredit', label: 'Kas Keluar (Kredit)' }]} />
          <Input label="Keterangan" name="keterangan" value={form.keterangan} onChange={handleChange} required placeholder="Contoh: Penjualan tunai, Beli ATK..." />
          <Input label="Nominal" name="nominal" type="number" value={form.nominal} onChange={handleChange} required placeholder="0" />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
