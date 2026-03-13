import { useState, useCallback } from 'react';

export function useContacts() {
  const [contacts, setContacts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nc_contacts') || '[]');
    } catch {
      return [];
    }
  });

  const addContact = useCallback((data) => {
    setContacts(prev => {
      const next = [...prev, data];
      localStorage.setItem('nc_contacts', JSON.stringify(next));
      return next;
    });
  }, []);

  return { contacts, addContact };
}
