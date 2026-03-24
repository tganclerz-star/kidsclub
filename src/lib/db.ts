import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, Timestamp, onSnapshot,
  QuerySnapshot, DocumentData,
} from 'firebase/firestore';
import { db, restGet, restQuery, restCreate } from './firebase';
import { Registration, Visit, StaffMember } from '../types';
import { format } from 'date-fns';
import { hashPin, verifyPin } from './crypto';

/** Race an SDK promise against a timeout — rejects if SDK hangs */
function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('SDK_TIMEOUT')), ms)),
  ]);
}

// ── REGISTRATIONS ────────────────────────────────────────────────────────────

export async function createRegistration(data: Registration): Promise<string> {
  const hashedPin = await hashPin(data.securityPin);
  const payload = {
    ...data,
    securityPin: hashedPin,
    createdAt: Timestamp.now(),
  };
  try {
    const docRef = await withTimeout(addDoc(collection(db, 'kc_registrations'), payload));
    return docRef.id;
  } catch {
    console.warn('Firestore SDK failed for createRegistration, using REST fallback');
    return await restCreate('kc_registrations', {
      ...data,
      securityPin: hashedPin,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function getRegistrationByRoom(roomNumber: string): Promise<Registration | null> {
  try {
    const q = query(
      collection(db, 'kc_registrations'),
      where('roomNumber', '==', roomNumber)
    );
    const snap = await withTimeout(getDocs(q));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Registration;
  } catch {
    console.warn('Firestore SDK failed for getRegistrationByRoom, using REST fallback');
    const docs = await restQuery('kc_registrations', 'roomNumber', 'EQUAL', roomNumber);
    return docs.length > 0 ? docs[0] as Registration : null;
  }
}

export async function getRegistrationByPhone(phone: string): Promise<Registration | null> {
  try {
    const q = query(
      collection(db, 'kc_registrations'),
      where('phone', '==', phone)
    );
    const snap = await withTimeout(getDocs(q));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Registration;
  } catch {
    console.warn('Firestore SDK failed for getRegistrationByPhone, using REST fallback');
    const docs = await restQuery('kc_registrations', 'phone', 'EQUAL', phone);
    return docs.length > 0 ? docs[0] as Registration : null;
  }
}

export async function getRegistrationByEmail(email: string): Promise<Registration | null> {
  try {
    const q = query(
      collection(db, 'kc_registrations'),
      where('email', '==', email)
    );
    const snap = await withTimeout(getDocs(q));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Registration;
  } catch {
    console.warn('Firestore SDK failed for getRegistrationByEmail, using REST fallback');
    const docs = await restQuery('kc_registrations', 'email', 'EQUAL', email);
    return docs.length > 0 ? docs[0] as Registration : null;
  }
}

export async function getAllRegistrations(): Promise<Registration[]> {
  try {
    const snap = await withTimeout(getDocs(
      query(collection(db, 'kc_registrations'), orderBy('createdAt', 'desc'))
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
  } catch {
    console.warn('Firestore SDK failed for registrations, using REST fallback');
    return await restGet('kc_registrations') as Registration[];
  }
}

// ── VISITS ───────────────────────────────────────────────────────────────────

export async function getTodayVisitChildIds(registrationId: string): Promise<Set<string>> {
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const q = query(
      collection(db, 'kc_visits'),
      where('registrationId', '==', registrationId),
      where('date', '==', today)
    );
    const snap = await withTimeout(getDocs(q));
    return new Set(snap.docs.map(d => d.data().childId as string));
  } catch {
    console.warn('Firestore SDK failed for getTodayVisitChildIds, using REST fallback');
    const docs = await restQuery('kc_visits', 'registrationId', 'EQUAL', registrationId);
    return new Set(
      docs.filter((d: any) => d.date === today).map((d: any) => d.childId as string)
    );
  }
}

export async function createVisit(data: Omit<Visit, 'id'>, pinAlreadyHashed = false): Promise<string> {
  const securityPin = pinAlreadyHashed ? data.securityPin : await hashPin(data.securityPin);
  const payload = { ...data, securityPin };
  try {
    const docRef = await withTimeout(addDoc(collection(db, 'kc_visits'), {
      ...payload,
      createdAt: Timestamp.now(),
    }));
    return docRef.id;
  } catch {
    console.warn('Firestore SDK failed for createVisit, using REST fallback');
    return await restCreate('kc_visits', {
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function checkInChild(visitId: string, staffName: string, session: string, operaChecked: boolean): Promise<void> {
  await updateDoc(doc(db, 'kc_visits', visitId), {
    status: 'checked-in',
    session,
    operaChecked,
    checkInTime: format(new Date(), 'HH:mm'),
    checkInBy: staffName,
  });
}

export async function checkOutChild(
  visitId: string,
  staffName: string,
  enteredPin: string
): Promise<{ success: boolean; message: string }> {
  const snap = await getDoc(doc(db, 'kc_visits', visitId));
  if (!snap.exists()) return { success: false, message: 'Visit not found' };

  const visit = snap.data() as Visit;
  const pinMatch = await verifyPin(enteredPin, visit.securityPin);
  if (!pinMatch) {
    return { success: false, message: 'Incorrect PIN — please ask the parent again' };
  }

  await updateDoc(doc(db, 'kc_visits', visitId), {
    status: 'checked-out',
    checkOutTime: format(new Date(), 'HH:mm'),
    checkOutBy: staffName,
  });
  return { success: true, message: 'Child checked out successfully' };
}

export async function checkOutChildOverride(
  visitId: string,
  staffName: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, 'kc_visits', visitId), {
    status: 'checked-out',
    checkOutTime: format(new Date(), 'HH:mm'),
    checkOutBy: `${staffName} (override)`,
    staffNotes: reason,
  });
}

export async function updateVisitNotes(visitId: string, notes: string, operaChecked: boolean): Promise<void> {
  await updateDoc(doc(db, 'kc_visits', visitId), { staffNotes: notes, operaChecked });
}

// Real-time subscription for today's visits
export function subscribeTodayVisits(callback: (visits: Visit[]) => void): () => void {
  const today = format(new Date(), 'yyyy-MM-dd');
  const q = query(
    collection(db, 'kc_visits'),
    where('date', '==', today)
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)));
  }, (error) => {
    console.error('Firestore subscription error:', error);
    callback([]);
  });
}

export async function getAllVisits(): Promise<Visit[]> {
  try {
    const snap = await withTimeout(getDocs(query(collection(db, 'kc_visits'), orderBy('date', 'desc'))));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit));
  } catch {
    console.warn('Firestore SDK failed for visits, using REST fallback');
    return await restGet('kc_visits') as Visit[];
  }
}

// ── STAFF ─────────────────────────────────────────────────────────────────────

const DEFAULT_STAFF = ['Amruta', 'Shruti', 'Hannah', 'Anara', 'Akash', 'Yukesh'];

let seeding = false;

export async function getStaff(): Promise<StaffMember[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, 'kc_staff')));
    if (snap.empty && !seeding) {
      seeding = true;
      const results: StaffMember[] = [];
      for (const name of DEFAULT_STAFF) {
        const ref = await addDoc(collection(db, 'kc_staff'), { name, role: 'Kids Club Staff', active: true });
        results.push({ id: ref.id, name, role: 'Kids Club Staff', active: true });
      }
      return results;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
  } catch (err) {
    console.warn('Firestore SDK failed, using REST API fallback:', err);
    const docs = await restGet('kc_staff');
    return docs as StaffMember[];
  }
}

export async function addStaffMember(data: Omit<StaffMember, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kc_staff'), data);
  return docRef.id;
}

export async function toggleStaffActive(staffId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'kc_staff', staffId), { active });
}
