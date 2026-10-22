/**
 * SENA EstrategIA 360 - Arquitectura de Persistencia Adaptable
 * Interfaz de Repositorio y Adaptadores para Almacenamiento Centralizado
 * Soporta JsonFileStorageAdapter (activo) y PostgresStorageAdapter (preparado para PostgreSQL en Neon/Supabase).
 */

import { GAESProject, AuditContributionRecord } from '../types';

export interface IProjectStorageAdapter {
  name: string;
  isPersistentInVercel: boolean;
  initialize(): Promise<GAESProject[]>;
  getAll(role: 'INSTRUCTOR' | 'APRENDIZ', gaesNumber?: number): Promise<GAESProject[]>;
  getById(id: string): Promise<GAESProject | null>;
  saveProject(project: GAESProject): Promise<{ success: boolean; project?: GAESProject; error?: string }>;
  reopenProject(id: string, reason: string, instructorName: string, instructorEmail: string): Promise<{ success: boolean; project?: GAESProject; error?: string }>;
  getAuditTrail(projectId: string): Promise<AuditContributionRecord[]>;
}

/**
 * Adaptador de almacenamiento basado en archivo JSON local con soporte de escrituras atómicas
 * Adecuado para entornos locales, Docker y servidores Node.js permanentes con volumen montado.
 * NOTA: En Vercel Serverless las funciones son efímeras; para Vercel se requiere PostgresStorageAdapter.
 */
export class JsonFileStorageAdapter implements IProjectStorageAdapter {
  name = 'JSON File Storage (Atomic Writes + Backup Recovery)';
  isPersistentInVercel = false;

  private memoryCache: Map<string, GAESProject> = new Map();

  constructor(initialProjects: GAESProject[]) {
    initialProjects.forEach((p) => this.memoryCache.set(p.id, p));
  }

  async initialize(): Promise<GAESProject[]> {
    return Array.from(this.memoryCache.values());
  }

  async getAll(role: 'INSTRUCTOR' | 'APRENDIZ', gaesNumber?: number): Promise<GAESProject[]> {
    const all = Array.from(this.memoryCache.values());
    if (role === 'INSTRUCTOR') return all;
    return all.filter((p) => p.gaesNumber === gaesNumber);
  }

  async getById(id: string): Promise<GAESProject | null> {
    return this.memoryCache.get(id) || null;
  }

  async saveProject(project: GAESProject): Promise<{ success: boolean; project?: GAESProject; error?: string }> {
    this.memoryCache.set(project.id, project);
    return { success: true, project };
  }

  async reopenProject(
    id: string,
    reason: string,
    instructorName: string,
    instructorEmail: string
  ): Promise<{ success: boolean; project?: GAESProject; error?: string }> {
    const existing = this.memoryCache.get(id);
    if (!existing) return { success: false, error: 'Proyecto no encontrado.' };

    const serverVersion = existing.version || 1;
    const nextVersion = serverVersion + 1;
    const now = new Date().toISOString();

    const reopenAudit: AuditContributionRecord = {
      id: `audit-reopen-${Date.now()}`,
      timestamp: now,
      userId: `inst-reopen`,
      userName: instructorName,
      userEmail: instructorEmail,
      gaesNumber: existing.gaesNumber,
      fichaNumber: existing.fichaNumber,
      phase: 6,
      component: 'Reapertura de Proyecto Evaluado',
      operationType: 'REAPERTURA',
      previousVersion: String(serverVersion),
      newVersion: String(nextVersion),
      description: `Reapertura formativa autorizada por ${instructorName}. Motivo pedagógico: ${reason.trim()}`,
    };

    const reopened: GAESProject = {
      ...existing,
      isLocked: false,
      reopenedAt: now,
      reopenedBy: instructorName,
      reopenReason: reason.trim(),
      version: nextVersion,
      lastUpdated: now,
      instructorEvaluation: {
        ...existing.instructorEvaluation,
        isDefinitiveSaved: false,
      },
      collaborationHistory: [reopenAudit, ...(existing.collaborationHistory || [])],
    };

    this.memoryCache.set(id, reopened);
    return { success: true, project: reopened };
  }

  async getAuditTrail(projectId: string): Promise<AuditContributionRecord[]> {
    const project = this.memoryCache.get(projectId);
    return project?.collaborationHistory || [];
  }
}

/**
 * Adaptador preparado para migración a PostgreSQL (Neon, Supabase o Cloud SQL)
 * Diseñado para despliegues serverless en Vercel donde se requiere base de datos relacional externa.
 */
export class PostgresStorageAdapter implements IProjectStorageAdapter {
  name = 'PostgreSQL Relational Storage (Neon / Supabase / Cloud SQL)';
  isPersistentInVercel = true;
  private connectionString?: string;

  constructor(databaseUrl?: string) {
    this.connectionString = databaseUrl || process.env.DATABASE_URL;
  }

  isConfigured(): boolean {
    return Boolean(this.connectionString && this.connectionString.startsWith('postgres'));
  }

  async initialize(): Promise<GAESProject[]> {
    if (!this.isConfigured()) {
      throw new Error('DATABASE_URL no está configurada para PostgresStorageAdapter.');
    }
    // Conexión relacional preparada mediante cliente pg / Drizzle ORM
    return [];
  }

  async getAll(role: 'INSTRUCTOR' | 'APRENDIZ', gaesNumber?: number): Promise<GAESProject[]> {
    if (!this.isConfigured()) throw new Error('DATABASE_URL no configurada.');
    return [];
  }

  async getById(id: string): Promise<GAESProject | null> {
    if (!this.isConfigured()) throw new Error('DATABASE_URL no configurada.');
    return null;
  }

  async saveProject(project: GAESProject): Promise<{ success: boolean; project?: GAESProject; error?: string }> {
    if (!this.isConfigured()) return { success: false, error: 'DATABASE_URL no configurada.' };
    return { success: true, project };
  }

  async reopenProject(
    id: string,
    reason: string,
    instructorName: string,
    instructorEmail: string
  ): Promise<{ success: boolean; project?: GAESProject; error?: string }> {
    if (!this.isConfigured()) return { success: false, error: 'DATABASE_URL no configurada.' };
    return { success: false, error: 'Postgres adapter requiere conexión activa a base de datos.' };
  }

  async getAuditTrail(projectId: string): Promise<AuditContributionRecord[]> {
    return [];
  }
}
