const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'driving-school-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Make logged-in user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
const publicRoutes = require('./routes/public');
app.use('/', publicRoutes);
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
const dashboardRoutes = require('./routes/dashboard');
app.use('/', dashboardRoutes);
const adminRoutes = require('./routes/admin');
app.use('/', adminRoutes);
const vehicleRoutes = require('./routes/vehicles');
app.use('/', vehicleRoutes);
const paymentRoutes = require('./routes/payments');
app.use('/', paymentRoutes);
const testRoutes = require('./routes/tests');
app.use('/', testRoutes);
app.listen(PORT, () => {
  console.log(`Driving school server running at http://localhost:${PORT}`);
});