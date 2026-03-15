import { useEffect, useState, useRef } from 'react';
import { subscribeTodayVisits } from '../lib/db';
import { restQuery } from '../lib/firebase';
import { Visit } from '../types';
import { format } from 'date-fns';

export function useTodayVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const gotData = useRef(false);

  useEffect(() => {
    const unsub = subscribeTodayVisits(data => {
      gotData.current = true;
      setVisits(data);
      setLoading(false);
    });

    // Fallback: if SDK hasn't delivered data in 5s, use REST
    const timer = setTimeout(async () => {
      if (!gotData.current) {
        console.warn('onSnapshot timeout, falling back to REST');
        try {
          const today = format(new Date(), 'yyyy-MM-dd');
          const docs = await restQuery('kc_visits', 'date', 'EQUAL', today);
          setVisits(docs as Visit[]);
        } catch (e) {
          console.error('REST fallback also failed:', e);
        }
        setLoading(false);
      }
    }, 5000);

    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const checkedIn = visits.filter(v => v.status === 'checked-in');
  const checkedOut = visits.filter(v => v.status === 'checked-out');
  const pending = visits.filter(v => v.status === 'pending');

  return { visits, checkedIn, checkedOut, pending, loading };
}
