import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import type { UploadedImage } from '../types/analysis';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (image: UploadedImage) => void;
  onFallbackToFilePicker: () => void;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFilePicker,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setIsStarting(true);
      setCameraError(null);
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Live camera access is unavailable in this browser context. You can choose a photo from your device instead.'
        );
        setIsStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            'Camera permission was denied or no camera hardware was detected. Please allow camera access or upload an image file.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1] ?? '';
    const sizeBytes = Math.round((base64.length * 3) / 4);

    onCapture({
      dataUrl,
      base64,
      mimeType: 'image/jpeg',
      name: `camera-capture-${Date.now()}.jpg`,
      sizeBytes,
      width: canvas.width,
      height: canvas.height,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070D]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="cyber-card w-full max-w-xl overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-3.5">
          <h2
            id="camera-modal-title"
            className="font-mono text-sm font-semibold text-cyan-200"
          >
            OPTICAL CAMERA CAPTURE
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#04070D]">
          {cameraError ? (
            <div className="max-w-sm px-6 text-center">
              <Camera className="mx-auto mb-3 h-8 w-8 text-cyan-400" aria-hidden="true" />
              <p className="text-sm text-slate-300 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackToFilePicker();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#06B6D4] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Choose Image File
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#04070D]/75">
                  <span className="font-mono text-xs font-medium text-cyan-300">
                    INITIALIZING OPTICAL FEED...
                  </span>
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-6 rounded-lg border border-cyan-400/45"
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-cyan-500/20 bg-[#080D18] px-5 py-3.5">
          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
            }
            disabled={Boolean(cameraError)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0D1526] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Switch Camera
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-[#0D1526] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSnap}
              disabled={Boolean(cameraError) || isStarting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06B6D4] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              Capture Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
