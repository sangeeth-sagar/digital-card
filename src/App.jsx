import React from 'react';
import Header         from './components/Header';
import FlipCard       from './components/FlipCard';
import CardActions    from './components/CardActions';
import Scanner        from './components/Scanner';
import ContactHistory from './components/ContactHistory';
import Toast          from './components/Toast';
import Footer         from './components/Footer';
import { useContacts } from './hooks/useContacts';
import { useToast }    from './hooks/useToast';

export default function App() {
  const { contacts, addContact } = useContacts();
  const { toast, showToast }     = useToast();

  return (
    <main>
      <Header />
      <FlipCard />
      <CardActions showToast={showToast} />
      <Scanner    showToast={showToast} onContactSaved={addContact} />
      <ContactHistory contacts={contacts} />
      <Footer />
      <Toast toast={toast} />
    </main>
  );
}
