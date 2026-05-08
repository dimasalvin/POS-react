const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLog');

router.use(authMiddleware);

// ==================== SUPPLIER ====================

// GET /api/pembelian/supplier/list
router.get('/supplier/list', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM supplier ORDER BY nama_pbf ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pembelian/supplier/create
router.post('/supplier/create', roleMiddleware('apoteker', 'apoteker_pendamping', 'admin'), async (req, res) => {
  try {
    const { kode, nama_pbf, alamat, kota, no_telp, jatuh_tempo } = req.body;

    if (!kode || !nama_pbf) {
      return res.status(400).json({ success: false, message: 'Kode dan nama PBF wajib diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO supplier (kode, nama_pbf, alamat, kota, no_telp, jatuh_tempo) VALUES (?, ?, ?, ?, ?, ?)',
      [kode, nama_pbf, alamat || null, kota || null, no_telp || null, parseInt(jatuh_tempo) || 30]
    );

    res.status(201).json({ success: true, message: 'Supplier berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Kode supplier sudah ada' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/pembelian/supplier/:id
router.put('/supplier/:id', roleMiddleware('apoteker', 'apoteker_pendamping', 'admin'), async (req, res) => {
  try {
    const { nama_pbf, alamat, kota, no_telp, jatuh_tempo } = req.body;

    if (!nama_pbf) {
      return res.status(400).json({ success: false, message: 'Nama PBF wajib diisi' });
    }

    await db.execute(
      'UPDATE supplier SET nama_pbf = ?, alamat = ?, kota = ?, no_telp = ?, jatuh_tempo = ? WHERE id = ?',
      [nama_pbf, alamat || null, kota || null, no_telp || null, parseInt(jatuh_tempo) || 30, req.params.id]
    );

    res.json({ success: true, message: 'Supplier berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== PEMBELIAN ====================

// GET /api/pembelian
router.get('/', async (req, res) => {
  try {
    const { from, to, supplier_id } = req.query;
    let query = `SELECT p.*, s.nama_pbf as supplier_nama, u.nama as user_nama
                 FROM pembelian p
                 LEFT JOIN supplier s ON p.supplier_id = s.id
                 LEFT JOIN users u ON p.user_id = u.id WHERE 1=1`;
    let params = [];

    if (from) { query += ' AND p.tanggal >= ?'; params.push(from); }
    if (to) { query += ' AND p.tanggal <= ?'; params.push(to); }
    if (supplier_id) { query += ' AND p.supplier_id = ?'; params.push(parseInt(supplier_id)); }

    query += ' ORDER BY p.tanggal DESC, p.id DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pembelian/:id
router.get('/:id', async (req, res) => {
  try {
    const [header] = await db.execute(
      `SELECT p.*, s.nama_pbf as supplier_nama FROM pembelian p
       LEFT JOIN supplier s ON p.supplier_id = s.id WHERE p.id = ?`,
      [req.params.id]
    );

    if (header.length === 0) {
      return res.status(404).json({ success: false, message: 'Pembelian tidak ditemukan' });
    }

    const [items] = await db.execute(
      `SELECT pd.*, b.nama_barang, b.satuan FROM pembelian_detail pd
       LEFT JOIN barang b ON pd.barang_id = b.id WHERE pd.pembelian_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...header[0], items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pembelian
router.post('/', roleMiddleware('apoteker', 'apoteker_pendamping', 'admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { no_faktur, tanggal, supplier_id, items } = req.body;

    if (!no_faktur || !tanggal || !supplier_id || !items || items.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No faktur, tanggal, supplier, dan items wajib diisi' });
    }

    const total = items.reduce((sum, item) => sum + parseFloat(item.jumlah_harga), 0);

    await conn.beginTransaction();

    const [result] = await conn.execute(
      'INSERT INTO pembelian (no_faktur, tanggal, supplier_id, total, user_id) VALUES (?, ?, ?, ?, ?)',
      [no_faktur, tanggal, parseInt(supplier_id), total, req.user.id]
    );

    const pembelianId = result.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pembelian_detail (pembelian_id, barang_id, jumlah, harga_hna, diskon_persen, diskon_nominal, harga_netto, jumlah_harga)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pembelianId, item.barang_id, parseInt(item.jumlah), parseFloat(item.harga_hna),
         parseFloat(item.diskon_persen) || 0, parseFloat(item.diskon_nominal) || 0,
         parseFloat(item.harga_netto), parseFloat(item.jumlah_harga)]
      );

      // Update stock
      await conn.execute(
        'UPDATE barang SET stock_saat_ini = stock_saat_ini + ? WHERE id = ?',
        [parseInt(item.jumlah), item.barang_id]
      );
    }

    await conn.commit();
    conn.release();
    await logActivity({ userId: req.user.id, username: req.user.username, action: 'create', module: 'pembelian', detail: `Pembelian ${no_faktur} dari supplier ID ${supplier_id}, total ${total}`, ip: req.ip });
    res.status(201).json({ success: true, message: 'Pembelian berhasil disimpan', id: pembelianId });
  } catch (err) {
    await conn.rollback();
    conn.release();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'No faktur sudah ada' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pembelian/histori/barang/:barang_id
router.get('/histori/barang/:barang_id', async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `SELECT pd.*, p.no_faktur, p.tanggal, s.nama_pbf
                 FROM pembelian_detail pd
                 JOIN pembelian p ON pd.pembelian_id = p.id
                 LEFT JOIN supplier s ON p.supplier_id = s.id
                 WHERE pd.barang_id = ?`;
    let params = [req.params.barang_id];

    if (from) { query += ' AND p.tanggal >= ?'; params.push(from); }
    if (to) { query += ' AND p.tanggal <= ?'; params.push(to); }

    query += ' ORDER BY p.tanggal DESC';
    const [rows] = await db.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== RETUR ====================

// GET /api/pembelian/retur/list
router.get('/retur/list', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.*, s.nama_pbf as supplier_nama FROM retur_pembelian r
       LEFT JOIN supplier s ON r.supplier_id = s.id ORDER BY r.tanggal DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/pembelian/retur/create
router.post('/retur/create', roleMiddleware('apoteker', 'apoteker_pendamping'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { no_retur, tanggal, supplier_id, keterangan, items } = req.body;

    if (!no_retur || !tanggal || !supplier_id || !items || items.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No retur, tanggal, supplier, dan items wajib diisi' });
    }

    const total = items.reduce((sum, item) => sum + parseFloat(item.jumlah_harga), 0);

    await conn.beginTransaction();

    const [result] = await conn.execute(
      'INSERT INTO retur_pembelian (no_retur, tanggal, supplier_id, total, keterangan, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [no_retur, tanggal, parseInt(supplier_id), total, keterangan || null, req.user.id]
    );

    const returId = result.insertId;

    for (const item of items) {
      // Check stock
      const [stockCheck] = await conn.execute('SELECT stock_saat_ini FROM barang WHERE id = ?', [item.barang_id]);
      if (stockCheck.length > 0 && stockCheck[0].stock_saat_ini < parseInt(item.jumlah)) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: `Stok tidak mencukupi untuk retur barang ID ${item.barang_id}` });
      }

      await conn.execute(
        'INSERT INTO retur_pembelian_detail (retur_pembelian_id, barang_id, jumlah, harga_satuan, jumlah_harga) VALUES (?, ?, ?, ?, ?)',
        [returId, item.barang_id, parseInt(item.jumlah), parseFloat(item.harga_satuan), parseFloat(item.jumlah_harga)]
      );

      await conn.execute(
        'UPDATE barang SET stock_saat_ini = stock_saat_ini - ? WHERE id = ?',
        [parseInt(item.jumlah), item.barang_id]
      );
    }

    await conn.commit();
    conn.release();
    await logActivity({ userId: req.user.id, username: req.user.username, action: 'create', module: 'retur', detail: `Retur ${no_retur} ke supplier ID ${supplier_id}`, ip: req.ip });
    res.status(201).json({ success: true, message: 'Retur berhasil disimpan', id: returId });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
