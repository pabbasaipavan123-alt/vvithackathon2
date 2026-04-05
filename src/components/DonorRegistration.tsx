import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BloodType, UserProfile } from '../types';
import { MapPin, Scale, Calendar, User, Phone, Activity, AlertTriangle } from 'lucide-react';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const DonorRegistration: React.FC = () => {
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [consumedAlcoholRecently, setConsumedAlcoholRecently] = useState(false);
  const [hasChronicDiseases, setHasChronicDiseases] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        bloodType,
        age: parseInt(age),
        weight: parseInt(weight),
        phone,
        gender,
        consumedAlcoholRecently,
        hasChronicDiseases,
        location: {
          address,
          lat: 17.3850, // Mock coordinates (Hyderabad)
          lng: 78.4867
        },
        isDonor: true,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
      >
        <h2 className="text-3xl font-bold text-stone-900 mb-2">Complete Your Profile</h2>
        <p className="text-stone-500 mb-8">Help us match you with patients in need.</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" /> Blood Type
            </label>
            <select
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value as BloodType)}
            >
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <User className="w-4 h-4 text-red-500" /> Age
            </label>
            <input
              type="number"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 25"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Scale className="w-4 h-4 text-red-500" /> Weight (kg)
            </label>
            <input
              type="number"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 65"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-500" /> Phone Number
            </label>
            <input
              type="tel"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Hospital/Location Address
            </label>
            <input
              type="text"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address or hospital name"
              required
            />
          </div>

          <div className="md:col-span-2 space-y-4 mt-4 p-6 bg-red-50 rounded-2xl border border-red-100">
            <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Eligibility Questionnaire
            </h3>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-stone-800">
                Have you consumed alcohol in the last 24 hours?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="alcohol" checked={consumedAlcoholRecently} onChange={() => setConsumedAlcoholRecently(true)} className="text-red-600 focus:ring-red-500" /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="alcohol" checked={!consumedAlcoholRecently} onChange={() => setConsumedAlcoholRecently(false)} className="text-red-600 focus:ring-red-500" /> No
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-stone-800">
                Do you have any chronic diseases (e.g., HIV, Hepatitis, Heart Disease)?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="disease" checked={hasChronicDiseases} onChange={() => setHasChronicDiseases(true)} className="text-red-600 focus:ring-red-500" /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="disease" checked={!hasChronicDiseases} onChange={() => setHasChronicDiseases(false)} className="text-red-600 focus:ring-red-500" /> No
                </label>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
