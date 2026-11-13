import { useEffect, useRef } from 'react';
import { Upload, RotateCcw, Activity } from 'lucide-react';

interface HeaderProps {
  hasResult: boolean;
  hasImage: boolean;
  isAnalyzing: boolean;
  onUploadClick: () => void;
  onReset: () => void;
  onNavigate: (sectionId: string) => void;
}

export function SiliconLensLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconClass = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={iconClass}
      aria-hidden="true"
    >
      {/* Chip Pins - Top & Bottom */}
      <rect x="12" y="2" width="2.5" height="5" rx="1" fill="#F59E0B" />
      <rect x="18.75" y="2" width="2.5" height="5" rx="1" fill="#F59E0B" />
      <rect x="25.5" y="2" width="2.5" height="5" rx="1" fill="#F59E0B" />
      <rect x="12" y="33" width="2.5" height="5" rx="1" fill="#F59E0B" />
      <rect x="18.75" y="33" width="2.5" height="5" rx="1" fill="#F59E0B" />
      <rect x="25.5" y="33" width="2.5" height="5" rx="1" fill="#F59E0B" />

      {/* Chip Pins - Left & Right */}
      <rect x="2" y="12" width="5" height="2.5" rx="1" fill="#10B981" />
      <rect x="2" y="18.75" width="5" height="2.5" rx="1" fill="#10B981" />
      <rect x="2" y="25.5" width="5" height="2.5" rx="1" fill="#10B981" />
      <rect x="33" y="12" width="5" height="2.5" rx="1" fill="#06B6D4" />
      <rect x="33" y="18.75" width="5" height="2.5" rx="1" fill="#06B6D4" />
      <rect x="33" y="25.5" width="5" height="2.5" rx="1" fill="#06B6D4" />

      {/* Silicon Package Body */}
      <rect
        x="7"
        y="7"
        width="26"
        height="26"
        rx="5"
        fill="url(#sl-chip-grad)"
        stroke="#06B6D4"
        strokeOpacity="0.65"
        strokeWidth="1"
      />
      <rect
        x="8.5"
        y="8.5"
        width="23"
        height="23"
        rx="4"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="0.75"
      />

      {/* Pin 1 Corner Marker */}
      <circle cx="11.5" cy="11.5" r="1.4" fill="#FDE68A" />

      {/* Optical Lens Aperture */}
      <circle
        cx="20"
        cy="20"
        r="6.2"
        fill="#080C14"
        stroke="#22D3EE"
        strokeWidth="1.6"
      />
      <circle cx="20" cy="20" r="2.6" fill="url(#sl-lens-grad)" />
      <circle cx="18.4" cy="18.4" r="0.9" fill="white" fillOpacity="0.9" />

      <defs>
        <linearGradient
          id="sl-chip-grad"
          x1="7"
          y1="7"
          x2="33"
          y2="33"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0E7490" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient
          id="sl-lens-grad"
          x1="17.4"
          y1="17.4"
          x2="22.6"
          y2="22.6"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LiveOscilloscopeStrip({ isAnalyzing }: { isAnalyzing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animId = 0;
    let phase = 0;

    const renderWave = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle center graticule line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Glowing neon-cyan sine wave
      const amplitude = isAnalyzing ? height * 0.34 : height * 0.26;
      const frequency = isAnalyzing ? 0.045 : 0.025;

      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 1.6;
      ctx.beginPath();

      for (let x = 0; x <= width; x += 2) {
        const harmonic =
          Math.sin(x * frequency + phase) * 0.78 +
          Math.sin(x * frequency * 2.1 - phase * 1.4) * 0.22;
        const y = height / 2 + harmonic * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary subtle emerald harmonic trace
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const y =
          height / 2 +
          Math.cos(x * frequency * 1.3 - phase * 0.85) * (amplitude * 0.55);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      if (!prefersReducedMotion) {
        phase += isAnalyzing ? 0.11 : 0.045;
        animId = requestAnimationFrame(renderWave);
      }
    };

    renderWave();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isAnalyzing]);

  return (
    <div className="border-t border-cyan-500/15 bg-[#060911]/90">
      <div className="mx-auto flex max-w-[1140px] items-center gap-4 px-4 py-1.5 sm:px-6">
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 whitespace-nowrap shrink-0">
          <Activity className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>{isAnalyzing ? 'SIGNAL LOCK · ACTIVE SCAN' : 'OSC CH-1 · 12.0 MHz'}</span>
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="h-7 w-full flex-1 block"
        />
        <span className="hidden sm:inline font-mono text-[11px] text-cyan-400/80 whitespace-nowrap shrink-0">
          Vpp 3.30V
        </span>
      </div>
    </div>
  );
}

export function Header({
  hasResult,
  hasImage,
  isAnalyzing,
  onUploadClick,
  onReset,
  onNavigate,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-500/25 bg-[#080C14]/90 backdrop-blur-md">
      <div
        aria-hidden="true"
        className="h-[2px] w-full bg-gradient-to-r from-[#06B6D4] via-[#2563EB] to-[#10B981]"
      />

      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('top');
          }}
          className="inline-flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md"
        >
          <SiliconLensLogo size="md" />
          <span className="font-mono text-lg font-bold tracking-wider text-white">
            SILICON
            <span className="bg-gradient-to-r from-[#22D3EE] to-[#10B981] bg-clip-text text-transparent">
              LENS
            </span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => onNavigate('input-section')}
            className="hover:text-cyan-300 hover:underline decoration-cyan-400 decoration-2 underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Inspector
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pinout-card')}
            className="hover:text-cyan-300 hover:underline decoration-cyan-400 decoration-2 underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Pinout
          </button>
          <button
            type="button"
            onClick={() => onNavigate('safety-card')}
            className="hover:text-cyan-300 hover:underline decoration-cyan-400 decoration-2 underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Safety
          </button>
          <button
            type="button"
            onClick={() => onNavigate('code-card')}
            className="hover:text-cyan-300 hover:underline decoration-cyan-400 decoration-2 underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Starter Code
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {hasImage || hasResult ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-[#0D1526] px-4 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              New Scan
            </button>
          ) : (
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06B6D4] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14]"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload Photo
            </button>
          )}
        </div>
      </div>

      <LiveOscilloscopeStrip isAnalyzing={isAnalyzing} />
    </header>
  );
}
