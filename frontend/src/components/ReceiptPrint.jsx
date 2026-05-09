import { forwardRef } from 'react';
import { format } from 'date-fns';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

const ReceiptPrint = forwardRef(({ data, onClose }, ref) => {
  if (!data) return null;

  const { no_nota, tanggal, shift, items, total, tunai, non_tunai, kembalian, kasir } = data;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk ${no_nota}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 11px; width: 58mm; padding: 4mm; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
          .item-name { margin-top: 3px; }
          .item-detail { display: flex; justify-content: space-between; padding-left: 8px; }
          h1 { font-size: 14px; margin-bottom: 2px; }
          p { margin: 1px 0; }
          @media print {
            body { width: 58mm; }
            @page { size: 58mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>POS APOTEK</h1>
          <p>Jl. Gamers No. 8, Semarang</p>
          <p>Telp: (024) 1234567</p>

        </div>
        <div class="line"></div>
        <div class="row"><span>No: ${no_nota}</span><span>${format(new Date(tanggal), 'dd/MM/yy')}</span></div>
        <div class="row"><span>Kasir: ${kasir || '-'}</span><span>Shift: ${shift}</span></div>
        <div class="line"></div>
        ${items.map(item => `
          <div class="item-name">${item.nama_barang}</div>
          <div class="item-detail">
            <span>${item.jumlah} x ${formatRupiah(item.harga_satuan)}</span>
            <span>${formatRupiah(item.subtotal)}</span>
          </div>
        `).join('')}
        <div class="line"></div>
        <div class="row bold"><span>TOTAL</span><span>Rp ${formatRupiah(total)}</span></div>
        <div class="row"><span>Tunai</span><span>Rp ${formatRupiah(tunai)}</span></div>
        ${parseFloat(non_tunai) > 0 ? `<div class="row"><span>Non-Tunai</span><span>Rp ${formatRupiah(non_tunai)}</span></div>` : ''}
        <div class="row bold"><span>Kembali</span><span>Rp ${formatRupiah(kembalian)}</span></div>
        <div class="line"></div>
        <div class="center" style="margin-top:6px;">
          <p>Terima kasih atas kunjungan Anda</p>
          <p>Semoga lekas sembuh</p>
          <p style="margin-top:4px; font-size:9px;">${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xs mx-4 p-6">
        {/* Preview */}
        <div ref={ref} className="font-mono text-xs space-y-1 mb-4">
          <div className="text-center">
            <p className="font-bold text-sm">POS APOTEK</p>
            <p>Jl. Gamers No. 8, Semarang</p>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between">
            <span>No: {no_nota}</span>
            <span>{format(new Date(tanggal), 'dd/MM/yy')}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          {items.map((item, i) => (
            <div key={i}>
              <p>{item.nama_barang}</p>
              <div className="flex justify-between pl-2">
                <span>{item.jumlah} x {formatRupiah(item.harga_satuan)}</span>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>Rp {formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tunai</span>
            <span>Rp {formatRupiah(tunai)}</span>
          </div>
          {parseFloat(non_tunai) > 0 && (
            <div className="flex justify-between">
              <span>Non-Tunai</span>
              <span>Rp {formatRupiah(non_tunai)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Kembali</span>
            <span>Rp {formatRupiah(kembalian)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <p className="text-center">Terima kasih</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="flex-1 bg-teal-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors">
            Cetak Struk
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
});

ReceiptPrint.displayName = 'ReceiptPrint';
export default ReceiptPrint;
