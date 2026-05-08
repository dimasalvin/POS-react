require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
    if (!origin || allowed.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for demo
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const barangRoutes = require('./routes/barang');
const pembelianRoutes = require('./routes/pembelian');
const penjualanRoutes = require('./routes/penjualan');

app.use('/api/auth', authRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/pembelian', pembelianRoutes);
app.use('/api/penjualan', penjualanRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Dashboard
app.get('/api/dashboard', require('./middleware/auth').authMiddleware, async (req, res) => {
  const db = require('./config/database');
  try {
    const today = new Date().toISOString().split('T')[0];

    const [salesToday] = await db.execute(
      `SELECT COUNT(*) as total_transaksi, COALESCE(SUM(total), 0) as total_penjualan 
       FROM penjualan WHERE DATE(tanggal) = ? AND status = 'confirmed'`, [today]
    );

    const [lowStock] = await db.execute(
      `SELECT id, kode, nama_barang, stock_saat_ini, stock_minimum 
       FROM barang WHERE stock_saat_ini <= stock_minimum AND is_active = 1 
       ORDER BY stock_saat_ini ASC LIMIT 10`
    );

    const [topProducts] = await db.execute(
      `SELECT b.nama_barang, SUM(pd.jumlah) as total_terjual
       FROM penjualan_detail pd
       JOIN barang b ON b.id = pd.barang_id
       JOIN penjualan p ON p.id = pd.penjualan_id
       WHERE DATE(p.tanggal) = ? AND p.status = 'confirmed'
       GROUP BY pd.barang_id
       ORDER BY total_terjual DESC LIMIT 5`, [today]
    );

    const [kasToday] = await db.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN jenis = 'debit' THEN nominal ELSE 0 END), 0) as total_debit,
         COALESCE(SUM(CASE WHEN jenis = 'kredit' THEN nominal ELSE 0 END), 0) as total_kredit
       FROM kas_apotek WHERE DATE(tanggal_transaksi) = ?`, [today]
    );

    res.json({
      success: true,
      data: {
        penjualan_hari_ini: salesToday[0],
        stok_kritis: lowStock,
        produk_terlaris: topProducts,
        kas: kasToday[0]
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Audit Log
app.get('/api/audit-log', require('./middleware/auth').authMiddleware, async (req, res) => {
  const db = require('./config/database');
  try {
    const { from, to, user_id, module: mod, limit = 100 } = req.query;
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    let params = [];
    if (from) { query += ' AND created_at >= ?'; params.push(from + ' 00:00:00'); }
    if (to) { query += ' AND created_at <= ?'; params.push(to + ' 23:59:59'); }
    if (user_id) { query += ' AND user_id = ?'; params.push(parseInt(user_id)); }
    if (mod) { query += ' AND module = ?'; params.push(mod); }
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Kelas Terapi
app.get('/api/kelas-terapi', require('./middleware/auth').authMiddleware, async (req, res) => {
  const db = require('./config/database');
  try {
    const [rows] = await db.execute('SELECT * FROM kelas_terapi ORDER BY nama ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Pelanggan
app.get('/api/pelanggan', require('./middleware/auth').authMiddleware, async (req, res) => {
  const db = require('./config/database');
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM pelanggan';
    let params = [];
    if (search) {
      query += ' WHERE nama LIKE ? OR kode LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    query += ' ORDER BY nama ASC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/pelanggan', require('./middleware/auth').authMiddleware, async (req, res) => {
  const db = require('./config/database');
  try {
    const { kode, nama, no_hp, alamat, tipe } = req.body;
    if (!kode || !nama) {
      return res.status(400).json({ success: false, message: 'Kode dan nama wajib diisi' });
    }
    const [result] = await db.execute(
      'INSERT INTO pelanggan (kode, nama, no_hp, alamat, tipe) VALUES (?, ?, ?, ?, ?)',
      [kode, nama, no_hp || null, alamat || null, tipe || 'umum']
    );
    res.status(201).json({ success: true, message: 'Pelanggan berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Kode pelanggan sudah ada' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
