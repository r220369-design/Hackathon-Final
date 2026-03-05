const Family = require('../models/Family');
const User = require('../models/User');
const Report = require('../models/Report');

const createGroupCode = (villageCode = 'AP') => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${villageCode}-FAM-${random}`;
};

const isSameId = (a, b) => String(a) === String(b);

const populateFamily = (familyId) => Family.findById(familyId)
    .populate('members', 'name email age isPregnant phone villageCode')
    .populate('createdBy', 'name email');

const syncMemberCount = async (family) => {
    family.memberCount = family.members.length;
    await family.save();
};

const findFamilyContainingMember = async (userId) => {
    return Family.findOne({ members: userId }).select('_id groupCode');
};

const createFamilyGroup = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.familyGroupId) {
            return res.status(400).json({ message: 'User already belongs to a family group' });
        }

        const existingFamily = await findFamilyContainingMember(user._id);
        if (existingFamily) {
            return res.status(400).json({ message: 'User already belongs to a family group' });
        }

        let groupCode = createGroupCode(user.villageCode);
        while (await Family.findOne({ groupCode })) {
            groupCode = createGroupCode(user.villageCode);
        }

        const family = await Family.create({
            groupCode,
            villageCode: user.villageCode,
            createdBy: user._id,
            members: [user._id],
            memberCount: 1
        });

        await User.findByIdAndUpdate(user._id, { familyGroupId: family._id });

        const populated = await populateFamily(family._id);
        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error creating family group' });
    }
};

const joinFamilyGroup = async (req, res) => {
    try {
        const { groupCode } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const normalizedCode = String(groupCode || '').trim().toUpperCase();

        if (!normalizedCode) {
            return res.status(400).json({ message: 'Group code is required' });
        }

        if (user.familyGroupId) {
            return res.status(400).json({ message: 'User already belongs to a family group' });
        }

        const existingFamily = await findFamilyContainingMember(user._id);
        if (existingFamily) {
            return res.status(400).json({ message: 'User already belongs to a family group' });
        }

        const family = await Family.findOne({ groupCode: normalizedCode });
        if (!family) {
            return res.status(404).json({ message: 'Family group not found' });
        }

        if (family.villageCode !== user.villageCode) {
            return res.status(403).json({ message: 'Family group village mismatch' });
        }

        if (!family.members.some((memberId) => isSameId(memberId, user._id))) {
            family.members.push(user._id);
            await syncMemberCount(family);
        }

        await User.findByIdAndUpdate(user._id, { familyGroupId: family._id });

        const populated = await populateFamily(family._id);
        res.json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error joining family group' });
    }
};

const getMyFamilyGroup = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user.familyGroupId) {
            return res.json({ family: null });
        }

        const family = await populateFamily(user.familyGroupId);

        if (!family) {
            await User.findByIdAndUpdate(user._id, { $unset: { familyGroupId: 1 } });
            return res.json({ family: null });
        }

        if (family.memberCount !== family.members.length) {
            family.memberCount = family.members.length;
            await family.save();
        }

        res.json({ family });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching family group' });
    }
};

const addMemberToFamily = async (req, res) => {
    try {
        const phone = String(req.body.phone || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();

        if (!phone && !email) {
            return res.status(400).json({ message: 'Provide phone or email to add a member' });
        }

        const me = await User.findById(req.user._id);
        if (!me.familyGroupId) {
            return res.status(400).json({ message: 'Create or join a family first' });
        }

        const family = await Family.findById(me.familyGroupId);
        if (!family) {
            return res.status(404).json({ message: 'Family group not found' });
        }

        const targetUser = await User.findOne(email ? { email } : { phone });
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        if (isSameId(targetUser._id, me._id)) {
            return res.status(400).json({ message: 'You are already a member of this family group' });
        }

        if (targetUser.villageCode !== family.villageCode) {
            return res.status(403).json({ message: 'Target user village mismatch' });
        }

        if (family.members.some((memberId) => isSameId(memberId, targetUser._id))) {
            return res.status(400).json({ message: 'Target user is already a member of this family group' });
        }

        if (targetUser.familyGroupId) {
            return res.status(400).json({ message: 'Target user already belongs to another family group' });
        }

        const existingTargetFamily = await findFamilyContainingMember(targetUser._id);
        if (existingTargetFamily) {
            return res.status(400).json({ message: 'Target user already belongs to another family group' });
        }

        family.members.push(targetUser._id);
        await syncMemberCount(family);

        targetUser.familyGroupId = family._id;
        await targetUser.save();

        const populated = await populateFamily(family._id);
        res.json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error adding member' });
    }
};

const leaveFamilyGroup = async (req, res) => {
    try {
        const me = await User.findById(req.user._id);
        if (!me.familyGroupId) {
            return res.status(400).json({ message: 'You are not part of a family group' });
        }

        const family = await Family.findById(me.familyGroupId);
        if (!family) {
            await User.findByIdAndUpdate(me._id, { $unset: { familyGroupId: 1 } });
            return res.json({ family: null, message: 'Left family group' });
        }

        family.members = family.members.filter((memberId) => !isSameId(memberId, me._id));
        await User.findByIdAndUpdate(me._id, { $unset: { familyGroupId: 1 } });

        if (family.members.length === 0) {
            await Family.findByIdAndDelete(family._id);
            return res.json({ family: null, message: 'Family group closed as last member left' });
        }

        if (isSameId(family.createdBy, me._id)) {
            family.createdBy = family.members[0];
        }

        await syncMemberCount(family);
        const updated = await populateFamily(family._id);
        res.json({ family: updated, message: 'Left family group' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error leaving family group' });
    }
};

const getFamilyMemberRecentDetails = async (req, res) => {
    try {
        const me = await User.findById(req.user._id);
        if (!me.familyGroupId) {
            return res.status(400).json({ message: 'Create or join a family first' });
        }

        const family = await Family.findById(me.familyGroupId);
        if (!family) {
            return res.status(404).json({ message: 'Family group not found' });
        }

        const memberId = String(req.params.memberId || '').trim();
        const isInFamily = family.members.some((id) => isSameId(id, memberId));
        if (!isInFamily) {
            return res.status(403).json({ message: 'Member not found in your family group' });
        }

        const member = await User.findById(memberId).select('name email age isPregnant phone villageCode language');
        if (!member) {
            return res.status(404).json({ message: 'Family member not found' });
        }

        const latestReport = await Report.findOne({ userId: member._id })
            .sort({ createdAt: -1 })
            .select('sourceType symptoms score level possibleDiseases recommendation explanation recommendationType createdAt');

        res.json({
            member,
            latestReport
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching family member details' });
    }
};

module.exports = {
    createFamilyGroup,
    joinFamilyGroup,
    getMyFamilyGroup,
    addMemberToFamily,
    leaveFamilyGroup,
    getFamilyMemberRecentDetails
};
