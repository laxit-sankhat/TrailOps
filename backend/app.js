import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import organizationRoutes from './routes/organizationRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'TrailOps backend is running' });
});

app.use('/api/organizations', organizationRoutes);
app.use('/api/auth', authRoutes);

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