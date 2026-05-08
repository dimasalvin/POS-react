# 🚀 Deployment Guide — Apotek Moro Mari

## Demo: Vercel (Frontend) + Railway (Backend + MySQL)

---

## Step 1: Push ke GitHub

```bash
# Di root project
git init
git add .
git commit -m "Initial commit: Apotek Moro Mari POS System"
git remote add origin https://github.com/USERNAME/apotek-moro-mari.git
git push -u origin main
```

---

## Step 2: Deploy Backend + MySQL di Railway

### 2.1 Buat Project di Railway
1. Buka [railway.app](https://railway.app) → Login dengan GitHub
2. Klik **"New Project"** → **"Deploy from GitHub Repo"**
3. Pilih repo `apotek-moro-mari`
4. Set **Root Directory**: `backend`

### 2.2 Tambah MySQL Service
1. Di project Railway, klik **"+ New"** → **"Database"** → **"MySQL"**
2. Railway otomatis buat MySQL instance

### 2.3 Set Environment Variables
Di service backend, buka tab **Variables** dan tambahkan:

```
PORT=5000
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
JWT_SECRET=apotek_moro_mari_secret_key_production_2024
FRONTEND_URL=https://apotek-moro-mari.vercel.app
```

### 2.4 Import Schema + Seed Data
1. Di Railway MySQL service, klik **"Connect"** → copy connection string
2. Gunakan MySQL client (DBeaver, TablePlus, atau CLI):

```bash
# Connect ke Railway MySQL
mysql -h <host> -P <port> -u <user> -p<password> <database> < backend/config/schema.sql

# Atau via Railway CLI
railway run node config/seed-barang.js
railway run node config/seed-demo.js
```

### 2.5 Verify
- Backend URL akan muncul di Railway dashboard (contoh: `https://apotek-backend-production.up.railway.app`)
- Test: `https://YOUR-URL/api/health`

---

## Step 3: Deploy Frontend di Vercel

### 3.1 Import Project
1. Buka [vercel.com](https://vercel.com) → Login dengan GitHub
2. Klik **"Add New"** → **"Project"**
3. Import repo `apotek-moro-mari`
4. Set **Root Directory**: `frontend`
5. Framework Preset: **Vite**

### 3.2 Set Environment Variable
```
VITE_API_URL=https://YOUR-RAILWAY-BACKEND-URL/api
```

### 3.3 Deploy
- Klik **Deploy** — Vercel otomatis build dan deploy
- URL: `https://apotek-moro-mari.vercel.app` (atau custom domain)

---

## Step 4: Verify Demo

1. Buka frontend URL
2. Login: `admin` / `1234` atau `dyah` / `1234`
3. Test semua fitur: Dashboard, Kasir, Laporan, dll

---

## 🔑 Akun Demo

| Username | Password | Role |
|----------|----------|------|
| `admin` | `1234` | Admin |
| `dyah` | `1234` | Apoteker |

---

## 📋 Checklist Sebelum Share Portfolio

- [ ] Backend running di Railway (test `/api/health`)
- [ ] Frontend running di Vercel
- [ ] Login berhasil
- [ ] Dashboard menampilkan data
- [ ] Kasir bisa transaksi
- [ ] Laporan menampilkan data
- [ ] Custom domain (opsional): `apotek.yourdomain.com`

---

## 💡 Tips

- **Railway free tier**: 500 jam/bulan, cukup untuk demo
- **Vercel free tier**: unlimited untuk project personal
- **Custom domain**: bisa di-set di Vercel settings
- **Reset demo data**: jalankan ulang `seed-demo.js` via Railway CLI
- **Monitoring**: Railway punya built-in logs

---

## 🔄 Update Deployment

```bash
# Push perubahan ke GitHub
git add . && git commit -m "update" && git push

# Railway & Vercel auto-deploy dari main branch
```

---

## Alternative: Deploy ke cPanel

Lihat bagian deployment di `README.md` untuk panduan deploy ke shared hosting cPanel.
