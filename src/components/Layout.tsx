import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { LogOut, Droplet, User as UserIcon, MessageSquare, Award, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await getDoc(doc(db, 'users', u.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <Droplet className="w-8 h-8 text-red-600 fill-red-600" />
              <span className="text-2xl font-bold tracking-tight text-red-600">BloodLink</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/requests" className="text-stone-600 hover:text-red-600 font-medium transition-colors">Requests</Link>
              {profile?.role === 'hospital' ? (
                <Link to="/hospital/dashboard" className="text-stone-600 hover:text-red-600 font-medium transition-colors">Hospital Dashboard</Link>
              ) : (
                <>
                  <Link to="/match" className="text-stone-600 hover:text-red-600 font-medium transition-colors">Find Patient</Link>
                  <Link to="/store" className="text-stone-600 hover:text-red-600 font-medium transition-colors">Rewards Store</Link>
                </>
              )}
              {user ? (
                <div className="flex items-center gap-4">
                  {profile?.role !== 'hospital' && (
                    <Link to="/store" className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full font-semibold hover:bg-red-100 transition-colors">
                      <Award className="w-4 h-4" />
                      {profile?.tokens || 0} Tokens
                    </Link>
                  )}
                  <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="bg-red-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg">
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Floating Chatbot Button */}
      <Link to="/chat" className="fixed bottom-8 right-8 bg-red-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50">
        <MessageSquare className="w-6 h-6" />
      </Link>
    </div>
  );
};
