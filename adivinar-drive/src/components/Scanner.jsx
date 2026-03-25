import React, { useState, useRef, useEffect, useCallback } from 'react';
import ImageVerifyModal from './ImageVerifyModal';
import { analyseFrame } from '../utils/imageVerifier';
import '../assets/styles/Scanner.css';

function compressImage(dataUrl, maxWidth = 1200, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let { width: w, height: h } = img;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function Scanner({ showToast }) {
  const [images,        setImages]        = useState({ front: null, back: null });
  const [status,        setStatus]        = useState(null);
  const [isUploading,   setIsUploading]   = useState(false);
  const [qualityPassed, setQualityPassed] = useState({ front: false, back: false });

  // Camera
  const [camOpen,  setCamOpen]  = useState(false);
  const [camSide,  setCamSide]  = useState('front');
  const streamRef  = useRef(null);
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);

  // Live detection state
  const [liveChecks,    setLiveChecks]    = useState(null);
  const [livePassed,    setLivePassed]    = useState(false);
  // Change options popup (camera retake or gallery)
  const [changePopup, setChangePopup] = useState(null); // 'front' | 'back' | null

  // File verify modal
  const [verifyOpen,    setVerifyOpen]    = useState(false);
  const [verifyDataUrl, setVerifyDataUrl] = useState(null);
  const [verifySide,    setVerifySide]    = useState('front');

  // Refs for hidden file inputs (for "change via gallery" after camera capture)
  const frontFileRef = useRef(null);
  const backFileRef  = useRef(null);

  // ── Live analysis loop ──────────────────────────────────────────────────────
  const analysisLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(analysisLoop);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const result = analyseFrame(canvas);
    if (!result) { rafRef.current = requestAnimationFrame(analysisLoop); return; }

    setLiveChecks(result.checks);
    setLivePassed(result.passed);

    rafRef.current = requestAnimationFrame(analysisLoop);
  }, [camSide]); // eslint-disable-line

  function startLoop() {
    setLiveChecks(null); setLivePassed(false);
    rafRef.current = requestAnimationFrame(analysisLoop);
  }

  function stopLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  async function openCamera(side) {
    setCamSide(side);
    setChangePopup(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = s;
      setCamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadeddata = startLoop;
        }
      }, 100);
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'Camera permission denied.'
                : e.name === 'NotFoundError'   ? 'No camera found. Use Gallery.'
                : 'Could not start camera.';
      showToast(msg, 'error');
    }
  }

  function closeCamera() {
    stopLoop();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCamOpen(false);
    setLiveChecks(null); setLivePassed(false);
  }

  // ── Capture ─────────────────────────────────────────────────────────────────
  function doCapture() {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) { closeCamera(); return; }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    closeCamera();
    setImages(prev => ({ ...prev, [camSide]: dataUrl }));
    setQualityPassed(prev => ({ ...prev, [camSide]: true }));
    showToast(`${camSide === 'front' ? 'Front' : 'Back'} captured ✓`, 'success');
  }

  // Manual capture — ONLY allowed when ALL checks pass
  function manualCapture() {
    if (!livePassed) return; // button is disabled anyway, but extra safety
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) { showToast('Camera not ready.', 'error'); return; }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    doCapture();
  }

  // ── Change popup — retake or pick from gallery ───────────────────────────────
  function openChangePopup(side) {
    setChangePopup(side);
  }

  function changeViaCamera(side) {
    setChangePopup(null);
    // Clear old image & quality so slot resets
    setImages(prev => ({ ...prev, [side]: null }));
    setQualityPassed(prev => ({ ...prev, [side]: false }));
    openCamera(side);
  }

  function changeViaGallery(side) {
    setChangePopup(null);
    if (side === 'front') frontFileRef.current?.click();
    else backFileRef.current?.click();
  }

  // ── File upload → verify modal ───────────────────────────────────────────────
  function handleFileChange(side, e) {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (file.size > 25 * 1024 * 1024)   { showToast('Image too large. Max 10MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setQualityPassed(prev => ({ ...prev, [side]: false }));
      setVerifySide(side);
      setVerifyDataUrl(ev.target.result);
      setVerifyOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleVerifyAccept(dataUrl) {
    setImages(prev => ({ ...prev, [verifySide]: dataUrl }));
    setQualityPassed(prev => ({ ...prev, [verifySide]: true }));
    setVerifyOpen(false);
    setVerifyDataUrl(null);
    showToast(`${verifySide === 'front' ? 'Front' : 'Back'} verified ✓`, 'success');
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  // Sends images to n8n webhook (non-blocking — failure won't stop Drive upload)
  async function sendToWebhook(front, back) {
    const N8N_WEBHOOK = 'http://173.212.241.174:5678/webhook/business-card-scan';
    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front:     front || null,
          back:      back  || null,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) console.warn('n8n webhook status:', res.status);
      else         console.log('✅ n8n webhook sent');
    } catch (err) {
      console.warn('n8n webhook error:', err.message);
    }
  }

  async function handleSubmit() {
    if (!images.front && !images.back) {
      setStatus({ msg: '⚠️ Capture or upload at least one side first.', type: 'warning' });
      return;
    }

    setIsUploading(true);
    setStatus({ msg: '<span class="spinner"></span> Sending…', type: 'processing' });
    try {
      // Compress both images once, reuse for both calls
      const front = images.front ? await compressImage(images.front) : null;
      const back  = images.back  ? await compressImage(images.back)  : null;

      await sendToWebhook(front, back);

      setStatus({ msg: '✅ Sent!', type: 'success' });
      showToast('Card Sent ✓', 'success');
      setTimeout(reset, 3000);
    } catch (err) {
      setStatus({ msg: `❌ ${err.message}`, type: 'error' });
      showToast('Failed to send.', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  function reset() {
    setImages({ front: null, back: null });
    setStatus(null);
    setQualityPassed({ front: false, back: false });
    setChangePopup(null);
  }

  useEffect(() => () => stopLoop(), []);

  const hasFront    = !!images.front, hasBack = !!images.back;
  const anyUploaded = hasFront || hasBack;
  const allPassed   = (hasFront ? qualityPassed.front : true) && (hasBack ? qualityPassed.back : true);
  const canUpload   = anyUploaded && allPassed && !isUploading;

  return (
    <>
      {/* Hidden file inputs for gallery-change on camera-captured slots */}
      <input
        ref={frontFileRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileChange('front', e)}
      />
      <input
        ref={backFileRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileChange('back', e)}
      />

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
            <span className="ai-badge drive-badge">🤖 AI Scan</span>
          </div>
          <p>Auto-captures when card is perfectly positioned</p>
        </div>

        <div className="scanner-body">
          {status && <div className={`status-msg ${status.type}`} dangerouslySetInnerHTML={{ __html: status.msg }} />}

          <UploadSlot
            side="front" image={images.front} qualityOk={qualityPassed.front}
            onFile={handleFileChange} onCamera={openCamera}
            onChange={() => openChangePopup('front')}
          />
          <UploadSlot
            side="back" image={images.back} qualityOk={qualityPassed.back}
            onFile={handleFileChange} onCamera={openCamera}
            onChange={() => openChangePopup('back')}
          />

          {anyUploaded && (
            <button
              className={`btn process-btn ${canUpload ? 'btn-green' : 'btn-disabled'}`}
              onClick={canUpload ? handleSubmit : undefined}
              disabled={!canUpload}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 11V3M4 7l4-4 4 4"/><path d="M2 13h12"/>
              </svg>
              {!allPassed ? '⚠ Quality check failed — retake photo' : hasFront && hasBack ? 'Save Both' : 'Save'}
            </button>
          )}

          {anyUploaded && !isUploading && (
            <button className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={reset}>
              Clear
            </button>
          )}

          <div className="tips-grid">
            {[['☀️','Good Light'],['📐','Perpendicular'],['🔍','In Focus']].map(([icon, name]) => (
              <div className="tip-card" key={name}>
                <span className="tip-icon">{icon}</span>
                <span className="tip-name">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Change options popup ── */}
      {changePopup && (
        <div className="change-backdrop" onClick={() => setChangePopup(null)}>
          <div className="change-sheet" onClick={e => e.stopPropagation()}>
            <div className="change-sheet-title">
              Change {changePopup === 'front' ? 'Front' : 'Back'} Side Photo
            </div>
            <button className="change-option" onClick={() => changeViaCamera(changePopup)}>
              <span className="change-option-icon">📷</span>
              <div>
                <div className="change-option-label">Retake with Camera</div>
                <div className="change-option-sub">Open camera and capture again</div>
              </div>
            </button>
            <button className="change-option" onClick={() => changeViaGallery(changePopup)}>
              <span className="change-option-icon">🖼️</span>
              <div>
                <div className="change-option-label">Choose from Gallery</div>
                <div className="change-option-sub">Pick a photo from your device</div>
              </div>
            </button>
            <button className="change-cancel" onClick={() => setChangePopup(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Live Camera Modal ── */}
      {camOpen && (
        <div className="camera-modal active">
          <div className="cam-label">
            Capture — <span>{camSide === 'front' ? 'Front Side' : 'Back Side'}</span>
          </div>

          <div className="cam-video-wrap">
            <video ref={videoRef} autoPlay playsInline muted className="cam-video" />

            {/* Guide box — border turns green when all pass */}
            <div className={`cam-guide-box ${livePassed ? 'guide-pass' : 'guide-fail'}`}>
              <span className="guide-corner gtl" /><span className="guide-corner gtr" />
              <span className="guide-corner gbl" /><span className="guide-corner gbr" />
            </div>
          </div>

          {/* ── Conditions row — outside video, below it ── */}
          <div className="live-checks-row">
            {!liveChecks && (
              <div className="lc-init">Initialising camera…</div>
            )}
            {liveChecks && Object.values(liveChecks).map((chk, i) => (
              <div key={i} className={`lc-pill ${chk.pass ? 'lc-pass' : 'lc-fail'}`}>
                <span className="lc-icon">{chk.icon}</span>
                <span className="lc-label">{chk.label}</span>
                <span className="lc-dot" />
              </div>
            ))}
          </div>

          {/* Hint line */}
          <div className="live-hint">
            {!liveChecks && ''}
            {liveChecks && livePassed && <span className="lh-good">✓ All good — tap Capture Now</span>}
            {liveChecks && !livePassed && (
              <span className="lh-bad">
                {Object.values(liveChecks).find(c => !c.pass)?.reason}
              </span>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="cam-controls">
            {/* Capture button — ONLY enabled when ALL checks pass */}
            <button
              className={`cam-capture-btn ${livePassed ? 'cam-btn-ready' : 'cam-btn-waiting'}`}
              onClick={livePassed ? manualCapture : undefined}
              disabled={!livePassed}
              title={!livePassed ? 'Fix the issues shown above before capturing' : 'Tap to capture now'}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8" cy="9" r="3"/><path d="M1 5h14v9H1zM5.5 5l.8-2h3.4l.8 2"/>
              </svg>
              {livePassed ? 'Capture Now' : 'Waiting…'}
            </button>
            <button className="cam-cancel-btn" onClick={closeCamera}>Cancel</button>
          </div>
        </div>
      )}

      {/* File verify modal */}
      {verifyOpen && (
        <ImageVerifyModal
          dataUrl={verifyDataUrl}
          side={verifySide}
          onAccept={handleVerifyAccept}
          onRetake={() => { setVerifyOpen(false); setVerifyDataUrl(null); }}
          onClose={() => { setVerifyOpen(false); setVerifyDataUrl(null); }}
        />
      )}
    </>
  );
}

// ── Upload Slot ───────────────────────────────────────────────────────────────
function UploadSlot({ side, image, qualityOk, onFile, onCamera, onChange }) {
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
        {image && (
          <span className={`quality-badge ${qualityOk ? 'q-pass' : 'q-fail'}`}>
            {qualityOk ? '✓ Verified' : '✗ Failed'}
          </span>
        )}
      </div>

      <div className={`upload-slot${image ? ' has-image' : ''}`}>
        {image ? (
          <>
            <img src={image} alt={`${label} side`} className="slot-preview" />
            <div className={`slot-quality-bar ${qualityOk ? 'qb-pass' : 'qb-fail'}`}>
              {qualityOk ? '✓ Quality Verified' : '✗ Quality check failed — tap Change'}
            </div>
            <div className="slot-done-badge">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1.5 4.5l2 2 4-4"/>
              </svg>
              Ready
            </div>
            {/* Change button → opens popup (camera retake OR gallery) */}
            <button className="slot-change-btn" onClick={onChange}>
              Change
            </button>
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
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 2v6M2 5h6"/></svg>
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