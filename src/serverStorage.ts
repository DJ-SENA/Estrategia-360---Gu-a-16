import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pg from 'pg';
import { GAESProject, AuditContributionRecord } from './types';
import { INITIAL_COHORT_PROJECTS } from './data/cohortMockProjects';

const { Pool } = pg;

const ROOT_DIR = typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..') : process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'projects-db.json');
const BACKUP_FILE = path.resolve(DATA_DIR, 'projects-db.json.bak');

export interface SessionUser {
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

export interface UserSession {
  token: string;
  user: SessionUser;
  createdAt: number;
  expiresAt: number;
}

export interface StorageStatus {
  activeAdapter: 'POSTGRESQL' | 'JSON_FILE' | 'IN_MEMORY_VERCEL';
  isPermanent: boolean;
  isVercelEnvironment: boolean;
  hasDatabaseUrl: boolean;
  databaseProvider: string;
  totalProjects: number;
  warningNotice?: string;
}

// In-memory fallback / cache for local development
let memoryProjects: GAESProject[] = [];
let memorySessions = new Map<string, UserSession>();
let pgPool: pg.Pool | null = null;
let isPgInitialized = false;
let lastPgError: string | null = null;

// Environment detection and sanitized configuration
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const RAW_DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const DATABASE_URL = RAW_DB_URL ? RAW_DB_URL.trim().replace(/^['"]|['"]$/g, '') : undefined;

function sanitizeError(err: any): string {
  if (!err) return 'Error desconocido de persistencia.';
  let msg = err.message || String(err);
  if (DATABASE_URL) {
    try {
      const parsed = new URL(DATABASE_URL);
      if (parsed.password) {
        msg = msg.split(parsed.password).join('********');
      }
    } catch {}
  }
  return msg;
}

export function getSanitizedDbInfo() {
  if (!DATABASE_URL) {
    return {
      configured: false,
      hostMasked: null,
      databaseName: null,
      userMasked: null,
      sslConfigured: false,
    };
  }
  try {
    const parsed = new URL(DATABASE_URL);
    const hostParts = parsed.hostname.split('.');
    const hostMasked = hostParts.length > 2
      ? `${hostParts[0].substring(0, 5)}***.${hostParts.slice(1).join('.')}`
      : parsed.hostname;
    const userMasked = parsed.username
      ? `${parsed.username.substring(0, 3)}***`
      : null;
    const sslConfigured = Boolean(
      parsed.searchParams.get('sslmode') === 'require' ||
      parsed.searchParams.get('ssl') === 'true' ||
      !parsed.hostname.includes('localhost')
    );
    return {
      configured: true,
      hostMasked,
      databaseName: parsed.pathname.replace(/^\//, '') || 'neondb',
      userMasked,
      sslConfigured,
    };
  } catch {
    return {
      configured: true,
      hostMasked: 'ep-***.neon.tech',
      databaseName: 'neondb',
      userMasked: 'neondb_owner',
      sslConfigured: true,
    };
  }
}

function validateProjectSchema(project: any): boolean {
  if (!project || typeof project !== 'object') return false;
  if (!project.id || typeof project.id !== 'string') return false;
  if (typeof project.gaesNumber !== 'number') return false;
  if (!project.company || typeof project.company !== 'object' || !project.company.name) return false;
  return true;
}

function getInitialSeededProjects(): GAESProject[] {
  return INITIAL_COHORT_PROJECTS.map((p, idx) => ({
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
}

// ============================================================================
// POSTGRESQL SUBSYSTEM
// ============================================================================

function getOrCreatePgPool(): pg.Pool | null {
  if (!DATABASE_URL) return null;
  if (pgPool) return pgPool;

  const isLocalhost = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('error', (err) => {
    console.error('[Storage:PostgreSQL] Error inesperado en cliente inactivo del pool:', sanitizeError(err));
  });

  return pgPool;
}

async function initPostgres(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  if (isPgInitialized && pgPool) return true;

  try {
    const pool = getOrCreatePgPool();
    if (!pool) return false;

    const client = await pool.connect();
    try {
      // 1. Create tables idempotently
      await client.query(`
        CREATE TABLE IF NOT EXISTS sena_gaes_projects (
          id VARCHAR(255) PRIMARY KEY,
          gaes_number INT NOT NULL,
          ficha_number VARCHAR(100) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          is_roster_confirmed BOOLEAN DEFAULT FALSE,
          is_demo_project BOOLEAN DEFAULT FALSE,
          is_locked BOOLEAN DEFAULT FALSE,
          version INT NOT NULL DEFAULT 1,
          data JSONB NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_gaes_ficha UNIQUE (gaes_number, ficha_number)
        );

        CREATE TABLE IF NOT EXISTS sena_active_sessions (
          token VARCHAR(255) PRIMARY KEY,
          user_data JSONB NOT NULL,
          created_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sena_gaes_ficha ON sena_gaes_projects (gaes_number, ficha_number);
        CREATE INDEX IF NOT EXISTS idx_sena_active_sessions_expires ON sena_active_sessions (expires_at);
      `);

      // 2. Demo projects seeding ONLY when explicitly authorized via SEED_DEMO_PROJECTS=true
      // In production/Vercel, tables remain clean and ready for actual cohort registrations
      const allowDemoSeed = process.env.SEED_DEMO_PROJECTS === 'true';
      if (allowDemoSeed) {
        const countRes = await client.query('SELECT COUNT(*) FROM sena_gaes_projects');
        const count = parseInt(countRes.rows[0].count, 10);
        if (count === 0) {
          console.log('[Storage:PostgreSQL] SEED_DEMO_PROJECTS=true autorizado. Sembrando proyectos de cohorte...');
          const seeded = getInitialSeededProjects();
          for (const proj of seeded) {
            await client.query(`
              INSERT INTO sena_gaes_projects (id, gaes_number, ficha_number, company_name, is_roster_confirmed, is_demo_project, is_locked, version, data)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (gaes_number, ficha_number) DO NOTHING
            `, [
              proj.id,
              proj.gaesNumber,
              proj.fichaNumber || '2687410',
              proj.company.name,
              Boolean(proj.isRosterConfirmed),
              Boolean(proj.isDemoProject),
              Boolean(proj.isLocked),
              proj.version || 1,
              JSON.stringify(proj),
            ]);
          }
          console.log(`[Storage:PostgreSQL] ${seeded.length} proyectos sembrados.`);
        }
      }

      isPgInitialized = true;
      lastPgError = null;
      console.log('[Storage:PostgreSQL] Tablas verificadas e inicializadas en Neon PostgreSQL.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const errorSanitized = sanitizeError(err);
    console.error('[Storage:PostgreSQL] Error al inicializar PostgreSQL:', errorSanitized);
    lastPgError = errorSanitized;
    isPgInitialized = false;
    return false;
  }
}

// ============================================================================
// FILE STORAGE SUBSYSTEM (LOCAL ATOMIC WRITES)
// ============================================================================

function atomicSaveToFile(projects: GAESProject[]): boolean {
  if (IS_VERCEL) {
    // In Vercel, filesystem is read-only. We do NOT simulate persistence.
    memoryProjects = projects;
    return false;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const payload = JSON.stringify(projects, null, 2);
    const tempFile = path.resolve(DATA_DIR, `projects-db.tmp.${process.pid}.${Date.now()}`);
    fs.writeFileSync(tempFile, payload, 'utf-8');

    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, BACKUP_FILE);
      } catch {}
    }

    fs.renameSync(tempFile, DB_FILE);
    memoryProjects = projects;
    return true;
  } catch (err) {
    console.error('[Storage:File] Error en escritura atómica:', err);
    memoryProjects = projects;
    return false;
  }
}

function loadFromFile(): GAESProject[] {
  if (IS_VERCEL) {
    return [];
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Storage:File] Intento de recuperación desde .bak...');
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const parsedBackup = JSON.parse(backupRaw);
        if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
          fs.writeFileSync(DB_FILE, backupRaw, 'utf-8');
          return parsedBackup;
        }
      }
    } catch {}
  }

  const seeded = getInitialSeededProjects();
  atomicSaveToFile(seeded);
  return seeded;
}

// Initial memory load for local dev environment
if (!IS_VERCEL) {
  memoryProjects = loadFromFile();
}

// ============================================================================
// PUBLIC STORAGE INTERFACE
// ============================================================================

export const serverStorage = {
  /**
   * Initializes PostgreSQL if credentials are provided in environment
   */
  async init(): Promise<boolean> {
    if (DATABASE_URL) {
      return await initPostgres();
    }
    return false;
  },

  /**
   * Real, active verification of database connection via live SQL query
   */
  async verifyDatabaseConnection() {
    const dbInfo = getSanitizedDbInfo();
    const startTime = Date.now();

    if (!DATABASE_URL) {
      return {
        success: !IS_VERCEL,
        activeAdapter: IS_VERCEL ? ('IN_MEMORY_VERCEL' as const) : ('JSON_FILE' as const),
        isPermanent: !IS_VERCEL,
        isVercelEnvironment: IS_VERCEL,
        databaseConfigured: false,
        databaseTarget: dbInfo,
        liveConnection: {
          pingOk: false,
          connectedDatabase: null,
          connectedUser: null,
          serverVersionSnippet: null,
          latencyMs: 0,
          tablesFound: [],
          totalProjectsInDatabase: 0,
          activeSessionsInDatabase: 0,
        },
        error: IS_VERCEL
          ? 'DATABASE_URL no está configurada en las variables de entorno de Vercel. Se requiere PostgreSQL (Neon) para persistencia permanente.'
          : undefined,
        warningNotice: IS_VERCEL
          ? 'Persistencia efímera en Vercel: Se requiere DATABASE_URL para evitar pérdida de datos entre lambdas.'
          : undefined,
      };
    }

    try {
      const pool = getOrCreatePgPool();
      if (!pool) {
        throw new Error('No se pudo instanciar el pool de conexiones PostgreSQL.');
      }

      const client = await pool.connect();
      try {
        // 1. Live ping query
        const pingRes = await client.query('SELECT current_database() as db, current_user as usr, version() as ver');
        const latencyMs = Date.now() - startTime;
        const currentDb = pingRes.rows[0]?.db || null;
        const currentUser = pingRes.rows[0]?.usr || null;
        const fullVer = pingRes.rows[0]?.ver || '';
        const serverVersionSnippet = fullVer.split(' ')[0] + ' ' + (fullVer.split(' ')[1] || '');

        // 2. Query actual tables in public schema
        const tablesRes = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('sena_gaes_projects', 'sena_active_sessions')
        `);
        const tablesFound = tablesRes.rows.map((r: any) => r.table_name);

        // 3. Count rows if tables exist
        let totalProjects = 0;
        let activeSessions = 0;

        if (tablesFound.includes('sena_gaes_projects')) {
          const projCount = await client.query('SELECT COUNT(*) FROM sena_gaes_projects');
          totalProjects = parseInt(projCount.rows[0].count, 10);
        }

        if (tablesFound.includes('sena_active_sessions')) {
          const sessCount = await client.query('SELECT COUNT(*) FROM sena_active_sessions');
          activeSessions = parseInt(sessCount.rows[0].count, 10);
        }

        isPgInitialized = tablesFound.includes('sena_gaes_projects');
        lastPgError = null;

        return {
          success: true,
          activeAdapter: 'POSTGRESQL' as const,
          isPermanent: true,
          isVercelEnvironment: IS_VERCEL,
          databaseConfigured: true,
          databaseTarget: dbInfo,
          liveConnection: {
            pingOk: true,
            connectedDatabase: currentDb,
            connectedUser: currentUser,
            serverVersionSnippet,
            latencyMs,
            tablesFound,
            totalProjectsInDatabase: totalProjects,
            activeSessionsInDatabase: activeSessions,
          },
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      const sanitized = sanitizeError(err);
      lastPgError = sanitized;
      isPgInitialized = false;
      return {
        success: false,
        activeAdapter: IS_VERCEL ? ('IN_MEMORY_VERCEL' as const) : ('JSON_FILE' as const),
        isPermanent: false,
        isVercelEnvironment: IS_VERCEL,
        databaseConfigured: true,
        databaseTarget: dbInfo,
        liveConnection: {
          pingOk: false,
          connectedDatabase: null,
          connectedUser: null,
          serverVersionSnippet: null,
          latencyMs: Date.now() - startTime,
          tablesFound: [],
          totalProjectsInDatabase: 0,
          activeSessionsInDatabase: 0,
        },
        error: `Fallo en conexión en vivo con Neon PostgreSQL: ${sanitized}`,
        warningNotice: 'La base de datos PostgreSQL configurada en DATABASE_URL no responde o rechazó la conexión.',
      };
    }
  },

  /**
   * Explicitly ensures the tables are created in PostgreSQL idempotently
   */
  async ensureSchemaInitialized(): Promise<{ success: boolean; tablesCreated: string[]; error?: string }> {
    if (!DATABASE_URL) {
      return { success: false, tablesCreated: [], error: 'DATABASE_URL no está configurada.' };
    }
    const ok = await initPostgres();
    if (!ok) {
      return { success: false, tablesCreated: [], error: lastPgError || 'Error al conectar a PostgreSQL.' };
    }
    return {
      success: true,
      tablesCreated: ['sena_gaes_projects', 'sena_active_sessions'],
    };
  },

  /**
   * Returns all stored projects.
   * In Vercel, strictly queries PostgreSQL to prevent serving stale/ephemeral RAM data.
   */
  async getAllProjects(): Promise<GAESProject[]> {
    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (!ok) {
        if (IS_VERCEL) {
          throw new Error(`Persistencia fallida en Vercel: No se pudo conectar a Neon PostgreSQL (${lastPgError || 'Error de conexión'}). Se prohíbe el uso de memoria efímera.`);
        }
      } else if (pgPool) {
        try {
          const res = await pgPool.query('SELECT data FROM sena_gaes_projects ORDER BY gaes_number ASC');
          const projects = res.rows.map((r) => r.data as GAESProject);
          memoryProjects = projects;
          return projects;
        } catch (err: any) {
          const sanitized = sanitizeError(err);
          console.error('[Storage:PostgreSQL] Error al consultar proyectos:', sanitized);
          if (IS_VERCEL) {
            throw new Error(`Error en consulta a Neon PostgreSQL: ${sanitized}`);
          }
        }
      }
    }

    if (IS_VERCEL && !DATABASE_URL) {
      throw new Error('Persistencia bloqueada: La variable DATABASE_URL es obligatoria en Vercel.');
    }

    if (!IS_VERCEL) {
      memoryProjects = loadFromFile();
    }
    return memoryProjects;
  },

  /**
   * Finds a project by ID
   */
  async getProjectById(id: string): Promise<GAESProject | null> {
    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
        try {
          const res = await pgPool.query('SELECT data FROM sena_gaes_projects WHERE id = $1', [id]);
          if (res.rows.length > 0) {
            return res.rows[0].data as GAESProject;
          }
          return null;
        } catch (err: any) {
          console.error('[Storage:PostgreSQL] Error al consultar por ID:', sanitizeError(err));
          if (IS_VERCEL) {
            throw new Error(`Error al consultar proyecto en PostgreSQL: ${sanitizeError(err)}`);
          }
        }
      } else if (IS_VERCEL) {
        throw new Error(`Fallo de conexión PostgreSQL al consultar proyecto: ${lastPgError || 'Desconectado'}`);
      }
    }

    return memoryProjects.find((p) => p.id === id) || null;
  },

  /**
   * Finds a project by GAES number and Ficha
   */
  async getProjectByGaesAndFicha(gaesNumber: number, fichaNumber: string): Promise<GAESProject | null> {
    const cleanFicha = (fichaNumber || '').trim();
    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
        try {
          const res = await pgPool.query(
            'SELECT data FROM sena_gaes_projects WHERE gaes_number = $1 AND ficha_number = $2',
            [gaesNumber, cleanFicha]
          );
          if (res.rows.length > 0) {
            return res.rows[0].data as GAESProject;
          }
          return null;
        } catch (err: any) {
          console.error('[Storage:PostgreSQL] Error al consultar por GAES y ficha:', sanitizeError(err));
          if (IS_VERCEL) {
            throw new Error(`Error en consulta por GAES y ficha: ${sanitizeError(err)}`);
          }
        }
      } else if (IS_VERCEL) {
        throw new Error(`Fallo de conexión PostgreSQL al buscar GAES: ${lastPgError || 'Desconectado'}`);
      }
    }

    return (
      memoryProjects.find(
        (p) => p.gaesNumber === gaesNumber && (p.fichaNumber || '').trim() === cleanFicha
      ) || null
    );
  },

  /**
   * Saves or updates a project (upsert)
   * In Vercel, rejects memory fallback so the user is never lied to about persistence.
   */
  async saveProject(project: GAESProject): Promise<{ success: boolean; error?: string }> {
    if (!validateProjectSchema(project)) {
      return { success: false, error: 'Esquema de proyecto no válido para persistencia.' };
    }

    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (!ok || !pgPool) {
        const errorMsg = lastPgError
          ? `Error de conexión con Neon PostgreSQL: ${lastPgError}`
          : 'No se pudo conectar a la base de datos PostgreSQL.';
        if (IS_VERCEL) {
          return {
            success: false,
            error: `${errorMsg}. Operación de guardado rechazada para evitar pérdida de datos en memoria efímera de Vercel.`,
          };
        }
      } else {
        try {
          await pgPool.query(`
            INSERT INTO sena_gaes_projects (
              id, gaes_number, ficha_number, company_name, is_roster_confirmed, is_demo_project, is_locked, version, data, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              gaes_number = EXCLUDED.gaes_number,
              ficha_number = EXCLUDED.ficha_number,
              company_name = EXCLUDED.company_name,
              is_roster_confirmed = EXCLUDED.is_roster_confirmed,
              is_demo_project = EXCLUDED.is_demo_project,
              is_locked = EXCLUDED.is_locked,
              version = EXCLUDED.version,
              data = EXCLUDED.data,
              last_updated = CURRENT_TIMESTAMP
          `, [
            project.id,
            project.gaesNumber,
            project.fichaNumber || '2687410',
            project.company.name,
            Boolean(project.isRosterConfirmed),
            Boolean(project.isDemoProject),
            Boolean(project.isLocked),
            project.version || 1,
            JSON.stringify(project),
          ]);

          // Update cache only after confirmed DB write
          const existingIdx = memoryProjects.findIndex((p) => p.id === project.id);
          if (existingIdx !== -1) {
            memoryProjects[existingIdx] = project;
          } else {
            memoryProjects.unshift(project);
          }

          return { success: true };
        } catch (err: any) {
          const sanitized = sanitizeError(err);
          console.error('[Storage:PostgreSQL] Error al guardar proyecto:', sanitized);
          return {
            success: false,
            error: `Error al persistir en Neon PostgreSQL: ${sanitized}`,
          };
        }
      }
    }

    if (IS_VERCEL) {
      return {
        success: false,
        error: 'Persistencia rechazada: En Vercel no se permite almacenar datos en memoria efímera. Configure la variable DATABASE_URL con Neon PostgreSQL.',
      };
    }

    // Local file fallback ONLY in non-Vercel environment
    const ok = atomicSaveToFile(memoryProjects);
    return { success: ok, error: ok ? undefined : 'Error al escribir archivo JSON local.' };
  },

  /**
   * Session Management: Saves an active session
   */
  async saveSession(session: UserSession): Promise<void> {
    memorySessions.set(session.token, session);

    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
        try {
          await pgPool.query(`
            INSERT INTO sena_active_sessions (token, user_data, created_at, expires_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (token) DO UPDATE SET
              user_data = EXCLUDED.user_data,
              expires_at = EXCLUDED.expires_at
          `, [session.token, JSON.stringify(session.user), session.createdAt, session.expiresAt]);
        } catch (err) {
          console.error('[Storage:PostgreSQL] Error al guardar sesión:', sanitizeError(err));
        }
      }
    }
  },

  /**
   * Session Management: Retrieves an active session by token
   */
  async getSession(token: string): Promise<UserSession | null> {
    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
        try {
          const res = await pgPool.query(
            'SELECT token, user_data, created_at, expires_at FROM sena_active_sessions WHERE token = $1 AND expires_at > $2',
            [token, Date.now()]
          );
          if (res.rows.length > 0) {
            const row = res.rows[0];
            const session: UserSession = {
              token: row.token,
              user: row.user_data as SessionUser,
              createdAt: Number(row.created_at),
              expiresAt: Number(row.expires_at),
            };
            memorySessions.set(token, session);
            return session;
          }
          return null;
        } catch (err) {
          console.error('[Storage:PostgreSQL] Error al recuperar sesión:', sanitizeError(err));
        }
      }
    }

    const local = memorySessions.get(token);
    if (!local) return null;
    if (Date.now() > local.expiresAt) {
      memorySessions.delete(token);
      return null;
    }
    return local;
  },

  /**
   * Session Management: Deletes an active session
   */
  async deleteSession(token: string): Promise<void> {
    memorySessions.delete(token);
    if (DATABASE_URL && pgPool) {
      try {
        await pgPool.query('DELETE FROM sena_active_sessions WHERE token = $1', [token]);
      } catch {}
    }
  },

  /**
   * Returns synchronous status snapshot
   */
  getStatus(): StorageStatus {
    const hasDb = Boolean(DATABASE_URL);
    let activeAdapter: 'POSTGRESQL' | 'JSON_FILE' | 'IN_MEMORY_VERCEL' = 'JSON_FILE';
    let isPermanent = true;
    let warningNotice: string | undefined;

    if (hasDb && isPgInitialized) {
      activeAdapter = 'POSTGRESQL';
      isPermanent = true;
    } else if (IS_VERCEL) {
      activeAdapter = 'IN_MEMORY_VERCEL';
      isPermanent = false;
      warningNotice =
        'Persistencia temporal en Vercel Serverless: Los archivos locales son efímeros. Para guardar proyectos y sesiones de forma permanente en Vercel, debe configurarse DATABASE_URL con Neon PostgreSQL.';
    } else {
      activeAdapter = 'JSON_FILE';
      isPermanent = true;
    }

    return {
      activeAdapter,
      isPermanent,
      isVercelEnvironment: IS_VERCEL,
      hasDatabaseUrl: hasDb,
      databaseProvider: hasDb ? 'PostgreSQL (Neon Cloud Relational)' : 'Ninguno (Almacenamiento JSON local)',
      totalProjects: memoryProjects.length,
      warningNotice,
    };
  },
};

