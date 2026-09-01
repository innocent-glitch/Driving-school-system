const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

// Show login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    // Save user info in session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Redirect based on role
    if (user.role === 'admin' || user.role === 'receptionist') {
      res.redirect('/dashboard/admin');
    } else if (user.role === 'instructor') {
      res.redirect('/dashboard/instructor');
    } else if (user.role === 'student') {
      res.redirect('/dashboard/student');
    } else {
      res.redirect('/');
    }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;