const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));

// Route files
const authRoutes = require('./routes/authRoutes');
const triageRoutes = require('./routes/triageRoutes');
const familyRoutes = require('./routes/familyRoutes');
const officerRoutes = require('./routes/officerRoutes');
const reportRoutes = require('./routes/reportRoutes');
const pregnancyRoutes = require('./routes/pregnancyRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const migrationRoutes = require('./routes/migrationRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const { dispatchDueRemindersCore } = require('./services/reminderService');

// Mount routers
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

// Simple test route
app.get('/', (req, res) => {
    res.send('Grameen Swastha AI API is running...');
});

// Health check for Railway
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

});

setInterval(async () => {
    try {
        const result = await dispatchDueRemindersCore();
        if (result.sent > 0 || result.failed > 0) {
            console.log(`Reminder dispatcher: sent=${result.sent}, failed=${result.failed}`);
        }
    } catch (error) {
        console.error('Reminder dispatcher error:', error.message);
    }
}, 60 * 60 * 1000);
