import React from 'react';
import COMPANY from '../utils/company';
import '../assets/styles/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} {COMPANY.name} · {COMPANY.brand}</p>
    </footer>
  );
}
