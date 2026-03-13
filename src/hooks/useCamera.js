import { useState, useRef, useCallback } from 'react';

export function useCamera() {
  const [open, setOpen]         = useState(false);
  const [side, setSide]         = useState('front');
  const streamRef               = useRef(null);
  const videoRef                = useRef(null);
  const canvasRef               = useRef(null);

  const openCamera = useCallback(async (targetSide) => {
    setSide(targetSide);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = s;
      setOpen(true);
      // Assign srcObject after modal renders
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 100);
      return { ok: true };
    } catch (e) {
      const msg = e.name === 'NotAllowedError' ? 'Camera permission denied.'
                : e.name === 'NotFoundError'   ? 'No camera found. Use Gallery.'
                : 'Could not start camera.';
      return { ok: false, msg };
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setOpen(false);
  }, []);

  const capture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) return null;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    closeCamera();
    return { dataUrl, side };
  }, [closeCamera, side]);

  return { open, side, videoRef, canvasRef, openCamera, closeCamera, capture };
}
