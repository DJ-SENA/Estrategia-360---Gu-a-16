import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGemini: Boolean(ai),
      time: new Date().toISOString(),
    });
  });

  // AI Strategic Analysis Endpoint
  app.post('/api/ai/analyze', async (req, res) => {
    const { action, payload } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Modo autónomo local activo (clave Gemini no configurada).',
      });
    }

    try {
      let prompt = '';
      if (action === 'matrix-insights') {
        prompt = `Eres un instructor experto del SENA en el programa Tecnólogo en Gestión Empresarial, especialista en la Guía 16 (Herramientas de Gestión y Evaluación Estratégica).
Analiza la siguiente información de la empresa del GAES:
${JSON.stringify(payload, null, 2)}

Genera un análisis sintético estructurado en formato JSON con:
1. "diagnosticoClave": resumen en 2 párrafos de la situación estratégica.
2. "recomendacionesMatrices": 3 sugerencias precisas para MEFI, MEFE, PEYEA o BCG.
3. "alertasCoherencia": posibles incoherencias detectadas entre el diagnóstico y las metas.
Responde únicamente un objeto JSON válido.`;
      } else if (action === 'audit-bsc') {
        prompt = `Eres un evaluador sénior del SENA de Gestión Empresarial. Audita la coherencia entre las matrices estratégicas y el Balanced Scorecard:
Datos:
${JSON.stringify(payload, null, 2)}

Genera una respuesta en formato JSON con:
1. "puntuacionCoherencia": número entre 0 y 100.
2. "hallazgos": lista de objetos { "tipo": "exito" | "advertencia" | "critico", "mensaje": string, "sugerencia": string }.
3. "dictamen": evaluación pedagógica constructiva para los aprendices.
Responde únicamente un objeto JSON válido.`;
      } else if (action === 'instructor-evaluation') {
        prompt = `Eres el instructor técnico del SENA encargado de emitir el juicio evaluativo de la Guía 16 para este GAES:
Datos del proyecto:
${JSON.stringify(payload, null, 2)}

Genera una propuesta de retroalimentación oficial del SENA en formato JSON:
1. "juicioSugerido": "APROBADO" o "NO APROBADO (CON PLAN DE MEJORAMIENTO)".
2. "observacionProducto": análisis detallado de las evidencias de producto (matrices y BSC).
3. "observacionDesempeno": recomendaciones para la sustentación y desempeño del equipo.
4. "criteriosEvaluados": lista de los 5 criterios de la Guía 16 con estado "Cumple" o "Por mejorar".
Responde únicamente un objeto JSON válido.`;
      } else {
        prompt = `Actúa como asesor estratégico SENA. Analiza: ${JSON.stringify(payload)}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, data: parsed });
      } catch {
        return res.json({ success: true, raw: responseText });
      }
    } catch (error: any) {
      console.error('Gemini error:', error);
      return res.status(200).json({
        success: false,
        error: error.message || 'Error en análisis con Gemini',
        fallback: true,
      });
    }
  });

  // Development vs Production
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
