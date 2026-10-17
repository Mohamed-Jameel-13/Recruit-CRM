const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testScreening() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error('Please set GEMINI_API_KEY environment variable.');
    process.exit(1);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
  });

  const resumeText = fs.readFileSync('demo_cvs/01_Elena_Rostova_FullStack.txt', 'utf-8');

  const prompt = `You are an expert HR Recruitment Architect and Technical Screening Evaluator.
Screen this candidate CV against the Senior Full-Stack Cloud Engineer position.

Evaluate based on:
- Skills (40%): Node.js, React, TypeScript, PostgreSQL, Docker, AWS/GCP
- Experience (30%): 4+ years in distributed systems
- Education (15%): Computer Science or relevant STEM degree
- Domain (15%): Cloud architecture, microservices, concurrency

Respond ONLY with valid JSON matching this schema:
{
  "matchScore": number (0 to 100),
  "categoryScores": {
    "skills": number (out of 40),
    "experience": number (out of 30),
    "education": number (out of 15),
    "domain": number (out of 15)
  },
  "recommendation": "STRONG_MATCH" | "POTENTIAL_MATCH" | "BORDERLINE" | "NOT_A_MATCH",
  "matchingSkills": string[],
  "transferableSkills": [
    {
      "candidate_skill": string,
      "target_skill": string,
      "relationship": string,
      "credit_percentage": number,
      "explanation": string
    }
  ],
  "missingRequirements": string[],
  "uncertainties": string[],
  "executiveSummary": string,
  "evidence": [
    {
      "category": "skill" | "experience" | "education" | "domain",
      "criterion": string,
      "matched_text": string,
      "reasoning": string,
      "confidence_score": number
    }
  ]
}

<UNTRUSTED_RESUME>
${resumeText}
</UNTRUSTED_RESUME>`;

  console.log('Sending prompt to Gemini 2.5 Flash...');
  const res = await model.generateContent(prompt);
  const jsonText = res.response.text();
  console.log('AI Response:\n', jsonText);
}

testScreening().catch(err => console.error('Error:', err));
