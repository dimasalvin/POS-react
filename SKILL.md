---
name: kasir-react
description: Panduan teknis implementasi fullstack app Apotek Moro Mari untuk AI coding assistant
---

# SKILL.md — Panduan Teknis Implementasi

## Apotek Moro Mari Fullstack App

Dokumen ini adalah panduan teknis mendetail untuk AI coding assistant dalam mengimplementasikan proyek ini. Ikuti semua konvensi di bawah secara konsisten.

---

## 1. KONVENSI UMUM

### Bahasa
- Semua **label UI, notifikasi, pesan error** → Bahasa Indonesia
- Semua **nama variabel, fungsi, file, komentar kode** → Bahasa Inggris
- Komentar penjelasan logika bisnis boleh campur (EN utama, ID untuk klarifikasi domain)

### Tanggal & Waktu
- Format tampilan: `DD-MM-YYYY` (contoh: 14-04-2020)
- Format API request/response: `YYYY-MM-DD` (ISO 8601)
- Timezone: `Asia/Jakarta` (`+07:00`)
- Gunakan `date-fns` untuk semua manipulasi tanggal di frontend

### Angka & Mata Uang
- Semua nilai harga: `DECIMAL(12,2)` di database
- Tampilan: format Rupiah tanpa simbol mata uang di dalam input, gunakan format `1.000` (titik sebagai separator ribuan)
- Tidak perlu simbol `Rp` di dalam tabel/form, cukup di label kolom

---

## 2. BACKEND — NODE.JS + EXPRESS

### Struktur Response API (WAJIB KONSISTEN)

```javascript
// Sukses dengan data
{ success: true, data: [...], message: "Opsional" }

// Sukses tanpa data
{ success: true, message: "Barang berhasil disimpan" }

// Sukses create
{ success: true, message: "...", id: insertId }

// Error
{ success: false, message: "Pesan error yang jelas" }
```

### Pattern Database Query

```javascript
// Selalu gunakan parameterized query, TIDAK PERNAH string interpolasi SQL
const [rows] = await db.execute('SELECT * FROM barang WHERE id = ?', [id]);

// Transaksi multi-table → wajib pakai transaction
const conn = await db.getConnection();
await conn.beginTransaction();
try {
  // ... queries
  await conn.commit();
  conn.release();
} catch (err) {
  await conn.rollback();
  conn.release();
  throw err;
}
```

### Middleware Auth

```javascript
// Semua route kecuali /api/auth/login dan /api/health wajib pakai:
router.use(authMiddleware);

// Untuk endpoint yang butuh role tertentu:
router.delete('/:id', authMiddleware, roleMiddleware('apoteker', 'admin'), handler);
```

### Error Codes yang Perlu Ditangani

| Error | HTTP Code | Pesan |
|---|---|---|
| Data tidak ditemukan | 404 | "... tidak ditemukan" |
| Duplikasi unik | 400 | "Kode ... sudah ada" |
| Token tidak ada | 401 | "Token tidak ditemukan" |
| Token invalid/expired | 403 | "Token tidak valid atau expired" |
| Role tidak punya akses | 403 | "Akses ditolak: role tidak memiliki izin" |
| Server error | 500 | "Server error" |

### Validasi Input Backend
- Selalu validasi field wajib sebelum query
- Casting tipe eksplisit: `parseInt()`, `parseFloat()` untuk angka dari body
- Nullable field: kirim `null` jika kosong, bukan string `"null"` atau `""`

---

## 3. FRONTEND — REACT + VITE + TAILWIND

### AuthContext (src/context/AuthContext.jsx)

```jsx
// Yang harus tersedia dari context:
const { user, token, login, logout, isAuthenticated } = useAuth();

// user shape:
{
  id: number,
  username: string,
  nama: string,
  role: 'apoteker' | 'apoteker_pendamping' | 'admin' | 'asisten_apoteker'
}

// Simpan token di localStorage key: 'apotek_token'
// Simpan user di localStorage key: 'apotek_user'
```

### Axios Instance (src/utils/api.js)

```javascript
// Instance tunggal dengan base URL dari env
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Request interceptor: otomatis inject Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('apotek_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: auto logout jika 401/403
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Semua fungsi API diekspor dari file ini, contoh:
export const getBarang = (params) => api.get('/barang', { params });
export const createBarang = (data) => api.post('/barang', data);
```

### Pola Fetch Data di Komponen

```jsx
// Gunakan pattern ini: state loading + error + data
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await getBarang();
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Notifikasi (react-hot-toast)

```jsx
toast.success('Berhasil disimpan');
toast.error('Gagal menyimpan data');
// TIDAK PERLU membuat komponen alert/notif sendiri
```

### Struktur Form

```jsx
// Gunakan controlled component
const [form, setForm] = useState({ nama_barang: '', satuan: '', grup: 'hijau', ... });
const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

// Submit
const handleSubmit = async (e) => {
  e.preventDefault();   // atau onClick handler jika bukan form HTML
  try {
    await createBarang(form);
    toast.success('Barang berhasil ditambahkan');
    onSuccess?.();       // callback untuk close modal + refresh list
  } catch (err) {
    toast.error(err.response?.data?.message || 'Terjadi kesalahan');
  }
};
```

### Komponen Reusable UI (src/components/ui/)

Buat dan gunakan komponen-komponen ini agar konsisten:

| Komponen | Props Utama | Keterangan |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `onClick` | variant: primary/secondary/danger/ghost |
| `Modal` | `isOpen`, `onClose`, `title`, `children` | Pakai backdrop + Escape key close |
| `Table` | `columns`, `data`, `loading` | Dengan skeleton loader |
| `Badge` | `color` | Untuk grup obat: hijau/merah/biru |
| `Input` | `label`, `error`, `...rest` | Dengan label dan pesan error |
| `Select` | `label`, `options`, `error`, `...rest` | |
| `ConfirmDialog` | `isOpen`, `onConfirm`, `onCancel`, `message` | Untuk hapus/void |

### Routing (src/App.jsx)

```jsx
// Struktur route:
/login                       → <Login />           (public)
/                            → redirect ke /dashboard
/dashboard                   → <Dashboard />        (semua role)
/stock/daftar-barang         → <DaftarBarang />
/stock/setting-harga         → <SettingHarga />
/stock/stock-opname          → <StockOpname />
/pembelian/supplier          → <DaftarSupplier />
/pembelian/input             → <InputPembelian />
/pembelian/histori           → <HistoriPembelian />
/pembelian/retur             → <ReturPembelian />
/penjualan/kasir-hv          → <KasirHV /> (termasuk modal input resep)
/penjualan/laporan           → <LaporanPenjualan />
/penjualan/closing           → <ClosingKasir />
/laporan/kas                 → <KasApotek />
```

---

## 4. DESAIN UI

### Palet Warna (Tailwind)

```
Primary    : teal-700 (#0f766e)  → tombol utama, sidebar aktif
Secondary  : teal-50             → background header tabel
Danger     : red-600             → tombol hapus, void, barang merah
Warning    : amber-500           → peringatan stok kritis
Success    : green-600           → konfirmasi berhasil
Neutral    : gray-100 bg, gray-700 text

Grup barang:
  hijau → bg-green-100 text-green-800
  merah → bg-red-100 text-red-800
  biru  → bg-blue-100 text-blue-800
```

### Layout

```
┌─────────────────────────────────────────┐
│  HEADER (apotek name + user info)       │
├──────────┬──────────────────────────────┤
│          │                              │
│ SIDEBAR  │    CONTENT AREA              │
│ (240px)  │    (flex-1, overflow-auto)   │
│          │                              │
└──────────┴──────────────────────────────┘
```

Sidebar menampilkan:
- Logo/nama apotek di atas
- Menu navigasi dikelompokkan: STOK / PEMBELIAN / PENJUALAN / LAPORAN
- Role user di bagian bawah
- Tombol logout

### Tabel Data

- Header tabel: `bg-teal-700 text-white`
- Row hover: `hover:bg-gray-50`
- Kolom aksi (Edit/Hapus): selalu di kolom paling kanan
- Selalu tampilkan jumlah total record: `Menampilkan X dari Y data`
- Tampilkan skeleton loader (3-5 baris abu-abu) saat loading

### Form di Modal

- Modal lebar: `max-w-lg` untuk form sederhana, `max-w-2xl` untuk form dengan tabel item
- Field wajib ditandai dengan `*` merah
- Disable tombol simpan saat sedang proses (loading state)

---

## 5. LOGIKA BISNIS KHUSUS

### Kasir (KasirHV.jsx — satu halaman untuk semua transaksi)

```
Flow Non-Resep:
1. User cari obat (by nama/kode) → tampil di dropdown/autocomplete
2. Pilih obat → masuk ke keranjang dengan harga_hv
3. Bisa ubah jumlah atau hapus item
4. Input pembayaran: tunai dan/atau non-tunai (EDC)
5. Kembalian = (tunai + non_tunai) - total
6. Konfirmasi → POST /api/penjualan (tipe: 'hv') → tampil no_nota + kembalian

Flow Resep (via modal):
1. Klik tombol "Resep (F3)" → buka modal input resep
2. Cari dan pilih obat → masuk ke keranjang resep dengan harga_resep
3. Atur qty per obat
4. Klik "Konfirmasi Resep" → masuk ke keranjang utama sebagai 1 item "Resep"
5. Di keranjang utama tampil: [R/] Resep | qty: 1 | harga: total resep
6. Saat submit, backend menerima items yang sudah di-flatten (stok tetap dipotong per obat)
7. Semua transaksi tetap tipe 'hv'
```

Harga yang dipakai:
- Obat biasa (non-resep) → `barang.harga_hv`
- Obat via modal resep → `barang.harga_resep`

### Input Pembelian (InputPembelian.jsx)

```
1. Pilih supplier dari dropdown
2. Input no. faktur dan tanggal
3. Tambah item: cari barang → isi jumlah + HNA + diskon
4. Sistem otomatis hitung: harga_netto = harga_hna × (1 - diskon/100)
5. jumlah_harga = jumlah × harga_netto
6. Total dihitung dari semua item
7. Simpan → POST /api/pembelian
8. Backend update stock_saat_ini += jumlah untuk setiap item
```

### Stock Opname (StockOpname.jsx)

```
1. Tampilkan semua barang aktif dengan stock_saat_ini (sistem)
2. User input stock_fisik (hasil hitung fisik)
3. Selisih otomatis dihitung: fisik - sistem (bisa negatif)
4. Baris dengan selisih ≠ 0 → highlight kuning
5. Simpan → backend update stock_saat_ini = stock_fisik
```

### Closing Kasir (ClosingKasir.jsx)

```
1. User pilih tanggal range + shift
2. Fetch GET /api/penjualan/closing/summary
3. Tampilkan per shift: total R/, total HV, pendapatan, non-tunai
4. Tampilkan GRAND TOTAL di baris bawah
5. Ada tombol CETAK (print window atau export PDF sederhana)
```

### Peringatan Stok Kritis

```
- Barang dengan stock_saat_ini <= stock_minimum → ditandai peringatan
- Dashboard menampilkan daftar 5 barang stok kritis
- Di halaman DaftarBarang: filter "Stok Kritis" → tampilkan hanya barang kritis
- Badge merah/amber di sidebar jika ada stok kritis
```

---

## 6. KEAMANAN

- Semua input user di-sanitize sebelum query (parameterized query)
- Password di-hash dengan bcrypt (salt rounds: 10)
- JWT secret minimal 32 karakter random
- CORS hanya izinkan origin dari `FRONTEND_URL`
- Soft delete untuk barang (is_active = 0), bukan hard delete
- Void untuk penjualan, bukan delete — stok dikembalikan saat void
- Tidak pernah expose password hash di response API

---

## 7. EDGE CASES YANG HARUS DITANGANI

| Skenario | Penanganan |
|---|---|
| Stok tidak cukup saat penjualan | Backend cek `stock_saat_ini >= jumlah`, jika tidak → return 400 |
| No. faktur pembelian duplikat | Tampilkan pesan error dari backend (ER_DUP_ENTRY) |
| Kasir tanpa pilih pelanggan | Default ke `pelanggan_id = null` (pelanggan umum) |
| Kembalian negatif | Disable tombol konfirmasi, tampilkan warning |
| Token expired saat sedang bekerja | Auto redirect ke /login via axios interceptor |
| Obat sudah ada transaksi, lalu dihapus | Soft delete saja; data historis tetap ada |
| Retur lebih banyak dari stok | Backend cek, return 400 jika stok tidak mencukupi |