import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Code2,
  Cpu,
  ShieldAlert,
  Terminal,
  Upload,
} from 'lucide-react';
import type { ComponentAnalysis, UploadedImage } from './types/analysis';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { UploadSection } from './components/UploadSection';
import { CameraModal } from './components/CameraModal';
import { ErrorAlert } from './components/ErrorAlert';
import { ResultsDashboard } from './components/ResultsDashboard';
import { MicrochipSvg } from './components/MicrochipSvg';
import { analyzeComponentStaticFallback } from './utils/analyzeComponentClient';

interface ErrorState {
  title: string;
  message: string;
}

const STANDBY_PINOUT_PREVIEW = [
  { pinNumber: '1', pinName: 'GND', type: 'Ground' as const, function: 'Ground reference (0V)' },
  { pinNumber: '2', pinName: 'TRIG', type: 'Input' as const, function: 'Trigger comparator input' },
  { pinNumber: '3', pinName: 'OUT', type: 'Output' as const, function: 'Push-pull timer output' },
  { pinNumber: '4', pinName: 'RESET', type: 'Control' as const, function: 'Active-low master reset' },
  { pinNumber: '5', pinName: 'CTRL', type: 'Control' as const, function: 'Control voltage threshold' },
  { pinNumber: '6', pinName: 'THRES', type: 'Input' as const, function: 'Upper threshold comparator' },
  { pinNumber: '7', pinName: 'DISCH', type: 'Output' as const, function: 'Open-collector discharge' },
  { pinNumber: '8', pinName: 'VCC', type: 'Power' as const, function: 'Positive supply rail (+4.5V to +16V)' },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ComponentAnalysis | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [standbyHoverPin, setStandbyHoverPin] = useState<number | null>(null);
  const [standbyLockedPin, setStandbyLockedPin] = useState<number | null>(0);

  const analyzeImage = async (image: UploadedImage) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    setErrorState(null);

    try {
      let payload: Partial<ComponentAnalysis> & { error?: string };
      let serverResponse: Response | null = null;

      try {
        serverResponse = await fetch('/api/analyze-component', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: image.base64,
            mimeType: image.mimeType,
          }),
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          return;
        }
        serverResponse = null;
      }

      const contentType = serverResponse?.headers.get('content-type') || '';

      if (
        !serverResponse ||
        serverResponse.status === 404 ||
        serverResponse.status === 405 ||
        (serverResponse.ok && !contentType.includes('application/json'))
      ) {
        payload = await analyzeComponentStaticFallback(image);
      } else {
        if (!contentType.includes('application/json')) {
          if (controller.signal.aborted) return;
          setAnalysis(null);
          setErrorState({
            title: 'Analysis Failed',
            message: `Server returned status ${serverResponse.status}. Please try again shortly.`,
          });
          return;
        }

        payload = (await serverResponse.json()) as Partial<ComponentAnalysis> & {
          error?: string;
        };

        if (!serverResponse.ok) {
          if (controller.signal.aborted) return;
          setAnalysis(null);
          setErrorState({
            title: 'Analysis Failed',
            message:
              payload.error ||
              'We encountered an issue while analyzing this image. Please try again.',
          });
          return;
        }
      }

      if (controller.signal.aborted) return;

      if (payload.status === 'error') {
        setAnalysis(null);
        setErrorState({
          title: 'Unable to Identify Component',
          message:
            payload.errorMessage ||
            'Markings appear unreadable or no electronic component was detected. Please upload a closer, well-lit photo.',
        });
        return;
      }

      setAnalysis(payload as ComponentAnalysis);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setAnalysis(null);
      setErrorState({
        title: 'Analysis Error',
        message:
          message.includes('API_KEY_INVALID') ||
          message.includes('API key not valid') ||
          message.includes('PERMISSION_DENIED')
            ? 'The configured Gemini API key was rejected. Please verify your API key.'
            : message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
              ? 'Analysis quota temporarily reached. Please wait a moment and try again.'
              : 'Unable to analyze this image right now. Please check your connection and try again.',
      });
    } finally {
      if (abortControllerRef.current === controller) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleImageSelected = (image: UploadedImage) => {
    setUploadedImage(image);
    setAnalysis(null);
    setErrorState(null);
    void analyzeImage(image);
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setUploadedImage(null);
    setAnalysis(null);
    setErrorState(null);
    setIsAnalyzing(false);
  };

  const handleNavigate = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAnalyze = () => {
    if (!uploadedImage || isAnalyzing) return;
    void analyzeImage(uploadedImage);
  };

  const activeStandbyPin =
    standbyHoverPin !== null ? standbyHoverPin : standbyLockedPin;

  return (
    <div id="top" className="relative min-h-screen flex flex-col bg-[#080C14] text-slate-100 overflow-x-hidden">
      {/* Animated PCB Micro-Grid Background */}
      <div
        aria-hidden="true"
        className="pcb-micro-grid pointer-events-none fixed inset-0 z-0 opacity-80"
      />

      {/* Glowing Neon Circuit Trace Lines */}
      <svg
        aria-hidden="true"
        className="circuit-trace-glow pointer-events-none fixed inset-0 z-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        fill="none"
      >
        <path
          d="M0 140 H180 L230 190 H420"
          stroke="#06B6D4"
          strokeOpacity="0.24"
          strokeWidth="1.25"
        />
        <circle cx="420" cy="190" r="3.5" fill="#06B6D4" fillOpacity="0.35" />
        <path
          d="M1440 240 H1220 L1160 300 H980"
          stroke="#10B981"
          strokeOpacity="0.22"
          strokeWidth="1.25"
        />
        <circle cx="980" cy="300" r="3.5" fill="#10B981" fillOpacity="0.35" />
        <path
          d="M0 680 H210 L260 630 H390"
          stroke="#2563EB"
          strokeOpacity="0.24"
          strokeWidth="1.25"
        />
        <circle cx="390" cy="630" r="3.5" fill="#2563EB" fillOpacity="0.35" />
        <path
          d="M1440 720 H1240 L1185 665 H1030"
          stroke="#06B6D4"
          strokeOpacity="0.22"
          strokeWidth="1.25"
        />
        <circle cx="1030" cy="665" r="3.5" fill="#06B6D4" fillOpacity="0.35" />
      </svg>

      <Header
        hasResult={Boolean(analysis)}
        hasImage={Boolean(uploadedImage)}
        isAnalyzing={isAnalyzing}
        onUploadClick={() => fileInputRef.current?.click()}
        onReset={handleReset}
        onNavigate={handleNavigate}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1140px] flex-1 px-4 py-12 sm:px-6 sm:py-14">
        {/* Hero Banner */}
        <section className="mb-12">
          <p className="font-mono text-xs font-semibold tracking-widest text-cyan-400">
            SILICONLENS DIAGNOSTICS WORKBENCH
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl text-balance">
            Hardware &amp; IC Telemetry from a{' '}
            <span className="bg-gradient-to-r from-[#22D3EE] via-[#38BDF8] to-[#10B981] bg-clip-text text-transparent">
              Single Capture
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Upload or capture any microchip, sensor breakout, or breadboard circuit. SiliconLens decodes package markings, maps interactive pinouts, audits wiring polarity, and synthesizes starter C/C++ firmware automatically.
          </p>
        </section>

        {/* SECTION 01: Inspector Upload & Viewfinder */}
        <div className="space-y-12">
          <UploadSection
            uploadedImage={uploadedImage}
            isAnalyzing={isAnalyzing}
            hasResult={Boolean(analysis)}
            fileInputRef={fileInputRef}
            onImageSelected={handleImageSelected}
            onImageCleared={handleReset}
            onOpenCamera={() => setIsCameraOpen(true)}
            onAnalyze={handleAnalyze}
            onFileError={(message) =>
              setErrorState({
                title: 'Invalid Image File',
                message,
              })
            }
          />

          {/* Polite Error Handling */}
          {errorState && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <ErrorAlert
                title={errorState.title}
                message={errorState.message}
                onRetry={() => fileInputRef.current?.click()}
              />
            </motion.div>
          )}

          {/* Loading Skeleton */}
          {isAnalyzing && (
            <div
              aria-live="polite"
              aria-label="Analyzing component"
              className="space-y-10"
            >
              <div className="cyber-card rounded-2xl p-6">
                <div className="h-3 w-48 rounded bg-cyan-500/20 animate-pulse" />
                <div className="mt-3 h-8 w-80 rounded bg-slate-700/70 animate-pulse" />
                <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="cyber-card h-72 rounded-2xl p-6 lg:col-span-5 animate-pulse" />
                <div className="cyber-card h-72 rounded-2xl p-6 lg:col-span-7 animate-pulse" />
              </div>
            </div>
          )}

          {/* Live Analysis Dashboard OR Standby Multi-Section Architecture */}
          {analysis && !isAnalyzing ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <ResultsDashboard analysis={analysis} />
            </motion.div>
          ) : (
            !isAnalyzing && (
              <div className="space-y-12">
                {/* SECTION 02: Standby Interactive Pinout Inspector Preview */}
                <section
                  id="pinout-card"
                  aria-label="Pinout Inspector Preview"
                  className="cyber-card scroll-mt-32 rounded-2xl p-6 sm:p-8"
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
                    <div>
                      <span className="font-mono text-[11px] font-semibold tracking-wider text-cyan-400">
                        02. PINOUT &amp; PACKAGE MATRIX
                      </span>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        Interactive SVG Microchip Inspector
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      REFERENCE MODEL · NE555P (8-PIN DIP)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-5">
                      <MicrochipSvg
                        partNumber="NE555P"
                        packageType="8-Pin DIP"
                        operatingVoltage="4.5V - 16V DC"
                        pinout={STANDBY_PINOUT_PREVIEW}
                        activePinIndex={activeStandbyPin}
                        onPinHover={setStandbyHoverPin}
                        onPinClick={(index) =>
                          setStandbyLockedPin((prev) =>
                            prev === index ? null : index
                          )
                        }
                      />
                    </div>

                    <div className="space-y-4 lg:col-span-7">
                      <div className="overflow-hidden rounded-xl border border-cyan-500/25 bg-[#070B14]">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-cyan-500/25 bg-[#0B1222] font-mono text-xs font-semibold text-cyan-300">
                              <th scope="col" className="px-4 py-3">Pin</th>
                              <th scope="col" className="px-4 py-3">Name</th>
                              <th scope="col" className="px-4 py-3">Type</th>
                              <th scope="col" className="px-4 py-3">Function</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {STANDBY_PINOUT_PREVIEW.map((pin, idx) => {
                              const isHighlighted = activeStandbyPin === idx;
                              return (
                                <tr
                                  key={pin.pinNumber}
                                  onMouseEnter={() => setStandbyHoverPin(idx)}
                                  onMouseLeave={() => setStandbyHoverPin(null)}
                                  onClick={() =>
                                    setStandbyLockedPin((prev) =>
                                      prev === idx ? null : idx
                                    )
                                  }
                                  className={`cursor-pointer transition-colors ${
                                    isHighlighted
                                      ? 'bg-cyan-500/20'
                                      : 'odd:bg-[#070B14] even:bg-[#0A101E] hover:bg-cyan-500/10'
                                  }`}
                                >
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold tabular-nums text-cyan-300">
                                    {pin.pinNumber}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-white">
                                    {pin.pinName}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-xs text-emerald-400">
                                    {pin.type}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-slate-300">
                                    {pin.function}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <p className="font-mono text-xs text-slate-400">
                        Upload any microchip or select a calibration sample above to populate live pinout telemetry for your component.
                      </p>
                    </div>
                  </div>
                </section>

                {/* SECTION 03: Dedicated Safety & Wiring Audit Module */}
                <section
                  id="safety-card"
                  aria-label="Safety and Wiring Audit Module"
                  className="scroll-mt-32 rounded-2xl border border-amber-500/35 bg-[#15110B]/85 p-6 backdrop-blur-md sm:p-8"
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                      <div>
                        <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400">
                          03. ELECTRICAL SAFETY &amp; WIRING AUDIT
                        </span>
                        <h2 className="mt-0.5 text-lg font-semibold text-white">
                          Pre-Power Circuit Protection Engine
                        </h2>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-amber-300">
                      REAL-TIME HAZARD CHECKS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-amber-500/25 bg-[#090D16]/90 p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-amber-300">
                        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                        SHORT-CIRCUIT DETECTION
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Inspects breadboard jumper routing for direct VCC-to-GND bridges and unintended row tie-points before energizing rails.
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-[#090D16]/90 p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-amber-300">
                        <Cpu className="h-4 w-4" aria-hidden="true" />
                        CURRENT-LIMITING AUDIT
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Flags missing series resistors on LEDs, transistor bases, and I/O pins plus required 100nF ceramic decoupling capacitors.
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-[#090D16]/90 p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-amber-300">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        POLARITY &amp; LOGIC LEVELS
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Verifies electrolytic capacitor/diode orientation and highlights 3.3V vs. 5V logic level shifting requirements.
                      </p>
                    </div>
                  </div>
                </section>

                {/* SECTION 04: Dedicated Starter Code & Export Module */}
                <section
                  id="code-card"
                  aria-label="Starter Code and Datasheet Export Module"
                  className="cyber-card scroll-mt-32 rounded-2xl p-6 sm:p-8"
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <Terminal className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                      <div>
                        <span className="font-mono text-[11px] font-semibold tracking-wider text-cyan-400">
                          04. FIRMWARE &amp; DATASHEET EXPORT
                        </span>
                        <h2 className="mt-0.5 text-lg font-semibold text-white">
                          Starter Code, Raw JSON Telemetry &amp; Markdown Export
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#06B6D4] px-4 py-2 font-mono text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      Scan Component Now
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-cyan-500/25 bg-[#070B14] p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-300">
                        <Code2 className="h-4 w-4" aria-hidden="true" />
                        ARDUINO &amp; EMBEDDED C
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Synthesizes compile-ready starter firmware mapped to your detected sensor or IC pins with one-click clipboard copy.
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-500/25 bg-[#070B14] p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
                        <Terminal className="h-4 w-4" aria-hidden="true" />
                        [ &lt;/&gt; RAW TELEMETRY ]
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Flip directly into the raw Gemini Vision JSON payload stream for automated hardware pipelines and debugging.
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-500/25 bg-[#070B14] p-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-300">
                        <Cpu className="h-4 w-4" aria-hidden="true" />
                        DATASHEET SUMMARY (.MD)
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        Download a complete Markdown lab report containing specs, pinout tables, safety warnings, and firmware code.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )
          )}
        </div>
      </main>

      <Footer />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleImageSelected}
        onFallbackToFilePicker={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
