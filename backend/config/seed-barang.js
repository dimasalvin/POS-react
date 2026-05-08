/**
 * Seed data barang realistis untuk Apotek Moro Mari
 * Jalankan: node config/seed-barang.js
 */
require('dotenv').config();
const db = require('./database');

const PPN_RATE = 0.10;
const MARGIN_HV = 0.10;
const MARGIN_RESEP = 0.08;

function calc(hargaBeli) {
  const jual = Math.round(hargaBeli * (1 + PPN_RATE));
  const hv = Math.round(jual * (1 + MARGIN_HV));
  const resep = Math.round(hv * (1 + MARGIN_RESEP));
  return [jual, hv, resep];
}

const barangData = [
  // ANALGESIK & ANTIPIRETIK (kelas_terapi_id: 1)
  ['OB006', 'Ibuprofen 400mg', 'Tablet', 'Kimia Farma', 'hijau', 1, 200, 30, 650],
  ['OB007', 'Mefenamic Acid 500mg', 'Kaplet', 'Sanbe Farma', 'hijau', 1, 300, 40, 450],
  ['OB008', 'Antalgin 500mg', 'Tablet', 'Kimia Farma', 'hijau', 1, 400, 50, 300],
  ['OB009', 'Asam Asetilsalisilat 100mg', 'Tablet', 'Bayer', 'hijau', 1, 250, 30, 800],
  ['OB010', 'Tramadol 50mg', 'Kapsul', 'Dexa Medica', 'merah', 1, 100, 20, 2500],
  ['OB011', 'Ketorolac 10mg', 'Tablet', 'Novell Pharma', 'merah', 1, 80, 15, 3500],

  // ANTIBIOTIK (kelas_terapi_id: 2)
  ['OB012', 'Ciprofloxacin 500mg', 'Tablet', 'Hexpharm Jaya', 'merah', 2, 150, 25, 1800],
  ['OB013', 'Azithromycin 500mg', 'Kaplet', 'Dexa Medica', 'merah', 2, 100, 20, 5500],
  ['OB014', 'Cefadroxil 500mg', 'Kapsul', 'Sanbe Farma', 'merah', 2, 120, 20, 2200],
  ['OB015', 'Doxycycline 100mg', 'Kapsul', 'Kimia Farma', 'merah', 2, 200, 30, 900],
  ['OB016', 'Metronidazole 500mg', 'Tablet', 'Indofarma', 'merah', 2, 250, 30, 700],
  ['OB017', 'Eritromisin 500mg', 'Kaplet', 'Sanbe Farma', 'merah', 2, 100, 20, 1500],
  ['OB018', 'Levofloxacin 500mg', 'Tablet', 'Dexa Medica', 'merah', 2, 80, 15, 6000],
  ['OB019', 'Clindamycin 300mg', 'Kapsul', 'Hexpharm Jaya', 'merah', 2, 90, 15, 3200],

  // ANTIDIABETES (kelas_terapi_id: 3)
  ['OB020', 'Glimepiride 2mg', 'Tablet', 'Dexa Medica', 'merah', 3, 200, 30, 1200],
  ['OB021', 'Glibenclamide 5mg', 'Tablet', 'Indofarma', 'merah', 3, 300, 40, 400],
  ['OB022', 'Acarbose 50mg', 'Tablet', 'Bayer', 'merah', 3, 100, 20, 3500],
  ['OB023', 'Pioglitazone 15mg', 'Tablet', 'Dexa Medica', 'merah', 3, 80, 15, 4500],

  // ANTIHIPERTENSI (kelas_terapi_id: 4)
  ['OB024', 'Amlodipine 5mg', 'Tablet', 'Dexa Medica', 'merah', 4, 300, 40, 500],
  ['OB025', 'Amlodipine 10mg', 'Tablet', 'Dexa Medica', 'merah', 4, 200, 30, 700],
  ['OB026', 'Captopril 25mg', 'Tablet', 'Indofarma', 'merah', 4, 400, 50, 350],
  ['OB027', 'Candesartan 8mg', 'Tablet', 'Dexa Medica', 'merah', 4, 150, 25, 3800],
  ['OB028', 'Valsartan 80mg', 'Tablet', 'Novartis', 'merah', 4, 120, 20, 4200],
  ['OB029', 'Bisoprolol 5mg', 'Tablet', 'Merck', 'merah', 4, 180, 25, 2800],
  ['OB030', 'Lisinopril 10mg', 'Tablet', 'Hexpharm Jaya', 'merah', 4, 200, 30, 1500],
  ['OB031', 'Nifedipine 10mg', 'Tablet', 'Bayer', 'merah', 4, 150, 20, 900],

  // ANTIHISTAMIN (kelas_terapi_id: 5)
  ['OB032', 'Loratadine 10mg', 'Tablet', 'Dexa Medica', 'hijau', 5, 250, 30, 600],
  ['OB033', 'Chlorpheniramine 4mg', 'Tablet', 'Kimia Farma', 'hijau', 5, 500, 50, 200],
  ['OB034', 'Desloratadine 5mg', 'Tablet', 'Merck', 'hijau', 5, 100, 20, 2500],

  // ANTIJAMUR (kelas_terapi_id: 6)
  ['OB035', 'Ketoconazole 200mg', 'Tablet', 'Hexpharm Jaya', 'merah', 6, 100, 15, 2000],
  ['OB036', 'Fluconazole 150mg', 'Kapsul', 'Dexa Medica', 'merah', 6, 60, 10, 8000],
  ['OB037', 'Griseofulvin 500mg', 'Tablet', 'Indofarma', 'merah', 6, 80, 15, 1800],

  // ANTIINFLAMASI (kelas_terapi_id: 7)
  ['OB038', 'Dexamethasone 0.5mg', 'Tablet', 'Kimia Farma', 'merah', 7, 400, 50, 250],
  ['OB039', 'Methylprednisolone 4mg', 'Tablet', 'Dexa Medica', 'merah', 7, 200, 30, 1800],
  ['OB040', 'Prednisone 5mg', 'Tablet', 'Indofarma', 'merah', 7, 300, 40, 350],
  ['OB041', 'Piroxicam 20mg', 'Kapsul', 'Hexpharm Jaya', 'hijau', 7, 200, 30, 500],
  ['OB042', 'Meloxicam 15mg', 'Tablet', 'Boehringer', 'merah', 7, 150, 20, 2200],
  ['OB043', 'Diclofenac Sodium 50mg', 'Tablet', 'Novartis', 'hijau', 7, 300, 40, 600],

  // GASTROINTESTINAL (kelas_terapi_id: 8)
  ['OB044', 'Ranitidine 150mg', 'Tablet', 'Hexpharm Jaya', 'hijau', 8, 300, 40, 500],
  ['OB045', 'Lansoprazole 30mg', 'Kapsul', 'Dexa Medica', 'merah', 8, 150, 25, 3000],
  ['OB046', 'Sucralfate Syrup 500mg/5ml', 'Botol', 'Sanbe Farma', 'hijau', 8, 50, 10, 25000],
  ['OB047', 'Domperidone 10mg', 'Tablet', 'Dexa Medica', 'hijau', 8, 300, 40, 600],
  ['OB048', 'Loperamide 2mg', 'Tablet', 'Janssen', 'hijau', 8, 200, 30, 800],
  ['OB049', 'Antasida DOEN', 'Tablet', 'Indofarma', 'hijau', 8, 500, 50, 200],
  ['OB050', 'Ondansetron 4mg', 'Tablet', 'Dexa Medica', 'merah', 8, 100, 15, 3500],

  // KARDIOVASKULAR (kelas_terapi_id: 9)
  ['OB051', 'Simvastatin 20mg', 'Tablet', 'Merck', 'merah', 9, 200, 30, 1500],
  ['OB052', 'Atorvastatin 20mg', 'Tablet', 'Pfizer', 'merah', 9, 150, 25, 4500],
  ['OB053', 'Clopidogrel 75mg', 'Tablet', 'Dexa Medica', 'merah', 9, 100, 20, 5000],
  ['OB054', 'Isosorbide Dinitrate 5mg', 'Tablet', 'Kimia Farma', 'merah', 9, 200, 30, 800],
  ['OB055', 'Digoxin 0.25mg', 'Tablet', 'Novartis', 'merah', 9, 80, 15, 2000],

  // VITAMIN & SUPLEMEN (kelas_terapi_id: 10)
  ['OB056', 'Vitamin C 500mg', 'Tablet', 'Kimia Farma', 'hijau', 10, 500, 50, 300],
  ['OB057', 'Vitamin B Complex', 'Tablet', 'Kimia Farma', 'hijau', 10, 400, 50, 250],
  ['OB058', 'Vitamin B12 50mcg', 'Tablet', 'Indofarma', 'hijau', 10, 300, 40, 350],
  ['OB059', 'Kalsium Laktat 500mg', 'Tablet', 'Kimia Farma', 'hijau', 10, 300, 40, 400],
  ['OB060', 'Asam Folat 1mg', 'Tablet', 'Indofarma', 'hijau', 10, 400, 50, 200],
  ['OB061', 'Zinc 20mg', 'Tablet', 'Indofarma', 'hijau', 10, 300, 40, 500],
  ['OB062', 'Multivitamin Dewasa', 'Kaplet', 'Sanbe Farma', 'hijau', 10, 200, 30, 1200],
  ['OB063', 'Neurobion Forte', 'Tablet', 'Merck', 'hijau', 10, 150, 25, 2500],

  // OBAT BATUK & FLU
  ['OB064', 'Ambroxol 30mg', 'Tablet', 'Dexa Medica', 'hijau', null, 300, 40, 400],
  ['OB065', 'Guaifenesin 100mg', 'Tablet', 'Kimia Farma', 'hijau', null, 400, 50, 300],
  ['OB066', 'Dextromethorphan 15mg', 'Tablet', 'Kimia Farma', 'hijau', null, 300, 40, 350],
  ['OB067', 'Pseudoephedrine 60mg', 'Tablet', 'Dexa Medica', 'hijau', null, 200, 30, 500],
  ['OB068', 'OBH Combi Batuk Berdahak', 'Botol', 'Combiphar', 'hijau', null, 80, 15, 15000],
  ['OB069', 'Vicks Formula 44', 'Botol', 'P&G', 'hijau', null, 60, 10, 22000],

  // OBAT MATA & TELINGA
  ['OB070', 'Chloramphenicol Tetes Mata', 'Botol', 'Cendo', 'merah', null, 50, 10, 8000],
  ['OB071', 'Gentamicin Tetes Mata', 'Botol', 'Cendo', 'merah', null, 40, 10, 12000],
  ['OB072', 'Insto Regular', 'Botol', 'Combiphar', 'hijau', null, 80, 15, 10000],

  // OBAT KULIT
  ['OB073', 'Hydrocortisone Cream 2.5%', 'Tube', 'Kimia Farma', 'hijau', null, 60, 10, 8000],
  ['OB074', 'Miconazole Cream 2%', 'Tube', 'Surya Dermato', 'hijau', null, 80, 15, 6000],
  ['OB075', 'Betamethasone Cream', 'Tube', 'Surya Dermato', 'merah', null, 50, 10, 9000],
  ['OB076', 'Acyclovir Cream 5%', 'Tube', 'Dexa Medica', 'merah', null, 40, 10, 15000],

  // KONSINYASI (grup biru)
  ['KS001', 'Madu TJ Murni 250ml', 'Botol', 'Tresno Joyo', 'biru', 10, 30, 5, 35000],
  ['KS002', 'Minyak Kayu Putih 60ml', 'Botol', 'Cap Lang', 'biru', null, 50, 10, 18000],
  ['KS003', 'Tolak Angin Cair', 'Sachet', 'Sido Muncul', 'biru', null, 100, 20, 3500],
  ['KS004', 'Antangin JRG', 'Sachet', 'Deltomed', 'biru', null, 100, 20, 3000],
  ['KS005', 'Promag Tablet', 'Strip', 'Kalbe Farma', 'biru', 8, 80, 15, 5000],
  ['KS006', 'Bodrex Tablet', 'Strip', 'Tempo Scan', 'biru', 1, 100, 20, 4000],
  ['KS007', 'Komix Herbal', 'Sachet', 'Bintang Toedjoe', 'biru', null, 80, 15, 2500],
  ['KS008', 'Betadine Solution 30ml', 'Botol', 'Mundipharma', 'biru', null, 40, 10, 18000],
];

async function seed() {
  console.log('Seeding barang data...');
  let inserted = 0;
  let skipped = 0;

  for (const item of barangData) {
    const [kode, nama, satuan, pabrik, grup, kelasId, stok, stokMin, hargaBeli] = item;
    const [jual, hv, resep] = calc(hargaBeli);

    try {
      await db.execute(
        `INSERT INTO barang (kode, nama_barang, satuan, pabrik, grup, kelas_terapi_id, stock_saat_ini, stock_minimum, harga_beli, harga_jual, harga_hv, harga_resep)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [kode, nama, satuan, pabrik, grup, kelasId, stok, stokMin, hargaBeli, jual, hv, resep]
      );
      inserted++;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        skipped++;
      } else {
        console.error(`Error inserting ${kode}:`, err.message);
      }
    }
  }

  console.log(`Done! Inserted: ${inserted}, Skipped (duplicate): ${skipped}`);
  process.exit(0);
}

seed();
