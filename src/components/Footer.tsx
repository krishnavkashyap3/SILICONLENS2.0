import { SiliconLensLogo } from './Header';

export function Footer() {
  return (
    <footer className="border-t border-cyan-500/20 bg-[#060911]">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-4 px-4 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <SiliconLensLogo size="sm" />
          <div>
            <p className="font-mono text-xs font-semibold text-slate-200">
              SILICONLENS HARDWARE LAB
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-400">
              Verify pinouts and maximum voltage limits against manufacturer datasheets before energizing circuits.
            </p>
          </div>
        </div>

        <p className="font-mono text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0">
          Developed by{' '}
          <span className="bg-gradient-to-r from-[#22D3EE] to-[#10B981] bg-clip-text text-transparent">
            Team DECOY
          </span>
        </p>
      </div>
    </footer>
  );
}
