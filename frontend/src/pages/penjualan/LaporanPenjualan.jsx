import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getPenjualan, voidPenjualan } from '../../utils/api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function LaporanPenjualan() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmVoid, setConfirmVoid] = useState(null);
  const [filter, setFilter] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    shift: '', tipe: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPenjualan(filter);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleVoid = async () => {
    try {
      await voidPenjualan(confirmVoid.id);
      toast.success('Penjualan berhasil di-void');
      setConfirmVoid(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal void');
    }
  };

  const canVoid = ['apoteker', 'apoteker_pendamping'].includes(user?.role);

  const columns = [
    { header: 'No. Nota', accessor: 'no_nota' },
    { header: 'Tanggal', render: (row) => format(new Date(row.created_at || row.tanggal), 'dd-MM-yyyy HH:mm:ss') },
    { header: 'Shift', render: (row) => <span className="capitalize">{row.shift}</span> },
    { header: 'Tipe', render: (row) => <Badge color={row.tipe === 'resep' ? 'biru' : 'hijau'}>{row.tipe.toUpperCase()}</Badge> },
    { header: 'Total', render: (row) => `Rp ${formatRupiah(row.total)}` },
    { header: 'Pasien', render: (row) => row.pelanggan_nama || '-' },
    { header: 'Kasir', accessor: 'kasir_nama' },
    { header: 'Status', render: (row) => (
      <div className="flex items-center gap-1">
        <Badge color={row.status === 'confirmed' ? 'hijau' : row.status === 'void' ? 'merah' : 'gray'}>
          {row.status}
        </Badge>
        {row.stock_minus === 1 && (
          <Badge color="amber">stok-</Badge>
        )}
      </div>
    )},
    ...(canVoid ? [{ header: 'Aksi', render: (row) => (
      row.status === 'confirmed' && (
        <button onClick={() => setConfirmVoid(row)} className="text-red-600 hover:text-red-800 text-xs font-medium">Void</button>
      )
    )}] : [])
  ];

  const totalPenjualan = data.filter(d => d.status === 'confirmed').reduce((s, r) => s + parseFloat(r.total), 0);

  const handlePrint = () => {
    const rows = data.map(row => `
      <tr>
        <td>${row.no_nota}</td>
        <td>${format(new Date(row.created_at || row.tanggal), 'dd-MM-yyyy HH:mm:ss')}</td>
        <td>${row.shift}</td>
        <td>${row.tipe.toUpperCase()}</td>
        <td style="text-align:right">Rp ${formatRupiah(row.total)}</td>
        <td>${row.pelanggan_nama || '-'}</td>
        <td>${row.kasir_nama || '-'}</td>
        <td>${row.status}${row.stock_minus ? ' [stok-]' : ''}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Laporan Penjualan</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background: #0f766e; color: white; }
        .footer { margin-top: 12px; font-size: 11px; display: flex; justify-content: space-between; }
        @media print { @page { size: landscape; margin: 10mm; } }
      </style></head><body>
        <h2>APOTEK MORO MARI</h2>
        <p class="subtitle">Laporan Penjualan: ${filter.from} s/d ${filter.to}</p>
        <table>
          <thead><tr>
            <th>No. Nota</th><th>Tanggal</th><th>Shift</th><th>Tipe</th>
            <th>Total</th><th>Pasien</th><th>Kasir</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          <span>${data.length} transaksi</span>
          <span><strong>Total (confirmed): Rp ${formatRupiah(totalPenjualan)}</strong></span>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Laporan Penjualan</h2>
        <Button variant="secondary" onClick={handlePrint} disabled={loading || data.length === 0}>
          <Printer size={16} /> Cetak
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Input label="Dari" type="date" value={filter.from}
          onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} />
        <Input label="Sampai" type="date" value={filter.to}
          onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} />
        <Select label="Shift" value={filter.shift}
          onChange={(e) => setFilter(prev => ({ ...prev, shift: e.target.value }))}
          options={[{ value: '', label: 'Semua' }, { value: 'pagi', label: 'Pagi' }, { value: 'siang', label: 'Siang' }]} />
        <Select label="Tipe" value={filter.tipe}
          onChange={(e) => setFilter(prev => ({ ...prev, tipe: e.target.value }))}
          options={[{ value: '', label: 'Semua' }, { value: 'hv', label: 'HV' }, { value: 'resep', label: 'Resep' }]} />
      </div>

      <Table columns={columns} data={data} loading={loading} />

      {!loading && (
        <p className="text-sm text-gray-600">
          {data.length} transaksi | Total (confirmed): <strong>Rp {formatRupiah(totalPenjualan)}</strong>
        </p>
      )}

      <ConfirmDialog
        isOpen={!!confirmVoid}
        onCancel={() => setConfirmVoid(null)}
        onConfirm={handleVoid}
        message={`Void transaksi ${confirmVoid?.no_nota}? Stok akan dikembalikan.`}
      />
    </div>
  );
}
