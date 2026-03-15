export type GuestType = 'Hotel' | 'Residence' | 'Day Pass';
export type Gender = 'M' | 'F';
export type Session = 'Morning' | 'Afternoon' | 'Evening';
export type PickupMethod = 'with mom' | 'with dad' | 'with nanny' | 'with guardian';
export type VisitStatus = 'pending' | 'checked-in' | 'checked-out';

export interface Child {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  birthdate: string;
  allergies: string;
}

export interface Registration {
  id?: string;
  guestType: GuestType;
  roomNumber: string;
  parentName: string;
  phone: string;
  email: string;
  country: string;
  children: Child[];
  securityPin: string;
  pickupMethod: PickupMethod;
  parentPreferences: string;
  disclaimerSigned: boolean;
  signature: string;
  departureDate: string;
  isFirstVisit: boolean;
  createdAt?: string;
}

export interface Visit {
  id?: string;
  registrationId: string;
  childId: string;
  childName: string;
  parentName: string;
  roomNumber: string;
  guestType: GuestType;
  session: Session;
  date: string;
  status: VisitStatus;
  checkInTime: string | null;
  checkInBy: string | null;
  checkOutTime: string | null;
  checkOutBy: string | null;
  pickupMethod: PickupMethod;
  departureDate: string;
  staffNotes: string;
  operaChecked: boolean;
  disclaimerSigned: boolean;
  securityPin: string;
  allergies: string;
  parentPreferences?: string;
}

export interface StaffMember {
  id?: string;
  name: string;
  role: string;
  active: boolean;
}
