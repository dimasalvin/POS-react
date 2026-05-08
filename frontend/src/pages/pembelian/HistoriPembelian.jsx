import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getPembelian, getSupplier } from '../../utils/api';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function HistoriPembelian() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [filter, setFilter] = useState({
    from: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    supplier_id: ''
  });

  useEffect(() => {
    getSupplier().then(res => setSuppliers(res.data.data)).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPembelian(filter);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const columns = [
    { header: 'No. Faktur', accessor: 'no_faktur' },
    { header: 'Tanggal', render: (row) => format(new Date(row.created_at || row.tanggal), 'dd-MM-yyyy HH:mm:ss') },
    { header: 'Supplier', accessor: 'supplier_nama' },
    { header: 'Total', render: (row) => `Rp ${formatRupiah(row.total)}` },
    { header: 'User', accessor: 'user_nama' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Histori Pembelian</h2>

      <div className="flex flex-wrap gap-3 items-end">
        <Input label="Dari" type="date" value={filter.from}
          onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} />
        <Input label="Sampai" type="date" value={filter.to}
          onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} />
        <Select label="Supplier" value={filter.supplier_id}
          onChange={(e) => setFilter(prev => ({ ...prev, supplier_id: e.target.value }))}
          options={[{ value: '', label: 'Semua' }, ...suppliers.map(s => ({ value: s.id, label: s.nama_pbf }))]} />
      </div>

      <Table columns={columns} data={data} loading={loading} />
      {!loading && <p className="text-sm text-gray-500">Total: {data.length} transaksi | Rp {formatRupiah(data.reduce((s, r) => s + parseFloat(r.total), 0))}</p>}
    </div>
  );
}
