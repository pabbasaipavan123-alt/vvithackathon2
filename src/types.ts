export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyLevel = 'normal' | 'critical';
export type RequestStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'donor' | 'hospital';
  age?: number;
  gender?: 'male' | 'female' | 'other';
  bloodType: BloodType;
  weight?: number;
  phone?: string;
  location?: Location;
  tokens: number;
  referralCode: string;
  referredBy?: string;
  lastDonationDate?: string;
  isDonor: boolean;
  createdAt: string;
  redeemedItems?: string[];
  licenseCode?: string;
  consumedAlcoholRecently?: boolean;
  hasChronicDiseases?: boolean;
}

export interface BloodRequest {
  id: string;
  requesterId: string;
  bloodType: BloodType;
  units: number;
  hospitalName: string;
  location: Location;
  urgency: UrgencyLevel;
  status: RequestStatus;
  createdAt: string;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  requestId?: string;
  date: string;
  tokensEarned: number;
  verified: boolean;
  createdAt: string;
}
