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

router.get('/dashboard/admin/students/new', requireAdmin, (req, res) => {
  res.render('admin/new-student', { error: null, user: req.session.user });
});

router.post('/dashboard/admin/students/new', requireAdmin, (req, res) => {
  const { name, email, phone, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'student', ?)`,
    [name, email, hashed, phone],
    function (err) {
      if (err) return res.render('admin/new-student', { error: 'Email already exists.', user: req.session.user });
      const userId = this.lastID;
      db.run(`INSERT INTO students (user_id) VALUES (?)`, [userId], () => {
        res.redirect('/dashboard/admin');
      });
    }
  );
});

router.get('/dashboard/admin/instructors/new', requireAdmin, (req, res) => {
  res.render('admin/new-instructor', { error: null, user: req.session.user });
});

router.post('/dashboard/admin/instructors/new', requireAdmin, (req, res) => {
  const { name, email, phone, password, specialty } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'instructor', ?)`,
    [name, email, hashed, phone],
    function (err) {
      if (err) return res.render('admin/new-instructor', { error: 'Email already exists.', user: req.session.user });
      const userId = this.lastID;
      db.run(`INSERT INTO instructors (user_id, specialty) VALUES (?, ?)`, [userId, specialty], () => {
        res.redirect('/dashboard/admin');
      });
    }
  );
});

router.get('/dashboard/admin/lessons/new', requireAdmin, (req, res) => {
  db.all(`
    SELECT students.id, users.name FROM students
    JOIN users ON students.user_id = users.id
  `, [], (err, students) => {
    db.all(`
      SELECT instructors.id, users.name FROM instructors
      JOIN users ON instructors.user_id = users.id
    `, [], (err2, instructors) => {
      res.render('admin/new-lesson', { students, instructors, error: null, user: req.session.user });
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

router.post('/dashboard/admin/lessons/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.run(`UPDATE lessons SET status = ? WHERE id = ?`, [status, req.params.id], () => {
    res.redirect('/dashboard/admin');
  });
});

router.get('/dashboard/admin/inquiries/:id/convert', requireAdmin, (req, res) => {
  db.get(`SELECT * FROM inquiries WHERE id = ?`, [req.params.id], (err, inquiry) => {
    if (!inquiry) return res.redirect('/dashboard/admin');
    res.render('admin/convert-inquiry', { inquiry, error: null, user: req.session.user });
  });
});

router.post('/dashboard/admin/inquiries/:id/convert', requireAdmin, (req, res) => {
  const { name, email, phone, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const inquiryId = req.params.id;
  db.run(
    `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'student', ?)`,
    [name, email, hashed, phone],
    function (err) {
      if (err) {
        return db.get(`SELECT * FROM inquiries WHERE id = ?`, [inquiryId], (err2, inquiry) => {
          res.render('admin/convert-inquiry', { inquiry, error: 'Email already exists.', user: req.session.user });
        });
      }
      const userId = this.lastID;
      db.run(`INSERT INTO students (user_id) VALUES (?)`, [userId], () => {
        db.run(`UPDATE inquiries SET status = 'converted' WHERE id = ?`, [inquiryId], () => {
          res.redirect('/dashboard/admin');
        });
      });
    }
  );
});

router.get('/dashboard/admin/students/:id', requireAdmin, (req, res) => {
  db.get(`
    SELECT students.*, users.name, users.email, users.phone
    FROM students JOIN users ON students.user_id = users.id
    WHERE students.id = ?
  `, [req.params.id], (err, student) => {
    if (!student) return res.redirect('/dashboard/admin/students');
    db.all(`
      SELECT lessons.*, i_user.name as instructor_name
      FROM lessons
      JOIN instructors ON lessons.instructor_id = instructors.id
      JOIN users i_user ON instructors.user_id = i_user.id
      WHERE lessons.student_id = ?
      ORDER BY lessons.date DESC
    `, [student.id], (err2, lessons) => {
      db.all(`
        SELECT * FROM payments WHERE student_id = ? ORDER BY paid_at DESC
      `, [student.id], (err3, payments) => {
        db.all(`
          SELECT * FROM tests WHERE student_id = ? ORDER BY test_date DESC
        `, [student.id], (err4, tests) => {
          res.render('admin/student-profile', {
            student,
            lessons: lessons || [],
            payments: payments || [],
            tests: tests || [],
            user: req.session.user
          });
        });
      });
    });
  });
});

router.post('/dashboard/admin/students/:id/license', requireAdmin, (req, res) => {
  const { license_stage, permit_number, license_number } = req.body;
  db.run(
    `UPDATE students SET license_stage = ?, permit_number = ?, license_number = ? WHERE id = ?`,
    [license_stage, permit_number, license_number, req.params.id],
    () => {
      res.redirect('/dashboard/admin/students/' + req.params.id);
    }
  );
});

router.get('/dashboard/admin/students', requireAdmin, (req, res) => {
  db.all(`
    SELECT students.id, students.license_stage, users.name, users.email, users.phone
    FROM students JOIN users ON students.user_id = users.id
    ORDER BY users.name
  `, [], (err, students) => {
    res.render('admin/students', { students: students || [], user: req.session.user });
  });
});

router.get('/dashboard/admin/instructors', requireAdmin, (req, res) => {
  db.all(`
    SELECT instructors.id, instructors.specialty, users.name, users.email, users.phone
    FROM instructors JOIN users ON instructors.user_id = users.id
    ORDER BY users.name
  `, [], (err, instructors) => {
    res.render('admin/instructors', { instructors: instructors || [], user: req.session.user });
  });
});

router.get('/dashboard/admin/lessons', requireAdmin, (req, res) => {
  db.all(`
    SELECT lessons.*, s_user.name as student_name, i_user.name as instructor_name
    FROM lessons
    JOIN students ON lessons.student_id = students.id
    JOIN users s_user ON students.user_id = s_user.id
    JOIN instructors ON lessons.instructor_id = instructors.id
    JOIN users i_user ON instructors.user_id = i_user.id
    ORDER BY lessons.date DESC
  `, [], (err, lessons) => {
    res.render('admin/lessons', { lessons: lessons || [], user: req.session.user });
  });
});

router.get('/dashboard/admin/inquiries', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM inquiries ORDER BY created_at DESC`, [], (err, inquiries) => {
    res.render('admin/inquiries', { inquiries: inquiries || [], user: req.session.user });
  });
});

router.post('/dashboard/admin/students/:id/delete', requireAdmin, (req, res) => {
  const studentId = req.params.id;
  db.get(`SELECT user_id FROM students WHERE id = ?`, [studentId], (err, student) => {
    if (!student) return res.redirect('/dashboard/admin/students');
    db.run(`DELETE FROM lessons WHERE student_id = ?`, [studentId], () => {
      db.run(`DELETE FROM payments WHERE student_id = ?`, [studentId], () => {
        db.run(`DELETE FROM tests WHERE student_id = ?`, [studentId], () => {
          db.run(`DELETE FROM students WHERE id = ?`, [studentId], () => {
            db.run(`DELETE FROM users WHERE id = ?`, [student.user_id], () => {
              res.redirect('/dashboard/admin/students');
            });
          });
        });
      });
    });
  });
});

router.post('/dashboard/admin/instructors/:id/delete', requireAdmin, (req, res) => {
  const instructorId = req.params.id;
  db.get(`SELECT user_id FROM instructors WHERE id = ?`, [instructorId], (err, instructor) => {
    if (!instructor) return res.redirect('/dashboard/admin/instructors');
    db.run(`DELETE FROM instructors WHERE id = ?`, [instructorId], () => {
      db.run(`DELETE FROM users WHERE id = ?`, [instructor.user_id], () => {
        res.redirect('/dashboard/admin/instructors');
      });
    });
  });
});

router.post('/dashboard/admin/vehicles/:id/delete', requireAdmin, (req, res) => {
  db.run(`DELETE FROM vehicles WHERE id = ?`, [req.params.id], () => {
    res.redirect('/dashboard/admin/vehicles');
  });
});

router.post('/dashboard/admin/inquiries/:id/delete', requireAdmin, (req, res) => {
  db.run(`DELETE FROM inquiries WHERE id = ?`, [req.params.id], () => {
    res.redirect('/dashboard/admin/inquiries');
  });
});

module.exports = router;

