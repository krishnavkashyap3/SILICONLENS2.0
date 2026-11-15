# SiliconLens

Hardware & IC telemetry workbench powered by Gemini Vision (`gemini-4-hydrogen`). Upload or capture a photograph of any microchip, integrated circuit, sensor module, or breadboard setup to extract package details, an interactive SVG pinout diagram, electrical safety & wiring audits, and ready-to-run Arduino C++ / Embedded C starter code.

---

## Architecture

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, TypeScript
- **Backend**: Express (`server.ts`) exposing `POST /api/analyze-component` and `GET /api/health`
- **AI Engine**: `@google/genai` (`gemini-4-hydrogen`) with strict structured JSON `responseSchema`
- **Static Fallback**: `src/utils/analyzeComponentClient.ts` automatically activates only when no backend `/api/analyze-component` route is present (e.g., static-only Vite deployments) and `VITE_GEMINI_API_KEY` is supplied

---

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your Gemini API key:
   ```env
   GEMINI_API_KEY="your-actual-gemini-api-key"
   ```

3. **Run the development server** (Express + Vite middleware on port 3000)
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

4. **Typecheck & production build**
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Production Deployment

### Option A: Full-Stack Node Deployment (Recommended)
Deploy to any Node.js host (Cloud Run, Render, Railway, Fly.io, VPS) so `GEMINI_API_KEY` stays strictly server-side:

- **Build command:** `npm run build`
- **Start command:** `NODE_ENV=production npm start` (runs `node server.ts`)
- **Required environment variable:**
  - `GEMINI_API_KEY`: Your Gemini API key
- **Optional environment variables:**
  - `PORT`: Listening port (default `3000`)
  - `ALLOWED_ORIGIN`: Allowed CORS origin(s), e.g. `https://your-app.vercel.app`

### Option B: Vercel Deployment
1. Push this repository to GitHub and import it into **Vercel**.
2. **If pairing Vercel (static frontend) with an external Express backend**:
   - Set `VITE_API_BASE_URL` in Vercel **Project Settings > Environment Variables** to your Express backend URL (e.g. `https://your-backend.onrender.com`).
   - Set `ALLOWED_ORIGIN` on the Express backend to your Vercel domain (e.g. `https://siliconlens.vercel.app`).
3. **If deploying purely as a static Vite build on Vercel (no backend server)**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - In Vercel **Project Settings > Environment Variables**, add:
     - `VITE_GEMINI_API_KEY`: Your Gemini API key
   - **Security Note**: `VITE_*` environment variables are bundled into client-side JavaScript. If you use `VITE_GEMINI_API_KEY` in a static deployment, restrict the API key by **HTTP referrer** in Google Cloud Console (`https://your-project.vercel.app/*`) so it cannot be abused from unauthorized domains.
