require('dotenv').config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const postJson = async (path, body, token) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { ok: response.ok, status: response.status, data: json };
};

const getJson = async (path, token) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { ok: response.ok, status: response.status, data: json };
};

const register = async ({ name, role, villageCode, officerCode }) => {
  const now = Date.now();
  const email = `${name.replace(/\s+/g, '.').toLowerCase()}.${now}@example.com`;
  const phone = `9${String(now).slice(-9)}`;

  const payload = {
    name,
    email,
    password: 'Password@123',
    phone,
    role,
    language: 'en',
    age: 31,
    isPregnant: false,
    villageCode,
    officerCode,
    notificationPreference: 'inapp'
  };

  const result = await postJson('/api/auth/register', payload);
  if (!result.ok) {
    throw new Error(`Register failed (${name}): ${result.status} ${JSON.stringify(result.data)}`);
  }

  return {
    token: result.data.token,
    userId: result.data._id,
    phone,
    villageCode: result.data.villageCode,
    email: result.data.email,
    role: result.data.role
  };
};

const triggerTriage = async ({ token, symptomText }) => {
  return postJson('/api/triage/analyze', {
    symptomText,
    language: 'en'
  }, token);
};

const run = async () => {
  console.log('VERIFY_START');

  const officer = await register({
    name: 'Officer Verify',
    role: 'officer',
    villageCode: '',
    officerCode: 'ASHA001'
  });

  const patientA = await register({
    name: 'Patient Alpha',
    role: 'user',
    villageCode: 'AP001'
  });

  const patientB = await register({
    name: 'Patient Beta',
    role: 'user',
    villageCode: 'AP001'
  });

  const familyCreate = await postJson('/api/family/create', {}, patientA.token);
  if (!familyCreate.ok) {
    throw new Error(`Family create failed: ${familyCreate.status} ${JSON.stringify(familyCreate.data)}`);
  }

  const addMember = await postJson('/api/family/members', { phone: patientB.phone }, patientA.token);
  if (!addMember.ok) {
    throw new Error(`Add family member failed: ${addMember.status} ${JSON.stringify(addMember.data)}`);
  }

  const moderateInputs = [
    'I have fever and throat pain since yesterday',
    'I have fever, cough and body pains from 2 days'
  ];

  const severeInputs = [
    'I have severe chest pain and shortness of breath and dizziness now',
    'I am having breathlessness with chest tightness and faint feeling'
  ];

  let moderateResult = null;
  for (const text of moderateInputs) {
    const triage = await triggerTriage({ token: patientA.token, symptomText: text });
    if (triage.ok && triage.data && typeof triage.data.score === 'number') {
      if (triage.data.score >= 50 && triage.data.score < 80) {
        moderateResult = triage.data;
        break;
      }
    }
  }

  let severeResult = null;
  for (const text of severeInputs) {
    const triage = await triggerTriage({ token: patientA.token, symptomText: text });
    if (!triage.ok) {
      throw new Error(`Triage severe call failed: ${triage.status} ${JSON.stringify(triage.data)}`);
    }
    if (typeof triage.data.score === 'number' && triage.data.score >= 80) {
      severeResult = triage.data;
      break;
    }
  }

  if (!severeResult) {
    throw new Error('Could not produce a severe case (score >= 80) to verify alerts');
  }

  const familyAlertsRes = await getJson('/api/alerts/me', patientB.token);
  if (!familyAlertsRes.ok) {
    throw new Error(`Fetch family alerts failed: ${familyAlertsRes.status} ${JSON.stringify(familyAlertsRes.data)}`);
  }

  const officerAlertsRes = await getJson('/api/alerts/me', officer.token);
  if (!officerAlertsRes.ok) {
    throw new Error(`Fetch officer alerts failed: ${officerAlertsRes.status} ${JSON.stringify(officerAlertsRes.data)}`);
  }

  const familyAlerts = familyAlertsRes.data.alerts || [];
  const officerAlerts = officerAlertsRes.data.alerts || [];

  const familyFromPatient = familyAlerts.filter((item) => String(item.fromUserId || '') === String(patientA.userId));
  const officerFromPatient = officerAlerts.filter((item) => String(item.fromUserId || '') === String(patientA.userId));

  console.log('MODERATE_FOUND', Boolean(moderateResult));
  if (moderateResult) {
    console.log('MODERATE_SCORE', moderateResult.score);
    console.log('MODERATE_LEVEL', moderateResult.level);
  }
  console.log('SEVERE_SCORE', severeResult.score);
  console.log('SEVERE_LEVEL', severeResult.level);

  console.log('FAMILY_ALERT_COUNT', familyFromPatient.length);
  console.log('OFFICER_ALERT_COUNT', officerFromPatient.length);

  const familyLatest = familyFromPatient[0];
  const officerLatest = officerFromPatient[0];

  console.log('FAMILY_LATEST', familyLatest ? JSON.stringify({ type: familyLatest.type, message: familyLatest.message }) : 'none');
  console.log('OFFICER_LATEST', officerLatest ? JSON.stringify({ type: officerLatest.type, message: officerLatest.message }) : 'none');

  if (!familyFromPatient.length || !officerFromPatient.length) {
    throw new Error('Expected alerts for both family member and officer were not created');
  }

  console.log('VERIFY_RESULT PASS');
};

run().catch((error) => {
  console.error('VERIFY_RESULT FAIL', error.message || error);
  process.exit(1);
});
