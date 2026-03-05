const Report = require('../models/Report');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { createInAppAlert } = require('../services/notificationService');

const recalculateScoreBasedOnHistory = async (userId) => {
    try {
        const reports = await Report.find({ userId }).sort({ createdAt: -1 });
        
        if (reports.length === 0) return 0;

        // Calculate base score from non-cured recent reports
        const activeReports = reports.filter(r => r.recoveryStatus !== 'cured');
        
        if (activeReports.length === 0) {
            // User has only cured reports - very low risk
            return 5;
        }

        // Get the latest score
        const latestScore = activeReports[0]?.score || 0;
        
        // Analyze trend
        const recentReports = activeReports.slice(0, 5); // Last 5 active reports
        const avgRecentScore = recentReports.reduce((sum, r) => sum + (r.score || 0), 0) / recentReports.length;
        
        // Count cured cases
        const curedReports = reports.filter(r => r.recoveryStatus === 'cured');
        const cureRate = curedReports.length / reports.length;
        
        // Calculate adjusted score
        let adjustedScore = latestScore;
        
        // If trend is improving, reduce score
        if (recentReports.length > 1) {
            const oldestRecentScore = recentReports[recentReports.length - 1]?.score || 0;
            if (latestScore < oldestRecentScore) {
                adjustedScore = adjustedScore * 0.9; // 10% reduction for improvement
            } else if (latestScore > oldestRecentScore) {
                adjustedScore = Math.min(100, adjustedScore * 1.1); // 10% increase for worsening
            }
        }
        
        // Factor in recovery history (high cure rate reduces overall risk)
        if (cureRate > 0.5) {
            adjustedScore = adjustedScore * 0.8; // 20% reduction if high cure rate
        }
        
        return Math.round(adjustedScore);
    } catch (error) {
        console.error('Error recalculating score:', error);
        return 0;
    }
};

const markAsRecovered = async (req, res) => {
    try {
        const { reportId, recoveryNotes, recoveryStatus = 'cured' } = req.body;
        
        console.log('[Recovery] Request received:', { reportId, userId: req.user?._id, recoveryStatus });
        
        if (!reportId) {
            console.log('[Recovery] No reportId provided');
            return res.status(400).json({ message: 'Report ID is required' });
        }

        if (!req.user?._id) {
            console.log('[Recovery] No user authenticated');
            return res.status(401).json({ message: 'User not authenticated' });
        }

        console.log(`[Recovery] markAsRecovered: reportId=${reportId}, user=${req.user._id}`);
        
        const report = await Report.findOne({ _id: reportId, userId: req.user._id });
        if (!report) {
            console.log(`[Recovery] Report not found: ${reportId}`);
            return res.status(404).json({ message: 'Report not found' });
        }

        console.log(`[Recovery] Report found, updating...`);

        // Update report with recovery info
        report.recoveryStatus = recoveryStatus;
        report.recoveredAt = new Date();
        report.recoveryNotes = recoveryNotes || '';
        await report.save();
        console.log(`[Recovery] Report saved: ${reportId}, status=${recoveryStatus}`);

        // Recalculate score based on updated history
        const newScore = await recalculateScoreBasedOnHistory(req.user._id);
        console.log(`[Recovery] Score recalculated: ${newScore}`);
        
        // Create alert for family members about recovery
        const Family = require('../models/Family');
        const family = await Family.findById(req.user.familyGroupId);
        console.log(`[Recovery] Family lookup: familyGroupId=${req.user.familyGroupId}, found=${!!family}`);
        
        if (family?.members?.length) {
            const recipientIds = family.members.filter((memberId) => String(memberId) !== String(req.user._id));
            console.log(`[Recovery] Sending alerts to ${recipientIds.length} family members`);
            for (const recipientId of recipientIds) {
                const message = recoveryStatus === 'cured' 
                    ? `✅ Good news! ${req.user.name || 'Family member'} has recovered from their condition.${recoveryNotes ? ` Notes: ${recoveryNotes}` : ''}`
                    : `📈 ${req.user.name || 'Family member'} is showing improvement. Status: ${recoveryStatus}.`;
                
                await createInAppAlert({
                    toUserId: recipientId,
                    fromUserId: req.user._id,
                    fromUserName: req.user.name || req.user.phone,
                    message,
                    type: 'general',
                    status: 'sent'
                });
            }
        }

        res.json({
            message: 'Recovery status updated',
            report,
            recalculatedScore: newScore
        });
    } catch (error) {
        console.error('[Recovery] Error in markAsRecovered:', error?.message || error);
        console.error('[Recovery] Full error:', error);
        res.status(500).json({ message: error?.message || 'Server error updating recovery status' });
    }
};

const getHealthTrend = async (req, res) => {
    try {
        const userId = req.user._id;
        const reports = await Report.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('score level symptoms recoveryStatus recoveredAt createdAt');

        const recalculatedScore = await recalculateScoreBasedOnHistory(userId);
        
        // Calculate trend
        const trend = {
            totalReports: reports.length,
            activeReports: reports.filter(r => r.recoveryStatus === 'active' || r.recoveryStatus === 'improving').length,
            curedReports: reports.filter(r => r.recoveryStatus === 'cured').length,
            worseeningReports: reports.filter(r => r.recoveryStatus === 'worsening').length,
            currentScore: recalculatedScore,
            reports: reports.map(r => ({
                _id: r._id,
                score: r.score,
                level: r.level,
                symptoms: r.symptoms,
                recoveryStatus: r.recoveryStatus,
                recoveredAt: r.recoveredAt,
                createdAt: r.createdAt
            }))
        };

        res.json(trend);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching health trend' });
    }
};

const submitCureUpdate = async (req, res) => {
    try {
        const { message, reportId } = req.body;

        if (!message || !reportId) {
            return res.status(400).json({ message: 'Message and reportId are required' });
        }

        // Parse message for cure-related keywords
        const lowerMessage = message.toLowerCase();
        const cureLikelihood = {
            cured: /cured|recovered|healed|better|fine|good|well|fine now|all good|no symptoms|symptom|free|resolved|fixed|improved/.test(lowerMessage),
            worsening: /worse|worsened|worsening|deteriorated|declined|getting worse|more symptoms|spreading/.test(lowerMessage),
            improving: /improving|improving|better|getting better|improved|some improvement|feeling better/.test(lowerMessage)
        };

        let recoveryStatus = 'active';
        if (cureLikelihood.cured) {
            recoveryStatus = 'cured';
        } else if (cureLikelihood.worsening) {
            recoveryStatus = 'worsening';
        } else if (cureLikelihood.improving) {
            recoveryStatus = 'improving';
        }

        // Update report
        console.log(`[Recovery] Updating report ${reportId} for user ${req.user._id} with status: ${recoveryStatus}`);
        const report = await Report.findOne({ _id: reportId, userId: req.user._id });
        if (!report) {
            console.log(`[Recovery] Report not found: ${reportId}`);
            return res.status(404).json({ message: 'Report not found' });
        }

        report.recoveryStatus = recoveryStatus;
        if (recoveryStatus === 'cured') {
            report.recoveredAt = new Date();
        }
        report.recoveryNotes = message;
        await report.save();
        console.log(`[Recovery] Report updated successfully: ${reportId}, new status: ${recoveryStatus}`);

        // Recalculate score
        const newScore = await recalculateScoreBasedOnHistory(req.user._id);

        // Notify family if cured
        if (recoveryStatus === 'cured') {
            const Family = require('../models/Family');
            
            const family = await Family.findById(req.user.familyGroupId);
            if (family?.members?.length) {
                const recipientIds = family.members.filter((memberId) => String(memberId) !== String(req.user._id));
                const senderName = req.user.name || req.user.phone || 'Family member';
                
                for (const recipientId of recipientIds) {
                    await createInAppAlert({
                        toUserId: recipientId,
                        fromUserId: req.user._id,
                        fromUserName: senderName,
                        message: `✅ Great news! ${senderName} has recovered. "${message}"`,
                        type: 'general',
                        status: 'sent'
                    });
                }
            }
        }

        res.json({
            message: 'Update processed',
            recoveryStatus,
            newScore,
            report
        });
    } catch (error) {
        console.error('[Recovery] Error:', error);
        res.status(500).json({ message: 'Server error processing update' });
    }
};

module.exports = {
    markAsRecovered,
    getHealthTrend,
    submitCureUpdate,
    recalculateScoreBasedOnHistory
};
