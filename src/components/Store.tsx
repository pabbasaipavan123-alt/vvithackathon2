import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Award, Gift, Stethoscope, Ticket, CheckCircle2 } from 'lucide-react';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  color: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: 'discount_10',
    title: '10% Pharmacy Discount',
    description: 'Get 10% off on your next purchase at partner pharmacies.',
    cost: 100,
    icon: <Ticket className="w-8 h-8" />,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'discount_20',
    title: '20% Pharmacy Discount',
    description: 'Get 20% off on your next purchase at partner pharmacies.',
    cost: 150,
    icon: <Ticket className="w-8 h-8" />,
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    id: 'free_consultancy',
    title: 'Free Health Consultancy',
    description: 'One free online consultation with a general physician.',
    cost: 200,
    icon: <Stethoscope className="w-8 h-8" />,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'health_checkup',
    title: 'Basic Health Checkup',
    description: 'Free basic blood test and health screening.',
    cost: 300,
    icon: <Gift className="w-8 h-8" />,
    color: 'bg-amber-50 text-amber-600',
  }
];

export const Store: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleRedeem = async (item: StoreItem) => {
    if (!auth.currentUser || !profile) return;
    
    if (profile.tokens < item.cost) {
      setError(`Not enough tokens for ${item.title}. You need ${item.cost - profile.tokens} more.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setRedeeming(item.id);
    try {
      const newTokens = profile.tokens - item.cost;
      const newRedeemedItems = [...(profile.redeemedItems || []), item.id];
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        tokens: newTokens,
        redeemedItems: newRedeemedItems
      });
      
      setProfile({
        ...profile,
        tokens: newTokens,
        redeemedItems: newRedeemedItems
      });
      
    } catch (err) {
      console.error("Error redeeming item:", err);
      setError("Failed to redeem item. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-12 text-stone-500">Please log in to access the store.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">Rewards Store</h1>
          <p className="text-stone-500 mt-2 text-lg">Redeem your hard-earned tokens for exclusive benefits.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <Award className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-500 uppercase tracking-wider">Your Balance</p>
            <p className="text-3xl font-black text-stone-900">{profile.tokens} <span className="text-lg text-stone-400 font-medium">tokens</span></p>
          </div>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 font-medium"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {STORE_ITEMS.map((item) => {
          const isRedeemed = profile.redeemedItems?.includes(item.id);
          const canAfford = profile.tokens >= item.cost;
          
          return (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 hover:shadow-xl transition-all flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </div>
                <div className="bg-stone-100 px-4 py-2 rounded-full flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-stone-700">{item.cost}</span>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-stone-900 mb-3">{item.title}</h3>
              <p className="text-stone-500 leading-relaxed flex-grow mb-8">{item.description}</p>
              
              <button
                onClick={() => handleRedeem(item)}
                disabled={redeeming === item.id || !canAfford || isRedeemed}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                  ${isRedeemed 
                    ? 'bg-green-50 text-green-600 border border-green-200 cursor-not-allowed' 
                    : canAfford 
                      ? 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg active:scale-95' 
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }`}
              >
                {redeeming === item.id ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isRedeemed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> Redeemed
                  </>
                ) : (
                  'Redeem Reward'
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
