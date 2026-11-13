export type PinCategory =
  | 'Power'
  | 'Ground'
  | 'Input'
  | 'Output'
  | 'I/O'
  | 'Control'
  | 'NC';

export interface PinInfo {
  pinNumber: string;
  pinName: string;
  type: PinCategory;
  function: string;
}

export interface SafetyWarning {
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
}

export interface StarterCode {
  language: string;
  filename: string;
  code: string;
}

export interface ComponentAnalysis {
  status: 'success' | 'error';
  errorMessage?: string;
  componentName: string;
  partNumber: string;
  manufacturer: string;
  packageType: string;
  pinCount: string;
  orientationMarker: string;
  operatingVoltage: string;
  isBreadboardCircuit: boolean;
  wiringAuditSummary?: string;
  summary: string;
  pinout: PinInfo[];
  safetyWarnings: SafetyWarning[];
  starterCode: StarterCode;
}

export interface UploadedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  name: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}
