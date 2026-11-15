import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const app = express();

// Allow base64 payloads representing up to 15 MB binary images (~20 MB base64 JSON)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Production-ready CORS middleware supporting split frontend/backend deployments
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGIN?.trim();
  const requestOrigin = req.headers.origin;

  if (!allowedOriginsEnv || allowedOriginsEnv === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin) {
    const allowedList = allowedOriginsEnv.split(',').map((o) => o.trim());
    if (allowedList.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
      description: 'Full human-readable name of the primary component, IC, or module (e.g., "NE555 Precision Timer", "ATmega328P Microcontroller", "HC-SR04 Ultrasonic Sensor").',
    },
    partNumber: {
      type: Type.STRING,
      description: 'Exact laser-etched part number or PCB silkscreen marking detected (e.g., "NE555P", "ATmega328P", "ESP32", "LM358", "74HC595").',
    },
    manufacturer: {
      type: Type.STRING,
      description: 'Detected manufacturer from logo or part prefix (e.g., "Texas Instruments", "Microchip / Atmel", "Espressif Systems", "STMicroelectronics", or "Generic / Multi-source").',
    },
    packageType: {
      type: Type.STRING,
      description: 'Physical package or form factor (e.g., "8-Pin DIP", "28-Pin PDIP", "SOIC-8", "QFN-48", "4-Pin Breakout Module", "Breadboard Assembly").',
    },
    pinCount: {
      type: Type.STRING,
      description: 'Observed physical pin or header count (e.g., "8 pins", "16 pins", "4 header pins").',
    },
    orientationMarker: {
      type: Type.STRING,
      description: 'Observed Pin 1 orientation reference such as notch side, circular dot, chamfered edge, or silkscreen Pin 1 label (e.g., "U-shaped notch and circular dot on left end indicating Pin 1 at bottom-left").',
    },
    operatingVoltage: {
      type: Type.STRING,
      description: 'Nominal operating supply voltage range (e.g., "4.5V - 16V DC", "3.3V", "5.0V DC").',
    },
    isBreadboardCircuit: {
      type: Type.BOOLEAN,
      description: 'True if the photo shows a breadboard or multi-component wired circuit rather than an isolated component.',
    },
    wiringAuditSummary: {
      type: Type.STRING,
      description: 'When isBreadboardCircuit is true, summarize the visual audit of jumper wiring, power rails, potential short circuits, missing current-limiting resistors (e.g. on LEDs), or reversed polarity. Otherwise return an empty string.',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence engineering summary of the identified IC/component and visible setup.',
    },
    pinout: {
      type: Type.ARRAY,
      description: 'Complete pinout table ordered sequentially by pin number or header order.',
      items: {
        type: Type.OBJECT,
        properties: {
          pinNumber: {
            type: Type.STRING,
            description: 'Pin index or header position (e.g., "1", "2", "A0").',
          },
          pinName: {
            type: Type.STRING,
            description: 'Official datasheet pin symbol (e.g., "VCC", "GND", "TRIG", "OUT").',
          },
          type: {
            type: Type.STRING,
            enum: ['Power', 'Ground', 'Input', 'Output', 'I/O', 'Control', 'NC'],
            description: 'Electrical pin classification.',
          },
          function: {
            type: Type.STRING,
            description: 'Clear description of what the pin does.',
          },
        },
        required: ['pinNumber', 'pinName', 'type', 'function'],
      },
    },
    safetyWarnings: {
      type: Type.ARRAY,
      description: 'Critical wiring, voltage, short-circuit, current-limiting resistor, decoupling, polarity, or ESD warnings.',
      items: {
        type: Type.OBJECT,
        properties: {
          severity: {
            type: Type.STRING,
            enum: ['critical', 'warning'],
            description: '"critical" for irreversible damage hazards (short circuits, overvoltage, reversed polarity, missing LED/base current-limiting resistors, logic level mismatch); "warning" for stability precautions (decoupling caps, pull-ups).',
          },
          title: {
            type: Type.STRING,
            description: 'Short warning title.',
          },
          detail: {
            type: Type.STRING,
            description: 'Actionable wiring precaution or audit finding.',
          },
        },
        required: ['severity', 'title', 'detail'],
      },
    },
    starterCode: {
      type: Type.OBJECT,
      description: 'Ready-to-use, multi-line indented C/C++ or Arduino starter code tailored to this component.',
      properties: {
        language: {
          type: Type.STRING,
          description: 'Language label such as "Arduino C++" or "Embedded C".',
        },
        filename: {
          type: Type.STRING,
          description: 'Suggested filename such as "ne555_frequency_monitor.ino".',
        },
        code: {
          type: Type.STRING,
          description: 'Clean, properly indented multi-line starter code using newline characters (\\n) between statements.',
        },
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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze-component', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: unknown;
      mimeType?: unknown;
    };

    if (typeof imageBase64 !== 'string' || imageBase64.trim().length < 32) {
      res.status(400).json({
        error: 'Please provide a valid image before running analysis.',
      });
      return;
    }

    const estimatedImageBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (estimatedImageBytes > 15 * 1024 * 1024) {
      res.status(413).json({
        error: 'The uploaded image exceeds the 15 MB limit. Please upload a smaller photo.',
      });
      return;
    }

    const validMime =
      typeof mimeType === 'string' && mimeType.startsWith('image/')
        ? mimeType
        : 'image/jpeg';

    const ai = getGeminiClient();

    const promptText = [
      'You are an expert electrical engineer and hardware diagnostics specialist.',
      'Analyze the uploaded image following these three mandatory tasks:',
      '1. Examine the physical package, pin count, notch/dot Pin-1 orientation, manufacturer logo, and laser-etched part numbers (e.g., NE555P, ATmega328P, ESP32, LM358, 74HC595) or PCB silkscreen markings.',
      '2. If the image shows a breadboard or multi-component circuit, identify the primary controller/IC, set "isBreadboardCircuit" to true, and audit the visible wiring for short circuits (e.g., VCC bridged directly to GND or shorted breadboard rows), missing current-limiting resistors (e.g., LEDs or BJT bases wired directly to rails/pins), or reversed polarity (electrolytic capacitors, diodes, or red/black rail swaps). Report findings in "wiringAuditSummary" and include urgent issues in "safetyWarnings".',
      '3. If the markings are completely unreadable or no electronic component is present in the image, set "status" to "error" and provide a brief, helpful message in "errorMessage" asking for a closer, well-lit photo.',
      'When identifiable, set "status" to "success" and return the complete pinout ordered sequentially from Pin 1, electrical safety warnings, and compile-ready multi-line C/C++ or Arduino starter code formatted with proper indentation and newline characters.',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: validMime,
              data: imageBase64,
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
      res.status(502).json({
        error: 'The analysis service returned an empty response. Please try again.',
      });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === 'GEMINI_API_KEY_MISSING') {
      res.status(500).json({
        error:
          'Gemini API key is not configured on the server. Set the GEMINI_API_KEY environment variable.',
      });
      return;
    }

    if (
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('403')
    ) {
      res.status(403).json({
        error:
          'The Gemini API key appears invalid or lacks permission. Please verify GEMINI_API_KEY.',
      });
      return;
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      res.status(429).json({
        error:
          'Analysis quota temporarily reached. Please wait a moment before trying another scan.',
      });
      return;
    }

    console.error('Analyze component error:', err);
    res.status(500).json({
      error:
        'Unable to analyze this image right now. Please try another photo or retry shortly.',
    });
  }
});

// JSON error middleware for Express body-parser limits / malformed JSON
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status: unknown }).status)
      : 500;

  if (status === 413) {
    res.status(413).json({
      error: 'The uploaded image is too large. Please upload an image under 15 MB.',
    });
    return;
  }

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: 'Invalid request payload sent to the analysis endpoint.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SiliconLens server listening on http://localhost:${PORT}`);
  });
}

startServer();
