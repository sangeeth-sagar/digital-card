import React from 'react';
import COMPANY from '../utils/company';
import { downloadPDF, saveVCard, shareCard } from '../utils/pdf';
import '../assets/styles/CardActions.css';

export default function CardActions({ showToast }) {
  const handlePDF = () => {
    try { downloadPDF(); showToast('PDF downloaded ✓', 'success'); }
    catch { showToast('PDF generation failed.', 'error'); }
  };

  const handleShare = async () => {
    try { await shareCard(); showToast('Contact copied to clipboard!', 'info'); }
    catch { showToast('Could not share.', 'error'); }
  };

  const handleVCard = () => {
    saveVCard();
    showToast('vCard saved ✓', 'success');
  };

  return (
    <>
      <div className="action-row">
        <button className="btn btn-dark" onClick={handlePDF}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 13h10"/>
          </svg>
          Save PDF
        </button>
        <button className="btn btn-green" onClick={handleShare}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/>
            <circle cx="12" cy="13" r="1.5"/>
            <path d="M5.5 7l5-3M5.5 9l5 3"/>
          </svg>
          Share
        </button>
        <button className="btn btn-outline" onClick={handleVCard}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 4a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/>
            <path d="M2 7h12M6 11l-1.5-1.5L6 8"/>
          </svg>
          vCard
        </button>
      </div>

      {/* Info strip */}
      <div className="info-strip">

        {/* CEO */}
        <div className="info-strip-row">
          <div className="info-strip-icon">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="5" r="2.5"/>
              <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4"/>
            </svg>
          </div>
          <div>
            <div className="info-strip-label">CEO</div>
            <div className="info-strip-value">{COMPANY.person}</div>
          </div>
        </div>

        {/* CMO */}
        <div className="info-strip-row">
          <div className="info-strip-icon">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="5" r="2.5"/>
              <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4"/>
            </svg>
          </div>
          <div>
            <div className="info-strip-label">CMO</div>
            <div className="info-strip-value">{COMPANY.cmo}</div>
          </div>
        </div>

        {[
          {
            label: 'Email', value: COMPANY.email,
            icon: <><path d="M2 4a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/><path d="M2 5.5l5 3 5-3"/></>,
          },
          {
            label: 'Phone', value: COMPANY.phone,
            icon: <path d="M2 3.5a1 1 0 011-1h1.5l1 2.5-1.2.9c.8 1.8 1.8 2.8 3.6 3.6l.9-1.2L11 9.5V11a1 1 0 01-1 1C4 12 2 7 2 3.5z"/>,
          },
          {
            label: 'Website', value: COMPANY.website,
            icon: <><circle cx="7" cy="7" r="5"/><path d="M2 7h10M7 2c-1.5 2-1.5 8 0 10M7 2c1.5 2 1.5 8 0 10"/></>,
          },
          {
            label: 'Address', value: COMPANY.address,
            icon: <><circle cx="7" cy="6" r="2.5"/><path d="M7 1C4.2 1 2 3.2 2 6c0 3.5 5 8 5 8s5-4.5 5-8c0-2.8-2.2-5-5-5z"/></>,
          },
        ].map(({ label, value, icon }) => (
          <div className="info-strip-row" key={label}>
            <div className="info-strip-icon">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">{icon}</svg>
            </div>
            <div>
              <div className="info-strip-label">{label}</div>
              <div className="info-strip-value">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}