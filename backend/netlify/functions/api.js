const serverless = require('serverless-http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('../../config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Allowed origins for CORS
const allowedOrigins = [
    'https://hackathon-final-ten.vercel.app',
    'https://hackathon-final-omv8m4mgj-r220369-designs-projects.vercel.app',
    'https://hackathon-final-git-main-r220369-designs-projects.vercel.app',
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
].filter(Boolean);

// Middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Allow all origins in production for now
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Route files
const authRoutes = require('../../routes/authRoutes');
const triageRoutes = require('../../routes/triageRoutes');
const familyRoutes = require('../../routes/familyRoutes');
const officerRoutes = require('../../routes/officerRoutes');
const reportRoutes = require('../../routes/reportRoutes');
const pregnancyRoutes = require('../../routes/pregnancyRoutes');
const alertRoutes = require('../../routes/alertRoutes');
const reminderRoutes = require('../../routes/reminderRoutes');
const migrationRoutes = require('../../routes/migrationRoutes');
const recoveryRoutes = require('../../routes/recoveryRoutes');

// Mount routers - note the /.netlify/functions/api prefix is handled by Netlify
app.use('/api/auth', authRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pregnancy', pregnancyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/recovery', recoveryRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
    res.send('Grameen Swastha AI API is running...');
});

// Export handler for Netlify
module.exports.handler = serverless(app);
