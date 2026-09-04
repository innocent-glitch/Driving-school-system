const express = require('express');
const router = express.Router();
const db = require('../db/database');

function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin', 'receptionist'].includes(req.session.user.role)) {
    return res.redirect('/login');
  }
  next();
}

// ---- BOOK A TEST (for a specific student) ----
router.get('/dashboard/admin/students/:id/tests/new', requireAdmin, (req, res) => {
  db.get(`
    SELECT students.*, users.name FROM students
    JOIN users ON students.user_id = users.id
    WHERE students.id = ?
  `, [req.params.id], (err, student) => {
    if (!student) return res.redirect('/dashboard/admin/students');
    res.render('admin/new-test', { student, error: null, user: req.session.user });
  });
});

router.post('/dashboard/admin/students/:id/tests/new', requireAdmin, (req, res) => {
  const { test_date, location, notes } = req.body;
  const studentId = req.params.id;

  db.run(
    `INSERT INTO tests (student_id, test_date, location, notes) VALUES (?, ?, ?, ?)`,
    [studentId, test_date, location, notes],
    () => {
      // Also update the student's license_stage to reflect a test is booked
      db.run(`UPDATE students SET license_stage = 'Test Scheduled' WHERE id = ?`, [studentId], () => {
        res.redirect('/dashboard/admin/students/' + studentId);
      });
    }
  );
});

// ---- UPDATE TEST RESULT ----
router.post('/dashboard/admin/tests/:id/result', requireAdmin, (req, res) => {
  const { result } = req.body;
  const testId = req.params.id;

  db.get(`SELECT * FROM tests WHERE id = ?`, [testId], (err, test) => {
    if (!test) return res.redirect('/dashboard/admin/students');

    db.run(`UPDATE tests SET result = ? WHERE id = ?`, [result, testId], () => {
      // If passed, automatically mark student as Licensed
      if (result === 'passed') {
        db.run(`UPDATE students SET license_stage = 'Licensed' WHERE id = ?`, [test.student_id], () => {
          res.redirect('/dashboard/admin/students/' + test.student_id);
        });
      } else {
        res.redirect('/dashboard/admin/students/' + test.student_id);
      }
    });
  });
});

module.exports = router;