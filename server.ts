import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { INITIAL_COHORT_PROJECTS } from './src/data/cohortMockProjects';
import { createBlankGAESProject } from './src/data/mockProjects';
import { GAESProject, AuditContributionRecord } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================================
// CENTRALIZED STORAGE SUBSYSTEM (SERVER-AUTHORITATIVE & PERSISTENT)
// =========================================================================

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'projects-db.json');
const BACKUP_FILE = path.resolve(DATA_DIR, 'projects-db.json.bak');

function validateProjectSchema(project: any): boolean {
  if (!project || typeof project !== 'object') return false;
  if (!project.id || typeof project.id !== 'string') return false;
  if (typeof project.gaesNumber !== 'number') return false;
  if (!project.company || typeof project.company !== 'object' || !project.company.name) return false;
  return true;
}

function atomicSaveProjectsToDisk(projects: GAESProject[]): { success: boolean; error?: string } {
  if (!Array.isArray(projects) || projects.length === 0) {
    return { success: false, error: 'Validación fallida: El conjunto de proyectos debe ser un arreglo no vacío.' };
  }

  for (const proj of projects) {
    if (!validateProjectSchema(proj)) {
      return { success: false, error: `Validación fallida: Esquema inválido en proyecto ${proj?.id || 'desconocido'}.` };
    }
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const payload = JSON.stringify(projects, null, 2);
    const tempFile = path.resolve(DATA_DIR, `projects-db.tmp.${process.pid}.${Date.now()}`);
    fs.writeFileSync(tempFile, payload, 'utf-8');

    // Create backup copy for crash recovery
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, BACKUP_FILE);
      } catch (copyErr) {
        console.warn('[Storage] Advertencia al generar archivo de respaldo .bak:', copyErr);
      }
    }

    // Atomic replacement
    fs.renameSync(tempFile, DB_FILE);
    storedProjects = projects;
    return { success: true };
  } catch (err: any) {
    console.error('[Storage] Error crítico en escritura atómica:', err);
    return { success: false, error: err?.message || 'Fallo de E/S en escritura atómica.' };
  }
}

function initializeProjectDatabase(): GAESProject[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Storage] Base de datos principal cargada exitosamente: ${parsed.length} proyectos.`);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Advertencia: Archivo principal dañado. Intentando recuperación automática desde respaldo .bak...');
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const parsedBackup = JSON.parse(backupRaw);
        if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
          console.log(`[Storage] RECUPERACIÓN EXITOSA: Proyectos restaurados desde ${BACKUP_FILE}.`);
          fs.writeFileSync(DB_FILE, backupRaw, 'utf-8');
          return parsedBackup;
        }
      }
    } catch (bakErr) {
      console.error('[Storage] Error crítico al restaurar desde respaldo:', bakErr);
    }
  }

  // Seed with INITIAL_COHORT_PROJECTS
  const seeded: GAESProject[] = INITIAL_COHORT_PROJECTS.map((p, idx) => ({
    ...p,
    version: p.version || 1,
    isLocked: p.isLocked ?? (p.instructorEvaluation?.isDefinitiveSaved || false),
    isRosterConfirmed: true,
    isDemoProject: true,
    collaborationHistory: (p.collaborationHistory && p.collaborationHistory.length > 0) ? p.collaborationHistory : [
      {
        id: `audit-init-${idx + 1}`,
        timestamp: p.lastUpdated || new Date().toISOString(),
        userId: 'sistema-sena',
        userName: 'Coordinación Académica SENA',
        userEmail: 'coordinacion@sena.edu.co',
        gaesNumber: p.gaesNumber,
        fichaNumber: p.fichaNumber,
        phase: p.currentStep || 1,
        component: 'Registro Oficial del GAES',
        operationType: 'CREAR' as const,
        newVersion: '1',
        description: `Constitución formal del GAES ${p.gaesNumber} para la empresa ${p.company.name}.`,
      },
    ],
  }));

  atomicSaveProjectsToDisk(seeded);
  return seeded;
}

let storedProjects: GAESProject[] = initializeProjectDatabase();

function saveProjectsToDisk(projects: GAESProject[]) {
  atomicSaveProjectsToDisk(projects);
}

// =========================================================================
// SECURITY & AUTHENTICATION SUBSYSTEM (SERVER-AUTHORITATIVE)
// =========================================================================

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'INSTRUCTOR' | 'APRENDIZ';
  fichaNumber?: string;
  gaesNumber?: number;
  regional?: string;
  centerName?: string;
  authenticatedAt: string;
}

interface UserSession {
  token: string;
  user: SessionUser;
  createdAt: number;
  expiresAt: number;
}

// In-memory server session store (invalidated on logout or expiration)
const activeSessions = new Map<string, UserSession>();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Password hashing utilities using PBKDF2 with SHA-512
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SERVER_SALT = crypto.randomBytes(16).toString('hex');
const CONFIGURED_INSTRUCTOR_PASSWORD = process.env.INSTRUCTOR_PASSWORD;
const DEMO_INSTRUCTOR_PASSCODE = process.env.DEMO_INSTRUCTOR_PASSWORD || 'DemoInstructor2026*';
const IS_DEMO_ENV = !CONFIGURED_INSTRUCTOR_PASSWORD;

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyInstructorPassword(provided: string): { valid: boolean; error?: string } {
  if (!provided || typeof provided !== 'string') {
    return { valid: false, error: 'La contraseña de instructor es obligatoria. No se permite acceso con campo vacío.' };
  }

  const clean = provided.trim();
  // Reject weak / trial PINs
  if (['1234', '123456', 'admin', 'sena', 'password', 'clave'].includes(clean.toLowerCase())) {
    return { valid: false, error: 'Credenciales inválidas de Instructor. Se rechazan contraseñas y PINs predeterminados inseguros.' };
  }

  if (CONFIGURED_INSTRUCTOR_PASSWORD) {
    const expectedHash = hashPassword(CONFIGURED_INSTRUCTOR_PASSWORD, SERVER_SALT);
    const providedHash = hashPassword(clean, SERVER_SALT);
    try {
      const match = crypto.timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
      return { valid: match, error: match ? undefined : 'Credenciales inválidas de Instructor. Acceso denegado.' };
    } catch {
      return { valid: false, error: 'Credenciales inválidas de Instructor. Acceso denegado.' };
    }
  }

  if (IS_PRODUCTION) {
    return {
      valid: false,
      error: 'Entorno de producción no configurado: Se requiere configurar la variable INSTRUCTOR_PASSWORD o el SSO institucional Microsoft Entra ID.',
    };
  }

  // Demonstration mode: compare against DEMO_INSTRUCTOR_PASSCODE
  const demoHash = hashPassword(DEMO_INSTRUCTOR_PASSCODE, SERVER_SALT);
  const providedHash = hashPassword(clean, SERVER_SALT);
  try {
    const match = crypto.timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(demoHash, 'hex'));
    return {
      valid: match,
      error: match
        ? undefined
        : `Credenciales inválidas de Instructor. En este entorno de demostración académica use la clave autorizada (${DEMO_INSTRUCTOR_PASSCODE}) o configure INSTRUCTOR_PASSWORD en .env.`,
    };
  } catch {
    return { valid: false, error: 'Credenciales inválidas de Instructor.' };
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

function getValidSession(req: Request): UserSession | null {
  const token = extractBearerToken(req);
  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  // Check TTL
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

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
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasGemini: Boolean(ai),
      time: new Date().toISOString(),
    });
  });

  // =========================================================================
  // AUTHENTICATION & SESSION ENDPOINTS (STRICT INSTITUTIONAL DOMAINS)
  // =========================================================================

  /**
   * POST /api/auth/login
   * Valida identidad institucional:
   * - APRENDIZ: dominio estricto @soy.sena.edu.co. Rechaza @sena.edu.co, comerciales y no registrados.
   * - INSTRUCTOR: dominio estricto @sena.edu.co con credencial segura. Rechaza @soy.sena.edu.co y comerciales.
   */
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, role, name, gaesNumber, fichaNumber } = req.body || {};

    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar un correo electrónico institucional.',
      });
    }

    if (role === 'APRENDIZ') {
      // Reject instructor domain when requesting access as apprentice
      if (normalizedEmail.endsWith('@sena.edu.co')) {
        return res.status(400).json({
          success: false,
          error: 'Acceso denegado: El dominio @sena.edu.co está reservado exclusivamente para Instructores. Los aprendices deben ingresar con su correo institucional @soy.sena.edu.co.',
        });
      }

      // Enforce strict regex: only @soy.sena.edu.co, no subdomains, no external domains
      const apprenticeDomainRegex = /^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i;
      if (!apprenticeDomainRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Acceso denegado: El perfil Aprendiz requiere obligatoriamente correo institucional del dominio @soy.sena.edu.co. Se rechazan correos comerciales (Gmail, Hotmail, Outlook) y dominios no autorizados.',
        });
      }

      const reqGaesNum = typeof gaesNumber === 'number' ? gaesNumber : 3;
      const targetProject = storedProjects.find((p) => p.gaesNumber === reqGaesNum);
      const registeredApprentice = targetProject?.apprentices?.find(
        (a) => a.email.toLowerCase() === normalizedEmail
      );

      // Enforce pre-formed GAES recognition: an apprentice must belong to their team
      if (targetProject && targetProject.apprentices && targetProject.apprentices.length > 0) {
        if (!registeredApprentice) {
          const otherProject = storedProjects.find((p) =>
            p.apprentices?.some((a) => a.email.toLowerCase() === normalizedEmail)
          );
          if (otherProject) {
            return res.status(403).json({
              success: false,
              error: `Acceso no autorizado: Su correo institucional ${normalizedEmail} está vinculado formalmente al GAES ${otherProject.gaesNumber} (${otherProject.company.name}). No puede ingresar arbitrariamente a un GAES distinto.`,
            });
          }
          return res.status(403).json({
            success: false,
            error: `Acceso no autorizado: El correo institucional ${normalizedEmail} no está registrado en el GAES ${targetProject.gaesNumber}. Solicite a su líder o instructor su vinculación oficial.`,
          });
        }
      }

      // Enforce document verification to prevent apprentice login by knowing email address alone
      const providedDoc = (req.body.documentNumber || '').toString().trim().replace(/[\.\s-]/g, '');
      if (!providedDoc) {
        return res.status(401).json({
          success: false,
          error: 'Verificación de identidad individual requerida: Debe ingresar obligatoriamente su número de documento (C.C. o T.I.) registrado en la nómina del GAES para prevenir suplantaciones por mero conocimiento del correo institucional.',
        });
      }

      if (registeredApprentice && registeredApprentice.document) {
        const cleanRegDoc = registeredApprentice.document.toString().trim().replace(/[\.\s-]/g, '');
        if (providedDoc !== cleanRegDoc) {
          return res.status(401).json({
            success: false,
            error: 'Fallo de verificación de identidad: El documento de identidad ingresado no coincide con el registro oficial del aprendiz en el GAES. Acceso denegado.',
          });
        }
      }

      const token = crypto.randomBytes(32).toString('hex');
      const user: SessionUser = {
        id: registeredApprentice?.id || `app-${crypto.randomBytes(6).toString('hex')}`,
        email: normalizedEmail,
        name: registeredApprentice?.name || (name && typeof name === 'string' ? name.trim() : '') || 'Aprendiz en Gestión Empresarial',
        role: 'APRENDIZ',
        fichaNumber: targetProject?.fichaNumber || fichaNumber || '2687410',
        gaesNumber: reqGaesNum,
        regional: targetProject?.regional || 'Regional Valle del Cauca',
        centerName: targetProject?.centerName || 'Centro de Gestión y Desarrollo Agroindustrial',
        authenticatedAt: new Date().toISOString(),
      };

      activeSessions.set(token, {
        token,
        user,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      return res.json({
        success: true,
        token,
        user,
      });
    }

    if (role === 'INSTRUCTOR') {
      // Reject apprentice domain when requesting access as instructor
      if (normalizedEmail.endsWith('@soy.sena.edu.co')) {
        return res.status(400).json({
          success: false,
          error: 'Acceso denegado: El dominio @soy.sena.edu.co corresponde al perfil de Aprendiz. Los instructores deben autenticarse con su correo institucional @sena.edu.co.',
        });
      }

      // Enforce strict regex: only @sena.edu.co
      const instructorDomainRegex = /^[a-zA-Z0-9._%+-]+@sena\.edu\.co$/i;
      if (!instructorDomainRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Acceso denegado: El perfil Instructor requiere obligatoriamente correo institucional del dominio @sena.edu.co. No se admiten correos personales ni dominios no autorizados.',
        });
      }

      const trimmedPassword = typeof password === 'string' ? password.trim() : '';
      if (!trimmedPassword) {
        return res.status(401).json({
          success: false,
          error: 'La contraseña de instructor es obligatoria. No se permite acceso con campo vacío.',
        });
      }

      const passResult = verifyInstructorPassword(trimmedPassword);
      if (!passResult.valid) {
        return res.status(401).json({
          success: false,
          error: passResult.error || 'Credenciales inválidas de Instructor. Acceso denegado.',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const user: SessionUser = {
        id: `inst-${crypto.randomBytes(6).toString('hex')}`,
        email: normalizedEmail,
        name: (name && typeof name === 'string' ? name.trim() : '') || 'Instructor Técnico Evaluador SENA',
        role: 'INSTRUCTOR',
        regional: 'Regional Valle del Cauca',
        centerName: 'Centro de Gestión y Desarrollo Agroindustrial',
        authenticatedAt: new Date().toISOString(),
      };

      activeSessions.set(token, {
        token,
        user,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      return res.json({
        success: true,
        token,
        user,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Rol no válido especificado para la autenticación.',
    });
  });

  /**
   * POST /api/auth/verify-session
   * Valida la autenticidad y vigencia de la sesión contra el servidor.
   */
  app.post('/api/auth/verify-session', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({
        valid: false,
        error: 'Sesión expirada o no autorizada en el servidor.',
      });
    }

    return res.json({
      valid: true,
      user: session.user,
    });
  });

  /**
   * POST /api/auth/logout
   * Destruye la sesión en el servidor.
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: 'Sesión finalizada exitosamente.' });
  });

  // =========================================================================
  // PERSISTENT CENTRALIZED PROJECT & COLLABORATION ENDPOINTS
  // =========================================================================

  /**
   * GET /api/projects
   * Consulta centralizada de proyectos con control de acceso por rol y GAES.
   */
  app.get('/api/projects', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autenticado. Inicie sesión para consultar los proyectos.',
      });
    }

    if (session.user.role === 'INSTRUCTOR') {
      return res.json({
        success: true,
        projects: storedProjects,
      });
    }

    // Aprendiz: only their assigned GAES
    const userProjects = storedProjects.filter((p) => p.gaesNumber === session.user.gaesNumber);
    return res.json({
      success: true,
      projects: userProjects,
    });
  });

  /**
   * GET /api/projects/:id
   * Consulta de un proyecto individual con verificación de aislamiento entre GAES.
   */
  app.get('/api/projects/:id', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autenticado.',
      });
    }

    const project = storedProjects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto formativo no encontrado.',
      });
    }

    // GAES Isolation: Apprentice cannot query another GAES
    if (session.user.role === 'APRENDIZ' && project.gaesNumber !== session.user.gaesNumber) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado: Aislamiento institucional. El GAES ${session.user.gaesNumber} no tiene autorización para consultar los datos del GAES ${project.gaesNumber}.`,
      });
    }

    return res.json({
      success: true,
      project,
    });
  });

  /**
   * POST /api/projects
   * Registro inicial de un GAES previamente constituido por su líder (sin aprobación previa del instructor).
   */
  app.post('/api/projects', (req: Request, res: Response) => {
    let session = getValidSession(req);

    const newProjectData: Partial<GAESProject> = req.body;
    if (!newProjectData || !newProjectData.company || !newProjectData.gaesNumber) {
      return res.status(400).json({ success: false, error: 'Datos incompletos para el registro del GAES.' });
    }

    const ficha = (newProjectData.fichaNumber || '2687410').trim();
    const gaesNum = Number(newProjectData.gaesNumber);

    // Duplicate check: Prevent duplicate projects for the same GAES number in the same ficha
    const existingSameGaes = storedProjects.find(
      (p) => p.gaesNumber === gaesNum && p.fichaNumber?.trim() === ficha
    );
    if (existingSameGaes) {
      return res.status(409).json({
        success: false,
        error: `Conflicto de registro: El GAES ${gaesNum} para la ficha ${ficha} (${existingSameGaes.company?.name || 'Empresa Registrada'}) ya ha sido constituido previamente en el sistema. Todos los integrantes deben ingresar utilizando sus credenciales individuales para acceder al proyecto compartido.`,
      });
    }

    // Identify and validate leader apprentice
    const leaderApprentice =
      newProjectData.apprentices?.find((a) => a.role === 'Líder GAES') ||
      newProjectData.apprentices?.[0];

    if (!leaderApprentice || !leaderApprentice.email || !leaderApprentice.name) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar los datos del aprendiz que actuará como Líder del GAES (nombre y correo institucional @soy.sena.edu.co).',
      });
    }

    const normalizedLeaderEmail = leaderApprentice.email.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i.test(normalizedLeaderEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El correo del líder del GAES debe pertenecer obligatoriamente al dominio institucional @soy.sena.edu.co.',
      });
    }

    // If no existing session, establish one for the leader
    let userToken = '';
    let sessionUser: SessionUser;
    if (session) {
      sessionUser = session.user;
    } else {
      userToken = crypto.randomBytes(32).toString('hex');
      sessionUser = {
        id: leaderApprentice.id || `app-leader-${crypto.randomBytes(4).toString('hex')}`,
        email: normalizedLeaderEmail,
        name: leaderApprentice.name.trim(),
        role: 'APRENDIZ',
        fichaNumber: ficha,
        gaesNumber: gaesNum,
        regional: newProjectData.regional || 'Regional Valle del Cauca',
        centerName: newProjectData.centerName || 'Centro de Gestión y Desarrollo Agroindustrial',
        authenticatedAt: new Date().toISOString(),
      };
      activeSessions.set(userToken, {
        token: userToken,
        user: sessionUser,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      });
    }

    const nextVersion = 1;
    const now = new Date().toISOString();
    const initAudit: AuditContributionRecord = {
      id: `audit-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: now,
      userId: sessionUser.id,
      userName: sessionUser.name,
      userEmail: sessionUser.email,
      gaesNumber: gaesNum,
      fichaNumber: ficha,
      phase: 1,
      component: 'Registro Oficial de GAES y Empresa',
      operationType: 'CREAR',
      newVersion: '1',
      description: `Registro inicial del GAES ${gaesNum} (${newProjectData.company.name}) por el líder ${sessionUser.name}.`,
    };

    const baseBlank = createBlankGAESProject(gaesNum, ficha);
    const newProject: GAESProject = {
      ...baseBlank,
      id: newProjectData.id || `gaes-${gaesNum}-${ficha}-${Date.now()}`,
      gaesNumber: gaesNum,
      fichaNumber: ficha,
      programName: newProjectData.programName || baseBlank.programName,
      centerName: newProjectData.centerName || baseBlank.centerName,
      regional: newProjectData.regional || baseBlank.regional,
      company: {
        ...baseBlank.company,
        name: newProjectData.company.name.trim(),
        nit: newProjectData.company.nit || baseBlank.company.nit,
        sector: newProjectData.company.sector || baseBlank.company.sector,
        size: newProjectData.company.size || baseBlank.company.size,
        city: newProjectData.company.city || baseBlank.company.city,
        ciiuCode: newProjectData.company.ciiuCode || baseBlank.company.ciiuCode,
        mainProduct: newProjectData.company.mainProduct || baseBlank.company.mainProduct,
        valueProposition: newProjectData.company.valueProposition || baseBlank.company.valueProposition,
        targetMarket: newProjectData.company.targetMarket || baseBlank.company.targetMarket,
        annualRevenueEstimated: newProjectData.company.annualRevenueEstimated || baseBlank.company.annualRevenueEstimated,
      },
      apprentices: newProjectData.apprentices && newProjectData.apprentices.length > 0 ? newProjectData.apprentices : [leaderApprentice],
      version: nextVersion,
      isLocked: false,
      isRosterConfirmed: false,
      isDemoProject: false,
      currentStep: 1,
      lastUpdated: now,
      collaborationHistory: [initAudit],
    };

    saveProjectsToDisk([newProject, ...storedProjects]);
    return res.status(201).json({
      success: true,
      project: newProject,
      token: userToken || session?.token,
      user: sessionUser,
    });
  });

  /**
   * PUT /api/projects/:id
   * Actualización colaborativa con control de concurrencia optimista, bloqueo y trazabilidad.
   */
  app.put('/api/projects/:id', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
    }

    const existingIndex = storedProjects.findIndex((p) => p.id === req.params.id);
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, error: 'Proyecto formativo no encontrado.' });
    }

    const existing = storedProjects[existingIndex];

    // GAES Isolation: Apprentice cannot modify another GAES
    if (session.user.role === 'APRENDIZ' && existing.gaesNumber !== session.user.gaesNumber) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado: No tiene autorización para modificar los datos del GAES ${existing.gaesNumber}.`,
      });
    }

    // Lock check: If project is locked or definitive evaluation is saved
    if (
      (existing.isLocked || existing.instructorEvaluation?.isDefinitiveSaved) &&
      session.user.role === 'APRENDIZ'
    ) {
      return res.status(423).json({
        success: false,
        locked: true,
        error: 'Proyecto bloqueado: La evaluación definitiva ya ha sido registrada por el instructor técnico. No se admiten modificaciones académicas ordinarias. Solicite reapertura formal al instructor.',
      });
    }

    const { updatedProject, clientVersion, changeSummary, phaseIntervened, componentIntervened } = req.body || {};
    if (!updatedProject) {
      return res.status(400).json({ success: false, error: 'Cuerpo de solicitud inválido.' });
    }

    // Enforce strict clientVersion check for concurrency control
    if (typeof clientVersion !== 'number' || isNaN(clientVersion) || clientVersion <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Petición inválida: Se exige obligatoriamente una versión de cliente válida (clientVersion entero > 0) para procesar cualquier actualización y salvaguardar el control estricto de concurrencia.',
      });
    }

    // Optimistic Concurrency Control: Check clientVersion against server version
    const serverVersion = existing.version || 1;
    if (clientVersion < serverVersion) {
      return res.status(409).json({
        success: false,
        conflict: true,
        error: 'Conflicto de concurrencia: Otro integrante del equipo guardó modificaciones recientes en el servidor. Para evitar sobrescrituras silenciosas, se ha bloqueado la operación. Actualice la vista antes de guardar.',
        serverVersion,
        serverLastUpdated: existing.lastUpdated,
        serverProject: existing,
      });
    }

    // Security check: Apprentice cannot alter instructor evaluation
    let sanitizedUpdates = { ...updatedProject };
    if (session.user.role === 'APRENDIZ') {
      sanitizedUpdates.instructorEvaluation = existing.instructorEvaluation;
    }

    // Roster lock protection:
    // If project roster is already confirmed, apprentices cannot add, delete, or replace members, nor change gaesNumber or company.name
    if (existing.isRosterConfirmed && session.user.role === 'APRENDIZ') {
      sanitizedUpdates.apprentices = existing.apprentices;
      sanitizedUpdates.gaesNumber = existing.gaesNumber;
      if (sanitizedUpdates.company) {
        sanitizedUpdates.company = {
          ...sanitizedUpdates.company,
          name: existing.company.name, // Protected company name
        };
      }
    }

    const nextVersion = serverVersion + 1;
    const now = new Date().toISOString();

    // Leader confirming the roster for the first time:
    const isConfirmingRosterNow = Boolean(sanitizedUpdates.isRosterConfirmed && !existing.isRosterConfirmed);
    if (isConfirmingRosterNow) {
      const candidates = sanitizedUpdates.apprentices || existing.apprentices || [];
      if (!candidates.some((a: any) => a.role === 'Líder GAES')) {
        return res.status(400).json({
          success: false,
          error: 'Debe designar formalmente al menos un integrante con el rol de Líder GAES antes de confirmar.',
        });
      }
      sanitizedUpdates.isRosterConfirmed = true;
      sanitizedUpdates.rosterConfirmedAt = now;
      sanitizedUpdates.rosterConfirmedBy = session.user.name;
    }

    // Determine phase & component
    const phase = typeof phaseIntervened === 'number' ? phaseIntervened : (updatedProject.currentStep || existing.currentStep || 1);
    const component = componentIntervened || (phase === 1 ? 'Caracterización GAES (Fase 1)' : phase === 2 ? 'Insumos y Entregables (Fase 2)' : phase === 3 ? 'Matrices Estratégicas (Fase 3)' : phase === 4 ? 'Balanced Scorecard (Fase 4)' : phase === 5 ? 'Auditoría de Coherencia (Fase 5)' : 'Panel de Evaluación (Fase 6)');

    const auditDescription = isConfirmingRosterNow
      ? `Conformación oficial del GAES ${existing.gaesNumber} (${existing.company.name}) confirmada y bloqueada por el líder ${session.user.name}. Nómina de ${(sanitizedUpdates.apprentices || existing.apprentices).length} integrantes asegurada.`
      : changeSummary || (session.user.role === 'INSTRUCTOR' ? `Evaluación o retroalimentación registrada por ${session.user.name}` : `Modificación de ${component} por ${session.user.name}`);

    const auditRecord: AuditContributionRecord = {
      id: `audit-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: now,
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      gaesNumber: existing.gaesNumber,
      fichaNumber: existing.fichaNumber,
      phase,
      component,
      operationType: session.user.role === 'INSTRUCTOR' ? 'EVALUAR' : 'MODIFICAR',
      previousVersion: String(serverVersion),
      newVersion: String(nextVersion),
      description: auditDescription,
    };

    // If instructor saved definitive evaluation, automatically lock project
    const shouldLock = session.user.role === 'INSTRUCTOR'
      ? Boolean(sanitizedUpdates.instructorEvaluation?.isDefinitiveSaved)
      : existing.isLocked;

    const mergedProject: GAESProject = {
      ...existing,
      ...sanitizedUpdates,
      id: existing.id,
      gaesNumber: existing.gaesNumber,
      version: nextVersion,
      isLocked: shouldLock,
      lastUpdated: now,
      collaborationHistory: [auditRecord, ...(existing.collaborationHistory || [])],
    };

    storedProjects[existingIndex] = mergedProject;
    saveProjectsToDisk([...storedProjects]);

    return res.json({
      success: true,
      project: mergedProject,
    });
  });

  /**
   * POST /api/projects/:id/reopen
   * Reapertura autorizada de un proyecto evaluado (Exclusiva para Instructor).
   */
  app.post('/api/projects/:id/reopen', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
    }

    if (session.user.role !== 'INSTRUCTOR') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: Solo el instructor técnico asignado puede autorizar la reapertura de un proyecto evaluado.',
      });
    }

    const { reason } = req.body || {};
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Debe justificar obligatoriamente el motivo pedagógico de la reapertura (ej. Plan de Mejoramiento Formativo).',
      });
    }

    const existingIndex = storedProjects.findIndex((p) => p.id === req.params.id);
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, error: 'Proyecto formativo no encontrado.' });
    }

    const existing = storedProjects[existingIndex];
    const serverVersion = existing.version || 1;
    const nextVersion = serverVersion + 1;
    const now = new Date().toISOString();

    const reopenAudit: AuditContributionRecord = {
      id: `audit-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: now,
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      gaesNumber: existing.gaesNumber,
      fichaNumber: existing.fichaNumber,
      phase: 6,
      component: 'Reapertura de Proyecto Evaluado',
      operationType: 'REAPERTURA',
      previousVersion: String(serverVersion),
      newVersion: String(nextVersion),
      description: `Reapertura formativa autorizada por ${session.user.name}. Motivo: ${reason.trim()}`,
    };

    const reopenedProject: GAESProject = {
      ...existing,
      isLocked: false,
      reopenedAt: now,
      reopenedBy: session.user.name,
      reopenReason: reason.trim(),
      version: nextVersion,
      lastUpdated: now,
      instructorEvaluation: {
        ...existing.instructorEvaluation,
        isDefinitiveSaved: false,
      },
      collaborationHistory: [reopenAudit, ...(existing.collaborationHistory || [])],
    };

    storedProjects[existingIndex] = reopenedProject;
    saveProjectsToDisk([...storedProjects]);

    return res.json({
      success: true,
      message: 'Proyecto reabierto exitosamente para ajustes formativos.',
      project: reopenedProject,
    });
  });

  /**
   * GET /api/audit/:projectId
   * Historial de auditoría inmutable del servidor.
   */
  app.get('/api/audit/:projectId', (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
    }

    const project = storedProjects.find((p) => p.id === req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto formativo no encontrado.' });
    }

    if (session.user.role === 'APRENDIZ' && project.gaesNumber !== session.user.gaesNumber) {
      return res.status(403).json({ success: false, error: 'Acceso denegado.' });
    }

    return res.json({
      success: true,
      gaesNumber: project.gaesNumber,
      companyName: project.company.name,
      history: project.collaborationHistory || [],
    });
  });

  /**
   * GET /api/auth/demo-info
   * Retorna información técnica sobre el entorno de ejecución, estado de Microsoft Entra ID y clave de prueba.
   */
  app.get('/api/auth/demo-info', (_req: Request, res: Response) => {
    res.json({
      environment: IS_PRODUCTION ? 'PRODUCCION' : 'DEMOSTRACION_ACADEMICA_AISLADA',
      isDemoMode: IS_DEMO_ENV,
      hasConfiguredPassword: Boolean(CONFIGURED_INSTRUCTOR_PASSWORD),
      demoInstructorKeyHint: IS_DEMO_ENV ? DEMO_INSTRUCTOR_PASSCODE : null,
      entraIdStatus: {
        configured: Boolean(process.env.AZURE_ENTRA_CLIENT_ID && process.env.AZURE_ENTRA_TENANT_ID),
        protocol: 'OpenID Connect (OIDC) / Microsoft Entra ID',
        statusNotice: 'Integración corporativa preparada a nivel arquitectónico. Pendiente de registro formal de aplicación institucional por la Dirección General del SENA.',
      },
      storageEngine: {
        adapter: 'JsonFileStorageAdapter',
        atomicWrites: true,
        crashRecovery: true,
        databaseFile: DB_FILE,
        backupFile: BACKUP_FILE,
        vercelNotice: 'En despliegue sobre Vercel Serverless se requiere conectar PostgreSQL (DATABASE_URL) dado que el sistema de archivos de lambdas es efímero.',
      },
    });
  });

  /**
   * GET /api/auth/entra/config
   * Endpoint OIDC para consulta de especificación institucional Microsoft Entra ID.
   */
  app.get('/api/auth/entra/config', (_req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.AZURE_ENTRA_CLIENT_ID && process.env.AZURE_ENTRA_TENANT_ID);
    res.json({
      isConfigured,
      tenantId: process.env.AZURE_ENTRA_TENANT_ID || null,
      clientId: process.env.AZURE_ENTRA_CLIENT_ID || null,
      authorizationEndpoint: isConfigured
        ? `https://login.microsoftonline.com/${process.env.AZURE_ENTRA_TENANT_ID}/oauth2/v2.0/authorize`
        : null,
      tokenEndpoint: isConfigured
        ? `https://login.microsoftonline.com/${process.env.AZURE_ENTRA_TENANT_ID}/oauth2/v2.0/token`
        : null,
      redirectUri: process.env.AZURE_ENTRA_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/entra/callback`,
      status: isConfigured ? 'ACTIVO' : 'BLOQUEADO_POR_DEPENDENCIA_EXTERNA',
      pedagogicalNotice: 'Mientras no exista registro institucional, se opera exclusivamente en entorno de demostración pedagógica aislado con identidades y datos de prueba.',
    });
  });

  /**
   * GET /api/storage/status
   * Estado de la persistencia atómica y preparación para PostgreSQL.
   */
  app.get('/api/storage/status', (_req: Request, res: Response) => {
    res.json({
      activeAdapter: 'JsonFileStorageAdapter (Atomic Writes & Recovery)',
      totalProjects: storedProjects.length,
      isAtomicWriteActive: true,
      backupFileExists: fs.existsSync(BACKUP_FILE),
      postgresAdapterReady: true,
      hasPostgresConnection: Boolean(process.env.DATABASE_URL),
      vercelDeploymentWarning: 'En Vercel Serverless, los archivos locales no persisten entre ejecuciones de lambdas. Se debe configurar DATABASE_URL (PostgreSQL en Neon o Supabase) para persistencia permanente en Vercel.',
    });
  });

  // =========================================================================
  // AI STRATEGIC ANALYSIS ENDPOINT (PROTECTED WITH RBAC)
  // =========================================================================

  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    const session = getValidSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autenticado. Debe iniciar sesión para utilizar el servicio de análisis.',
      });
    }

    const { action, payload } = req.body || {};

    // Strict Role-Based Access Control:
    // Only verified instructors can request an AI-generated evaluation proposal
    if (action === 'instructor-evaluation') {
      if (session.user.role !== 'INSTRUCTOR') {
        return res.status(403).json({
          success: false,
          error: 'Operación denegada: La propuesta de evaluación con IA es exclusiva para instructores técnicos autorizados.',
        });
      }
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'El servicio de IA no está disponible en este momento (clave de API no configurada). Continúe con la evaluación manual.',
        fallback: false,
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
        prompt = `Eres el instructor técnico del SENA encargado de emitir una sugerencia pedagógica de evaluación de la Guía 16 para este GAES.
IMPORTANTE: Esto es una propuesta sugerida para revisión del instructor docente, NO una calificación definitiva automática.
Datos del proyecto:
${JSON.stringify(payload, null, 2)}

Genera una propuesta de retroalimentación pedagógica en formato JSON:
1. "juicioSugerido": "APROBADO" o "NO APROBADO (CON PLAN DE MEJORAMIENTO)" o "PENDIENTE DE SUSTENTACIÓN".
2. "observacionProducto": análisis reflexivo de las evidencias de producto (matrices y BSC).
3. "observacionDesempeno": recomendaciones de sustento oral y trabajo colaborativo para el GAES.
4. "criteriosEvaluados": lista de los criterios de la Guía 16 con estado "Cumple" o "Por Mejorar".
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
      return res.status(500).json({
        success: false,
        error: error.message || 'Error en el servicio de IA al procesar la solicitud.',
        fallback: false,
      });
    }
  });

  // Development vs Production
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
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
