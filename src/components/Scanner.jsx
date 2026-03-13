import React, { useState, useRef } from 'react';
import { parseCardText } from '../utils/ocr';
import '../assets/styles/Scanner.css';

const EMPTY_FORM = { name: '', title: '', company: '', email: '', phone: '', website: '' };

export default function Scanner({ onContactSaved, showToast }) {
  const [images, setImages]         = useState({ front: null, back: null });
  const [form, setForm]             = useState(EMPTY_FORM);
  const [status, setStatus]         = useState(null);   // { msg, type }
  const [progress, setProgress]     = useState(0);
  const [scanning, setScanning]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [showSave, setShowSave]     = useState(false);

  // Camera modal state
  const [camOpen, setCamOpen]       = useState(false);
  const [camSide, setCamSide]       = useState('front');
  const streamRef                   = useRef(null);
  const videoRef                    = useRef(null);
  const canvasRef                   = useRef(null);

  // ── Slot upload ──────────────────────────────
  function handleFileChange(side, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024)   { showToast('Image too large. Max 10MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setImages(prev => ({ ...prev, [side]: ev.target.result }));
      showToast(`${side === 'front' ? 'Front' : 'Back'} side uploaded ✓`, 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Camera ───────────────────────────────────
  async function openCamera(side) {
    setCamSide(side);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = s;
      setCamOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'Camera permission denied.'
                : e.name === 'NotFoundError'   ? 'No camera found. Use Gallery.'
                : 'Could not start camera.';
      showToast(msg, 'error');
    }
  }

  function closeCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCamOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) { showToast('Camera not ready yet.', 'error'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    closeCamera();
    setImages(prev => ({ ...prev, [camSide]: dataUrl }));
    showToast(`${camSide === 'front' ? 'Front' : 'Back'} captured ✓`, 'success');
  }

  // ── OCR ──────────────────────────────────────
  async function processCards() {
    const imgs = [images.front, images.back].filter(Boolean);
    if (!imgs.length) { setStatus({ msg: '⚠️ Upload at least the front side.', type: 'warning' }); return; }

    setScanning(true);
    setStatus({ msg: 'Tesseract OCR is reading the card…', type: 'processing' });
    setProgress(0);

    let combined = '';
    try {
      const Tesseract = window.Tesseract;
      for (let i = 0; i < imgs.length; i++) {
        const result = await Tesseract.recognize(imgs[i], 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(((i / imgs.length) + (m.progress / imgs.length)) * 100));
            }
          },
        });
        combined += '\n' + result.data.text;
      }
      const parsed = parseCardText(combined.trim());
      setForm(parsed);
      setStatus({ msg: '✅ Card processed! Verify details below.', type: 'success' });
      setShowForm(true);
      setShowSave(true);
      showToast('Card scanned successfully!', 'success');
    } catch (e) {
      setStatus({ msg: '❌ OCR failed. Fill details manually.', type: 'error' });
      showToast('Scan failed. Please retry.', 'error');
      setShowForm(true);
      setShowSave(true);
    } finally {
      setScanning(false);
      setProgress(0);
    }
  }

  // ── Save to Google Sheets ────────────────────
  async function saveToSheets() {
    const data = { ...form, scanned_at: new Date().toLocaleString('en-IN') };
    if (!data.name && !data.email && !data.phone) {
      setStatus({ msg: '⚠️ Fill in at least Name, Email, or Phone.', type: 'warning' });
      showToast('Fill in at least one contact field.', 'error');
      return;
    }

    onContactSaved(data);
    setStatus({ msg: '<span class="spinner"></span> Saving to Google Sheet…', type: 'processing' });

    try {
      const res = await fetch('/api/save-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setStatus({ msg: '✅ Contact saved to Google Sheet!', type: 'success' });
        showToast('Saved to Google Sheet ✓', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        setStatus({ msg: '⚠️ Saved locally. Server: ' + (err.message || 'Please retry.'), type: 'error' });
        showToast('Saved locally (server error).', 'error');
      }
    } catch {
      setStatus({ msg: '📴 Offline — saved locally.', type: 'warning' });
      showToast('Saved offline.', 'info');
    }
  }

  // ── Reset ─────────────────────────────────────
  function reset() {
    setImages({ front: null, back: null });
    setForm(EMPTY_FORM);
    setStatus(null);
    setProgress(0);
    setShowForm(false);
    setShowSave(false);
  }

  const hasFront = !!images.front;
  const hasBack  = !!images.back;
  const canProcess = (hasFront || hasBack) && !scanning;

  return (
    <>
      <div className="scanner-wrap fade-in">
        <div className="scanner-head">
          <div className="scanner-head-row">
            <h3>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="16" height="10" rx="2"/>
                <path d="M6 9h8M6 12h5"/>
              </svg>
              Card Scanner
            </h3>
            <span className="ai-badge">✦ Tesseract OCR</span>
          </div>
          <p>Upload front &amp; back images for accurate extraction</p>
        </div>

        <div className="scanner-body">
          <div className="info-banner">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
            </svg>
            Upload clear, well-lit photos of the card for the most accurate OCR results.
          </div>

          {/* Status */}
          {status && (
            <div
              className={`status-msg ${status.type}`}
              dangerouslySetInnerHTML={{ __html: status.msg }}
            />
          )}

          {/* Progress bar */}
          {scanning && (
            <>
              <div className="progress-label">Extracting text…</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </>
          )}

          {/* Upload slots */}
          <UploadSlot side="front" image={images.front} onFile={handleFileChange} onCamera={openCamera} />
          <UploadSlot side="back"  image={images.back}  onFile={handleFileChange} onCamera={openCamera} />

          {/* Process button */}
          {canProcess && (
            <button className="btn btn-green process-btn" onClick={processCards}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 8a5 5 0 1110 0 5 5 0 01-10 0z"/><path d="M8 5.5v2.5l1.5 1.5"/>
              </svg>
              {hasFront && hasBack ? 'Process Both Sides' : hasFront ? 'Process Front Side' : 'Process Back Side'}
            </button>
          )}

          {/* OCR form */}
          {showForm && (
            <div className="ocr-result-box fade-in">
              <div className="ocr-label">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 3h10M1 6h7M1 9h5"/>
                </svg>
                Extracted Info — verify &amp; correct
              </div>
              <div className="field-group">
                {[
                  { id: 'name',    label: 'Full Name', placeholder: 'Name from card',     type: 'text' },
                  { id: 'title',   label: 'Job Title', placeholder: 'Title / Designation', type: 'text' },
                  { id: 'company', label: 'Company',   placeholder: 'Company name',        type: 'text' },
                  { id: 'email',   label: 'Email',     placeholder: 'email@company.com',   type: 'email' },
                  { id: 'phone',   label: 'Phone',     placeholder: '+91 …',               type: 'tel' },
                  { id: 'website', label: 'Website',   placeholder: 'www…',                type: 'text' },
                ].map(({ id, label, placeholder, type }) => (
                  <div className="field-row" key={id}>
                    <label>{label}</label>
                    <input
                      type={type}
                      value={form[id]}
                      placeholder={placeholder}
                      onChange={e => setForm(prev => ({ ...prev, [id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save / Reset */}
          {showSave && (
            <div className="save-row">
              <button className="btn btn-green" style={{ width: '100%' }} onClick={saveToSheets}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="1" y="2" width="14" height="12" rx="2"/>
                  <path d="M1 6h14M5 6v8"/>
                </svg>
                Save to Google Sheet
              </button>
              <button className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={reset}>
                Scan Another Card
              </button>
            </div>
          )}

          {/* Tips */}
          <div className="tips-grid">
            {[['☀️','Good Light'],['📐','Flat Surface'],['🔍','HD Clear']].map(([icon, name]) => (
              <div className="tip-card" key={name}>
                <span className="tip-icon">{icon}</span>
                <span className="tip-name">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Camera modal */}
      {camOpen && (
        <div className="camera-modal active">
          <div className="cam-label">
            Capture — <span>{camSide === 'front' ? 'Front Side' : 'Back Side'}</span>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="cam-video" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="cam-controls">
            <button className="cam-capture-btn" onClick={capturePhoto}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8" cy="9" r="3"/><path d="M1 5h14v9H1zM5.5 5l.8-2h3.4l.8 2"/>
              </svg>
              Capture
            </button>
            <button className="cam-cancel-btn" onClick={closeCamera}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Upload Slot sub-component ──────────────────
function UploadSlot({ side, image, onFile, onCamera }) {
  const isBack = side === 'back';
  const label  = isBack ? 'Back' : 'Front';

  return (
    <>
      <div className="side-label">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
          {isBack
            ? <><rect x="1" y="2.5" width="5" height="9" rx="1.5" strokeDasharray="2 1.5"/><rect x="8" y="2.5" width="5" height="9" rx="1.5"/></>
            : <><rect x="1" y="2.5" width="12" height="9" rx="1.5"/><path d="M3.5 6.5h5M3.5 9h3.5"/></>
          }
        </svg>
        {label} Side
      </div>

      <div className={`upload-slot${image ? ' has-image' : ''}`}>
        {image ? (
          <>
            <img src={image} alt={`${label} side`} className="slot-preview" />
            <div className="slot-done-badge">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1.5 4.5l2 2 4-4"/>
              </svg>
              Done
            </div>
            <label className="slot-change-btn">
              Change
              <input type="file" accept="image/*" onChange={e => onFile(side, e)} style={{ display: 'none' }} />
            </label>
          </>
        ) : (
          <>
            <div className="slot-icon">
              <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.6">
                {isBack
                  ? <><rect x="2" y="4" width="9" height="14" rx="2" strokeDasharray="3 2"/><rect x="15" y="4" width="9" height="14" rx="2"/></>
                  : <><rect x="2" y="4" width="22" height="14" rx="3"/><path d="M6 11h8M6 15h5"/></>
                }
              </svg>
              <div className="plus-badge">
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 2v6M2 5h6"/>
                </svg>
              </div>
            </div>
            <div className="slot-title">Upload {label} Side</div>
            <div className="slot-actions">
              <label className="slot-action-btn">
                <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="1" y="2" width="11" height="9" rx="1.5"/><circle cx="6.5" cy="6.5" r="2"/>
                </svg>
                Gallery
                <input type="file" accept="image/*" onChange={e => onFile(side, e)} style={{ display: 'none' }} />
              </label>
              <span style={{ color: '#ccc', fontSize: 13 }}>·</span>
              <button className="slot-action-btn" onClick={() => onCamera(side)}>
                <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="6.5" cy="7.5" r="2"/><path d="M1 3.5h11v8H1zM4 3.5l.8-2h2.4l.8 2"/>
                </svg>
                Camera
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
