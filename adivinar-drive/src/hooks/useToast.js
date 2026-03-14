import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null); // { msg, type }
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return { toast, showToast };
}
