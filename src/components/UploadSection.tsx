import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Cpu,
  Eye,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import type { UploadedImage } from '../types/analysis';
import { formatFileSize, processImageFile, processImageUrl } from '../utils/imageUtils';
import sampleUltrasonic from '../assets/images/sample_ultrasonic_sensor_1794552917825.jpg';
import sampleNe555 from '../assets/images/sample_ne555_ic_1794552919264.jpg';

interface UploadSectionProps {
  uploadedImage: UploadedImage | null;
  isAnalyzing: boolean;
  hasResult?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelected: (image: UploadedImage) => void;
  onImageCleared: () => void;
  onOpenCamera: () => void;
  onAnalyze: () => void;
  onFileError: (message: string) => void;
}

const SAMPLE_COMPONENTS = [
  {
    id: 'hc-sr04',
    label: 'HC-SR04 Ultrasonic Sensor',
    caption: '4-pin module',
    src: sampleUltrasonic,
    filename: 'sample-hc-sr04-sensor.jpg',
  },
  {
    id: 'ne555p',
    label: 'NE555P Precision Timer',
    caption: '8-pin DIP on breadboard',
    src: sampleNe555,
    filename: 'sample-ne555p-dip8.jpg',
  },
];

const SCAN_TICKER_MESSAGES = [
  'SCANNING SILICON PACKAGE... PARSING LASER ETCHING...',
  'INDEXING PIN-1 NOTCH... MAPPING ELECTRODE LEADS...',
  'AUDITING BREADBOARD RAILS... CHECKING POLARITY & RESISTORS...',
  'COMPILING DATASHEET TELEMETRY & STARTER FIRMWARE...',
];

export function UploadSection({
  uploadedImage,
  isAnalyzing,
  hasResult = false,
  fileInputRef,
  onImageSelected,
  onImageCleared,
  onOpenCamera,
  onAnalyze,
  onFileError,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setTickerIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % SCAN_TICKER_MESSAGES.length);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const handleFile = async (file: File) => {
    try {
      const processed = await processImageFile(file);
      onImageSelected(processed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to read the selected image.';
      onFileError(message);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleLoadSample = async (sample: (typeof SAMPLE_COMPONENTS)[number]) => {
    if (isAnalyzing || loadingSampleId) return;
    setLoadingSampleId(sample.id);
    try {
      const processed = await processImageUrl(sample.src, sample.filename);
      onImageSelected(processed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load sample component.';
      onFileError(message);
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <section
      id="input-section"
      aria-label="Optical Component Inspector"
      className="cyber-card scroll-mt-32 rounded-2xl p-6 sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <span className="font-mono text-[11px] font-semibold tracking-wider text-cyan-400">
            01. OPTICAL COMPONENT INSPECTOR
          </span>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Capture or Upload Hardware Target
          </h2>
        </div>

        <span className="font-mono text-xs text-emerald-400">
          {isAnalyzing
            ? 'STATUS: ACQUIRING TELEMETRY'
            : uploadedImage
              ? 'STATUS: TARGET LOCKED'
              : 'STATUS: STANDBY'}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Upload component image"
      />

      {!uploadedImage ? (
        <div>
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop a microchip or circuit photo, or press Enter to browse files"
            className={`group relative flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-cyan-500/35 bg-[#070B14]/80 hover:border-cyan-400/70 hover:bg-[#09101E]'
            }`}
          >
            {/* Viewfinder Corner Reticles */}
            <span aria-hidden="true" className="pointer-events-none absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 border-cyan-400/60" />
            <span aria-hidden="true" className="pointer-events-none absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 border-cyan-400/60" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-cyan-400/60" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-cyan-400/60" />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-300 transition-transform duration-150 group-hover:scale-105">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>

            <p className="text-base font-semibold text-white">
              Drop a photo of a microchip, sensor, or breadboard circuit
            </p>
            <p className="mt-1.5 max-w-md text-sm text-slate-400">
              Top-down illumination makes laser-etched silicon markings and PCB silkscreens crisp. PNG, JPG, or WEBP up to 15 MB.
            </p>

            <div
              className="mt-7 flex flex-wrap items-center justify-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#06B6D4] px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Browse Image
              </button>

              <button
                type="button"
                onClick={onOpenCamera}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-[#0D1526] px-5 py-2.5 text-sm font-semibold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Capture via Camera
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-cyan-500/15 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-xs text-slate-400">
                CALIBRATION SAMPLES · CLICK TO AUTO-SCAN
              </span>

              <div className="flex flex-wrap items-center gap-3">
                {SAMPLE_COMPONENTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    disabled={loadingSampleId !== null}
                    onClick={() => void handleLoadSample(sample)}
                    className="inline-flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-[#070B14] pr-3.5 pl-1.5 py-1.5 text-left hover:border-cyan-400/70 hover:bg-cyan-500/10 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <img
                      src={sample.src}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="h-10 w-13 rounded-md object-cover border border-cyan-500/20 bg-slate-900 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-slate-100 whitespace-nowrap">
                        {loadingSampleId === sample.id ? 'LOADING...' : sample.label}
                      </span>
                      <span className="block text-[11px] text-cyan-400/80 whitespace-nowrap">
                        {sample.caption}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Optical Crosshair Viewfinder Frame */}
          <div className="overflow-hidden rounded-xl border border-cyan-500/35 bg-[#060911]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-[#0A101E] px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300">
                <span>OPTICAL VIEWFINDER · CROSSHAIR LOCK</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={blueprintMode}
                onClick={() => setBlueprintMode((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 font-mono text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  blueprintMode
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Blueprint / X-Ray Mode: {blueprintMode ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="relative flex min-h-[280px] max-h-[420px] items-center justify-center overflow-hidden p-6">
              {/* Viewfinder Corner Brackets */}
              <span aria-hidden="true" className="pointer-events-none absolute top-4 left-4 z-10 h-6 w-6 border-t-2 border-l-2 border-cyan-400" />
              <span aria-hidden="true" className="pointer-events-none absolute top-4 right-4 z-10 h-6 w-6 border-t-2 border-r-2 border-cyan-400" />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 z-10 h-6 w-6 border-b-2 border-l-2 border-cyan-400" />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 z-10 h-6 w-6 border-b-2 border-r-2 border-cyan-400" />

              {/* Optical Center Crosshair Overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              >
                <div className="relative h-14 w-14">
                  <span className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-cyan-400/60" />
                  <span className="absolute top-1/2 right-0 h-px w-4 -translate-y-1/2 bg-cyan-400/60" />
                  <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-cyan-400/60" />
                  <span className="absolute left-1/2 bottom-0 h-4 w-px -translate-x-1/2 bg-cyan-400/60" />
                  <span className="absolute inset-3 rounded-full border border-cyan-400/35" />
                </div>
              </div>

              {/* Blueprint Technical Grid Tint when X-Ray Mode ON */}
              {blueprintMode && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 opacity-35"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(34,211,238,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.28) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              )}

              {/* Animated Horizontal Laser Scanline while Analyzing */}
              {isAnalyzing && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-4 bottom-4 z-20 overflow-hidden"
                >
                  <div className="laser-scanline-track h-full w-full">
                    <div className="h-[2px] w-full bg-cyan-300 shadow-[0_0_16px_4px_rgba(6,182,212,0.85)]" />
                    <div className="h-10 w-full bg-gradient-to-b from-cyan-400/25 to-transparent" />
                  </div>
                </div>
              )}

              <img
                src={uploadedImage.dataUrl}
                alt={`Preview of ${uploadedImage.name}`}
                referrerPolicy="no-referrer"
                className={`max-h-[350px] w-auto rounded-md object-contain transition-all duration-200 ${
                  blueprintMode ? 'blueprint-xray-filter' : ''
                }`}
              />
            </div>

            {/* Live Laser Scan Ticker during Analysis */}
            {isAnalyzing && (
              <div
                aria-live="polite"
                className="border-t border-cyan-500/30 bg-cyan-950/40 px-4 py-2 font-mono text-xs text-cyan-300"
              >
                {SCAN_TICKER_MESSAGES[tickerIndex]}
              </div>
            )}

            {/* Metadata + Utility Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cyan-500/20 bg-[#0A101E] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 min-w-0">
                <span className="truncate max-w-[240px] font-medium text-slate-200">
                  {uploadedImage.name}
                </span>
                {uploadedImage.width && uploadedImage.height && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-cyan-300">
                      {uploadedImage.width} × {uploadedImage.height} px
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatFileSize(uploadedImage.sizeBytes)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0D1526] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Replace
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={onOpenCamera}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0D1526] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Camera
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={onImageCleared}
                  aria-label="Remove image"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0D1526] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-xs text-slate-400">
              {isAnalyzing
                ? 'GEMINI VISION STREAM ACTIVE · EXTRACTING PACKAGE & PINOUT...'
                : 'AUTO-ANALYSIS ENABLED ON UPLOAD · RE-TRIGGER ANYTIME'}
            </p>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#06B6D4] px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-700 disabled:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing Component...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                  {hasResult ? 'Re-analyze Component' : 'Analyze Component'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
