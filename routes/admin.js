const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin', 'receptionist'].includes(req.session.user.role)) {
    return res.redirect('/login');
  }
  next();
}

// ---- NEW STUDENT ----
router.get('/dashboard/admin/students/new', requireAdmin, (req, res) => {
  res.render('admin/new-student', { error: null });
});

router.post('/dashboard/admin/students/new', requireAdmin, (req, res) => {
  const { name, email, phone, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'student', ?)`,
    [name, email, hashed, phone],
    function (err) {
      if (err) return res.render('admin/new-student', { error: 'Email already exists.' });

      const userId = this.lastID;
      db.run(`INSERT INTO students (user_id) VALUES (?)`, [userId], () => {
        res.redirect('/dashboard/admin');
      });
    }
  );
});

// ---- NEW INSTRUCTOR ----
router.get('/dashboard/admin/instructors/new', requireAdmin, (req, res) => {
  res.render('admin/new-instructor', { error: null });
});

router.post('/dashboard/admin/instructors/new', requireAdmin, (req, res) => {
  const { name, email, phone, password, specialty } = req.body;
  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'instructor', ?)`,
    [name, email, hashed, phone],
    function (err) {
      if (err) return res.render('admin/new-instructor', { error: 'Email already exists.' });

      const userId = this.lastID;
      db.run(`INSERT INTO instructors (user_id, specialty) VALUES (?, ?)`, [userId, specialty], () => {
        res.redirect('/dashboard/admin');
      });
    }
  );
});

// ---- NEW LESSON ----
router.get('/dashboard/admin/lessons/new', requireAdmin, (req, res) => {
  db.all(`
    SELECT students.id, users.name FROM students
    JOIN users ON students.user_id = users.id
  `, [], (err, students) => {
    db.all(`
      SELECT instructors.id, users.name FROM instructors
      JOIN users ON instructors.user_id = users.id
    `, [], (err2, instructors) => {
      res.render('admin/new-lesson', { students, instructors, error: null });
    });
  });
});

router.post('/dashboard/admin/lessons/new', requireAdmin, (req, res) => {
  const { student_id, instructor_id, date, time } = req.body;

  db.run(
    `INSERT INTO lessons (student_id, instructor_id, date, time) VALUES (?, ?, ?, ?)`,
    [student_id, instructor_id, date, time],
    () => {
      res.redirect('/dashboard/admin');
    }
  );
});

module.exports = router;