const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'school.db'));

db.serialize(() => {
  // Users table — handles login for admin, receptionist, instructor, student
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','receptionist','instructor','student')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Instructors — extra profile info linked to a user account
  db.run(`CREATE TABLE IF NOT EXISTS instructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    specialty TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Students — extra profile info linked to a user account
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    license_stage TEXT DEFAULT 'Not Started',
    notes TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Lessons — scheduled sessions between a student and instructor
  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    instructor_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
    notes TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(instructor_id) REFERENCES instructors(id)
  )`);

  // Public booking inquiries — from the public website contact/booking form
  db.run(`CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new','contacted','converted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create a default admin account if none exists yet
  db.get(`SELECT * FROM users WHERE role = 'admin' LIMIT 1`, (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Admin', 'admin@school.com', hashedPassword, 'admin'],
        () => console.log('Default admin created: admin@school.com / admin123')
      );
    }
  });
});

module.exports = db;