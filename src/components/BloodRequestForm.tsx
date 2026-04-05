import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BloodType, UrgencyLevel, UserProfile } from '../types';
import { Droplet, Hospital, MapPin, AlertCircle, Send, Phone, User, Search } from 'lucide-react';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Haversine formula to calculate distance between two lat/lng points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
};

export const BloodRequestForm: React.FC = () => {
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [units, setUnits] = useState('1');
  const [address, setAddress] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number}>({ lat: 17.3850, lng: 78.4867 });
  const [locating, setLocating] = useState(false);
  
  const [matchedDonors, setMatchedDonors] = useState<UserProfile[] | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(0);
  const [sosSent, setSosSent] = useState(false);

  const navigate = useNavigate();

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }
    setLoading(true);

    try {
      // 1. Save the request
      await addDoc(collection(db, 'requests'), {
        requesterId: auth.currentUser.uid,
        bloodType,
        units: parseInt(units),
        hospitalName: 'Current Location',
        location: {
          address,
          lat: coords.lat,
          lng: coords.lng
        },
        urgency,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 2. Find nearby donors
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isDonor', '==', true), where('bloodType', '==', bloodType));
      const querySnapshot = await getDocs(q);
      
      const allDonors: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        // Don't match with self
        if (data.uid !== auth.currentUser?.uid && data.location?.lat && data.location?.lng) {
          allDonors.push(data);
        }
      });

      // 3. Radius search logic
      let currentRadius = 5; // Start with 5km
      const maxRadius = 100; // Max 100km
      let foundDonors: UserProfile[] = [];

      while (currentRadius <= maxRadius && foundDonors.length === 0) {
        foundDonors = allDonors.filter(donor => {
          if (!donor.location) return false;
          const dist = calculateDistance(coords.lat, coords.lng, donor.location.lat, donor.location.lng);
          return dist <= currentRadius;
        });

        if (foundDonors.length === 0) {
          currentRadius += 10; // Increase radius by 10km if no donors found
        }
      }

      setSearchRadius(currentRadius > maxRadius ? maxRadius : currentRadius);
      setMatchedDonors(foundDonors);
      setSosSent(true);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (sosSent && matchedDonors) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-green-50 rounded-full mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-stone-900 mb-2">SOS Sent Successfully!</h2>
            <p className="text-stone-500">
              Your request has been posted. We searched within a <span className="font-bold text-stone-800">{searchRadius}km radius</span>.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-red-500" /> Nearby Active Donors ({matchedDonors.length})
            </h3>
            
            {matchedDonors.length > 0 ? (
              <div className="grid gap-4">
                {matchedDonors.map((donor) => (
                  <div key={donor.uid} className="p-4 border border-stone-100 rounded-2xl bg-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-lg">
                        {donor.bloodType}
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-stone-400" /> {donor.name}
                        </h4>
                        <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
                          <Phone className="w-4 h-4 text-stone-400" /> {donor.phone || 'No phone provided'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-1 rounded">
                        Active
                      </span>
                      {donor.location && (
                        <p className="text-xs text-stone-500 mt-2">
                          ~{calculateDistance(coords.lat, coords.lng, donor.location.lat, donor.location.lng).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-red-50 rounded-2xl text-center border border-red-100">
                <p className="text-red-800 font-medium">No active donors found within {searchRadius}km with blood type {bloodType}.</p>
                <p className="text-sm text-red-600 mt-2">We will keep notifying users as they become active.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/requests')}
            className="w-full mt-8 bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-stone-800 transition-all shadow-lg active:scale-95"
          >
            View All Requests
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-50 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-stone-900">Request Blood</h2>
            <p className="text-stone-500">Submit an urgent request for blood donation.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Droplet className="w-4 h-4 text-red-500" /> Blood Type Needed
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
              <label className="text-sm font-semibold text-stone-700">Units Required</label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" /> Location
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                {locating ? 'Locating...' : 'Location instantly'}
              </button>
            </div>
            <input
              type="text"
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Use my current location or type address"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Urgency Level</label>
            <div className="flex gap-4">
              {(['normal', 'critical'] as UrgencyLevel[]).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`flex-1 py-3 rounded-xl font-semibold border transition-all ${
                    urgency === level 
                      ? 'bg-red-600 text-white border-red-600 shadow-md' 
                      : 'bg-white text-stone-600 border-stone-200 hover:border-red-300'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : (
              <>
                <Send className="w-5 h-5" />
                Post Request
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
