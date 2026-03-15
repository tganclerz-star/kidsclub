import { useEffect, useState } from 'react';
import { getStaff } from '../lib/db';
import { StaffMember } from '../types';

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getStaff()
      .then(data => {
        setStaff(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load staff:', err);
        setError(err.message || 'Failed to connect to database');
        setLoading(false);
      });
  }, []);

  return { staff, loading, error, setStaff };
}
