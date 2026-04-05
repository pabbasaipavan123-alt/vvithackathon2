import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Droplet, Mail, Lock, User, Phone, Share2, ShieldCheck } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'donor' | 'hospital'>('donor');
  const [referralInput, setReferralInput] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    setVerificationSent(false);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const proceed = () => {
            if (userData.role === 'hospital') {
              navigate('/hospital/dashboard');
            } else {
              // Check if profile is complete (e.g., age is present)
              if (userData.age) {
                navigate('/dashboard');
              } else {
                navigate('/register');
              }
            }
          };

          proceed();
        } else {
          navigate('/register');
        }
      } else {
        if (role === 'hospital' && licenseCode.length < 5) {
          throw new Error('Please enter a valid Hospital License Code (min 5 characters).');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        

        // Handle referral if provided
        if (referralInput.trim()) {
          const q = query(collection(db, 'users'), where('referralCode', '==', referralInput.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const referrerDoc = snap.docs[0];
            const referrerData = referrerDoc.data();
            await updateDoc(doc(db, 'users', referrerDoc.id), {
              tokens: (referrerData.tokens || 0) + 25
            });
          }
        }

        // Initialize profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          role,
          tokens: role === 'hospital' ? 0 : 50, // Signup bonus only for donors
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          referredBy: referralInput.trim().toUpperCase() || null,
          isDonor: role === 'donor',
          bloodType: 'O+', // Default
          createdAt: new Date().toISOString(),
          ...(role === 'hospital' && { licenseCode })
        });
        
        if (role === 'hospital') {
          navigate('/hospital/dashboard');
        } else {
          navigate('/register');
        }
      }
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Email already exists. Please sign in instead.');
      } else if (code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-red-50 rounded-2xl mb-4">
            <Droplet className="w-8 h-8 text-red-600 fill-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900">{isLogin ? 'Welcome Back' : 'Join BloodLink'}</h2>
          <p className="text-stone-500 mt-2">{isLogin ? 'Save lives by donating blood' : 'Start your journey as a life saver'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Full Name / Hospital Name"
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('donor')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'donor' ? 'bg-white text-red-600 shadow-sm' : 'text-stone-500'}`}
                >
                  Donor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('hospital')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'hospital' ? 'bg-white text-red-600 shadow-sm' : 'text-stone-50'}`}
                >
                  Hospital
                </button>
              </div>
              {role === 'hospital' && (
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Hospital License Code"
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="relative">
                <Share2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Referral Code (Optional)"
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all uppercase"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center font-medium">{message}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isSubmitting ? 'bg-stone-400 text-stone-100' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-red-200 active:scale-95'}`}
          >
            {isSubmitting ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-stone-600 hover:text-red-600 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
