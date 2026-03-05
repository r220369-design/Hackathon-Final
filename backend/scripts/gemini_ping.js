require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

(async () => {
  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      console.log('PING_RESULT missing_key');
      process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Respond in JSON only: {"ok": true}');
    const text = result.response.text();

    console.log('PING_MODEL', modelName);
    console.log('PING_RESULT success');
    console.log('PING_TEXT', text);
  } catch (error) {
    console.log('PING_MODEL', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    console.log('PING_RESULT failure');
    console.log('PING_ERROR_NAME', error?.name || 'unknown');
    console.log('PING_ERROR_MESSAGE', error?.message || 'unknown');
    if (error?.status) console.log('PING_ERROR_STATUS', error.status);
    if (error?.errorDetails) console.log('PING_ERROR_DETAILS', JSON.stringify(error.errorDetails));
    process.exit(1);
  }
})();
