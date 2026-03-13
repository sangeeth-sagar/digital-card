import React from 'react';
import '../assets/styles/ContactHistory.css';

export default function ContactHistory({ contacts }) {
  if (!contacts.length) return null;

  const recent = contacts.slice(-10).reverse();

  return (
    <>
      <div className="contacts-chip">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M9 6a2 2 0 100-4 2 2 0 000 4zM2 12c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4"/>
        </svg>
        Contacts Saved
        <div className="badge">{contacts.length}</div>
      </div>

      <div className="history-section">
        <h4>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="5.5"/>
            <path d="M7 4v3l2 2"/>
          </svg>
          Recent Scans
        </h4>
        <div className="history-list">
          {recent.map((c, i) => {
            const initials = (c.name || '?')
              .split(' ')
              .map(w => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?';
            const time = c.scanned_at?.split(',')[1]?.trim() || '';

            return (
              <div className="history-item" key={i}>
                <div className="history-avatar">{initials}</div>
                <div className="history-info">
                  <div className="history-name">{c.name || '(No name)'}</div>
                  <div className="history-company">{c.company || c.email || ''}</div>
                </div>
                <div className="history-time">{time}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
