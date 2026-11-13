import { useState } from 'react';
import { Check, Copy, Code2 } from 'lucide-react';
import type { StarterCode } from '../types/analysis';

interface StarterCodeCardProps {
  starterCode: StarterCode;
}

interface Token {
  text: string;
  className: string;
}

const CPP_KEYWORDS = new Set([
  'void',
  'int',
  'long',
  'unsigned',
  'float',
  'double',
  'bool',
  'char',
  'byte',
  'uint8_t',
  'uint16_t',
  'uint32_t',
  'int16_t',
  'int32_t',
  'size_t',
  'const',
  'static',
  'volatile',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'return',
  'true',
  'false',
  'nullptr',
  'NULL',
]);

const ARDUINO_CONSTANTS = new Set([
  'HIGH',
  'LOW',
  'INPUT',
  'OUTPUT',
  'INPUT_PULLUP',
  'LED_BUILTIN',
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'Serial',
  'Wire',
  'SPI',
  'setup',
  'loop',
  'pinMode',
  'digitalWrite',
  'digitalRead',
  'analogRead',
  'analogWrite',
  'delay',
  'delayMicroseconds',
  'pulseIn',
  'millis',
  'micros',
]);

function tokenizeLine(line: string, inBlockComment: boolean): { tokens: Token[]; inBlockComment: boolean } {
  const tokens: Token[] = [];
  let i = 0;
  let blockComment = inBlockComment;

  if (blockComment) {
    const endIdx = line.indexOf('*/');
    if (endIdx === -1) {
      return {
        tokens: [{ text: line, className: 'text-slate-400 italic' }],
        inBlockComment: true,
      };
    }
    tokens.push({
      text: line.slice(0, endIdx + 2),
      className: 'text-slate-400 italic',
    });
    i = endIdx + 2;
    blockComment = false;
  }

  const trimmedStart = line.slice(i).trimStart();
  if (i === 0 && trimmedStart.startsWith('#')) {
    return {
      tokens: [{ text: line, className: 'text-cyan-300' }],
      inBlockComment: false,
    };
  }

  while (i < line.length) {
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), className: 'text-slate-500 italic' });
      break;
    }

    if (line[i] === '/' && line[i + 1] === '*') {
      const endIdx = line.indexOf('*/', i + 2);
      if (endIdx === -1) {
        tokens.push({ text: line.slice(i), className: 'text-slate-500 italic' });
        blockComment = true;
        break;
      }
      tokens.push({
        text: line.slice(i, endIdx + 2),
        className: 'text-slate-500 italic',
      });
      i = endIdx + 2;
      continue;
    }

    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j += 1;
        j += 1;
      }
      j = Math.min(j + 1, line.length);
      tokens.push({ text: line.slice(i, j), className: 'text-emerald-300' });
      i = j;
      continue;
    }

    if (/[0-9]/.test(line[i]) && (i === 0 || !/[A-Za-z0-9_]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9xXa-fA-F.ULul]/.test(line[j])) {
        j += 1;
      }
      tokens.push({ text: line.slice(i, j), className: 'text-amber-300' });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) {
        j += 1;
      }
      const word = line.slice(i, j);
      if (CPP_KEYWORDS.has(word)) {
        tokens.push({ text: word, className: 'text-sky-400 font-medium' });
      } else if (ARDUINO_CONSTANTS.has(word)) {
        tokens.push({ text: word, className: 'text-cyan-300' });
      } else {
        tokens.push({ text: word, className: 'text-slate-100' });
      }
      i = j;
      continue;
    }

    let j = i + 1;
    while (j < line.length && !/[A-Za-z0-9_"'/]/.test(line[j])) {
      j += 1;
    }
    tokens.push({ text: line.slice(i, j), className: 'text-slate-400' });
    i = j;
  }

  return { tokens, inBlockComment: blockComment };
}

function highlightCppCode(code: string): Token[][] {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const result: Token[][] = [];
  let inBlockComment = false;

  for (const line of lines) {
    const parsed = tokenizeLine(line, inBlockComment);
    result.push(parsed.tokens);
    inBlockComment = parsed.inBlockComment;
  }
  return result;
}

export function StarterCodeCard({ starterCode }: StarterCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(starterCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = starterCode.code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const highlightedLines = highlightCppCode(starterCode.code);

  return (
    <div className="cyber-card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-[#0A101E] px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Code2 className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2 min-w-0 font-mono text-xs">
            <span className="font-semibold text-white whitespace-nowrap">
              {starterCode.filename}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-emerald-400 whitespace-nowrap">
              {starterCode.language}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-[#0D1526] px-3.5 py-1.5 font-mono text-xs font-semibold text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/15 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              Copy Starter Code
            </>
          )}
        </button>
      </div>

      <div className="code-scroll overflow-x-auto bg-[#060911] p-5">
        <pre className="font-mono text-[13px] leading-relaxed">
          <code>
            {highlightedLines.map((lineTokens, lineIdx) => (
              <div key={lineIdx} className="table-row">
                <span className="table-cell select-none pr-5 text-right font-mono tabular-nums text-slate-600">
                  {lineIdx + 1}
                </span>
                <span className="table-cell whitespace-pre">
                  {lineTokens.length > 0 ? (
                    lineTokens.map((tok, tIdx) => (
                      <span key={tIdx} className={tok.className}>
                        {tok.text}
                      </span>
                    ))
                  ) : (
                    '\n'
                  )}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
