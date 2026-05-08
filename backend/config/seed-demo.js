/**
 * Seed demo data lengkap untuk portfolio demo
 * Jalankan: node config/seed-demo.js
 * 
 * Ini akan menambahkan:
 * - Transaksi penjualan sample
 * - Pembelian sample
 * - Kas sample
 * - Pelanggan sample
 */
require('dotenv').config();
const db = require('./database');

async function seed() {
  console.log('Seeding demo data...');

  try {
    // Sample pelanggan
    const pelanggan = [
      ['P001', 'Budi Santoso', '081234567890', 'Jl. Merpati No. 5, Semarang', 'resep'],
      ['P002', 'Siti Aminah', '082345678901', 'Jl. Kenari No. 12, Semarang', 'resep'],
      ['P003', 'Ahmad Fauzi', '083456789012', 'Jl. Cendrawasih No. 8, Semarang', 'umum'],
      ['P004', 'Dewi Lestari', '084567890123', 'Jl. Rajawali No. 3, Semarang', 'resep'],
      ['P005', 'Hendra Wijaya', '085678901234', 'Jl. Elang No. 15, Semarang', 'umum'],
    ];

    for (const p of pelanggan) {
      try {
        await db.execute('INSERT INTO pelanggan (kode, nama, no_hp, alamat, tipe) VALUES (?, ?, ?, ?, ?)', p);
      } catch (_) {}
    }
    console.log('  Pelanggan: done');

    // Get barang IDs
    const [barangRows] = await db.execute('SELECT id, harga_hv, harga_resep FROM barang WHERE is_active = 1 LIMIT 20');
    if (barangRows.length === 0) {
      console.log('  No barang found. Run seed-barang.js first.');
      process.exit(1);
    }

    // Sample penjualan (last 7 days)
    const shifts = ['pagi', 'siang'];
    const tipes = ['hv', 'resep'];
    let penjualanCount = 0;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const tanggal = date.toISOString().split('T')[0];

      // 3-8 transactions per day
      const txCount = 3 + Math.floor(Math.random() * 6);

      for (let t = 0; t < txCount; t++) {
        const shift = shifts[Math.floor(Math.random() * shifts.length)];
        const tipe = tipes[Math.floor(Math.random() * tipes.length)];
        const prefix = tipe === 'resep' ? 'R' : 'A';
        const dateStr = tanggal.slice(8, 10) + tanggal.slice(5, 7) + tanggal.slice(2, 4);
        const seq = String(t + 1).padStart(3, '0');
        const noNota = `${prefix}${dateStr}${seq}`;

        // 1-4 items per transaction
        const itemCount = 1 + Math.floor(Math.random() * 4);
        const selectedBarang = [];
        let total = 0;

        for (let i = 0; i < itemCount; i++) {
          const b = barangRows[Math.floor(Math.random() * barangRows.length)];
          if (selectedBarang.find(x => x.id === b.id)) continue;
          const jumlah = 1 + Math.floor(Math.random() * 3);
          const harga = tipe === 'resep' ? parseFloat(b.harga_resep) : parseFloat(b.harga_hv);
          const subtotal = jumlah * harga;
          total += subtotal;
          selectedBarang.push({ id: b.id, jumlah, harga, subtotal });
        }

        if (selectedBarang.length === 0) continue;

        const tunai = total;
        const pelangganId = tipe === 'resep' ? Math.floor(Math.random() * 4) + 1 : null;

        try {
          const [result] = await db.execute(
            `INSERT INTO penjualan (no_nota, tanggal, shift, tipe, pelanggan_id, total, tunai, non_tunai, kembalian, status, user_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'confirmed', 2, ?)`,
            [noNota, tanggal, shift, tipe, pelangganId, total, tunai, `${tanggal} ${8 + Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`]
          );

          for (const item of selectedBarang) {
            await db.execute(
              'INSERT INTO penjualan_detail (penjualan_id, barang_id, jumlah, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)',
              [result.insertId, item.id, item.jumlah, item.harga, item.subtotal]
            );
          }
          penjualanCount++;
        } catch (_) {}
      }
    }
    console.log(`  Penjualan: ${penjualanCount} transaksi`);

    // Sample kas entries
    const kasEntries = [
      ['Penjualan tunai pagi', 'debit', 250000],
      ['Beli ATK', 'kredit', 35000],
      ['Penjualan tunai siang', 'debit', 180000],
      ['Bayar listrik', 'kredit', 150000],
      ['Penjualan tunai pagi', 'debit', 320000],
      ['Beli galon air', 'kredit', 20000],
      ['Penjualan tunai siang', 'debit', 275000],
    ];

    for (let i = 0; i < kasEntries.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const tanggal = date.toISOString().split('T')[0];
      const [ket, jenis, nominal] = kasEntries[i];
      try {
        await db.execute(
          'INSERT INTO kas_apotek (tanggal, keterangan, jenis, nominal, tanggal_transaksi, user_id) VALUES (?, ?, ?, ?, ?, 2)',
          [tanggal, ket, jenis, nominal, tanggal]
        );
      } catch (_) {}
    }
    console.log('  Kas: done');

    // Sample audit log
    const auditEntries = [
      [2, 'dyah', 'login', 'auth', 'Login berhasil sebagai apoteker'],
      [1, 'admin', 'login', 'auth', 'Login berhasil sebagai admin'],
      [2, 'dyah', 'create', 'penjualan', 'Penjualan A080526001 tipe hv, total 5246'],
      [2, 'dyah', 'create', 'pembelian', 'Pembelian FK-2026-001 dari supplier ID 1'],
      [1, 'admin', 'update', 'barang', 'Update barang ID 5: Metformin 500mg'],
    ];

    for (const entry of auditEntries) {
      try {
        await db.execute(
          'INSERT INTO audit_log (user_id, username, action, module, detail) VALUES (?, ?, ?, ?, ?)',
          entry
        );
      } catch (_) {}
    }
    console.log('  Audit log: done');

    console.log('\nDemo data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
