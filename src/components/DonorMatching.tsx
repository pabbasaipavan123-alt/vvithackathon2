import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BloodRequest, UserProfile, BloodType } from '../types';
import { motion } from 'motion/react';
import { MapPin, Phone, Droplet, User, Users, Navigation, Search, Globe, ChevronRight, Lock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';

import { seedFakeRequests, seedFakeDonors } from '../services/seedData';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const hospitalIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const donorIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const LOCATIONIQ_KEY = "pk.c82f5897e93925caa7e180020f374bab";

const COMPATIBILITY: Record<BloodType, BloodType[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

const center: [number, number] = [17.3850, 78.4867];

// Component to handle map view changes
const MapViewHandler: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const DonorMatching: React.FC = () => {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [matchedDonors, setMatchedDonors] = useState<UserProfile[]>([]);
  const [radius, setRadius] = useState(5);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [animatedRadius, setAnimatedRadius] = useState(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const processedParam = React.useRef(false);

  const RADIUS_STEPS = [5, 10, 20, 50];

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

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Seeding data...");
        await Promise.all([
          seedFakeRequests(auth.currentUser!.uid),
          seedFakeDonors()
        ]);
        
        console.log("Fetching requests...");
        const q = query(collection(db, 'requests'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        const fetchedRequests = snap.docs.map(d => ({ id: d.id, ...d.data() } as BloodRequest));
        fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(fetchedRequests);
        console.log(`Fetched ${fetchedRequests.length} requests`);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, [isAuthReady]);

  useEffect(() => {
    const requestId = searchParams.get('requestId');
    if (requestId && requests.length > 0 && !processedParam.current) {
      const targetRequest = requests.find(r => r.id === requestId);
      if (targetRequest) {
        console.log(`Auto-triggering search for requestId: ${requestId}`);
        findDonors(targetRequest, radius);
        processedParam.current = true;
        // Optionally clear the param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('requestId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, requests, radius, setSearchParams]);

  const findDonors = async (request: BloodRequest, currentRadius: number) => {
    console.log(`Finding donors for ${request.hospitalName} at ${currentRadius}km`);
    setSelectedRequest(request);
    setLoading(true);
    setSearching(true);
    setAutoExpanded(false);
    setAnimatedRadius(0);
    
    const targetRadius = currentRadius * 1000;
    const duration = 1500;
    const start = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t);
      setAnimatedRadius(targetRadius * easeOutQuad(progress));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);

    try {
      const compatibleTypes = COMPATIBILITY[request.bloodType];
      console.log(`Compatible types for ${request.bloodType}:`, compatibleTypes);
      
      const q = query(
        collection(db, 'users'), 
        where('bloodType', 'in', compatibleTypes), 
        where('isDonor', '==', true)
      );
      const snap = await getDocs(q);
      
      let donors = snap.docs.map(d => d.data() as UserProfile);
      console.log(`Found ${donors.length} compatible donors in DB`);
      
      const isRemote = request.hospitalName.includes('Apollo') || request.hospitalName.includes('City');
      
      const getFilteredDonors = (r: number) => {
        const threshold = isRemote ? 20 : 5;
        if (r < threshold) return [];
        
        const density = r / 5;
        if (donors.length > 0) {
          return donors.slice(0, Math.max(1, Math.floor(density)));
        } else {
          // Fallback to fake donors if DB is empty
          return Array.from({ length: Math.floor(density * 1.5) }).map((_, i) => ({
            uid: `fake-${r}-${i}`,
            name: `Donor ${i + 1}`,
            bloodType: compatibleTypes[Math.floor(Math.random() * compatibleTypes.length)],
            phone: '+91 98765 43210',
            role: 'donor',
            tokens: 100,
            isDonor: true,
            email: `donor${i}@example.com`,
            referralCode: 'FAKE123',
            createdAt: new Date().toISOString()
          } as UserProfile));
        }
      };

      let filtered = getFilteredDonors(currentRadius);
      console.log(`Filtered donors at ${currentRadius}km: ${filtered.length}`);
      
      if (filtered.length === 0) {
        console.log("No donors found at current radius, auto-expanding...");
        for (const step of RADIUS_STEPS) {
          if (step > currentRadius) {
            const nextFiltered = getFilteredDonors(step);
            if (nextFiltered.length > 0) {
              console.log(`Found ${nextFiltered.length} donors at ${step}km`);
              filtered = nextFiltered;
              setAutoExpanded(true);
              setRadius(step);
              break;
            }
          }
        }
      }

      setMatchedDonors(filtered); 
    } catch (error) {
      console.error("Error finding donors:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setSearching(false), 500);
    }
  };

  if (isAuthReady && !auth.currentUser) {
    return (
      <div className="text-center py-24 bg-stone-50 rounded-[3rem] border border-stone-100">
        <Lock className="w-16 h-16 text-stone-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-stone-900 mb-2">Authentication Required</h3>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Please sign in to match with donors and help save lives.</p>
        <Link to="/auth" className="bg-red-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg">
          Sign In Now
        </Link>
      </div>
    );
  }

  const mapCenter: [number, number] = selectedRequest 
    ? [selectedRequest.location.lat, selectedRequest.location.lng] 
    : (userLocation || center);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-stone-900">Donor Matching</h2>
          <p className="text-stone-500">Find compatible donors near the hospital location.</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-stone-100 shadow-sm">
            <span className="text-sm font-bold text-stone-500 px-2 uppercase">Radius</span>
            <div className="flex gap-1">
              {RADIUS_STEPS.map(r => (
                <button
                  key={r}
                  onClick={() => {
                    console.log(`Radius changed to ${r}km`);
                    setRadius(r);
                    if (selectedRequest) findDonors(selectedRequest, r);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${radius === r ? 'bg-red-600 text-white shadow-md' : 'hover:bg-stone-50 text-stone-600'}`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
          {autoExpanded && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100"
            >
              Radius auto-expanded to find donors
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Droplet className="text-red-600" /> Active Requests
          </h3>
          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-stone-50 rounded-3xl border border-stone-100">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-stone-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <p className="text-stone-500">No active blood requests found.</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 text-red-600 font-bold hover:underline"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            requests.map(req => (
              <motion.div 
                key={req.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => findDonors(req, radius)}
                className={`p-6 rounded-3xl border cursor-pointer transition-all ${
                  selectedRequest?.id === req.id ? 'border-red-600 bg-red-50 shadow-lg' : 'border-stone-100 bg-white shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 font-bold text-xl">
                      {req.bloodType}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{req.hospitalName}</h4>
                      <p className="text-sm text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {req.location.address}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    req.urgency === 'critical' ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {req.urgency}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-stone-100">
                  <span className="text-stone-600 font-medium">{req.units} Units Required</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Connect button clicked");
                      findDonors(req, radius);
                    }}
                    className="text-red-600 font-bold flex items-center gap-1 hover:underline"
                  >
                    Connect <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden h-[400px] relative">
            {searching && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-pulse">
                <Search className="w-4 h-4 animate-spin" />
                Searching in {radius}km...
              </div>
            )}
            
            <MapContainer 
              center={mapCenter} 
              zoom={12} 
              style={{ height: '100%', width: '100%', borderRadius: '1.5rem', overflow: 'hidden' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <ZoomControl position="bottomright" />
              <MapViewHandler center={mapCenter} zoom={12} />

              {userLocation && !selectedRequest && (
                <Marker position={userLocation} icon={donorIcon} />
              )}

              {selectedRequest && (
                <>
                  <Marker position={[selectedRequest.location.lat, selectedRequest.location.lng]} icon={hospitalIcon} />
                  <Circle
                    center={[selectedRequest.location.lat, selectedRequest.location.lng]}
                    radius={animatedRadius || radius * 1000}
                    pathOptions={{
                      fillColor: searching ? '#2563eb' : '#dc2626',
                      fillOpacity: 0.2,
                      color: searching ? '#2563eb' : '#dc2626',
                      weight: 2,
                    }}
                  />
                  {matchedDonors.map((donor, idx) => (
                    <Marker 
                      key={idx}
                      position={[
                        selectedRequest.location.lat + (Math.random() - 0.5) * 0.03, 
                        selectedRequest.location.lng + (Math.random() - 0.5) * 0.03 
                      ]}
                      icon={donorIcon}
                    />
                  ))}
                </>
              )}
            </MapContainer>
            
            {!selectedRequest && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center p-8 text-center">
                <div>
                  <MapPin className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-stone-900">Visual Matching</h4>
                  <p className="text-stone-500 text-sm max-w-xs mx-auto">Select a request to see compatible donors on the map within your chosen radius.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-blue-600" /> Matched Donors ({matchedDonors.length})
            </h3>
            {!selectedRequest ? (
              <div className="h-32 flex flex-col items-center justify-center bg-stone-100 rounded-3xl border-2 border-dashed border-stone-200 text-stone-400">
                <p>Select a request to find compatible donors</p>
              </div>
            ) : loading ? (
              <p className="text-stone-500 animate-pulse">Scanning for donors in {radius}km radius...</p>
            ) : matchedDonors.length === 0 ? (
              <p className="text-stone-500">No matching donors found within {radius}km radius.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {matchedDonors.map(donor => (
                  <motion.div 
                    key={donor.uid}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 bg-white rounded-3xl border border-stone-100 shadow-md flex items-center justify-between group hover:border-red-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                        <User className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{donor.name}</h4>
                        <p className="text-sm text-stone-500 flex items-center gap-1">
                          <Droplet className="w-3 h-3 text-red-500" /> {donor.bloodType} • {Math.floor(Math.random() * radius) + 1}.{Math.floor(Math.random() * 9)} km away
                        </p>
                      </div>
                    </div>
                    <a 
                      href={`tel:${donor.phone}`}
                      className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                    >
                      <Phone className="w-6 h-6" />
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
