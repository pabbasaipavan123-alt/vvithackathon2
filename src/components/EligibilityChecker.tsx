import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Activity, Scale, Calendar, User, Info } from 'lucide-react';
import { aiService } from '../services/aiService';
import { differenceInDays } from 'date-fns';

export const EligibilityChecker: React.FC = () => {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [hb, setHb] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [lastDonation, setLastDonation] = useState('');
  const [recentIllness, setRecentIllness] = useState(false);
  
  const [result, setResult] = useState<{ eligible: boolean; reasons: string[]; advice?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = async () => {
    setLoading(true);
    const reasons: string[] = [];
    const ageNum = parseInt(age);
    const weightNum = parseInt(weight);
    const hbNum = parseFloat(hb);
    
    if (ageNum < 18 || ageNum > 65) reasons.push('Age must be between 18 and 65');
    if (weightNum < 50) reasons.push('Weight must be at least 50kg');
    if (gender === 'male' && hbNum < 13) reasons.push('Haemoglobin must be at least 13 g/dL for males');
    if (gender === 'female' && hbNum < 12) reasons.push('Haemoglobin must be at least 12 g/dL for females');
    
    if (lastDonation) {
      const daysSince = differenceInDays(new Date(), new Date(lastDonation));
      if (daysSince < 90) reasons.push(`Last donation was only ${daysSince} days ago. Wait at least 90 days.`);
    }
    
    if (recentIllness) reasons.push('Must be free of illness for at least 7 days');

    const eligible = reasons.length === 0;
    let advice = '';
    
    if (!eligible) {
      advice = await aiService.getEligibilityAdvice(reasons);
    }

    setResult({ eligible, reasons, advice });
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Activity className="text-red-600" /> Eligibility Check
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Age</label>
                <input type="number" className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl" value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Weight (kg)</label>
                <input type="number" className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Gender</label>
              <div className="flex gap-2">
                {['male', 'female'].map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g as any)}
                    className={`flex-1 py-2 rounded-xl font-semibold border ${gender === g ? 'bg-red-600 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200'}`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Haemoglobin (Hb)</label>
              <input type="number" step="0.1" className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl" value={hb} onChange={e => setHb(e.target.value)} placeholder="e.g. 14.5" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Last Donation Date</label>
              <input type="date" className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl" value={lastDonation} onChange={e => setLastDonation(e.target.value)} />
            </div>

            <label className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-red-600" checked={recentIllness} onChange={e => setRecentIllness(e.target.checked)} />
              <span className="text-sm font-medium text-stone-700">Any illness in the last 7 days?</span>
            </label>

            <button
              onClick={checkEligibility}
              disabled={loading}
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Check Eligibility'}
            </button>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-100 rounded-3xl border-2 border-dashed border-stone-200"
              >
                <Info className="w-12 h-12 text-stone-300 mb-4" />
                <p className="text-stone-500">Fill in the details to see if you can donate today.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className={`h-full p-8 rounded-3xl shadow-xl border ${result.eligible ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}
              >
                <div className="text-center mb-6">
                  {result.eligible ? (
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  )}
                  <h3 className={`text-3xl font-black ${result.eligible ? 'text-green-700' : 'text-red-700'}`}>
                    {result.eligible ? 'YOU ARE ELIGIBLE!' : 'NOT ELIGIBLE TODAY'}
                  </h3>
                </div>

                {!result.eligible && (
                  <div className="space-y-6">
                    <div className="bg-white/50 p-4 rounded-2xl">
                      <h4 className="font-bold text-red-800 mb-2">Reasons:</h4>
                      <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                        {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                        <h4 className="font-bold text-stone-900">AI Health Advisor</h4>
                      </div>
                      <p className="text-stone-700 text-sm leading-relaxed italic whitespace-pre-wrap">
                        {result.advice}
                      </p>
                    </div>
                  </div>
                )}

                {result.eligible && (
                  <div className="text-center space-y-6">
                    <p className="text-green-700 font-medium">You are in great health! Your donation can save up to 3 lives.</p>
                    <button className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 transition-all shadow-lg">
                      Find Nearby Requests
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
