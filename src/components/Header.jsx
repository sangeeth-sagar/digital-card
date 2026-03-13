import React from 'react';
import COMPANY from '../utils/company';
import '../assets/styles/Header.css';

export default function Header() {
  return (
    <div className="header">
      <img
        src="Adivinar-FINAL_2.png"
        alt="Adivinar"
        className="header-logo"
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="header-text">
        <h1>{COMPANY.brand}</h1>
        <p>{COMPANY.name}</p>
      </div>
      <div className="powered-tag">OCR Powered</div>
    </div>
  );
}
