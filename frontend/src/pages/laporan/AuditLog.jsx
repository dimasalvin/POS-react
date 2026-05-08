import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAuditLog } from '../../utils/api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { format } from 'date-fns';

const actionColors = {
  login: 'hijau',
  create: 'biru',
  update: 'amber',
  delete: 'merah',
  void: 'merah',
  stock_opname: 'amber'
};

export default function AuditLog() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    module: '',
    limit: '100'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAuditLog(filter);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const columns = [
    { header: 'Waktu', render: (row) => format(new Date(row.created_at), 'dd-MM-yyyy HH:mm:ss') },
    { header: 'User', render: (row) => row.username || '-' },
    { header: 'Aksi', render: (row) => (
      <Badge color={actionColors[row.action] || 'gray'}>{row.action}</Badge>
    )},
    { header: 'Modul', render: (row) => <span className="capitalize">{row.module}</span> },
    { header: 'Detail', render: (row) => (
      <span className="text-xs text-gray-600 max-w-xs truncate block">{row.detail || '-'}</span>
    )},
    { header: 'IP', render: (row) => <span className="text-xs text-gray-400">{row.ip_address || '-'}</span> }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Audit Log</h2>

      <div className="flex flex-wrap gap-3 items-end">
        <Input label="Dari" type="date" value={filter.from}
          onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} />
        <Input label="Sampai" type="date" value={filter.to}
          onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} />
        <Select label="Modul" value={filter.module}
          onChange={(e) => setFilter(prev => ({ ...prev, module: e.target.value }))}
          options={[
            { value: '', label: 'Semua' },
            { value: 'auth', label: 'Auth' },
            { value: 'barang', label: 'Barang' },
            { value: 'pembelian', label: 'Pembelian' },
            { value: 'retur', label: 'Retur' },
            { value: 'penjualan', label: 'Penjualan' },
            { value: 'kas', label: 'Kas' }
          ]} />
        <Select label="Limit" value={filter.limit}
          onChange={(e) => setFilter(prev => ({ ...prev, limit: e.target.value }))}
          options={[
            { value: '50', label: '50' },
            { value: '100', label: '100' },
            { value: '200', label: '200' },
            { value: '500', label: '500' }
          ]} />
      </div>

      <Table columns={columns} data={data} loading={loading} />

      {!loading && <p className="text-sm text-gray-500">{data.length} log ditampilkan</p>}
    </div>
  );
}
