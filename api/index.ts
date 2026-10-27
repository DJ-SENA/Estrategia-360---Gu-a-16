import app from './_serverApp.bundle.js';

/**
 * Vercel Serverless Function entry point
 * En Vercel, todas las solicitudes dirigidas a /api/* son resueltas por este handler.
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}
