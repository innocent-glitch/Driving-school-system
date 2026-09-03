const express = require('express');
const router = express.Router();
const db = require('../db/database');

function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin', 'receptionist'].includes(req.session.user.role)) {
    return res.redirect('/login');
  }
  next();
}

router.get('/dashboard/admin/vehicles', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM vehicles ORDER BY make`, [], (err, vehicles) => {
    res.render('admin/vehicles', { vehicles: vehicles || [], user: req.session.user });
  });
});

router.get('/dashboard/admin/vehicles/new', requireAdmin, (req, res) => {
  res.render('admin/new-vehicle', { error: null, user: req.session.user });
});

router.post('/dashboard/admin/vehicles/new', requireAdmin, (req, res) => {
  const { make, model, plate_number, transmission } = req.body;
  db.run(
    `INSERT INTO vehicles (make, model, plate_number, transmission) VALUES (?, ?, ?, ?)`,
    [make, model, plate_number, transmission],
    (err) => {
      if (err) return res.render('admin/new-vehicle', { error: 'Plate number already exists.', user: req.session.user });
      res.redirect('/dashboard/admin/vehicles');
    }
  );
});

router.post('/dashboard/admin/vehicles/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.run(`UPDATE vehicles SET status = ? WHERE id = ?`, [status, req.params.id], () => {
    res.redirect('/dashboard/admin/vehicles');
  });
});

module.exports = router;