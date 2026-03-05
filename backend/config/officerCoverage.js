const DEFAULT_OFFICER_COVERAGE = {
    "ASHA-GNT-001": {
        localityType: "phc",
        localityName: "Guntur PHC Cluster",
        coveredVillageCodes: ["AP001", "AP002", "AP003"]
    },
    "ASHA-VJA-001": {
        localityType: "municipality",
        localityName: "Vijayawada Municipality Zone 1",
        coveredVillageCodes: ["AP101", "AP102", "AP103"]
    },
    "ASHA-MGL-001": {
        localityType: "phc",
        localityName: "Mangalagiri PHC",
        coveredVillageCodes: ["AP201", "AP202"]
    }
};

const OFFICER_CODE_ALIASES = {
    ASHA001: 'ASHA-GNT-001',
    ASHA002: 'ASHA-VJA-001',
    ASHA003: 'ASHA-MGL-001'
};

const normalizeOfficerCode = (value) => String(value || '').trim().toUpperCase();

const compactOfficerCode = (value) => normalizeOfficerCode(value).replace(/[^A-Z0-9]/g, '');

const parseOfficerCoverageFromEnv = () => {
    const raw = process.env.OFFICER_CODE_MAP;
    if (!raw) return DEFAULT_OFFICER_COVERAGE;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return DEFAULT_OFFICER_COVERAGE;

        return Object.entries(parsed).reduce((acc, [code, value]) => {
            if (!value || typeof value !== "object") return acc;

            const coveredVillageCodes = Array.isArray(value.coveredVillageCodes)
                ? value.coveredVillageCodes.map((item) => String(item).trim()).filter(Boolean)
                : [];

            if (!coveredVillageCodes.length) return acc;

            acc[String(code).trim().toUpperCase()] = {
                localityType: value.localityType === "municipality" ? "municipality" : "phc",
                localityName: String(value.localityName || "Assigned Locality").trim(),
                coveredVillageCodes
            };

            return acc;
        }, {});
    } catch (error) {
        console.error("Failed to parse OFFICER_CODE_MAP. Using defaults.", error.message);
        return DEFAULT_OFFICER_COVERAGE;
    }
};

const OFFICER_COVERAGE = parseOfficerCoverageFromEnv();

const getOfficerCoverageByCode = (officerCode) => {
    const code = normalizeOfficerCode(officerCode);
    if (!code) return null;

    const codeCompacted = compactOfficerCode(code);
    const directAlias = OFFICER_CODE_ALIASES[codeCompacted];

    const matchedEntry = Object.entries(OFFICER_COVERAGE).find(([registeredCode]) => {
        const normalizedRegistered = normalizeOfficerCode(registeredCode);
        if (normalizedRegistered === code) return true;
        return compactOfficerCode(normalizedRegistered) === codeCompacted;
    });

    const resolvedCode = directAlias || (matchedEntry ? matchedEntry[0] : null);
    const coverage = resolvedCode ? OFFICER_COVERAGE[resolvedCode] : null;
    if (!coverage) return null;

    return {
        officerCode: resolvedCode,
        ...coverage
    };
};

module.exports = { getOfficerCoverageByCode };
