import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { BloodRequest, DonationRecord, UserProfile } from '../types';
import { motion } from 'motion/react';
import { Hospital, Plus, CheckCircle, Clock, Users, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HospitalDashboard: React.FC = () => {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, fulfilled: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'requests'), where('status', 'in', ['pending', 'fulfilled']));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as BloodRequest));
      setRequests(data);
      setStats({
        active: data.filter(r => r.status === 'pending').length,
        fulfilled: data.filter(r => r.status === 'fulfilled').length
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleVerifyDonation = async (requestId: string, donorId: string) => {
    try {
      // 1. Mark request as fulfilled
      await updateDoc(doc(db, 'requests', requestId), { status: 'fulfilled' });

      // 2. Create donation record
      await addDoc(collection(db, 'donations'), {
        donorId,
        requestId,
        date: new Date().toISOString(),
        tokensEarned: 50,
        verified: true,
        createdAt: new Date().toISOString()
      });

      // 3. Find donor document by UID and update tokens
      const donorQuery = query(collection(db, 'users'), where('uid', '==', donorId));
      const donorSnap = await getDocs(donorQuery);
      if (donorSnap.empty) {
        alert('Donor not found. Verified request is still marked fulfilled.');
      } else {
        const donorDoc = donorSnap.docs[0];
        const donorData = donorDoc.data();
        const currentTokens = typeof donorData.tokens === 'number' ? donorData.tokens : Number(donorData.tokens) || 0;
        await updateDoc(donorDoc.ref, {
          tokens: currentTokens + 50,
          lastDonationDate: new Date().toISOString()
        });
        alert('Donation verified successfully! Tokens awarded to donor.');
      }

      // Refresh local request list and stats after verification
      const refreshedRequests = await getDocs(query(collection(db, 'requests'), where('status', 'in', ['pending', 'fulfilled'])));
      const data = refreshedRequests.docs.map(d => ({ id: d.id, ...d.data() } as BloodRequest));
      setRequests(data);
      setStats({
        active: data.filter(r => r.status === 'pending').length,
        fulfilled: data.filter(r => r.status === 'fulfilled').length
      });
    } catch (err) {
      console.error(err);
      alert('Failed to verify donation. Please retry.');
    }
  };

  if (loading) return <div className="text-center py-12">Loading hospital dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-stone-900">Hospital Panel</h2>
          <p className="text-stone-500">Manage your blood requests and verify life-saving donations.</p>
        </div>
        <Link to="/request/new" className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Request
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-stone-500 uppercase">Active Requests</span>
          </div>
          <p className="text-4xl font-black">{stats.active}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-bold text-stone-500 uppercase">Fulfilled</span>
          </div>
          <p className="text-4xl font-black">{stats.fulfilled}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-bold text-stone-500 uppercase">Total Impact</span>
          </div>
          <p className="text-4xl font-black">{stats.fulfilled * 3} Lives Saved</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Your Requests</h3>
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
            <p className="text-stone-400">No requests posted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map(req => (
              <motion.div 
                key={req.id}
                className="bg-white p-6 rounded-3xl border border-stone-100 shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 font-bold text-xl">
                      {req.bloodType}
                    </div>
                    <div>
                      <h4 className="font-bold">{req.units} Units Required</h4>
                      <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">{req.urgency} urgency</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${req.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {req.status}
                  </span>
                </div>

                {req.status === 'pending' && (
                  <div className="mt-6 pt-6 border-t border-stone-50">
                    <p className="text-sm text-stone-500 mb-4 italic">Verify donor donation and complete request:</p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={async () => {
                          const donorId = window.prompt('Enter donor UID to verify donation:');
                          if (!donorId) return;
                          await handleVerifyDonation(req.id, donorId.trim());
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition-all"
                      >
                        Verify Donation
                      </button>
                      <button
                        onClick={async () => {
                          await handleVerifyDonation(req.id, 'unknown-donor');
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                      >
                        Mark Completed (No donor UID)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
