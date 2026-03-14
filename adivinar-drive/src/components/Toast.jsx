import React from 'react';
import '../assets/styles/Toast.css';

const ICONS = {
  success: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 7l3 3 5.5-6"/></svg>,
  error:   <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l8 8M11 3l-8 8"/></svg>,
  info:    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M7 5v4M7 9.5v.5"/></svg>,
};

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast toast--${toast.type}`}>
      {ICONS[toast.type]}
      {toast.msg}
    </div>
  );
}
