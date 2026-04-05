import { collection, addDoc, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BloodType, UrgencyLevel } from '../types';

const SAMPLE_HOSPITALS = [
  { name: 'City General Hospital', lat: 17.3850, lng: 78.4867, address: 'Abids, Hyderabad' },
  { name: 'Apollo Health City', lat: 17.4265, lng: 78.4123, address: 'Jubilee Hills, Hyderabad' },
  { name: 'Yashoda Hospital', lat: 17.4523, lng: 78.4982, address: 'Secunderabad, Hyderabad' },
  { name: 'Care Hospital', lat: 17.4123, lng: 78.4456, address: 'Banjara Hills, Hyderabad' },
];

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES: UrgencyLevel[] = ['normal', 'critical'];

export const seedFakeDonors = async () => {
  const q = query(collection(db, 'users'), where('isDonor', '==', true), limit(1));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    console.log('Donors already exist, skipping seed.');
    return;
  }

  console.log('Seeding fake donors...');
  
  const names = ['Rahul Sharma', 'Priya Patel', 'Amit Singh', 'Sneha Reddy', 'Vikram Rao', 'Anjali Gupta', 'Karan Verma', 'Deepa Nair'];
  
  for (let i = 0; i < names.length; i++) {
    const bloodType = BLOOD_TYPES[Math.floor(Math.random() * BLOOD_TYPES.length)];
    
    await addDoc(collection(db, 'users'), {
      uid: `seed-donor-${i}`,
      name: names[i],
      email: `donor${i}@example.com`,
      bloodType,
      phone: `+91 98765 ${10000 + i}`,
      role: 'donor',
      tokens: 100,
      isDonor: true,
      referralCode: `DONOR${i}`,
      createdAt: new Date().toISOString()
    });
  }
  
  console.log('Donor seed complete.');
};

export const seedFakeRequests = async (userId: string) => {
  const q = query(collection(db, 'requests'), limit(1));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    console.log('Requests already exist, skipping seed.');
    return;
  }

  console.log('Seeding fake requests...');
  
  for (let i = 0; i < 5; i++) {
    const hospital = SAMPLE_HOSPITALS[Math.floor(Math.random() * SAMPLE_HOSPITALS.length)];
    const bloodType = BLOOD_TYPES[Math.floor(Math.random() * BLOOD_TYPES.length)];
    const urgency = URGENCIES[Math.floor(Math.random() * URGENCIES.length)];
    
    await addDoc(collection(db, 'requests'), {
      requesterId: userId,
      bloodType,
      units: Math.floor(Math.random() * 5) + 1,
      hospitalName: hospital.name,
      location: {
        lat: hospital.lat + (Math.random() - 0.5) * 0.02,
        lng: hospital.lng + (Math.random() - 0.5) * 0.02,
        address: hospital.address
      },
      urgency,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }
  
  console.log('Seed complete.');
};
