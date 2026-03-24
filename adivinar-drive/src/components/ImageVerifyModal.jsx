import React, { useEffect, useState } from 'react';
import { verifyCardImage } from '../utils/imageVerifier';
import '../assets/styles/ImageVerifyModal.css';

/**
 * ImageVerifyModal
 * Shows 4 checks: Lighting · Sharpness · Angle · Card in Frame
 * Submit only enabled when ALL pass.
 * Retake always available.
 */
export default function ImageVerifyModal({ dataUrl, side, onAccept, onRetake, onClose }) {
  const [state, setState] = useState('checking'); // checking | done
  const [result, setResult] = useState(null);

  const sideLabel = side === 'front' ? 'Front Side' : 'Back Side';

  useEffect(() => {
    if (!dataUrl) return;
    setState('checking');
    setResult(null);
    verifyCardImage(dataUrl).then(r => {
      setResult(r);
      setState('done');
    });
  }, [dataUrl]);

  if (!dataUrl) return null;

  return (
    <div className="verify-backdrop" onClick={onClose}>
      <div className="verify-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="verify-header">
          <div className="verify-header-icon">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 1L11 6H16L12 9L13.5 14L9 11L4.5 14L6 9L2 6H7Z"/>
            </svg>
          </div>
          <div>
            <h4>Photo Check</h4>
            <p>{sideLabel}</p>
          </div>
          <button className="verify-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Image preview ── */}
        <div className="verify-preview-wrap">
          <img src={dataUrl} alt="preview" className="verify-preview-img" />

          {/* Corner guide brackets */}
          <div className="verify-frame">
            <span className="vf-corner vfc-tl" />
            <span className="vf-corner vfc-tr" />
            <span className="vf-corner vfc-bl" />
            <span className="vf-corner vfc-br" />
          </div>

          {/* Scanning overlay */}
          {state === 'checking' && (
            <div className="verify-scan-overlay">
              <div className="verify-scan-line" />
              <span className="verify-scan-label">Analysing photo…</span>
            </div>
          )}

          {/* Result badge */}
          {state === 'done' && result && (
            <div className={`verify-result-badge ${result.passed ? 'vbadge-pass' : 'vbadge-fail'}`}>
              {result.passed ? '✓ Ready' : '✗ Retake needed'}
            </div>
          )}
        </div>

        {/* ── Checks ── */}
        {state === 'checking' && (
          <div className="verify-loading">
            <div className="verify-spinner" />
            <span>Checking lighting, focus &amp; angle…</span>
          </div>
        )}

        {state === 'done' && result && (
          <>
            <div className="verify-checks">
              {Object.values(result.checks).map((chk, i) => (
                <div key={i} className={`vcheck-row ${chk.pass ? 'vcheck-pass' : 'vcheck-fail'}`}>
                  <span className="vcheck-icon">{chk.icon}</span>
                  <div className="vcheck-body">
                    <span className="vcheck-label">{chk.label}</span>
                    <span className="vcheck-reason">{chk.reason}</span>
                  </div>
                  <span className="vcheck-mark">
                    {chk.pass
                      ? <svg viewBox="0 0 14 14" fill="none" stroke="#16a34a" strokeWidth="2.2"><path d="M2 7l3.5 3.5 6.5-6.5"/></svg>
                      : <svg viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="2.2"><path d="M3 3l8 8M11 3l-8 8"/></svg>
                    }
                  </span>
                </div>
              ))}
            </div>

            {/* Main advice line */}
            <div className={`verify-advice ${result.passed ? 'advice-pass' : 'advice-fail'}`}>
              {result.advice}
            </div>

            {/* Buttons */}
            <div className="verify-actions">
              <button className="verify-retake" onClick={onRetake}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 8a6 6 0 1 1 1.5 4"/><path d="M2 12V8h4"/>
                </svg>
                Retake
              </button>
              <button
                className={`verify-accept ${result.passed ? 'va-enabled' : 'va-disabled'}`}
                disabled={!result.passed}
                onClick={result.passed ? () => onAccept(dataUrl) : undefined}
                title={!result.passed ? 'Fix the issues above, then retake' : ''}
              >
                {result.passed
                  ? <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8l3.5 3.5 6.5-7"/></svg> Use Photo</>
                  : <>Fix &amp; Retake</>
                }
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}