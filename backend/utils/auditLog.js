const db = require('../config/database');

/**
 * Log an activity to audit_log table
 * @param {object} params
 * @param {number} params.userId
 * @param {string} params.username
 * @param {string} params.action - 'login', 'create', 'update', 'delete', 'void', 'stock_opname', etc.
 * @param {string} params.module - 'auth', 'barang', 'pembelian', 'penjualan', 'supplier', 'kas', etc.
 * @param {string} params.detail - Human-readable description
 * @param {string} params.ip - IP address
 */
async function logActivity({ userId, username, action, module, detail, ip }) {
  try {
    await db.execute(
      'INSERT INTO audit_log (user_id, username, action, module, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, username || null, action, module, detail || null, ip || null]
    );
  } catch (err) {
    // Don't let audit log failure break the app
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logActivity };
