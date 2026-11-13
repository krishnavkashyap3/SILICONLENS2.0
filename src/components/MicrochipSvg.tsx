import type { PinCategory, PinInfo } from '../types/analysis';

interface MicrochipSvgProps {
  partNumber: string;
  packageType: string;
  operatingVoltage: string;
  pinout: PinInfo[];
  activePinIndex: number | null;
  onPinHover: (index: number | null) => void;
  onPinClick: (index: number) => void;
}

function getPinAccentColor(type: PinCategory): string {
  switch (type) {
    case 'Power':
      return '#FB7185';
    case 'Ground':
      return '#94A3B8';
    case 'Input':
      return '#38BDF8';
    case 'Output':
      return '#34D399';
    case 'I/O':
      return '#A78BFA';
    case 'Control':
      return '#FBBF24';
    default:
      return '#64748B';
  }
}

export function MicrochipSvg({
  partNumber,
  packageType,
  operatingVoltage,
  pinout,
  activePinIndex,
  onPinHover,
  onPinClick,
}: MicrochipSvgProps) {
  const totalPins = pinout.length;
  const leftCount = Math.ceil(totalPins / 2);
  const rightCount = totalPins - leftCount;
  const rowCount = Math.max(leftCount, rightCount, 2);

  const rowSpacing = 38;
  const bodyTop = 36;
  const bodyHeight = rowCount * rowSpacing + 36;
  const svgHeight = bodyTop + bodyHeight + 28;
  const svgWidth = 440;
  const bodyWidth = 176;
  const bodyX = (svgWidth - bodyWidth) / 2;
  const leadWidth = 30;
  const leadHeight = 14;

  // Standard IC counter-clockwise order:
  // Left side top-to-bottom: indices 0 .. leftCount - 1
  // Right side top-to-bottom: indices totalPins - 1 down to leftCount
  const leftPins = pinout.slice(0, leftCount).map((pin, i) => ({
    pin,
    originalIndex: i,
    row: i,
  }));

  const rightPins = pinout
    .slice(leftCount)
    .reverse()
    .map((pin, i) => ({
      pin,
      originalIndex: totalPins - 1 - i,
      row: i,
    }));

  const activePin =
    activePinIndex !== null && pinout[activePinIndex]
      ? pinout[activePinIndex]
      : null;

  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#070B14] p-3">
        <div className="mb-2 flex items-center justify-between px-1 font-mono text-[11px] text-slate-400">
          <span>PACKAGE DIAGRAM · INTERACTIVE</span>
          <span className="text-cyan-400">HOVER OR CLICK PIN</span>
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="mx-auto w-full max-w-[440px] select-none"
          role="img"
          aria-label={`Interactive IC package diagram for ${partNumber}`}
        >
          <defs>
            <linearGradient id="ic-body-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#121C33" />
              <stop offset="100%" stopColor="#080D19" />
            </linearGradient>
            <linearGradient id="ic-lead-left" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="65%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="ic-lead-right" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="35%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
          </defs>

          {/* Subtle Alignment Crosshair Lines */}
          <line
            x1={svgWidth / 2}
            y1="8"
            x2={svgWidth / 2}
            y2={svgHeight - 8}
            stroke="rgba(6, 182, 212, 0.1)"
            strokeDasharray="3 4"
          />

          {/* IC Silicon Body */}
          <rect
            x={bodyX}
            y={bodyTop}
            width={bodyWidth}
            height={bodyHeight}
            rx="10"
            fill="url(#ic-body-grad)"
            stroke="rgba(6, 182, 212, 0.45)"
            strokeWidth="1.5"
          />

          {/* Inner Die Perimeter */}
          <rect
            x={bodyX + 8}
            y={bodyTop + 8}
            width={bodyWidth - 16}
            height={bodyHeight - 16}
            rx="6"
            fill="none"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="1"
          />

          {/* Top U-Notch */}
          <path
            d={`M ${svgWidth / 2 - 14} ${bodyTop} A 14 14 0 0 0 ${svgWidth / 2 + 14} ${bodyTop}`}
            fill="#070B14"
            stroke="rgba(6, 182, 212, 0.5)"
            strokeWidth="1.25"
          />

          {/* Pin 1 Orientation Dot */}
          <circle
            cx={bodyX + 20}
            cy={bodyTop + 20}
            r="4.5"
            fill="#06B6D4"
            fillOpacity="0.25"
            stroke="#22D3EE"
            strokeWidth="1.2"
          />
          <circle cx={bodyX + 20} cy={bodyTop + 20} r="1.8" fill="#22D3EE" />

          {/* Laser-etched Package Markings */}
          <text
            x={svgWidth / 2}
            y={bodyTop + bodyHeight / 2 - 8}
            textAnchor="middle"
            className="fill-slate-100 font-mono text-[13px] font-semibold tracking-wider"
          >
            {partNumber.length > 16 ? `${partNumber.slice(0, 15)}…` : partNumber}
          </text>
          <text
            x={svgWidth / 2}
            y={bodyTop + bodyHeight / 2 + 11}
            textAnchor="middle"
            className="fill-cyan-400/80 font-mono text-[10px]"
          >
            {packageType.length > 20 ? `${packageType.slice(0, 19)}…` : packageType}
          </text>
          <text
            x={svgWidth / 2}
            y={bodyTop + bodyHeight / 2 + 27}
            textAnchor="middle"
            className="fill-emerald-400/80 font-mono text-[9px]"
          >
            {operatingVoltage}
          </text>

          {/* Left Pins */}
          {leftPins.map(({ pin, originalIndex, row }) => {
            const y = bodyTop + 24 + row * rowSpacing;
            const isActive = activePinIndex === originalIndex;
            const accent = getPinAccentColor(pin.type);

            return (
              <g
                key={`left-${originalIndex}`}
                role="button"
                tabIndex={0}
                aria-label={`Pin ${pin.pinNumber}: ${pin.pinName} (${pin.type}) - ${pin.function}`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => onPinHover(originalIndex)}
                onMouseLeave={() => onPinHover(null)}
                onFocus={() => onPinHover(originalIndex)}
                onBlur={() => onPinHover(null)}
                onClick={() => onPinClick(originalIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPinClick(originalIndex);
                  }
                }}
              >
                {/* Invisible wider hit target */}
                <rect
                  x={4}
                  y={y - 8}
                  width={bodyX + 12}
                  height={leadHeight + 16}
                  fill="transparent"
                />
                {/* Metallic Lead */}
                <rect
                  x={bodyX - leadWidth}
                  y={y}
                  width={leadWidth}
                  height={leadHeight}
                  rx="2"
                  fill={isActive ? '#06B6D4' : 'url(#ic-lead-left)'}
                  stroke={isActive ? '#67E8F9' : '#475569'}
                  strokeWidth={isActive ? '1.5' : '0.8'}
                />
                {/* Pin Type Color Pad */}
                <circle
                  cx={bodyX - leadWidth + 5}
                  cy={y + leadHeight / 2}
                  r="2.4"
                  fill={accent}
                />
                {/* Pin Number inside edge */}
                <text
                  x={bodyX + 11}
                  y={y + leadHeight / 2 + 3.5}
                  textAnchor="start"
                  className={`font-mono text-[10px] font-semibold ${
                    isActive ? 'fill-cyan-300' : 'fill-slate-400'
                  }`}
                >
                  {pin.pinNumber}
                </text>
                {/* Pin Name outside left */}
                <text
                  x={bodyX - leadWidth - 8}
                  y={y + leadHeight / 2 + 3.5}
                  textAnchor="end"
                  className={`font-mono text-[11px] font-semibold ${
                    isActive ? 'fill-cyan-300' : 'fill-slate-200'
                  }`}
                >
                  {pin.pinName}
                </text>
              </g>
            );
          })}

          {/* Right Pins */}
          {rightPins.map(({ pin, originalIndex, row }) => {
            const y = bodyTop + 24 + row * rowSpacing;
            const isActive = activePinIndex === originalIndex;
            const accent = getPinAccentColor(pin.type);

            return (
              <g
                key={`right-${originalIndex}`}
                role="button"
                tabIndex={0}
                aria-label={`Pin ${pin.pinNumber}: ${pin.pinName} (${pin.type}) - ${pin.function}`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => onPinHover(originalIndex)}
                onMouseLeave={() => onPinHover(null)}
                onFocus={() => onPinHover(originalIndex)}
                onBlur={() => onPinHover(null)}
                onClick={() => onPinClick(originalIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPinClick(originalIndex);
                  }
                }}
              >
                <rect
                  x={bodyX + bodyWidth - 12}
                  y={y - 8}
                  width={svgWidth - (bodyX + bodyWidth) + 8}
                  height={leadHeight + 16}
                  fill="transparent"
                />
                <rect
                  x={bodyX + bodyWidth}
                  y={y}
                  width={leadWidth}
                  height={leadHeight}
                  rx="2"
                  fill={isActive ? '#06B6D4' : 'url(#ic-lead-right)'}
                  stroke={isActive ? '#67E8F9' : '#475569'}
                  strokeWidth={isActive ? '1.5' : '0.8'}
                />
                <circle
                  cx={bodyX + bodyWidth + leadWidth - 5}
                  cy={y + leadHeight / 2}
                  r="2.4"
                  fill={accent}
                />
                <text
                  x={bodyX + bodyWidth - 11}
                  y={y + leadHeight / 2 + 3.5}
                  textAnchor="end"
                  className={`font-mono text-[10px] font-semibold ${
                    isActive ? 'fill-cyan-300' : 'fill-slate-400'
                  }`}
                >
                  {pin.pinNumber}
                </text>
                <text
                  x={bodyX + bodyWidth + leadWidth + 8}
                  y={y + leadHeight / 2 + 3.5}
                  textAnchor="start"
                  className={`font-mono text-[11px] font-semibold ${
                    isActive ? 'fill-cyan-300' : 'fill-slate-200'
                  }`}
                >
                  {pin.pinName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live Pin Inspector Tooltip / Telemetry Readout */}
      <div
        aria-live="polite"
        className="rounded-xl border border-cyan-500/25 bg-[#070B14]/90 p-3.5"
      >
        {activePin ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <span className="font-semibold text-cyan-300">
                PIN {activePin.pinNumber} · {activePin.pinName}
              </span>
              <span className="text-emerald-400">
                TYPE: {activePin.type.toUpperCase()} · NOMINAL {operatingVoltage}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {activePin.function}
            </p>
          </div>
        ) : (
          <p className="font-mono text-xs text-slate-400">
            Select or hover any pin lead on the IC graphic or row in the table to inspect electrical function.
          </p>
        )}
      </div>
    </div>
  );
}
