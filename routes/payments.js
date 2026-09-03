const express = require('express');
const router = express.Router();
const db = require('../db/database');

function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin', 'receptionist'].includes(req.session.user.role)) {
    return res.redirect('/login');
  }
  next();
}

// ---- LIST PAYMENTS ----
router.get('/dashboard/admin/payments', requireAdmin, (req, res) => {
  db.all(`
    SELECT payments.*, users.name as student_name
    FROM payments
    JOIN students ON payments.student_id = students.id
    JOIN users ON students.user_id = users.id
    ORDER BY payments.paid_at DESC
  `, [], (err, payments) => {
    const total = (payments || []).reduce((sum, p) => sum + p.amount, 0);
    res.render('admin/payments', { payments: payments || [], total, user: req.session.user });
  });
});

// ---- NEW PAYMENT ----
router.get('/dashboard/admin/payments/new', requireAdmin, (req, res) => {
  db.all(`
    SELECT students.id, users.name FROM students
    JOIN users ON students.user_id = users.id
  `, [], (err, students) => {
    res.render('admin/new-payment', { students: students || [], error: null, user: req.session.user });
  });
});

router.post('/dashboard/admin/payments/new', requireAdmin, (req, res) => {
  const { student_id, amount, method, notes } = req.body;
  db.run(
    `INSERT INTO payments (student_id, amount, method, notes) VALUES (?, ?, ?, ?)`,
    [student_id, amount, method, notes],
    () => {
      res.redirect('/dashboard/admin/payments');
    }
  );
});

module.exports = router;