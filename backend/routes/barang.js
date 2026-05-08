const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLog');

router.use(authMiddleware);

const PPN_RATE = 0.10;
const MARGIN_HV = 0.10;
const MARGIN_RESEP = 0.08;

function calculatePrices(hargaBeli) {
  const hargaJual = hargaBeli * (1 + PPN_RATE);
  const hargaHv = hargaJual * (1 + MARGIN_HV);
  const hargaResep = hargaHv * (1 + MARGIN_RESEP);
  return {
    harga_jual: Math.round(hargaJual),
    harga_hv: Math.round(hargaHv),
    harga_resep: Math.round(hargaResep)
  };
}

// GET /api/barang
router.get('/', async (req, res) => {
  try {
    const { search, grup, low_stock, page = 1, limit = 25 } = req.query;
    let query = 'SELECT b.*, kt.nama as kelas_terapi_nama FROM barang b LEFT JOIN kelas_terapi kt ON b.kelas_terapi_id = kt.id WHERE b.is_active = 1';
    let countQuery = 'SELECT COUNT(*) as total FROM barang b WHERE b.is_active = 1';
    let params = [];
    let countParams = [];

    if (search) {
      query += ' AND (b.nama_barang LIKE ? OR b.kode LIKE ?)';
      countQuery += ' AND (b.nama_barang LIKE ? OR b.kode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (grup) {
      query += ' AND b.grup = ?';
      countQuery += ' AND b.grup = ?';
      params.push(grup);
      countParams.push(grup);
    }

    if (low_stock === 'true') {
      query += ' AND b.stock_saat_ini <= b.stock_minimum';
      countQuery += ' AND b.stock_saat_ini <= b.stock_minimum';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY b.nama_barang ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);

    res.json({
      success: true,
      data: rows,
      meta: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/barang/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT b.*, kt.nama as kelas_terapi_nama FROM barang b LEFT JOIN kelas_terapi kt ON b.kelas_terapi_id = kt.id WHERE b.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/barang
router.post('/', roleMiddleware('apoteker', 'apoteker_pendamping'), async (req, res) => {
  try {
    const { kode, nama_barang, satuan, pabrik, grup, kelas_terapi_id, stock_minimum, harga_beli } = req.body;

    if (!kode || !nama_barang || !satuan || !grup || !harga_beli) {
      return res.status(400).json({ success: false, message: 'Kode, nama, satuan, grup, dan harga beli wajib diisi' });
    }

    const prices = calculatePrices(parseFloat(harga_beli));

    const [result] = await db.execute(
      `INSERT INTO barang (kode, nama_barang, satuan, pabrik, grup, kelas_terapi_id, stock_minimum, harga_beli, harga_jual, harga_hv, harga_resep)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode, nama_barang, satuan, pabrik || null, grup, kelas_terapi_id || null,
       parseInt(stock_minimum) || 0, parseFloat(harga_beli), prices.harga_jual, prices.harga_hv, prices.harga_resep]
    );

    await logActivity({ userId: req.user.id, username: req.user.username, action: 'create', module: 'barang', detail: `Tambah barang: ${kode} - ${nama_barang}`, ip: req.ip });
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Kode barang sudah ada' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/barang/:id
router.put('/:id', roleMiddleware('apoteker', 'apoteker_pendamping'), async (req, res) => {
  try {
    const { nama_barang, satuan, pabrik, grup, kelas_terapi_id, stock_minimum, harga_beli } = req.body;

    if (!nama_barang || !satuan || !grup || !harga_beli) {
      return res.status(400).json({ success: false, message: 'Nama, satuan, grup, dan harga beli wajib diisi' });
    }

    const prices = calculatePrices(parseFloat(harga_beli));

    await db.execute(
      `UPDATE barang SET nama_barang = ?, satuan = ?, pabrik = ?, grup = ?, kelas_terapi_id = ?,
       stock_minimum = ?, harga_beli = ?, harga_jual = ?, harga_hv = ?, harga_resep = ?
       WHERE id = ? AND is_active = 1`,
      [nama_barang, satuan, pabrik || null, grup, kelas_terapi_id || null,
       parseInt(stock_minimum) || 0, parseFloat(harga_beli), prices.harga_jual, prices.harga_hv, prices.harga_resep,
       req.params.id]
    );

    await logActivity({ userId: req.user.id, username: req.user.username, action: 'update', module: 'barang', detail: `Update barang ID ${req.params.id}: ${nama_barang}`, ip: req.ip });
    res.json({ success: true, message: 'Barang berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/barang/:id (soft delete)
router.delete('/:id', roleMiddleware('apoteker'), async (req, res) => {
  try {
    await db.execute('UPDATE barang SET is_active = 0 WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, username: req.user.username, action: 'delete', module: 'barang', detail: `Hapus barang ID ${req.params.id}`, ip: req.ip });
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/barang/stock-opname/submit
router.post('/stock-opname/submit', roleMiddleware('apoteker', 'apoteker_pendamping'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { periode, tanggal, items } = req.body;

    if (!periode || !tanggal || !items || items.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Periode, tanggal, dan items wajib diisi' });
    }

    await conn.beginTransaction();

    for (const item of items) {
      await conn.execute(
        `INSERT INTO stock_opname (barang_id, periode, tanggal, stock_sistem, stock_fisik, selisih, keterangan, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.barang_id, periode, tanggal, item.stock_sistem, item.stock_fisik,
         item.stock_fisik - item.stock_sistem, item.keterangan || null, req.user.id]
      );

      await conn.execute(
        'UPDATE barang SET stock_saat_ini = ? WHERE id = ?',
        [item.stock_fisik, item.barang_id]
      );
    }

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Stock opname berhasil disimpan' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
