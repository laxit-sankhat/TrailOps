import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import organizationRoutes from './routes/organizationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import medicalRoutes from './routes/medicalRoutes.js';

const app = express();

connectDB();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser());

app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'TrailOps backend is running' });
});

app.use('/api/organizations', organizationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/medical', medicalRoutes);

// Global error handler - always last
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));