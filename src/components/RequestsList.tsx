import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BloodRequest } from '../types';
import { motion } from 'motion/react';
import { MapPin, Droplet, AlertCircle, Lock, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { seedFakeRequests } from '../services/seedData';
import { onAuthStateChanged } from 'firebase/auth';

export const RequestsList: React.FC = () => {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthReady(true);
      if (!user) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!auth.currentUser) return;

    const fetchRequests = async () => {
      const timeoutId = setTimeout(() => {
        if (loading) {
          setError("Request timed out. Please check your internet connection and Firebase configuration.");
          setLoading(false);
        }
      }, 10000);

      try {
        console.log("RequestsList: Starting fetch...");
        await seedFakeRequests(auth.currentUser!.uid);
        console.log("RequestsList: Seeding complete (if needed)");
        
        const q = query(collection(db, 'requests'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        console.log(`RequestsList: Fetched ${snap.docs.length} docs`);
        
        const fetchedRequests = snap.docs.map(d => ({ id: d.id, ...d.data() } as BloodRequest));
        fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setRequests(fetchedRequests);
        setError(null);
      } catch (err: any) {
        console.error("RequestsList: Error fetching requests:", err);
        setError(err.message || "Failed to load requests.");
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    fetchRequests();
  }, [isAuthReady]);

  if (isAuthReady && !auth.currentUser) {
    return (
      <div className="text-center py-24 bg-stone-50 rounded-[3rem] border border-stone-100">
        <Lock className="w-16 h-16 text-stone-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-stone-900 mb-2">Authentication Required</h3>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Please sign in to view active blood requests and help save lives.</p>
        <Link to="/auth" className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg">
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-stone-900">Blood Requests</h2>
          <p className="text-stone-500">Urgent needs from hospitals and patients near you.</p>
        </div>
        <Link to="/request/new" className="bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-700 transition-all">
          Post Request
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500">Loading requests...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-3xl border border-red-100 p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-red-700 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Try Again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 bg-stone-100 rounded-3xl border-2 border-dashed border-stone-200">
          <AlertCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 text-lg">No active requests at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(req => (
            <motion.div 
              key={req.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl shadow-md border border-stone-100 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  req.urgency === 'critical' ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-600'
                }`}>
                  {req.urgency}
                </div>
                <div className="text-red-600 font-black text-2xl">{req.bloodType}</div>
              </div>
              
              <h4 className="text-xl font-bold text-stone-900 mb-1">{req.hospitalName}</h4>
              <p className="text-stone-500 text-sm flex items-center gap-1 mb-4">
                <MapPin className="w-4 h-4" /> {req.location.address}
              </p>

              <div className="flex flex-col gap-3 pt-4 border-t border-stone-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Droplet className="w-4 h-4 text-red-500" />
                    <span className="font-bold">{req.units} Units</span>
                  </div>
                  <span className="text-xs text-stone-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                
                <Link 
                  to={`/match?requestId=${req.id}`} 
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-center hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" /> Connect
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
