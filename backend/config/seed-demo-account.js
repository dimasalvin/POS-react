/**
 * Seed akun demo + data transaksi realistis untuk portfolio demo
 * Jalankan: cd backend && node config/seed-demo-account.js
 * 
 * Pastikan .env sudah diset dengan DB credentials:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apotek_moromari'
  });

  console.log('Connected to MySQL');

  // 1. Create demo user
  const hash = await bcrypt.hash('demo', 10);
  try {
    await c.execute(
      "INSERT INTO users (username, password, nama, role) VALUES ('demo', ?, 'Demo User', 'apoteker')",
      [hash]
    );
    console.log('Demo user created: demo / demo (role: apoteker)');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      await c.execute("UPDATE users SET password = ? WHERE username = 'demo'", [hash]);
      console.log('Demo user updated: demo / demo');
    } else {
      throw e;
    }
  }

  // Get demo user id
  const [[demoUser]] = await c.execute("SELECT id FROM users WHERE username = 'demo'");
  const userId = demoUser.id;

  // Get some barang for transactions
  const [barangList] = await c.execute('SELECT id, nama_barang, harga_hv, harga_resep, stock_saat_ini FROM barang WHERE is_active = 1 LIMIT 30');
  if (barangList.length === 0) {
    console.log('No barang found. Run seed-barang.js first.');
    await c.end();
    return;
  }

  // Get or create pelanggan
  let pelangganId = null;
  try {
    await c.execute("INSERT INTO pelanggan (nama, alamat, no_hp) VALUES ('Budi Santoso', 'Jl. Pandanaran 45 Semarang', '081234567890')");
    const [[p]] = await c.execute("SELECT id FROM pelanggan WHERE nama = 'Budi Santoso'");
    pelangganId = p.id;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      const [[p]] = await c.execute("SELECT id FROM pelanggan WHERE nama = 'Budi Santoso'");
      pelangganId = p.id;
    }
  }

  // 2. Create 14 days of penjualan
  console.log('Creating demo transactions...');
  let txCount = 0;
  const now = new Date();

  for (let day = 13; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    // 5-10 transactions per day
    const txPerDay = 5 + Math.floor(Math.random() * 6);

    for (let t = 0; t < txPerDay; t++) {
      const shift = t < Math.ceil(txPerDay / 2) ? 'pagi' : 'siang';
      const tipe = Math.random() > 0.7 ? 'resep' : 'hv';
      const noNota = `${dateStr.replace(/-/g, '')}${String(t + 1).padStart(4, '0')}`;

      // 1-4 items per transaction
      const itemCount = 1 + Math.floor(Math.random() * 4);
      let total = 0;
      const items = [];

      for (let i = 0; i < itemCount; i++) {
        const barang = barangList[Math.floor(Math.random() * barangList.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        const harga = tipe === 'resep' ? parseFloat(barang.harga_resep) : parseFloat(barang.harga_hv);
        const subtotal = harga * qty;
        total += subtotal;
        items.push({ barang_id: barang.id, qty, harga, subtotal });
      }

      // Round total
      total = Math.round(total);
      const tunai = Math.ceil(total / 1000) * 1000;
      const kembalian = tunai - total;
      const usePelanggan = tipe === 'resep' ? pelangganId : null;

      await c.execute(
        `INSERT INTO penjualan (no_nota, tanggal, shift, tipe, pelanggan_id, total, tunai, non_tunai, kembalian, status, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'selesai', ?, ?)`,
        [noNota, dateStr, shift, tipe, usePelanggan, total, tunai, kembalian, userId, `${dateStr} ${8 + t}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`]
      );

      const [[lastInsert]] = await c.execute('SELECT LAST_INSERT_ID() as id');
      const penjualanId = lastInsert.id;

      for (const item of items) {
        await c.execute(
          'INSERT INTO penjualan_detail (penjualan_id, barang_id, qty, harga, subtotal) VALUES (?, ?, ?, ?, ?)',
          [penjualanId, item.barang_id, item.qty, item.harga, item.subtotal]
        );
      }

      txCount++;
    }
  }
  console.log(`Penjualan: ${txCount} transaksi (14 hari)`);

  // 3. Create kas entries
  for (let day = 13; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    await c.execute(
      `INSERT INTO kas_apotek (tanggal, shift, tipe, keterangan, jumlah, user_id) VALUES (?, 'pagi', 'modal', 'Modal awal pagi', 500000, ?)`,
      [dateStr, userId]
    );
  }
  console.log('Kas: 14 entries');

  // 4. Create pembelian
  const [suppliers] = await c.execute('SELECT id FROM supplier LIMIT 3');
  for (let i = 0; i < Math.min(3, suppliers.length); i++) {
    const fakturDate = new Date(now);
    fakturDate.setDate(fakturDate.getDate() - (i * 5 + 2));
    const dateStr = fakturDate.toISOString().split('T')[0];
    const noFaktur = `FAK-${dateStr.replace(/-/g, '')}-${i + 1}`;

    let totalFaktur = 0;
    const pembeliItems = [];
    const itemCount = 3 + Math.floor(Math.random() * 3);

    for (let j = 0; j < itemCount; j++) {
      const barang = barangList[Math.floor(Math.random() * barangList.length)];
      const qty = 10 + Math.floor(Math.random() * 50);
      const harga = parseFloat(barang.harga_hv) * 0.7; // HNA ~70% of HV
      const subtotal = Math.round(harga * qty);
      totalFaktur += subtotal;
      pembeliItems.push({ barang_id: barang.id, qty, harga: Math.round(harga), subtotal });
    }

    await c.execute(
      `INSERT INTO pembelian (no_faktur, supplier_id, tanggal, jatuh_tempo, total, status, user_id) VALUES (?, ?, ?, DATE_ADD(?, INTERVAL 30 DAY), ?, 'lunas', ?)`,
      [noFaktur, suppliers[i].id, dateStr, dateStr, totalFaktur, userId]
    );

    const [[lastPembelian]] = await c.execute('SELECT LAST_INSERT_ID() as id');
    for (const item of pembeliItems) {
      await c.execute(
        'INSERT INTO pembelian_detail (pembelian_id, barang_id, qty, harga, subtotal) VALUES (?, ?, ?, ?, ?)',
        [lastPembelian.id, item.barang_id, item.qty, item.harga, item.subtotal]
      );
    }
  }
  console.log(`Pembelian: ${Math.min(3, suppliers.length)} faktur`);

  // 5. Audit log entries
  const actions = [
    { action: 'login', module: 'auth', detail: 'Login berhasil' },
    { action: 'create', module: 'penjualan', detail: 'Transaksi HV baru' },
    { action: 'create', module: 'penjualan', detail: 'Transaksi Resep baru' },
    { action: 'create', module: 'pembelian', detail: 'Input pembelian baru' },
    { action: 'update', module: 'barang', detail: 'Update harga obat' },
    { action: 'create', module: 'kas', detail: 'Input modal kasir' },
    { action: 'login', module: 'auth', detail: 'Login berhasil' },
    { action: 'closing', module: 'penjualan', detail: 'Closing kasir shift pagi' },
  ];

  for (const a of actions) {
    await c.execute(
      'INSERT INTO audit_log (user_id, username, action, module, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'demo', a.action, a.module, a.detail, '103.28.xx.xx']
    );
  }
  console.log('Audit log: 8 entries');

  console.log('\nDone! Demo account ready:');
  console.log('  Username: demo');
  console.log('  Password: demo');
  console.log('  Role: apoteker (full access)');

  await c.end();
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
