import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { ComponentAnalysis, UploadedImage } from '../types/analysis';

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['success', 'error'],
      description:
        'Set to "success" only if an electronic component, IC, sensor, or breadboard circuit is visible and identifiable with high confidence. Set to "error" if the markings are completely unreadable, too blurry/dark, or no electronic component is present.',
    },
    errorMessage: {
      type: Type.STRING,
      description:
        'When status is "error", provide a brief, polite message asking the user for a closer, well-lit photo so chip markings or wiring can be read. Empty string when status is "success".',
    },
    componentName: {
      type: Type.STRING,
      description:
        'Full human-readable name of the primary component, IC, or module.',
    },
    partNumber: {
      type: Type.STRING,
      description:
        'Exact laser-etched part number or PCB silkscreen marking detected.',
    },
    manufacturer: {
      type: Type.STRING,
      description: 'Detected manufacturer from logo or part prefix.',
    },
    packageType: {
      type: Type.STRING,
      description: 'Physical package or form factor.',
    },
    pinCount: {
      type: Type.STRING,
      description: 'Observed physical pin or header count.',
    },
    orientationMarker: {
      type: Type.STRING,
      description: 'Observed Pin 1 orientation reference.',
    },
    operatingVoltage: {
      type: Type.STRING,
      description: 'Nominal operating supply voltage range.',
    },
    isBreadboardCircuit: {
      type: Type.BOOLEAN,
      description:
        'True if the photo shows a breadboard or multi-component wired circuit.',
    },
    wiringAuditSummary: {
      type: Type.STRING,
      description:
        'When isBreadboardCircuit is true, summarize the visual audit of jumper wiring, short circuits, missing current-limiting resistors, or reversed polarity. Otherwise empty string.',
    },
    summary: {
      type: Type.STRING,
      description:
        'Concise 1-2 sentence engineering summary of the identified IC/component and visible setup.',
    },
    pinout: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pinNumber: { type: Type.STRING },
          pinName: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['Power', 'Ground', 'Input', 'Output', 'I/O', 'Control', 'NC'],
          },
          function: { type: Type.STRING },
        },
        required: ['pinNumber', 'pinName', 'type', 'function'],
      },
    },
    safetyWarnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: {
            type: Type.STRING,
            enum: ['critical', 'warning'],
          },
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ['severity', 'title', 'detail'],
      },
    },
    starterCode: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING },
        filename: { type: Type.STRING },
        code: { type: Type.STRING },
      },
      required: ['language', 'filename', 'code'],
    },
  },
  required: [
    'status',
    'errorMessage',
    'componentName',
    'partNumber',
    'manufacturer',
    'packageType',
    'pinCount',
    'orientationMarker',
    'operatingVoltage',
    'isBreadboardCircuit',
    'wiringAuditSummary',
    'summary',
    'pinout',
    'safetyWarnings',
    'starterCode',
  ],
};

function getStaticGeminiApiKey(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY_MISSING');
  }
  return apiKey;
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

export async function analyzeComponentStaticFallback(
  image: UploadedImage
): Promise<ComponentAnalysis> {
  const apiKey = getStaticGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const promptText = [
    'You are an expert electrical engineer and hardware diagnostics specialist.',
    'Analyze the uploaded image following these three mandatory tasks:',
    '1. Examine the physical package, pin count, notch/dot Pin-1 orientation, manufacturer logo, and laser-etched part numbers (e.g., NE555P, ATmega328P, ESP32, LM358, 74HC595) or PCB silkscreen markings.',
    '2. If the image shows a breadboard or multi-component circuit, identify the primary controller/IC, set "isBreadboardCircuit" to true, and audit the visible wiring for short circuits, missing current-limiting resistors, or reversed polarity. Report findings in "wiringAuditSummary" and include urgent issues in "safetyWarnings".',
    '3. If the markings are completely unreadable or no electronic component is present in the image, set "status" to "error" and provide a brief, helpful message in "errorMessage" asking for a closer, well-lit photo.',
    'When identifiable, set "status" to "success" and return the complete pinout ordered sequentially from Pin 1, electrical safety warnings, and compile-ready multi-line C/C++ or Arduino starter code formatted with proper indentation and newline characters.',
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: image.mimeType || 'image/jpeg',
            data: image.base64,
          },
        },
        {
          text: promptText,
        },
      ],
    },
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      systemInstruction:
        'Respond strictly in JSON adhering to the provided schema. Format starterCode.code with clean multi-line indentation and newline characters. Never guess or fabricate a part number when markings are illegible or no electronic part is visible; set status to "error" instead.',
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
    },
  });

  const rawText = response.text ? stripJsonFences(response.text) : '';
  if (!rawText) {
    throw new Error('The analysis service returned an empty response. Please try again.');
  }

  return JSON.parse(rawText) as ComponentAnalysis;
}
