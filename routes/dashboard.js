const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Middleware: must be logged in
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Middleware: must be admin or receptionist
function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin', 'receptionist'].includes(req.session.user.role)) {
    return res.redirect('/login');
  }
  next();
}

// Admin / Receptionist dashboard
router.get('/dashboard/admin', requireAdmin, (req, res) => {
  db.all(`SELECT * FROM inquiries ORDER BY created_at DESC`, [], (err, inquiries) => {
    db.all(`
      SELECT lessons.*, s_user.name as student_name, i_user.name as instructor_name
      FROM lessons
      JOIN students ON lessons.student_id = students.id
      JOIN users s_user ON students.user_id = s_user.id
      JOIN instructors ON lessons.instructor_id = instructors.id
      JOIN users i_user ON instructors.user_id = i_user.id
      ORDER BY lessons.date DESC
    `, [], (err2, lessons) => {
      db.get(`SELECT COUNT(*) as count FROM students`, [], (err3, studentCount) => {
        db.get(`SELECT COUNT(*) as count FROM instructors`, [], (err4, instructorCount) => {
          db.get(`SELECT COUNT(*) as count FROM vehicles`, [], (err5, vehicleCount) => {
            db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM payments`, [], (err6, paymentTotal) => {
              const allLessons = lessons || [];
              const allInquiries = inquiries || [];
              const today = new Date().toISOString().split('T')[0];
              const todayLessons = allLessons.filter(l => l.date === today);
              res.render('dashboard/admin', {
                user: req.session.user,
                inquiries: allInquiries,
                lessons: allLessons,
                todayLessons: todayLessons,
                totalStudents: studentCount.count,
                totalInstructors: instructorCount.count,
                totalVehicles: vehicleCount.count,
                totalPayments: paymentTotal.total,
                scheduledCount: allLessons.filter(l => l.status === 'scheduled').length,
                newInquiriesCount: allInquiries.filter(i => i.status === 'new').length
              });
            });
          });
        });
      });
    });
  });
});

// Instructor dashboard
router.get('/dashboard/instructor', requireLogin, (req, res) => {
  if (req.session.user.role !== 'instructor') return res.redirect('/login');

  db.get(`SELECT * FROM instructors WHERE user_id = ?`, [req.session.user.id], (err, instructor) => {
    if (!instructor) return res.render('dashboard/instructor', { user: req.session.user, lessons: [] });

    db.all(`
      SELECT lessons.*, s_user.name as student_name
      FROM lessons
      JOIN students ON lessons.student_id = students.id
      JOIN users s_user ON students.user_id = s_user.id
      WHERE lessons.instructor_id = ?
      ORDER BY lessons.date ASC
    `, [instructor.id], (err2, lessons) => {
      res.render('dashboard/instructor', { user: req.session.user, lessons: lessons || [] });
    });
  });
});

// Student dashboard
router.get('/dashboard/student', requireLogin, (req, res) => {
  if (req.session.user.role !== 'student') return res.redirect('/login');

  db.get(`SELECT * FROM students WHERE user_id = ?`, [req.session.user.id], (err, student) => {
    if (!student) return res.render('dashboard/student', { user: req.session.user, lessons: [] });

    db.all(`
      SELECT lessons.*, i_user.name as instructor_name
      FROM lessons
      JOIN instructors ON lessons.instructor_id = instructors.id
      JOIN users i_user ON instructors.user_id = i_user.id
      WHERE lessons.student_id = ?
      ORDER BY lessons.date ASC
    `, [student.id], (err2, lessons) => {
      res.render('dashboard/student', { user: req.session.user, lessons: lessons || [] });
    });
  });
});
// Instructor: mark lesson complete
router.post('/dashboard/instructor/lessons/:id/complete', requireLogin, (req, res) => {
  if (req.session.user.role !== 'instructor') return res.redirect('/login');
  db.run(`UPDATE lessons SET status = 'completed' WHERE id = ?`, [req.params.id], () => {
    res.redirect('/dashboard/instructor');
  });
});
module.exports = router;