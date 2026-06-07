import { useState, useCallback, useRef } from 'react';

export const useSalesToast = () => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ show: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  }, []);

  return { toast, showToast };
};
