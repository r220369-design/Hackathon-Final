const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createFamilyGroup,
    joinFamilyGroup,
    getMyFamilyGroup,
    addMemberToFamily,
    leaveFamilyGroup,
    getFamilyMemberRecentDetails
} = require('../controllers/familyController');

router.post('/create', protect, createFamilyGroup);
router.post('/join', protect, joinFamilyGroup);
router.get('/me', protect, getMyFamilyGroup);
router.post('/members', protect, addMemberToFamily);
router.get('/members/:memberId/recent', protect, getFamilyMemberRecentDetails);
router.post('/leave', protect, leaveFamilyGroup);

module.exports = router;
