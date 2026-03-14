import React from 'react';
import Header      from './components/Header';
import FlipCard    from './components/FlipCard';
import CardActions from './components/CardActions';
import Scanner     from './components/Scanner';
import Toast       from './components/Toast';
import Footer      from './components/Footer';
import { useToast } from './hooks/useToast';

export default function App() {
  const { toast, showToast } = useToast();

  return (
    <main>
      <Header />
      <FlipCard />
      <CardActions showToast={showToast} />
      <Scanner showToast={showToast} />
      <Footer />
      <Toast toast={toast} />
    </main>
  );
}
