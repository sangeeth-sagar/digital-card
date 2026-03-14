import React, { useState, useRef } from 'react';
import '../assets/styles/Scanner.css';

// Compress image to stay under Vercel's 4.5MB limit
function compressImage(dataUrl, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if too wide
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function Scanner({ showToast }) {
  const [images, setImages]           = useState({ front: null, back: null });
  const [status, setStatus]           = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [camOpen, setCamOpen] = useState(false);
  const [camSide, setCamSide] = useState('front');
  const streamRef             = useRef(null);
  const videoRef              = useRef(null);
  const canvasRef             = useRef(null);

  // ── File upload ──────────────────────────────
  function handleFileChange(side, e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024)   { showToast('Image too large. Max 10MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setImages(prev => ({ ...prev, [side]: ev.target.result }));
      showToast(`${side === 'front' ? 'Front' : 'Back'} side loaded ✓`, 'success');
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamOpen(false);
  }

  function capturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) { showToast('Camera not ready yet.', 'error'); return; }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    closeCamera();
    setImages(prev => ({ ...prev, [camSide]: dataUrl }));
    showToast(`${camSide === 'front' ? 'Front' : 'Back'} captured ✓`, 'success');
  }

  // ── Upload ───────────────────────────────────
  async function uploadToDrive() {
    if (!images.front && !images.back) {
      setStatus({ msg: '⚠️ Capture or upload at least one side first.', type: 'warning' });
      return;
    }

    setIsUploading(true);
    setStatus({ msg: '<span class="spinner"></span> Compressing and uploading…', type: 'processing' });

    try {
      // Compress both images before sending
      const front = images.front ? await compressImage(images.front) : null;
      const back  = images.back  ? await compressImage(images.back)  : null;

      const res = await fetch('/api/upload-drive', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ front, back }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({ msg: '✅ Saved !', type: 'success' });
        showToast('Card Saved ✓', 'success');
        setTimeout(reset, 3000);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
      showToast('Upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  // ── Reset ────────────────────────────────────
  function reset() {
    setImages({ front: null, back: null });
    setStatus(null);
  }

  const hasFront  = !!images.front;
  const hasBack   = !!images.back;
  const canUpload = (hasFront || hasBack) && !isUploading;

  return (
    <>
      <div className="scanner-wrap fade-in">
        <div className="scanner-head">
          <div className="scanner-head-row">
            <h3>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                <rect x="2" y="5" width="16" height="10" rx="2"/>
                <circle cx="10" cy="10" r="3"/>
              </svg>
              Card Scanner
            </h3>
            <span className="ai-badge drive-badge">☁️ Drive Sync</span>
          </div>
          <p>Capture front &amp; back — saved </p>
        </div>

        <div className="scanner-body">
          {status && (
            <div
              className={`status-msg ${status.type}`}
              dangerouslySetInnerHTML={{ __html: status.msg }}
            />
          )}

          <UploadSlot side="front" image={images.front} onFile={handleFileChange} onCamera={openCamera} />
          <UploadSlot side="back"  image={images.back}  onFile={handleFileChange} onCamera={openCamera} />

          {canUpload && (
            <button className="btn btn-green process-btn" onClick={uploadToDrive}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 11V3M4 7l4-4 4 4"/><path d="M2 13h12"/>
              </svg>
              {hasFront && hasBack ? 'Save Both ' : 'Save '}
            </button>
          )}

          {(hasFront || hasBack) && !isUploading && (
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={reset}>
              Clear
            </button>
          )}

          <div className="tips-grid">
            {[['☀️', 'Good Light'], ['📐', 'Flat Surface'], ['🔍', 'HD Clear']].map(([icon, name]) => (
              <div className="tip-card" key={name}>
                <span className="tip-icon">{icon}</span>
                <span className="tip-name">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              Ready
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