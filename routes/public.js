const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Home page
router.get('/', (req, res) => {
  res.render('home');
});

// Contact / booking inquiry form
router.get('/contact', (req, res) => {
  res.render('contact', { success: false });
});

router.post('/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  db.run(
    `INSERT INTO inquiries (name, email, phone, message) VALUES (?, ?, ?, ?)`,
    [name, email, phone, message],
    (err) => {
      if (err) {
        console.error(err);
        return res.render('contact', { success: false });
      }
      res.render('contact', { success: true });
    }
  );
});

module.exports = router;