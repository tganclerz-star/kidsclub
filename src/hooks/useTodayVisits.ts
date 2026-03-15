import { useEffect, useState } from 'react';
import { subscribeTodayVisits } from '../lib/db';
import { Visit } from '../types';

export function useTodayVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeTodayVisits(data => {
      setVisits(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const checkedIn = visits.filter(v => v.status === 'checked-in');
  const checkedOut = visits.filter(v => v.status === 'checked-out');
  const pending = visits.filter(v => v.status === 'pending');

  return { visits, checkedIn, checkedOut, pending, loading };
}
