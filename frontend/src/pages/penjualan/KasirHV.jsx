import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getBarang, createPenjualan, getPelanggan, createPelanggan } from '../../utils/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ReceiptPrint from '../../components/ReceiptPrint';
import { Search, Trash2, ShoppingCart, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

export default function KasirHV() {
  const { user } = useAuth();
  const [barangList, setBarangList] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [shift, setShift] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 14 ? 'siang' : 'pagi';
  });
  const [tunai, setTunai] = useState('');
  const [nonTunai, setNonTunai] = useState('0');
  const [saving, setSaving] = useState(false);
  const [lastNota, setLastNota] = useState(null);
  const [stockWarning, setStockWarning] = useState(null); // { items: [...], proceed: fn }
  const searchRef = useRef(null);

  // Patient info
  const [hasResep, setHasResep] = useState(false);
  const [pasien, setPasien] = useState({ nama: '', alamat: '', no_hp: '' });
  const [pelangganList, setPelangganList] = useState([]);
  const [showPelangganSuggestion, setShowPelangganSuggestion] = useState(false);

  // Resep modal state
  const [showResepModal, setShowResepModal] = useState(false);
  const [resepCart, setResepCart] = useState([]);
  const [resepSearch, setResepSearch] = useState('');
  const [showResepResults, setShowResepResults] = useState(false);

  useEffect(() => {
    getBarang({ limit: 1000 }).then(res => setBarangList(res.data.data)).catch(() => {});
    getPelanggan().then(res => setPelangganList(res.data.data)).catch(() => {});
  }, []);

  // Keyboard shortcut: F2 focus search, F3 open resep
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); setShowResepModal(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ==================== REGULAR CART ====================
  const filteredBarang = barangList.filter(b =>
    b.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
    b.kode.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const addToCart = (barang) => {
    const exists = cart.find(c => c.barang_id === barang.id && !c.isResep);
    if (exists) {
      setCart(prev => prev.map(c =>
        c.barang_id === barang.id && !c.isResep
          ? { ...c, jumlah: c.jumlah + 1, subtotal: (c.jumlah + 1) * parseFloat(c.harga_satuan) }
          : c
      ));
    } else {
      const harga = parseFloat(barang.harga_hv) || 0;
      setCart(prev => [...prev, {
        barang_id: barang.id, nama_barang: barang.nama_barang, satuan: barang.satuan,
        harga_satuan: harga, jumlah: 1, subtotal: harga,
        stock: barang.stock_saat_ini, isResep: false
      }]);
    }
    setSearch('');
    setShowResults(false);
  };

  const updateQty = (index, qty) => {
    const val = parseInt(qty) || 0;
    if (val <= 0) { removeItem(index); return; }
    setCart(prev => prev.map((c, i) =>
      i === index ? { ...c, jumlah: val, subtotal: val * parseFloat(c.harga_satuan) } : c
    ));
  };

  const removeItem = (index) => setCart(prev => prev.filter((_, i) => i !== index));

  // ==================== RESEP MODAL ====================
  const filteredResepBarang = barangList.filter(b =>
    b.nama_barang.toLowerCase().includes(resepSearch.toLowerCase()) ||
    b.kode.toLowerCase().includes(resepSearch.toLowerCase())
  ).slice(0, 8);

  const addToResepCart = (barang) => {
    const exists = resepCart.find(c => c.barang_id === barang.id);
    if (exists) {
      setResepCart(prev => prev.map(c =>
        c.barang_id === barang.id
          ? { ...c, jumlah: c.jumlah + 1, subtotal: (c.jumlah + 1) * parseFloat(c.harga_satuan) }
          : c
      ));
    } else {
      const harga = parseFloat(barang.harga_resep) || 0;
      setResepCart(prev => [...prev, {
        barang_id: barang.id, nama_barang: barang.nama_barang, satuan: barang.satuan,
        harga_satuan: harga, jumlah: 1, subtotal: harga,
        stock: barang.stock_saat_ini
      }]);
    }
    setResepSearch('');
    setShowResepResults(false);
  };

  const updateResepQty = (index, qty) => {
    const val = parseInt(qty) || 0;
    if (val <= 0) { setResepCart(prev => prev.filter((_, i) => i !== index)); return; }
    setResepCart(prev => prev.map((c, i) =>
      i === index ? { ...c, jumlah: val, subtotal: val * parseFloat(c.harga_satuan) } : c
    ));
  };

  const removeResepItem = (index) => setResepCart(prev => prev.filter((_, i) => i !== index));

  const resepTotal = resepCart.reduce((sum, c) => sum + c.subtotal, 0);

  const handleConfirmResep = () => {
    if (resepCart.length === 0) {
      toast.error('Pilih obat resep terlebih dahulu');
      return;
    }

    // Stock warning shown at payment time, not here

    // Add as single "Resep" item to main cart
    const resepEntry = {
      isResep: true,
      nama_barang: 'Resep',
      satuan: 'Paket',
      harga_satuan: resepTotal,
      jumlah: 1,
      subtotal: resepTotal,
      resepItems: resepCart.map(c => ({
        barang_id: c.barang_id, jumlah: c.jumlah, harga_satuan: c.harga_satuan, subtotal: c.subtotal
      }))
    };

    setCart(prev => [...prev, resepEntry]);
    setResepCart([]);
    setShowResepModal(false);
    setHasResep(true);
    toast.success('Resep ditambahkan ke keranjang');
  };

  // ==================== PAYMENT ====================
  const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const bayarTunai = parseFloat(tunai) || 0;
  const bayarNonTunai = parseFloat(nonTunai) || 0;
  const totalBayar = bayarTunai + bayarNonTunai;
  const kembalian = totalBayar - total;

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return; }
    if (totalBayar < total) { toast.error('Pembayaran kurang'); return; }

    // Validate patient info for resep
    if (hasResep) {
      if (!pasien.nama || !pasien.alamat || !pasien.no_hp) {
        toast.error('Nama, alamat, dan no. HP pasien wajib diisi untuk resep');
        return;
      }
    }

    // Check stock — warn but allow
    const minusItems = cart.filter(item => !item.isResep && item.jumlah > item.stock);
    const resepMinusItems = cart
      .filter(item => item.isResep && item.resepItems)
      .flatMap(item => item.resepItems)
      .filter(ri => {
        const b = barangList.find(x => x.id === ri.barang_id);
        return b && ri.jumlah > b.stock_saat_ini;
      });

    const allMinus = [...minusItems.map(i => i.nama_barang), ...resepMinusItems.map(ri => {
      const b = barangList.find(x => x.id === ri.barang_id);
      return b?.nama_barang || 'Unknown';
    })];

    if (allMinus.length > 0 && !stockWarning) {
      setStockWarning({ items: allMinus });
      return;
    }
    setStockWarning(null);

    // Flatten items: regular items + resep detail items
    const flatItems = [];
    for (const item of cart) {
      if (item.isResep && item.resepItems) {
        for (const ri of item.resepItems) {
          flatItems.push(ri);
        }
      } else {
        flatItems.push({
          barang_id: item.barang_id, jumlah: item.jumlah,
          harga_satuan: item.harga_satuan, subtotal: item.subtotal
        });
      }
    }

    setSaving(true);
    try {
      // Resolve pelanggan_id
      let pelangganId = null;
      if (pasien.nama) {
        const existing = pelangganList.find(p => p.nama.toLowerCase() === pasien.nama.toLowerCase());
        if (existing) {
          pelangganId = existing.id;
        } else {
          // Create new pelanggan
          const kode = 'P' + Date.now().toString().slice(-6);
          const pelRes = await createPelanggan({ kode, nama: pasien.nama, no_hp: pasien.no_hp || null, alamat: pasien.alamat || null, tipe: hasResep ? 'resep' : 'umum' });
          pelangganId = pelRes.data.id;
          getPelanggan().then(r => setPelangganList(r.data.data)).catch(() => {});
        }
      }

      const res = await createPenjualan({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        shift, tipe: hasResep ? 'resep' : 'hv', pelanggan_id: pelangganId,
        items: flatItems,
        tunai: bayarTunai, non_tunai: bayarNonTunai
      });
      const receiptItems = cart.map(item => {
        if (item.isResep) {
          return { nama_barang: 'Resep (' + item.resepItems.length + ' item)', jumlah: 1, harga_satuan: item.harga_satuan, subtotal: item.subtotal };
        }
        return { nama_barang: item.nama_barang, jumlah: item.jumlah, harga_satuan: item.harga_satuan, subtotal: item.subtotal };
      });
      setReceiptData({
        no_nota: res.data.no_nota, tanggal: format(new Date(), 'yyyy-MM-dd'),
        shift, items: receiptItems, total, tunai: bayarTunai, non_tunai: bayarNonTunai,
        kembalian: res.data.kembalian, kasir: user?.nama
      });

      setLastNota({ no_nota: res.data.no_nota, kembalian: res.data.kembalian, total });
      setCart([]);
      setHasResep(false);
      setPasien({ nama: '', alamat: '', no_hp: '' });
      setTunai('');
      setNonTunai('0');
      toast.success(`Transaksi berhasil! Nota: ${res.data.no_nota}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left: Cart */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={searchRef} type="text" placeholder="Cari obat (F2)..." value={search}
                onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {showResults && search && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  {filteredBarang.length > 0 ? filteredBarang.map(b => (
                    <button key={b.id} onMouseDown={() => addToCart(b)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-0 text-sm">
                      <div className="flex justify-between">
                        <span><strong>{b.kode}</strong> - {b.nama_barang}</span>
                        <span className="text-teal-700 font-medium">Rp {formatRupiah(b.harga_hv)}</span>
                      </div>
                      <span className="text-xs text-gray-400">Stok: {b.stock_saat_ini} {b.satuan}</span>
                    </button>
                  )) : <p className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan</p>}
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={() => setShowResepModal(true)} className="whitespace-nowrap">
              <FileText size={16} /> Resep (F3)
            </Button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">Barang</th>
                  <th className="pb-2 w-20">Qty</th>
                  <th className="pb-2 w-28 text-right">Harga</th>
                  <th className="pb-2 w-32 text-right">Subtotal</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item, i) => (
                  <tr key={i} className={item.isResep ? 'bg-blue-50' : ''}>
                    <td className="py-2">
                      <p className="font-medium">
                        {item.isResep && <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded mr-2">R/</span>}
                        {item.nama_barang}
                      </p>
                      <p className="text-xs text-gray-400">{item.satuan}</p>
                      {item.isResep && item.resepItems && (
                        <p className="text-xs text-blue-600 mt-0.5">{item.resepItems.length} item obat</p>
                      )}
                    </td>
                    <td className="py-2">
                      {item.isResep ? (
                        <span className="text-sm text-center block">1</span>
                      ) : (
                        <input type="number" value={item.jumlah} min="1"
                          onChange={(e) => updateQty(i, e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-center text-sm" />
                      )}
                    </td>
                    <td className="py-2 text-right">{formatRupiah(item.harga_satuan)}</td>
                    <td className="py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                    <td className="py-2">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart size={48} className="mb-2" />
              <p>Keranjang kosong</p>
              <p className="text-xs mt-1">Cari obat atau tambah resep (F3)</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Payment */}
      <div className="w-80 bg-white rounded-xl border p-4 flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Kasir</h3>

        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Shift</label>
          <div className="flex gap-2">
            {[{ key: 'pagi', label: 'Pagi (07-14)' }, { key: 'siang', label: 'Siang (14-21)' }].map(s => (
              <button key={s.key} onClick={() => setShift(s.key)}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors
                  ${shift === s.key ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Info */}
        <div className="mb-3 space-y-2">
          {hasResep ? (
            <>
              <div className="relative">
                <Input label="Nama Pasien *" value={pasien.nama}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasien(prev => ({ ...prev, nama: val }));
                    setShowPelangganSuggestion(val.length >= 2);
                  }}
                  onBlur={() => setTimeout(() => setShowPelangganSuggestion(false), 200)}
                  placeholder="Nama pasien" />
                {showPelangganSuggestion && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                    {pelangganList
                      .filter(p => p.nama.toLowerCase().includes(pasien.nama.toLowerCase()))
                      .slice(0, 5)
                      .map(p => (
                        <button key={p.id} onMouseDown={() => {
                          setPasien({ nama: p.nama, alamat: p.alamat || '', no_hp: p.no_hp || '' });
                          setShowPelangganSuggestion(false);
                        }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                          <span className="font-medium">{p.nama}</span>
                          {p.no_hp && <span className="text-gray-400 ml-2">{p.no_hp}</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <Input label="Alamat *" value={pasien.alamat}
                onChange={(e) => setPasien(prev => ({ ...prev, alamat: e.target.value }))}
                placeholder="Alamat pasien" />
              <Input label="No. HP *" value={pasien.no_hp}
                onChange={(e) => setPasien(prev => ({ ...prev, no_hp: e.target.value }))}
                placeholder="08xxxxxxxxxx" />
            </>
          ) : (
            <Input label="Nama Pasien" value={pasien.nama}
              onChange={(e) => setPasien(prev => ({ ...prev, nama: e.target.value }))}
              placeholder="Opsional" />
          )}
        </div>

        <div className="flex-1" />

        {/* Total */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-teal-700">Rp {formatRupiah(total)}</span>
          </div>

          <Input label="Tunai" type="number" value={tunai}
            onChange={(e) => setTunai(e.target.value)} placeholder="0" />
          <Input label="Non-Tunai (EDC)" type="number" value={nonTunai}
            onChange={(e) => setNonTunai(e.target.value)} placeholder="0" />

          <div className={`flex justify-between text-sm font-semibold ${kembalian < 0 ? 'text-red-600' : 'text-green-600'}`}>
            <span>Kembalian</span>
            <span>Rp {formatRupiah(Math.max(kembalian, 0))}</span>
          </div>

          <Button className="w-full" onClick={handleSubmit} loading={saving} disabled={cart.length === 0 || kembalian < 0}>
            Konfirmasi Pembayaran
          </Button>
        </div>

        {/* Last Nota */}
        {lastNota && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm">
            <p className="font-medium text-green-800">Transaksi Terakhir:</p>
            <p>Nota: {lastNota.no_nota}</p>
            <p>Total: Rp {formatRupiah(lastNota.total)}</p>
            <p>Kembalian: Rp {formatRupiah(lastNota.kembalian)}</p>
          </div>
        )}
      </div>

      {/* ==================== RESEP MODAL ==================== */}
      <Modal isOpen={showResepModal} onClose={() => setShowResepModal(false)} title="Input Resep Dokter" size="lg">
        <div className="space-y-4">
          {/* Search obat resep */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Cari obat untuk resep..." value={resepSearch}
              onChange={(e) => { setResepSearch(e.target.value); setShowResepResults(true); }}
              onFocus={() => setShowResepResults(true)}
              onBlur={() => setTimeout(() => setShowResepResults(false), 200)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {showResepResults && resepSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredResepBarang.length > 0 ? filteredResepBarang.map(b => (
                  <button key={b.id} onMouseDown={() => addToResepCart(b)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-0 text-sm">
                    <div className="flex justify-between">
                      <span><strong>{b.kode}</strong> - {b.nama_barang}</span>
                      <span className="text-blue-700 font-medium">Rp {formatRupiah(b.harga_resep)}</span>
                    </div>
                    <span className="text-xs text-gray-400">Stok: {b.stock_saat_ini} {b.satuan}</span>
                  </button>
                )) : <p className="px-4 py-2 text-sm text-gray-400">Tidak ditemukan</p>}
              </div>
            )}
          </div>

          {/* Resep items table */}
          {resepCart.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-800">
                    <th className="px-3 py-2 text-left text-xs">Obat</th>
                    <th className="px-3 py-2 text-center text-xs w-20">Qty</th>
                    <th className="px-3 py-2 text-right text-xs w-28">Harga</th>
                    <th className="px-3 py-2 text-right text-xs w-28">Subtotal</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resepCart.map((item, i) => (
                    <tr key={item.barang_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.nama_barang}</p>
                        <p className="text-xs text-gray-400">{item.satuan}</p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={item.jumlah} min="1"
                          onChange={(e) => updateResepQty(i, e.target.value)}
                          className="w-14 px-1 py-1 border rounded text-center text-sm" />
                      </td>
                      <td className="px-3 py-2 text-right">{formatRupiah(item.harga_satuan)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeResepItem(i)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 border rounded-lg">
              <FileText size={32} className="mx-auto mb-2" />
              <p className="text-sm">Belum ada obat dipilih</p>
              <p className="text-xs">Cari dan tambahkan obat sesuai resep dokter</p>
            </div>
          )}

          {/* Total & Confirm */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Total Harga Resep</p>
              <p className="text-xl font-bold text-blue-800">Rp {formatRupiah(resepTotal)}</p>
            </div>
            <Button onClick={handleConfirmResep} disabled={resepCart.length === 0}>
              Konfirmasi Resep
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================== STOCK WARNING ==================== */}
      {stockWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setStockWarning(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-amber-700 mb-2">Peringatan Stok</h3>
            <p className="text-sm text-gray-600 mb-3">Barang berikut akan menyebabkan stok minus:</p>
            <ul className="text-sm space-y-1 mb-4 max-h-32 overflow-y-auto">
              {stockWarning.items.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-red-600">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {name}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-4">Transaksi akan ditandai sebagai "stok minus" di laporan.</p>
            <div className="flex gap-2">
              <button onClick={() => setStockWarning(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                Batal
              </button>
              <button onClick={() => handleSubmit()}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== RECEIPT PRINT ==================== */}
      {receiptData && (
        <ReceiptPrint data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </div>
  );
}
