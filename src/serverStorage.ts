import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pg from 'pg';
import { GAESProject, AuditContributionRecord } from './types';
import { INITIAL_COHORT_PROJECTS } from './data/cohortMockProjects';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
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

// In-memory fallback / cache
let memoryProjects: GAESProject[] = [];
let memorySessions = new Map<string, UserSession>();
let pgPool: pg.Pool | null = null;
let isPgInitialized = false;

// Check environment
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

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

async function initPostgres(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  if (isPgInitialized && pgPool) return true;

  try {
    const isLocalhost = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pgPool.connect();
    try {
      // Create tables if not exist
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
      `);

      // Check if seeded
      const countRes = await client.query('SELECT COUNT(*) FROM sena_gaes_projects');
      const count = parseInt(countRes.rows[0].count, 10);
      if (count === 0) {
        console.log('[Storage:PostgreSQL] Base de datos vacía. Sembrando proyectos de cohorte...');
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
        console.log(`[Storage:PostgreSQL] ${seeded.length} proyectos sembrados exitosamente.`);
      }

      isPgInitialized = true;
      console.log('[Storage:PostgreSQL] Conexión y esquema validados exitosamente.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Storage:PostgreSQL] Error al inicializar PostgreSQL:', err);
    isPgInitialized = false;
    return false;
  }
}

// ============================================================================
// FILE STORAGE SUBSYSTEM (LOCAL ATOMIC WRITES)
// ============================================================================

function atomicSaveToFile(projects: GAESProject[]): boolean {
  if (IS_VERCEL) {
    // Vercel serverless has read-only filesystem (except /tmp)
    memoryProjects = projects;
    return true;
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

// Initial memory load
memoryProjects = loadFromFile();

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
   * Returns all stored projects, checking PostgreSQL first, then file/memory
   */
  async getAllProjects(): Promise<GAESProject[]> {
    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
        try {
          const res = await pgPool.query('SELECT data FROM sena_gaes_projects ORDER BY gaes_number ASC');
          const projects = res.rows.map((r) => r.data as GAESProject);
          memoryProjects = projects;
          return projects;
        } catch (err) {
          console.error('[Storage:PostgreSQL] Error al consultar proyectos:', err);
        }
      }
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
        } catch (err) {
          console.error('[Storage:PostgreSQL] Error al consultar por ID:', err);
        }
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
        } catch (err) {
          console.error('[Storage:PostgreSQL] Error al consultar por GAES y ficha:', err);
        }
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
   */
  async saveProject(project: GAESProject): Promise<{ success: boolean; error?: string }> {
    if (!validateProjectSchema(project)) {
      return { success: false, error: 'Esquema de proyecto no válido.' };
    }

    // Always update memory
    const existingIdx = memoryProjects.findIndex((p) => p.id === project.id);
    if (existingIdx !== -1) {
      memoryProjects[existingIdx] = project;
    } else {
      memoryProjects.unshift(project);
    }

    if (DATABASE_URL) {
      const ok = await initPostgres();
      if (ok && pgPool) {
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
          return { success: true };
        } catch (err: any) {
          console.error('[Storage:PostgreSQL] Error al guardar proyecto:', err);
          return { success: false, error: err?.message || 'Error en base de datos PostgreSQL.' };
        }
      }
    }

    // Local file fallback
    const ok = atomicSaveToFile(memoryProjects);
    return { success: ok };
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
          console.error('[Storage:PostgreSQL] Error al guardar sesión:', err);
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
          console.error('[Storage:PostgreSQL] Error al recuperar sesión:', err);
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
   * Returns complete diagnostic storage status
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
        'Persistencia temporal en Vercel Serverless: Los archivos locales son efímeros y de solo lectura. Para guardar proyectos y sesiones de forma permanente en Vercel, debe configurarse la variable DATABASE_URL con una base de datos PostgreSQL (Neon, Supabase o Vercel Postgres).';
    } else {
      activeAdapter = 'JSON_FILE';
      isPermanent = true;
    }

    return {
      activeAdapter,
      isPermanent,
      isVercelEnvironment: IS_VERCEL,
      hasDatabaseUrl: hasDb,
      databaseProvider: hasDb ? 'PostgreSQL (Conexión configurada)' : 'Ninguno (Almacenamiento JSON local)',
      totalProjects: memoryProjects.length,
      warningNotice,
    };
  },
};
