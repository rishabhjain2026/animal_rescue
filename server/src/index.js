const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const rescuerRoutes = require('./routes/rescuerRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/rescuers', rescuerRoutes);
app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => {
  res.send('Animal Rescue API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


