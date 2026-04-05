import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { auth } from './firebase';
import { Auth } from './components/Auth';
import { DonorRegistration } from './components/DonorRegistration';
import { BloodRequestForm } from './components/BloodRequestForm';
import { Dashboard } from './components/Dashboard';
import { DonorMatching } from './components/DonorMatching';
import { EligibilityChecker } from './components/EligibilityChecker';
import { Chatbot } from './components/Chatbot';
import { HospitalDashboard } from './components/HospitalDashboard';
import { RequestsList } from './components/RequestsList';
import { Store } from './components/Store';
import { motion } from 'motion/react';
import { Droplet, Heart, Shield, Zap, Award, Users } from 'lucide-react';

const LandingPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-24">
    {/* Hero Section */}
    <section className="relative py-20 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Smart Blood Donation
          </div>
          <h1 className="text-7xl font-black text-stone-900 leading-[1.1] tracking-tight">
            Every Drop <span className="text-red-600">Saves</span> a Life.
          </h1>
          <p className="text-xl text-stone-500 max-w-lg leading-relaxed">
            BloodLink uses AI to connect donors with patients instantly. Join our community of life savers and earn rewards.
          </p>
          <div className="flex flex-wrap gap-4">
            {!isLoggedIn ? (
              <Link to="/auth" className="bg-red-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-red-200 hover:bg-red-700 transition-all hover:scale-105 active:scale-95">
                Start Saving Lives
              </Link>
            ) : (
              <Link to="/match" className="bg-red-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-red-200 hover:bg-red-700 transition-all hover:scale-105 active:scale-95">
                Donate Blood
              </Link>
            )}
            <Link to="/check" className="bg-white text-stone-900 border-2 border-stone-200 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all">
              Check Eligibility
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="aspect-square bg-red-600 rounded-[4rem] rotate-6 absolute inset-0 -z-10 opacity-10"></div>
          <img 
            src="https://picsum.photos/seed/blood/800/800" 
            alt="Blood Donation" 
            className="rounded-[4rem] shadow-2xl object-cover w-full aspect-square"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-3xl shadow-2xl border border-stone-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <Heart className="w-6 h-6 fill-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900">1,240+</p>
              <p className="text-sm text-stone-500 font-bold uppercase tracking-wider">Lives Saved</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Features Grid */}
    <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-10 bg-white rounded-[3rem] border border-stone-100 shadow-xl hover:shadow-2xl transition-all group">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mb-8 group-hover:scale-110 transition-transform">
          <Zap className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-4">Smart Matching</h3>
        <p className="text-stone-500 leading-relaxed">AI-powered matching finds compatible donors within a 10km radius instantly.</p>
      </div>
      <div className="p-10 bg-white rounded-[3rem] border border-stone-100 shadow-xl hover:shadow-2xl transition-all group">
        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-4">Verified Requests</h3>
        <p className="text-stone-500 leading-relaxed">Every blood request is verified with hospital location and urgency levels.</p>
      </div>
      <div className="p-10 bg-white rounded-[3rem] border border-stone-100 shadow-xl hover:shadow-2xl transition-all group">
        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 mb-8 group-hover:scale-110 transition-transform">
          <Award className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-4">Token Rewards</h3>
        <p className="text-stone-500 leading-relaxed">Earn tokens for every donation and referral. Redeem for pharmacy discounts.</p>
      </div>
    </section>

    {/* CTA Section */}
    <section className="bg-stone-900 rounded-[4rem] p-16 text-center text-white relative overflow-hidden">
      <div className="relative z-10 max-w-2xl mx-auto space-y-8">
        <h2 className="text-5xl font-black leading-tight">Ready to make a difference?</h2>
        <p className="text-stone-400 text-xl">Join the BloodLink network today and help us ensure no one has to wait for life-saving blood.</p>
        <Link to="/auth" className="inline-block bg-red-600 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-red-700 transition-all shadow-xl">
          Create Your Profile
        </Link>
      </div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>
      </div>
    </section>
  </div>
); 
};

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<DonorRegistration />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requests" element={<RequestsList />} />
          <Route path="/request/new" element={<BloodRequestForm />} />
          <Route path="/match" element={<DonorMatching />} />
          <Route path="/check" element={<EligibilityChecker />} />
          <Route path="/chat" element={<Chatbot />} />
          <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
          <Route path="/store" element={<Store />} />
        </Routes>
      </Layout>
    </Router>
  );
}
