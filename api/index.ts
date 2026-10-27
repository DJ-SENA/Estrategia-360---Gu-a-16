// @ts-ignore
import serverBundle from './_serverApp.bundle.cjs';

// CommonJS module interop
const app = (serverBundle && (serverBundle.default || serverBundle)) as any;

/**
 * Vercel Serverless Function entry point
 * En Vercel, todas las solicitudes dirigidas a /api/* son resueltas por este handler.
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}

