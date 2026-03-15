import { useEffect, useState } from 'react';
import { getStaff } from '../lib/db';
import { StaffMember } from '../types';

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaff().then(data => {
      setStaff(data);
      setLoading(false);
    });
  }, []);

  return { staff, loading, setStaff };
}
