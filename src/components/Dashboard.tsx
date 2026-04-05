import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { UserProfile, BloodRequest } from '../types';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Award, Calendar, Droplet, Clock, Share2, TrendingUp, Heart, ArrowRight } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { aiService } from '../services/aiService';
import { seedFakeRequests } from '../services/seedData';

export const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prediction, setPrediction] = useState<string>('Analyzing demand...');
  const [recoveryTips, setRecoveryTips] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        await seedFakeRequests(auth.currentUser.uid); // Seed data if empty
        
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (docSnap.exists()) {
          const p = docSnap.data() as UserProfile;
          setProfile(p);
          
          // AI Prediction
          const requestsSnap = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(10)));
          const recentRequests = requestsSnap.docs.map(d => d.data());
          if (recentRequests.length > 0) {
            const pred = await aiService.predictDemand(recentRequests);
            setPrediction(pred);
          } else {
            setPrediction('Not enough data for prediction yet.');
          }

          // AI Recovery Tips if donated recently
          if (p.lastDonationDate) {
            const tips = await aiService.getRecoveryTips({
              age: p.age || 25,
              weight: p.weight || 60,
              bloodType: p.bloodType
            });
            setRecoveryTips(tips);
          }
        }
      } catch (error) {
        console.error('Dashboard load failed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-12">Loading your dashboard...</div>;
  if (!profile) return <div className="text-center py-12">Please complete your profile first.</div>;

  const checkEligibility = (p: UserProfile) => {
    const reasons: string[] = [];
    let nextDate: Date | null = null;

    if (p.hasChronicDiseases) {
      reasons.push('Chronic diseases prevent donation');
    }
    if (p.age && (p.age < 18 || p.age > 65)) {
      reasons.push('Age must be between 18 and 65');
    }
    if (p.weight && p.weight < 50) {
      reasons.push('Weight must be at least 50 kg');
    }
    if (p.consumedAlcoholRecently) {
      reasons.push('Must wait 24 hours after consuming alcohol');
      const tomorrow = addDays(new Date(), 1);
      if (!nextDate || tomorrow > nextDate) nextDate = tomorrow;
    }
    if (p.lastDonationDate) {
      const donationNextDate = addDays(new Date(p.lastDonationDate), 90);
      if (donationNextDate > new Date()) {
        reasons.push('Must wait 90 days between donations');
        if (!nextDate || donationNextDate > nextDate) nextDate = donationNextDate;
      }
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      nextDate
    };
  };

  const { isEligible, reasons, nextDate } = profile ? checkEligibility(profile) : { isEligible: false, reasons: [], nextDate: null };
  const daysToWait = nextDate ? differenceInDays(nextDate, new Date()) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="space-y-1">
          <p className="text-sm text-stone-500">Welcome back, {profile?.name || 'Donor'}</p>
          <h1 className="text-3xl font-black text-stone-900">Your Donor Dashboard</h1>
        </div>
        <button
          onClick={() => window.location.href = '/match'}
          className="bg-red-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all"
        >
          Donate Blood
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Token Balance */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-4 relative z-10">
            <Award className="w-10 h-10 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded">Rewards</span>
          </div>
          <h3 className="text-4xl font-black relative z-10">{profile.tokens}</h3>
          <p className="text-red-100 font-medium relative z-10 mb-4">Available Tokens</p>
          <Link to="/store" className="inline-flex items-center gap-2 text-sm font-bold bg-white text-red-600 px-4 py-2 rounded-full hover:bg-red-50 transition-colors relative z-10">
            Redeem <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </motion.div>

        {/* Eligibility Status */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md"
        >
          <div className="flex justify-between items-start mb-4">
            <Droplet className={`w-10 h-10 ${isEligible ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${isEligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isEligible ? 'Eligible' : 'Cooldown'}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-stone-900">
            {isEligible ? 'Ready to Donate' : (profile.hasChronicDiseases ? 'Not Eligible' : `Wait ${daysToWait > 0 ? daysToWait : 1} Days`)}
          </h3>
          <div className="text-stone-500 text-sm mt-1">
            {isEligible ? (
              <p>You can donate anytime!</p>
            ) : (
              <div className="space-y-1 mt-2">
                {reasons.map((r, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-600 rounded-full"></span> {r}
                  </p>
                ))}
                {nextDate && !profile.hasChronicDiseases && (
                  <p className="font-medium text-stone-700 mt-2">Next eligible: {format(nextDate, 'dd/MM/yyyy')}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Referral Code */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md"
        >
          <div className="flex justify-between items-start mb-4">
            <Share2 className="w-10 h-10 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-1 rounded">Referral</span>
          </div>
          <h3 className="text-2xl font-mono font-bold text-stone-900">{profile.referralCode}</h3>
          <p className="text-stone-500 text-sm mt-1">Share code to earn 25 tokens!</p>
        </motion.div>
      </div>

      {/* AI Demand Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold uppercase tracking-widest text-stone-400">AI Demand Predictor</span>
            </div>
            <p className="text-2xl font-medium leading-relaxed italic">
              "{prediction}"
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
        </div>

        {recoveryTips && (
          <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-red-600" />
                <span className="text-sm font-bold uppercase tracking-widest text-red-700">AI Recovery Advisor</span>
              </div>
              <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">
                {recoveryTips}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-md">
          <h4 className="text-xl font-bold mb-4">Recent Activity</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Signup Bonus</p>
                <p className="text-sm text-stone-500">+50 Tokens</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-md">
          <h4 className="text-xl font-bold mb-4">Health Profile</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-xs text-stone-500 uppercase font-bold">Blood Type</p>
              <p className="text-2xl font-bold text-red-600">{profile.bloodType}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-xs text-stone-500 uppercase font-bold">Weight</p>
              <p className="text-2xl font-bold text-stone-900">{profile.weight} kg</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
