import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { GAESProject, AuditContributionRecord } from './types';
import { createBlankGAESProject } from './data/mockProjects';
import { serverStorage, UserSession, SessionUser } from './serverStorage';

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS & Headers for Vercel Serverless
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

// =========================================================================
// SECURITY & SESSION UTILITIES
// =========================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SERVER_SALT = crypto.randomBytes(16).toString('hex');
const CONFIGURED_INSTRUCTOR_PASSWORD = process.env.INSTRUCTOR_PASSWORD;
const DEMO_INSTRUCTOR_PASSCODE = process.env.DEMO_INSTRUCTOR_PASSWORD || 'DemoInstructor2026*';
const IS_DEMO_ENV = !CONFIGURED_INSTRUCTOR_PASSWORD;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyInstructorPassword(provided: string): { valid: boolean; error?: string } {
  if (!provided || typeof provided !== 'string') {
    return { valid: false, error: 'La contraseña de instructor es obligatoria. No se permite acceso con campo vacío.' };
  }

  const clean = provided.trim();
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

  // Demonstration mode
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

async function getValidSessionAsync(req: Request): Promise<UserSession | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  return await serverStorage.getSession(token);
}

// =========================================================================
// API ROUTER (MOUNTED ON BOTH /api AND / FOR VERCEL REWRITES COMPATIBILITY)
// =========================================================================

const apiRouter = express.Router();

/**
 * GET /health
 */
apiRouter.get('/health', async (_req: Request, res: Response) => {
  const liveStorage = await serverStorage.verifyDatabaseConnection();
  res.json({
    status: 'ok',
    hasGemini: Boolean(ai),
    time: new Date().toISOString(),
    storage: liveStorage,
  });
});

/**
 * GET /storage/status
 * Diagnóstico en vivo de la conexión con Neon PostgreSQL
 */
apiRouter.get('/storage/status', async (_req: Request, res: Response) => {
  const status = await serverStorage.verifyDatabaseConnection();
  res.json(status);
});

/**
 * POST /storage/init
 * Inicialización controlada e idempotente de tablas en PostgreSQL
 */
apiRouter.post('/storage/init', async (_req: Request, res: Response) => {
  const result = await serverStorage.ensureSchemaInitialized();
  const liveCheck = await serverStorage.verifyDatabaseConnection();
  return res.json({
    ...result,
    verification: liveCheck,
  });
});

/**
 * POST /auth/login
 * Autenticación estricta con validación de dominios y verificación de documento para aprendices
 */
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password, role, name, gaesNumber, fichaNumber } = req.body || {};

  const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar un correo electrónico institucional.',
    });
  }

  let allProjects: GAESProject[];
  try {
    allProjects = await serverStorage.getAllProjects();
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: `Error de persistencia: ${err.message || 'No se pudo consultar la base de datos PostgreSQL en Neon.'}`,
    });
  }

  if (role === 'APRENDIZ') {
    if (normalizedEmail.endsWith('@sena.edu.co')) {
      return res.status(400).json({
        success: false,
        error: 'Acceso denegado: El dominio @sena.edu.co está reservado exclusivamente para Instructores. Los aprendices deben ingresar con su correo institucional @soy.sena.edu.co.',
      });
    }

    const apprenticeDomainRegex = /^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i;
    if (!apprenticeDomainRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Acceso denegado: El perfil Aprendiz requiere obligatoriamente correo institucional del dominio @soy.sena.edu.co. Se rechazan correos comerciales (Gmail, Hotmail, Outlook) y dominios no autorizados.',
      });
    }

    const reqGaesNum = typeof gaesNumber === 'number' ? gaesNumber : 3;
    const targetProject = allProjects.find((p) => p.gaesNumber === reqGaesNum);
    const registeredApprentice = targetProject?.apprentices?.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );

    if (targetProject && targetProject.apprentices && targetProject.apprentices.length > 0) {
      if (!registeredApprentice) {
        const otherProject = allProjects.find((p) =>
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

    // Document verification check
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

    const session: UserSession = {
      token,
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    await serverStorage.saveSession(session);

    return res.json({
      success: true,
      token,
      user,
    });
  }

  if (role === 'INSTRUCTOR') {
    if (normalizedEmail.endsWith('@soy.sena.edu.co')) {
      return res.status(400).json({
        success: false,
        error: 'Acceso denegado: El dominio @soy.sena.edu.co corresponde al perfil de Aprendiz. Los instructores deben autenticarse con su correo institucional @sena.edu.co.',
      });
    }

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

    const session: UserSession = {
      token,
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    await serverStorage.saveSession(session);

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
 * POST /auth/verify-session
 */
apiRouter.post('/auth/verify-session', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
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
 * POST /auth/logout
 */
apiRouter.post('/auth/logout', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (token) {
    await serverStorage.deleteSession(token);
  }
  return res.json({ success: true, message: 'Sesión finalizada exitosamente.' });
});

/**
 * GET /auth/demo-info
 */
apiRouter.get('/auth/demo-info', (_req: Request, res: Response) => {
  const status = serverStorage.getStatus();
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
      adapter: status.hasDatabaseUrl ? 'PostgresStorageAdapter' : 'JsonFileStorageAdapter',
      isPermanent: status.isPermanent,
      atomicWrites: true,
      crashRecovery: true,
      databaseProvider: status.databaseProvider,
      vercelNotice: 'En despliegue sobre Vercel Serverless se requiere conectar PostgreSQL (DATABASE_URL) dado que el sistema de archivos de lambdas es efímero.',
    },
  });
});

/**
 * GET /auth/entra/config
 */
apiRouter.get('/auth/entra/config', (_req: Request, res: Response) => {
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
    redirectUri: process.env.AZURE_ENTRA_REDIRECT_URI || `${reqProtocol(res)}/api/auth/entra/callback`,
    status: isConfigured ? 'LISTO_PARA_PRODUCCION' : 'BLOQUEADO_POR_DEPENDENCIA_EXTERNA',
    pedagogicalNotice:
      'Mientras no exista registro institucional, se opera exclusivamente en entorno de demostración pedagógica aislado con identidades y datos de prueba.',
  });
});

function reqProtocol(_res: Response): string {
  return process.env.PUBLIC_APP_URL || 'https://ais-dev-razg5gfgnaznwayvia3xkd-500098861207.us-west1.run.app';
}

/**
 * GET /projects
 */
apiRouter.get('/projects', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autenticado. Inicie sesión para consultar los proyectos.',
    });
  }

  let allProjects: GAESProject[];
  try {
    allProjects = await serverStorage.getAllProjects();
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: `Error de persistencia: ${err.message || 'Fallo de consulta en base de datos PostgreSQL.'}`,
    });
  }

  if (session.user.role === 'INSTRUCTOR') {
    return res.json({
      success: true,
      projects: allProjects,
    });
  }

  const userProjects = allProjects.filter((p) => p.gaesNumber === session.user.gaesNumber);
  return res.json({
    success: true,
    projects: userProjects,
  });
});

/**
 * GET /projects/:id
 */
apiRouter.get('/projects/:id', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autenticado.',
    });
  }

  let project: GAESProject | null;
  try {
    project = await serverStorage.getProjectById(req.params.id);
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: `Error de persistencia: ${err.message || 'Fallo al consultar la base de datos PostgreSQL.'}`,
    });
  }
  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Proyecto formativo no encontrado.',
    });
  }

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
 * POST /projects
 * Registro inicial por el líder del GAES (sin aprobación previa del instructor)
 */
apiRouter.post('/projects', async (req: Request, res: Response) => {
  let session = await getValidSessionAsync(req);

  const newProjectData: Partial<GAESProject> = req.body;
  if (!newProjectData || !newProjectData.company || !newProjectData.gaesNumber) {
    return res.status(400).json({ success: false, error: 'Datos incompletos para el registro del GAES.' });
  }

  const ficha = (newProjectData.fichaNumber || '2687410').trim();
  const gaesNum = Number(newProjectData.gaesNumber);

  // Duplicate check
  const existingSameGaes = await serverStorage.getProjectByGaesAndFicha(gaesNum, ficha);
  if (existingSameGaes) {
    return res.status(409).json({
      success: false,
      error: `Conflicto de registro: El GAES ${gaesNum} para la ficha ${ficha} (${existingSameGaes.company?.name || 'Empresa Registrada'}) ya ha sido constituido previamente en el sistema. Todos los integrantes deben ingresar utilizando sus credenciales individuales para acceder al proyecto compartido.`,
    });
  }

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

    const newSession: UserSession = {
      token: userToken,
      user: sessionUser,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    await serverStorage.saveSession(newSession);
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

  const saveResult = await serverStorage.saveProject(newProject);
  if (!saveResult.success) {
    return res.status(500).json({
      success: false,
      error: saveResult.error || 'Error al persistir el proyecto en la base de datos PostgreSQL.',
    });
  }

  return res.status(201).json({
    success: true,
    project: newProject,
    token: userToken || session?.token,
    user: sessionUser,
  });
});

/**
 * PUT /projects/:id
 * Control de concurrencia optimista, bloqueo y trazabilidad
 */
apiRouter.put('/projects/:id', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
  }

  const existing = await serverStorage.getProjectById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Proyecto formativo no encontrado.' });
  }

  if (session.user.role === 'APRENDIZ' && existing.gaesNumber !== session.user.gaesNumber) {
    return res.status(403).json({
      success: false,
      error: `Acceso denegado: No tiene autorización para modificar los datos del GAES ${existing.gaesNumber}.`,
    });
  }

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

  if (typeof clientVersion !== 'number' || isNaN(clientVersion) || clientVersion <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Petición inválida: Se exige obligatoriamente una versión de cliente válida (clientVersion entero > 0) para procesar cualquier actualización y salvaguardar el control estricto de concurrencia.',
    });
  }

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

  let sanitizedUpdates = { ...updatedProject };
  if (session.user.role === 'APRENDIZ') {
    sanitizedUpdates.instructorEvaluation = existing.instructorEvaluation;
  }

  // Roster lock protection
  if (existing.isRosterConfirmed && session.user.role === 'APRENDIZ') {
    sanitizedUpdates.apprentices = existing.apprentices;
    sanitizedUpdates.gaesNumber = existing.gaesNumber;
    if (sanitizedUpdates.company) {
      sanitizedUpdates.company = {
        ...sanitizedUpdates.company,
        name: existing.company.name,
      };
    }
  }

  const nextVersion = serverVersion + 1;
  const now = new Date().toISOString();

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

  const saveResult = await serverStorage.saveProject(mergedProject);
  if (!saveResult.success) {
    return res.status(500).json({
      success: false,
      error: saveResult.error || 'Error al persistir la actualización en la base de datos PostgreSQL.',
    });
  }

  return res.json({
    success: true,
    project: mergedProject,
  });
});

/**
 * POST /projects/:id/reopen
 */
apiRouter.post('/projects/:id/reopen', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
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

  const existing = await serverStorage.getProjectById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Proyecto formativo no encontrado.' });
  }

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

  const saveResult = await serverStorage.saveProject(reopenedProject);
  if (!saveResult.success) {
    return res.status(500).json({
      success: false,
      error: saveResult.error || 'Error al guardar la reapertura en la base de datos PostgreSQL.',
    });
  }

  return res.json({
    success: true,
    message: 'Proyecto reabierto exitosamente para ajustes formativos.',
    project: reopenedProject,
  });
});

/**
 * GET /audit/:projectId
 */
apiRouter.get('/audit/:projectId', async (req: Request, res: Response) => {
  const session = await getValidSessionAsync(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Acceso no autenticado.' });
  }

  const project = await serverStorage.getProjectById(req.params.projectId);
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
 * POST /generate (Gemini Server Proxy)
 */
apiRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { action, payload } = req.body || {};

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'El servicio de Inteligencia Artificial Gemini no está disponible (GEMINI_API_KEY no configurada en las variables de entorno del servidor).',
        fallback: false,
      });
    }

    let prompt = '';
    if (action === 'SYNTHESIZE_PRIOR_GUIDES') {
      prompt = `Actúa como asesor pedagógico SENA experto en Gestión Empresarial (Guía 16).
Analiza los siguientes insumos empresariales de las guías 1 a 15 y genera una síntesis estructurada para alimentar las matrices estratégicas PESTA, MEFI y MEFE:
${JSON.stringify(payload, null, 2)}
Responde en formato JSON con la siguiente estructura:
{
  "diagnosticSummary": "Resumen ejecutivo del diagnóstico...",
  "suggestedPestaFactors": [{"category": "Político|Económico|Social|Tecnológico|Ambiental|Legal", "factor": "...", "impactType": "Oportunidad|Amenaza", "intensity": "Alta|Media|Baja", "rationale": "...", "evidenceSource": "..."}],
  "suggestedMefiFactors": [{"type": "Fortaleza|Debilidad", "area": "Administración|Finanzas|Mercadeo|Operaciones|Talento Humano", "factor": "...", "weight": 0.05-0.30, "rating": 1-4}],
  "suggestedMefeFactors": [{"type": "Oportunidad|Amenaza", "pestaCategory": "...", "factor": "...", "weight": 0.05-0.30, "rating": 1-4}]
}
Asegúrate de que la suma de pesos de MEFI sea 1.0 y MEFE sea 1.0.`;
    } else if (action === 'AUDIT_COHERENCE') {
      prompt = `Actúa como auditor metodológico de evaluación estratégica SENA. Revisa la coherencia entre el diagnóstico, matrices (MEFI, MEFE, DOFA, PEYEA, MPC, BCG) y el Balanced Scorecard:
${JSON.stringify(payload, null, 2)}
Genera un dictamen pedagógico en formato JSON con recomendaciones de mejora formativa.`;
    } else if (action === 'INSTRUCTOR_ASSISTANT') {
      prompt = `Actúa como asistente técnico-pedagógico para el Instructor SENA en el programa Tecnólogo en Gestión Empresarial.
Analiza el proyecto formativo presentado por el GAES y genera recomendaciones reflexivas y constructivas para apoyar la labor de evaluación y sustentación.
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

// Mount on BOTH /api and / to handle Vercel routing rewrites seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
