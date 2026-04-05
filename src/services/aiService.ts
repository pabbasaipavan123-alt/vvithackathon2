import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!apiKey) {
  console.warn('[aiService] Gemini key not found. Chat will use fallback responses. Set VITE_GEMINI_API_KEY in .env.');
} else if (!ai) {
  console.warn('[aiService] Gemini client initialization failed. Check API key and GenAI package.');
} else {
  console.log('[aiService] Gemini client initialized with key length', apiKey.length);
}

const noApiFallback = async (prompt: string) => {
  const lower = prompt.toLowerCase();
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
    return 'Hi! I am BloodLink assistant. You can ask about eligibility, donor matching, or reward tokens.';
  }
  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes('are you good')) {
    return 'I am doing great and ready to help you save lives! Ask me about donation eligibility or matching.';
  }
  if (lower.includes('eligibility') || lower.includes('cannot donate') || lower.includes('eligible')) {
    return 'You can donate if you are 18-65, healthy, and not recently donated. If unsure, fill your eligibility details on dashboard.';
  }
  if (lower.includes('token') || lower.includes('reward')) {
    return 'Donate blood and earn tokens. Redeem tokens in the store for discounts and health services.';
  }
  if (lower.includes('match') || lower.includes('donor')) {
    return 'To find donors, create a blood request and we will match nearby compatible donors quickly.';
  }
  return 'BloodLink connects donors with requests. Ask me about eligibility, matching, hospital requests, or reward tokens.';
};

export const aiService = {
  async getEligibilityAdvice(failedCriteria: string[], language: 'en' | 'te' = 'en') {
    if (!ai) {
      return noApiFallback('eligibility');
    }
    try {
      const model = ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `The user failed blood donation eligibility for the following reasons: ${failedCriteria.join(', ')}. Explain in simple ${language === 'te' ? 'Telugu and English' : 'English'} why they cannot donate today. Provide 2-3 health tips to improve their health (like haemoglobin or weight) to become eligible sooner. Keep it encouraging and professional.`,
      });
      const response = await model;
      return response.text;
    } catch (error) {
      console.error('AI eligibility error:', error);
      return noApiFallback('eligibility');
    }
  },

  async predictDemand(recentRequests: any[]) {
    if (!ai) {
      return 'High demand predicted: O+ and A+ likely high demand in next 48 hours.';
    }
    try {
      const model = ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze these recent blood requests: ${JSON.stringify(recentRequests)}. Predict which blood type will be in highest demand in the next 48 hours. Return a short summary like: \"High demand predicted: O+ — 3 requests pending\".`,
      });
      const response = await model;
      return response.text;
    } catch (error) {
      console.error('AI demand prediction error:', error);
      return 'High demand predicted: O+ and A+ likely high demand in next 48 hours.';
    }
  },

  async getRecoveryTips(profile: { age: number; weight: number; bloodType: string }) {
    if (!ai) {
      return 'Rest well, drink water, eat iron-rich foods, and avoid heavy exercise for 24 hours.';
    }
    try {
      const model = ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `A donor just donated blood. Profile: Age ${profile.age}, Weight ${profile.weight}kg, Blood Type ${profile.bloodType}. Provide 3 personalized post-donation recovery tips in simple English and Telugu.`,
      });
      const response = await model;
      return response.text;
    } catch (error) {
      console.error('AI recovery tips error:', error);
      return 'Rest well, drink water, eat iron-rich foods, and avoid heavy exercise for 24 hours.';
    }
  },

  async chat(message: string) {
    if (!ai) {
      console.warn('AI key missing; using fallback output.');
      return noApiFallback(message);
    }
    try {
      console.log('AI chat request:', message);
      const model = ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: message,
        config: {
          systemInstruction: "You are BloodLink assistant. Answer questions about blood donation eligibility, process, and token rewards in both Telugu and English based on what language the user writes in. Keep answers under 3 sentences.",
        },
      });
      const response = await model;
      if (!response?.text || response.text.trim().length === 0) {
        console.warn('AI chat returned empty response, using fallback.');
        return noApiFallback(message);
      }
      return response.text;
    } catch (error) {
      console.error('AI chat error:', error);
      return 'Sorry, AI is temporarily unavailable. ' + await noApiFallback(message);
    }
  },
};
