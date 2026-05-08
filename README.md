# 🏥 Apotek Moro Mari — Sistem Manajemen Farmasi

> **No. SIA:** 442/18/DPM-PTSP/IUAP/IV/2019  
> **Alamat:** Jalan Gamers No. 8, Semarang | **Telp:** (024) 1234567

Sistem informasi manajemen apotek berbasis web fullstack untuk mengelola stok obat, pembelian dari PBF/supplier, penjualan kasir (HV & Resep), laporan harian, dan closing kasir per shift.

---

## 📐 Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + React Router v6 |
| Backend | Node.js + Express.js |
| Database | MySQL 5.7+ / MariaDB 10.3+ |
| Auth | JWT (JSON Web Token, expire 12h) |
| HTTP Client | Axios (dengan interceptor token otomatis) |
| Icons | Lucide React |
| Notifikasi | React Hot Toast |
| Tanggal | date-fns |

**Target deployment:**
- Backend → Shared Hosting via cPanel Node.js Selector, atau Railway/Render
- Frontend → Vercel (static build `dist/`) atau subdomain shared hosting

---

## 🗂️ Struktur Direktori

```
apotek-moro-mari/
├── backend/
│   ├── index.js                    # Entry point server Express
│   ├── .env.example                # Template konfigurasi environment
│   ├── config/
│   │   ├── database.js             # MySQL connection pool (promise-based)
│   │   └── schema.sql              # DDL lengkap + seed data awal
│   ├── middleware/
│   │   └── auth.js                 # JWT verify middleware + role guard
│   └── routes/
│       ├── auth.js                 # POST /login, POST /change-password
│       ├── barang.js               # CRUD obat, harga otomatis, stock opname
│       ├── pembelian.js            # Pembelian, supplier, histori, retur
│       └── penjualan.js            # Kasir, laporan, closing, kas apotek
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Router utama + ProtectedRoute
        ├── context/
        │   └── AuthContext.jsx     # Global auth state, login/logout action
        ├── utils/
        │   └── api.js              # Axios instance + semua fungsi API call
        ├── hooks/
        │   └── useAuth.js          # Hook untuk konsumsi AuthContext
        ├── components/
        │   ├── Layout.jsx          # Sidebar + header wrapper + <Outlet>
        │   ├── Sidebar.jsx         # Navigasi sidebar dengan active state
        │   ├── ProtectedRoute.jsx  # Guard route berdasar login + role
        │   └── ui/
        │       ├── Button.jsx
        │       ├── Modal.jsx
        │       ├── Table.jsx
        │       ├── Badge.jsx       # Badge warna grup obat
        │       ├── Input.jsx
        │       └── Select.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx       # Summary + peringatan stok kritis
            ├── stock/
            │   ├── DaftarBarang.jsx
            │   ├── SettingHarga.jsx
            │   └── StockOpname.jsx
            ├── pembelian/
            │   ├── DaftarSupplier.jsx
            │   ├── InputPembelian.jsx
            │   ├── HistoriPembelian.jsx
            │   └── ReturPembelian.jsx
            ├── penjualan/
            │   ├── KasirHV.jsx
            │   ├── KasirResep.jsx
            │   ├── LaporanPenjualan.jsx
            │   └── ClosingKasir.jsx
            └── laporan/
                └── KasApotek.jsx
```

---

## 🗄️ Database Schema

### Tabel & Fungsi

| Tabel | Fungsi |
|---|---|
| `users` | Akun login dengan role RBAC |
| `barang` | Master data obat/produk apotek |
| `kelas_terapi` | Kategori terapi obat |
| `supplier` | Data PBF / distributor |
| `pelanggan` | Data member / pasien |
| `pembelian` | Header faktur pembelian dari PBF |
| `pembelian_detail` | Item per baris faktur pembelian |
| `retur_pembelian` | Header retur barang ke PBF |
| `retur_pembelian_detail` | Item retur |
| `penjualan` | Header transaksi kasir (HV/Resep) |
| `penjualan_detail` | Item per transaksi penjualan |
| `stock_opname` | Rekam fisik vs sistem per periode |
| `kas_apotek` | Jurnal kas harian (debit/kredit) |
| `closing_kasir` | Rekap pendapatan per shift |

### Relasi Utama

```
supplier ──< pembelian ──< pembelian_detail >── barang
supplier ──< retur_pembelian ──< retur_pembelian_detail >── barang
pelanggan ──< penjualan ──< penjualan_detail >── barang
users ──< penjualan
users ──< pembelian
barang ──< stock_opname
```

### Enum & Nilai Khusus

```sql
users.role         → 'apoteker' | 'apoteker_pendamping' | 'admin' | 'asisten_apoteker'

barang.grup        → 'hijau'  -- obat bebas, bebas terbatas
                   → 'merah'  -- obat keras, narkotika, psikotropika
                   → 'biru'   -- barang konsinyasi

penjualan.tipe     → 'hv' | 'resep'
penjualan.shift    → 'pagi' | 'siang'
penjualan.status   → 'draft' | 'confirmed' | 'void'

kas_apotek.jenis   → 'debit' | 'kredit'
```

---

## 💰 Logika Harga Otomatis

Dihitung di backend setiap kali barang dibuat/diupdate:

```
harga_beli   → HNA (Harga Netto Apotek, sebelum PPN)
    × 1.10
harga_jual   → HNA + PPN 10%
    × 1.10
harga_hv     → harga_jual + margin 10% (untuk penjualan bebas/HV)
    × 1.08
harga_resep  → harga_hv + margin 8% (untuk penjualan dengan resep dokter)
```

Frontend menampilkan preview kalkulasi secara **real-time** saat input `harga_beli` di form barang.

---

## 🔐 Role-Based Access Control

| Role | Stok | Pembelian | Kasir | Laporan | Master Data |
|---|---|---|---|---|---|
| `apoteker` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `apoteker_pendamping` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ |
| `admin` | 👁 View | ✅ Full | ✅ Full | ✅ Full | ❌ |
| `asisten_apoteker` | 👁 View | ❌ | ✅ Kasir saja | 👁 View | ❌ |

Guard diimplementasi di:
- Backend: middleware `roleMiddleware(...roles)` pada route tertentu
- Frontend: komponen `ProtectedRoute` + hide/disable tombol berdasarkan `user.role`

---

## 🔢 Format Nomor Nota

```
Kasir       : A{DDMMYY}{3-digit-seq}    contoh: A140420065
Resep (via modal) menggunakan nota yang sama (tipe tetap 'hv')
Retur PBF   : RT{YYYYMMDD}{3-digit-seq} contoh: RT202004140001
```

Nomor nota di-generate otomatis oleh backend. Urutan (seq) dihitung dari jumlah transaksi di tanggal dan tipe yang sama + 1.

---

## 🔌 API Endpoints

Semua endpoint (kecuali `/api/auth/login` dan `/api/health`) memerlukan header:
```
Authorization: Bearer <jwt_token>
```

### Auth
```
POST   /api/auth/login
       Body: { username, password }
       Response: { token, user: { id, username, nama, role } }

POST   /api/auth/change-password    [auth]
       Body: { old_password, new_password }
```

### Barang / Stok
```
GET    /api/barang                  ?search=&grup=hijau|merah|biru&low_stock=true
GET    /api/barang/:id
POST   /api/barang
       Body: { kode, nama_barang, satuan, pabrik, grup, kelas_terapi_id,
               stock_minimum, harga_beli }
PUT    /api/barang/:id
       Body: (sama seperti POST, minus kode)
DELETE /api/barang/:id              → soft delete (is_active = 0)
POST   /api/barang/stock-opname/submit
       Body: { periode, tanggal, items: [{ barang_id, stock_sistem, stock_fisik, keterangan }] }
```

### Pembelian & Supplier
```
GET    /api/pembelian               ?from=YYYY-MM-DD&to=YYYY-MM-DD&supplier_id=
GET    /api/pembelian/:id           → include detail items
POST   /api/pembelian
       Body: { no_faktur, tanggal, supplier_id,
               items: [{ barang_id, jumlah, harga_hna, diskon_persen, diskon_nominal,
                         harga_netto, jumlah_harga }] }
GET    /api/pembelian/histori/barang/:barang_id  ?from=&to=
GET    /api/pembelian/supplier/list
POST   /api/pembelian/supplier/create
       Body: { kode, nama_pbf, alamat, kota, no_telp, jatuh_tempo }
PUT    /api/pembelian/supplier/:id
POST   /api/pembelian/retur/create
       Body: { no_retur, tanggal, supplier_id, keterangan,
               items: [{ barang_id, jumlah, harga_satuan, jumlah_harga }] }
GET    /api/pembelian/retur/list
```

### Penjualan / Kasir
```
GET    /api/penjualan               ?from=&to=&shift=pagi|siang&tipe=hv|resep
GET    /api/penjualan/:id           → include detail items
POST   /api/penjualan
       Body: { tanggal, shift, tipe, pelanggan_id (opsional),
               items: [{ barang_id, jumlah, harga_satuan, subtotal }],
               tunai, non_tunai }
       Response: { no_nota, id, kembalian }
POST   /api/penjualan/:id/void      → kembalikan stok
GET    /api/penjualan/laporan/per-barang  ?from=&to=&barang_id=&shift=
GET    /api/penjualan/closing/summary     ?from=&to=&shift=
GET    /api/penjualan/kas/list            ?from=&to=
POST   /api/penjualan/kas/create
       Body: { tanggal, keterangan, jenis, nominal, tanggal_transaksi }
```

### Umum
```
GET    /api/dashboard               → summary hari ini + stok kritis
GET    /api/kelas-terapi
GET    /api/pelanggan               ?search=
POST   /api/pelanggan               Body: { kode, nama, no_hp, alamat, tipe }
GET    /api/health
```

---

## 📦 Variabel Environment

### Backend `.env`
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=apotek_moro_mari
JWT_SECRET=ganti_dengan_string_acak_panjang
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Cara Menjalankan

```bash
# 1. Setup database
mysql -u root -p < backend/config/schema.sql

# 2. Backend
cd backend && cp .env.example .env
# edit .env
npm install && npm run dev

# 3. Frontend
cd frontend && cp .env.example .env
# edit .env → VITE_API_URL
npm install && npm run dev
```

---

## 🔑 Akun Default (Seed)

| Username | Password | Role |
|---|---|---|
| `admin` | `1234` | admin |
| `dyah` | `1234` | apoteker |

> ⚠️ Wajib ganti password setelah login pertama kali.

---

## 🚢 Deployment Guide

### Frontend → Vercel

1. Push repo ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set root directory: `frontend`
4. Set environment variable: `VITE_API_URL=https://your-backend-domain.com/api`
5. Deploy — Vercel otomatis build dengan `npm run build`

### Backend → cPanel Shared Hosting

1. Login cPanel → Setup Node.js App
2. Buat app baru:
   - Node.js version: 18+
   - Application root: `backend`
   - Application startup file: `index.js`
3. Upload folder `backend/` ke server via File Manager
4. Buat file `.env` di folder backend (isi sesuai `.env.example`)
5. Import `schema.sql` via phpMyAdmin
6. Klik "Run NPM Install" di panel Node.js App
7. Start/Restart app

### Backend → Railway / Render

1. Push repo ke GitHub
2. Connect repo di Railway/Render
3. Set root directory: `backend`
4. Set environment variables (DB_HOST, DB_USER, dll)
5. Start command: `npm start`
6. Deploy

### Backend → VPS

```bash
# Clone repo
git clone <repo-url> && cd kasir-react/backend

# Install
cp .env.example .env && nano .env
npm install

# Run with PM2
npm install -g pm2
pm2 start index.js --name apotek-backend
pm2 save && pm2 startup
```