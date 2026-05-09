import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getClosingSummary } from '../../utils/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function ClosingKasir() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    shift: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getClosingSummary(filter);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const grandTotal = data.reduce((s, r) => s + parseFloat(r.total_penjualan || 0), 0);
  const totalTunai = data.reduce((s, r) => s + parseFloat(r.total_tunai || 0), 0);
  const totalNonTunai = data.reduce((s, r) => s + parseFloat(r.total_non_tunai || 0), 0);

  const handlePrint = () => {
    const rows = data.map(row => `
      <tr>
        <td style="text-transform:capitalize">${row.shift}</td>
        <td style="text-transform:uppercase">${row.tipe}</td>
        <td style="text-align:right">${row.jumlah_transaksi}</td>
        <td style="text-align:right">Rp ${formatRupiah(row.total_penjualan)}</td>
        <td style="text-align:right">Rp ${formatRupiah(row.total_tunai)}</td>
        <td style="text-align:right">Rp ${formatRupiah(row.total_non_tunai)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Closing Kasir</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
        th { background: #0f766e; color: white; text-align: left; }
        td { text-align: left; }
        .total-row { background: #f3f4f6; font-weight: bold; }
        .footer { margin-top: 16px; font-size: 10px; color: #666; text-align: right; }
        @media print { @page { margin: 10mm; } }
      </style></head><body>
        <h2>POS APOTEK</h2>
        <p class="subtitle">Closing Kasir: ${filter.from} s/d ${filter.to}${filter.shift ? ' | Shift: ' + filter.shift : ''}</p>
        <table>
          <thead><tr>
            <th>Shift</th><th>Tipe</th><th style="text-align:right">Transaksi</th>
            <th style="text-align:right">Total Penjualan</th><th style="text-align:right">Tunai</th><th style="text-align:right">Non-Tunai</th>
          </tr></thead>
          <tbody>${rows}
            <tr class="total-row">
              <td colspan="3">GRAND TOTAL</td>
              <td style="text-align:right">Rp ${formatRupiah(grandTotal)}</td>
              <td style="text-align:right">Rp ${formatRupiah(totalTunai)}</td>
              <td style="text-align:right">Rp ${formatRupiah(totalNonTunai)}</td>
            </tr>
          </tbody>
        </table>
        <p class="footer">Dicetak: ${format(new Date(), 'dd-MM-yyyy HH:mm:ss')}</p>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Closing Kasir</h2>
        <Button variant="secondary" onClick={handlePrint}>Cetak</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Input label="Dari" type="date" value={filter.from}
          onChange={(e) => setFilter(prev => ({ ...prev, from: e.target.value }))} />
        <Input label="Sampai" type="date" value={filter.to}
          onChange={(e) => setFilter(prev => ({ ...prev, to: e.target.value }))} />
        <Select label="Shift" value={filter.shift}
          onChange={(e) => setFilter(prev => ({ ...prev, shift: e.target.value }))}
          options={[{ value: '', label: 'Semua' }, { value: 'pagi', label: 'Pagi' }, { value: 'siang', label: 'Siang' }]} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 text-left">Shift</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-right">Transaksi</th>
                <th className="px-4 py-3 text-right">Total Penjualan</th>
                <th className="px-4 py-3 text-right">Tunai</th>
                <th className="px-4 py-3 text-right">Non-Tunai</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize">{row.shift}</td>
                  <td className="px-4 py-3 uppercase">{row.tipe}</td>
                  <td className="px-4 py-3 text-right">{row.jumlah_transaksi}</td>
                  <td className="px-4 py-3 text-right font-medium">Rp {formatRupiah(row.total_penjualan)}</td>
                  <td className="px-4 py-3 text-right">Rp {formatRupiah(row.total_tunai)}</td>
                  <td className="px-4 py-3 text-right">Rp {formatRupiah(row.total_non_tunai)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-3" colSpan="3">GRAND TOTAL</td>
                <td className="px-4 py-3 text-right">Rp {formatRupiah(grandTotal)}</td>
                <td className="px-4 py-3 text-right">Rp {formatRupiah(totalTunai)}</td>
                <td className="px-4 py-3 text-right">Rp {formatRupiah(totalNonTunai)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
