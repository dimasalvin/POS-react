const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLog');

router.use(authMiddleware);

// Helper: generate no_nota
async function generateNoNota(tipe, tanggal) {
  const prefix = tipe === 'resep' ? 'R' : 'A';
  const dateStr = tanggal.replace(/-/g, '').slice(2); // YYMMDD from YYYY-MM-DD → take chars 2-7
  const formattedDate = dateStr.slice(4, 6) + dateStr.slice(2, 4) + dateStr.slice(0, 2); // DDMMYY

  const [rows] = await db.execute(
    `SELECT COUNT(*) as count FROM penjualan WHERE tipe = ? AND DATE(tanggal) = ?`,
    [tipe, tanggal]
  );

  const seq = String(rows[0].count + 1).padStart(3, '0');
  return `${prefix}${formattedDate}${seq}`;
}

// GET /api/penjualan
router.get('/', async (req, res) => {
  try {
    const { from, to, shift, tipe } = req.query;
    let query = `SELECT p.*, u.nama as kasir_nama, pel.nama as pelanggan_nama
                 FROM penjualan p
                 LEFT JOIN users u ON p.user_id = u.id
                 LEFT JOIN pelanggan pel ON p.pelanggan_id = pel.id
                 WHERE 1=1`;
    let params = [];

    if (from) { query += ' AND p.tanggal >= ?'; params.push(from); }
    if (to) { query += ' AND p.tanggal <= ?'; params.push(to); }
    if (shift) { query += ' AND p.shift = ?'; params.push(shift); }
    if (tipe) { query += ' AND p.tipe = ?'; params.push(tipe); }

    query += ' ORDER BY p.tanggal DESC, p.id DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/penjualan/:id
router.get('/:id', async (req, res) => {
  try {
    const [header] = await db.execute(
      `SELECT p.*, u.nama as kasir_nama, pel.nama as pelanggan_nama
       FROM penjualan p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN pelanggan pel ON p.pelanggan_id = pel.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (header.length === 0) {
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan' });
    }

    const [items] = await db.execute(
      `SELECT pd.*, b.nama_barang, b.satuan FROM penjualan_detail pd
       LEFT JOIN barang b ON pd.barang_id = b.id WHERE pd.penjualan_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...header[0], items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/penjualan
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { tanggal, shift, tipe, pelanggan_id, items, tunai, non_tunai } = req.body;

    if (!tanggal || !shift || !tipe || !items || items.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Tanggal, shift, tipe, dan items wajib diisi' });
    }

    if (!['pagi', 'siang'].includes(shift)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Shift harus pagi atau siang' });
    }

    const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const bayarTunai = parseFloat(tunai) || 0;
    const bayarNonTunai = parseFloat(non_tunai) || 0;
    const totalBayar = bayarTunai + bayarNonTunai;

    if (totalBayar < total) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Pembayaran kurang dari total' });
    }

    await conn.beginTransaction();

    // Check stock — allow negative but flag it
    let hasStockMinus = false;
    for (const item of items) {
      const [stockCheck] = await conn.execute('SELECT stock_saat_ini, nama_barang FROM barang WHERE id = ?', [item.barang_id]);
      if (stockCheck.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: `Barang ID ${item.barang_id} tidak ditemukan` });
      }
      if (stockCheck[0].stock_saat_ini < parseInt(item.jumlah)) {
        hasStockMinus = true;
      }
    }

    const noNota = await generateNoNota(tipe, tanggal);
    const kembalian = totalBayar - total;

    const [result] = await conn.execute(
      `INSERT INTO penjualan (no_nota, tanggal, shift, tipe, pelanggan_id, total, tunai, non_tunai, kembalian, status, stock_minus, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [noNota, tanggal, shift, tipe, pelanggan_id || null, total, bayarTunai, bayarNonTunai, kembalian, hasStockMinus ? 1 : 0, req.user.id]
    );

    const penjualanId = result.insertId;

    for (const item of items) {
      await conn.execute(
        'INSERT INTO penjualan_detail (penjualan_id, barang_id, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)',
        [penjualanId, item.barang_id, parseInt(item.jumlah), parseFloat(item.harga_satuan), parseFloat(item.subtotal)]
      );

      await conn.execute(
        'UPDATE barang SET stock_saat_ini = stock_saat_ini - ? WHERE id = ?',
        [parseInt(item.jumlah), item.barang_id]
      );
    }

    await conn.commit();
    conn.release();
    await logActivity({ userId: req.user.id, username: req.user.username, action: 'create', module: 'penjualan', detail: `Penjualan ${noNota} tipe ${tipe}, total ${total}${hasStockMinus ? ' [STOK MINUS]' : ''}`, ip: req.ip });
    res.status(201).json({ success: true, message: 'Penjualan berhasil', no_nota: noNota, id: penjualanId, kembalian });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/penjualan/:id/void
router.post('/:id/void', roleMiddleware('apoteker', 'apoteker_pendamping'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [penjualan] = await conn.execute('SELECT * FROM penjualan WHERE id = ? AND status = ?', [req.params.id, 'confirmed']);

    if (penjualan.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Penjualan tidak ditemukan atau sudah di-void' });
    }

    await conn.beginTransaction();

    // Return stock
    const [items] = await conn.execute('SELECT * FROM penjualan_detail WHERE penjualan_id = ?', [req.params.id]);
    for (const item of items) {
      await conn.execute(
        'UPDATE barang SET stock_saat_ini = stock_saat_ini + ? WHERE id = ?',
        [item.jumlah, item.barang_id]
      );
    }

    await conn.execute('UPDATE penjualan SET status = ? WHERE id = ?', ['void', req.params.id]);

    await conn.commit();
    conn.release();
    await logActivity({ userId: req.user.id, username: req.user.username, action: 'void', module: 'penjualan', detail: `Void penjualan ${penjualan[0].no_nota}`, ip: req.ip });
    res.json({ success: true, message: 'Penjualan berhasil di-void, stok dikembalikan' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/penjualan/laporan/per-barang
router.get('/laporan/per-barang', async (req, res) => {
  try {
    const { from, to, barang_id, shift } = req.query;
    let query = `SELECT b.kode, b.nama_barang, b.satuan, SUM(pd.jumlah) as total_qty,
                 SUM(pd.subtotal) as total_nominal
                 FROM penjualan_detail pd
                 JOIN penjualan p ON pd.penjualan_id = p.id
                 JOIN barang b ON pd.barang_id = b.id
                 WHERE p.status = 'confirmed'`;
    let params = [];

    if (from) { query += ' AND p.tanggal >= ?'; params.push(from); }
    if (to) { query += ' AND p.tanggal <= ?'; params.push(to); }
    if (barang_id) { query += ' AND pd.barang_id = ?'; params.push(parseInt(barang_id)); }
    if (shift) { query += ' AND p.shift = ?'; params.push(shift); }

    query += ' GROUP BY pd.barang_id ORDER BY total_qty DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/penjualan/closing/summary
router.get('/closing/summary', async (req, res) => {
  try {
    const { from, to, shift } = req.query;
    let query = `SELECT p.shift, p.tipe,
                 COUNT(*) as jumlah_transaksi,
                 SUM(p.total) as total_penjualan,
                 SUM(p.tunai) as total_tunai,
                 SUM(p.non_tunai) as total_non_tunai
                 FROM penjualan p WHERE p.status = 'confirmed'`;
    let params = [];

    if (from) { query += ' AND p.tanggal >= ?'; params.push(from); }
    if (to) { query += ' AND p.tanggal <= ?'; params.push(to); }
    if (shift) { query += ' AND p.shift = ?'; params.push(shift); }

    query += ' GROUP BY p.shift, p.tipe ORDER BY FIELD(p.shift, "pagi", "siang"), p.tipe';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== KAS APOTEK ====================

// GET /api/penjualan/kas/list
router.get('/kas/list', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = 'SELECT k.*, u.nama as user_nama FROM kas_apotek k LEFT JOIN users u ON k.user_id = u.id WHERE 1=1';
    let params = [];

    if (from) { query += ' AND k.tanggal_transaksi >= ?'; params.push(from); }
    if (to) { query += ' AND k.tanggal_transaksi <= ?'; params.push(to); }

    query += ' ORDER BY k.tanggal_transaksi DESC, k.id DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/penjualan/kas/create
router.post('/kas/create', async (req, res) => {
  try {
    const { tanggal, keterangan, jenis, nominal, tanggal_transaksi } = req.body;

    if (!keterangan || !jenis || !nominal || !tanggal_transaksi) {
      return res.status(400).json({ success: false, message: 'Keterangan, jenis, nominal, dan tanggal transaksi wajib diisi' });
    }

    if (!['debit', 'kredit'].includes(jenis)) {
      return res.status(400).json({ success: false, message: 'Jenis harus debit atau kredit' });
    }

    const [result] = await db.execute(
      'INSERT INTO kas_apotek (tanggal, keterangan, jenis, nominal, tanggal_transaksi, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [tanggal || tanggal_transaksi, keterangan, jenis, parseFloat(nominal), tanggal_transaksi, req.user.id]
    );

    await logActivity({ userId: req.user.id, username: req.user.username, action: 'create', module: 'kas', detail: `Kas ${jenis}: ${keterangan} (Rp ${nominal})`, ip: req.ip });
    res.status(201).json({ success: true, message: 'Kas berhasil dicatat', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
