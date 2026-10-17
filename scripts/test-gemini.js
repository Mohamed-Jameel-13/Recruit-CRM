const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error('Please set GEMINI_API_KEY environment variable.');
    process.exit(1);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const res = await model.generateContent('Return JSON: {"status": "SUCCESS", "message": "Gemini 2.5 Flash is active"}');
  console.log('AI Output:', res.response.text());
}

main().catch(err => console.error('Error:', err));
