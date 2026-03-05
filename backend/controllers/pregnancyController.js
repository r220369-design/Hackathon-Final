const Pregnancy = require('../models/Pregnancy');
const Reminder = require('../models/Reminder');
const { createInAppAlert } = require('../services/notificationService');

const VACCINATION_TEMPLATE = [
    { vaccine: 'BCG + OPV 0 + Hep B1', afterMonths: 0 },
    { vaccine: 'OPV 1 + Penta 1 + RVV 1 + PCV 1', afterMonths: 1.5 },
    { vaccine: 'OPV 2 + Penta 2 + RVV 2 + PCV 2', afterMonths: 2.5 },
    { vaccine: 'OPV 3 + Penta 3 + RVV 3 + PCV 3 + IPV 1', afterMonths: 3.5 },
    { vaccine: 'Measles-Rubella 1 + Vitamin A', afterMonths: 9 },
    { vaccine: 'MR 2 + OPV Booster + DPT Booster 1', afterMonths: 18 }
];

const addMonths = (dateString, months) => {
    const date = new Date(dateString);
    const wholeMonths = Math.floor(months);
    const extraDays = Math.round((months - wholeMonths) * 30);
    date.setMonth(date.getMonth() + wholeMonths);
    date.setDate(date.getDate() + extraDays);
    return date.toISOString().slice(0, 10);
};

const upsertPregnancy = async (req, res) => {
    try {
        const { dueDate, notes } = req.body;
        if (!dueDate) {
            return res.status(400).json({ message: 'dueDate is required' });
        }

        let pregnancy = await Pregnancy.findOne({ userId: req.user._id });

        if (!pregnancy) {
            pregnancy = await Pregnancy.create({ userId: req.user._id, dueDate, notes: notes || [] });
        } else {
            pregnancy.dueDate = dueDate;
            if (Array.isArray(notes) && notes.length > 0) {
                pregnancy.notes.push(...notes);
            }
            await pregnancy.save();
        }

        res.json(pregnancy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error saving pregnancy data' });
    }
};

const addMonthlyCheckup = async (req, res) => {
    try {
        const { month, doctorNotes, riskLevel, recommendations } = req.body;
        const pregnancy = await Pregnancy.findOne({ userId: req.user._id });

        if (!pregnancy) {
            return res.status(404).json({ message: 'Pregnancy profile not found' });
        }

        pregnancy.monthlyCheckups.push({ month, doctorNotes, riskLevel, recommendations });
        await pregnancy.save();

        if (riskLevel === 'High' || riskLevel === 'Critical') {
            const dueAt = new Date();
            dueAt.setDate(dueAt.getDate() + 7);
            await Reminder.create({
                userId: req.user._id,
                title: 'Pregnancy follow-up',
                message: 'Please visit the doctor for follow-up checkup.',
                severity: riskLevel,
                dueAt,
                channel: req.user.notificationPreference || 'inapp'
            });
        }

        res.json(pregnancy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error adding monthly checkup' });
    }
};

const addBaby = async (req, res) => {
    try {
        const { name, dob } = req.body;

        if (!name || !dob) {
            return res.status(400).json({ message: 'Baby name and DOB are required' });
        }

        const pregnancy = await Pregnancy.findOne({ userId: req.user._id });
        if (!pregnancy) {
            return res.status(404).json({ message: 'Pregnancy profile not found' });
        }

        const vaccinations = VACCINATION_TEMPLATE.map((item) => ({
            vaccine: item.vaccine,
            dueDate: addMonths(dob, item.afterMonths),
            completed: false
        }));

        pregnancy.babies.push({ name, dob, vaccinations });
        await pregnancy.save();

        for (const item of vaccinations) {
            await Reminder.create({
                userId: req.user._id,
                title: `Vaccination due: ${name}`,
                message: `${item.vaccine} is due for ${name} on ${item.dueDate}`,
                severity: 'Moderate',
                dueAt: new Date(item.dueDate),
                channel: req.user.notificationPreference || 'inapp'
            });
        }

        await createInAppAlert({
            toUserId: req.user._id,
            fromUserId: req.user._id,
            message: `Baby ${name} added. Vaccination reminders are scheduled.`,
            type: 'vaccination',
            villageCode: req.user.villageCode,
            status: 'sent'
        });

        res.status(201).json(pregnancy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error adding baby data' });
    }
};

const updateVaccination = async (req, res) => {
    try {
        const { babyIndex, vaccinationIndex } = req.params;

        const pregnancy = await Pregnancy.findOne({ userId: req.user._id });
        if (!pregnancy) {
            return res.status(404).json({ message: 'Pregnancy profile not found' });
        }

        const baby = pregnancy.babies[Number(babyIndex)];
        if (!baby) {
            return res.status(404).json({ message: 'Baby not found' });
        }

        const vaccination = baby.vaccinations[Number(vaccinationIndex)];
        if (!vaccination) {
            return res.status(404).json({ message: 'Vaccination entry not found' });
        }

        vaccination.completed = true;
        vaccination.completedOn = new Date().toISOString().slice(0, 10);
        await pregnancy.save();

        res.json(pregnancy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error updating vaccination status' });
    }
};

const getPregnancyData = async (req, res) => {
    try {
        const pregnancy = await Pregnancy.findOne({ userId: req.user._id });
        res.json({ pregnancy });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching pregnancy data' });
    }
};

module.exports = {
    upsertPregnancy,
    addMonthlyCheckup,
    addBaby,
    updateVaccination,
    getPregnancyData
};
