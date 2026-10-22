import { DeliverablePoint } from '../data/learningGuidesDeliverables';

export type EconomicSector = 'Agropecuario / Agroindustrial' | 'Manufactura / Industrial' | 'Comercial' | 'Servicios / Tecnología';
export type CompanySize = 'Microempresa (1-10)' | 'Pequeña (11-50)' | 'Mediana (51-200)' | 'Gran Empresa (>200)';
export type BSCPerspective = 'Financiera' | 'Clientes' | 'Procesos Internos' | 'Aprendizaje y Crecimiento';

export type UserRole = 'INSTRUCTOR' | 'APRENDIZ';

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  token?: string;
  documentNumber?: string;
  regional?: string;
  centerName?: string;
  fichaNumber?: string;
  gaesNumber?: number;
  authenticatedAt: string;
}

export interface Apprentice {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  role: 'Líder GAES' | 'Coordinador Financiero' | 'Coordinador de Mercadeo' | 'Coordinador de Operaciones / Calidad' | 'Coordinador de Talento Humano';
}

export interface CompanyProfile {
  name: string;
  nit: string;
  sector: EconomicSector;
  ciiuCode: string;
  size: CompanySize;
  city: string;
  mainProduct: string;
  valueProposition: string;
  targetMarket: string;
  annualRevenueEstimated: string;
}

export interface PriorGuidesData {
  diagnosticSummary: string; // Guía 2 & 3: Diagnóstico empresarial
  internalValueChain: string; // Guía 4 & 5: Procesos internos y logística
  missionVisionOriginal: {
    mission: string;
    vision: string;
    values: string[];
  };
  marketStudyFindings: string; // Guía 8 & 9: Estudio de mercado y competencia
  financialHealth: {
    grossMarginPercent: number;
    netMarginPercent: number;
    liquidityRatio: number;
    debtRatioPercent: number;
    annualSales: number;
  };
  operationalBottlenecks: string; // Guía 10 & 11: Procesos y tiempos
  uploadedDocumentsSummary: string[];
}

// Guía 16: PESTA
export interface PESTAItem {
  id: string;
  category: 'Político' | 'Económico' | 'Social' | 'Tecnológico' | 'Ambiental / Legal';
  factor: string;
  impactType: 'Oportunidad' | 'Amenaza';
  intensity: 'Alta' | 'Media' | 'Baja';
  rationale: string;
  evidenceSource: string;
}

// Guía 16: MEFI
export interface MEFIItem {
  id: string;
  type: 'Fortaleza' | 'Debilidad';
  factor: string;
  weight: number; // 0.01 - 1.00
  rating: 1 | 2 | 3 | 4; // 1=Debilidad Mayor, 2=Debilidad Menor, 3=Fortaleza Menor, 4=Fortaleza Mayor
  weightedScore: number;
  area: 'Financiera' | 'Mercadeo' | 'Operaciones' | 'Talento Humano' | 'Direccionamiento';
  validationStatus: 'Validado' | 'Supuesto por Verificar';
}

// Guía 16: MEFE
export interface MEFEItem {
  id: string;
  type: 'Oportunidad' | 'Amenaza';
  factor: string;
  weight: number; // 0.01 - 1.00
  rating: 1 | 2 | 3 | 4; // 1=Respuesta deficiente, 2=Respuesta media, 3=Respuesta sobre la media, 4=Respuesta superior
  weightedScore: number;
  pestaCategory: 'Político' | 'Económico' | 'Social' | 'Tecnológico' | 'Ambiental / Legal';
  validationStatus: 'Validado' | 'Supuesto por Verificar';
}

// Guía 16: DOFA Estratégica
export interface DOFAStrategy {
  id: string;
  code: string; // FO-1, DO-2, FA-1, DA-2
  type: 'FO' | 'DO' | 'FA' | 'DA';
  title: string;
  description: string;
  crossedFactors: string[]; // ['F1', 'F3', 'O2']
  priority: 'Alta' | 'Media' | 'Baja';
}

// Guía 16: PEYEA
export interface PEYEAFactor {
  id: string;
  name: string;
  score: number; // For FF and FI: 1 to 6; For VC and EA: -6 to -1
}

export interface PEYEAMatrix {
  financialStrength: PEYEAFactor[]; // FF: +1 a +6
  competitiveAdvantage: PEYEAFactor[]; // VC: -6 a -1
  environmentalStability: PEYEAFactor[]; // EA: -6 a -1
  industryStrength: PEYEAFactor[]; // FI: +1 a +6
  // Calculated:
  avgFF: number;
  avgVC: number;
  avgEA: number;
  avgFI: number;
  coordinateX: number; // avgVC + avgFI
  coordinateY: number; // avgEA + avgFF
  quadrant: 'Agresivo' | 'Conservador' | 'Defensivo' | 'Competitivo';
  interpretation: string;
}

// Guía 16: MPC (Matriz Perfil Competitivo)
export interface MPCFactor {
  id: string;
  factor: string;
  weight: number; // Sum = 1.0
  companyRating: 1 | 2 | 3 | 4;
  competitor1Rating: 1 | 2 | 3 | 4;
  competitor2Rating: 1 | 2 | 3 | 4;
}

export interface MPCMatrix {
  competitor1Name: string;
  competitor2Name: string;
  factors: MPCFactor[];
}

// Guía 16: BCG
export interface BCGItem {
  id: string;
  productName: string;
  relativeMarketShare: number; // >= 1.0 is high, < 1.0 is low
  marketGrowthRatePercent: number; // >= 10% is high, < 10% is low
  companySalesPercent: number; // Bubble size (1 - 100%)
  category: 'Estrella' | 'Vaca Lechera' | 'Interrogante' | 'Perro';
  strategicAction: string;
}

// Guía 16: Hoja de Vida de Indicador (Ficha Técnica)
export interface IndicatorCard {
  id: string;
  code: string; // e.g. IND-FIN-01
  name: string;
  perspective: BSCPerspective;
  associatedObjectiveId: string;
  definition: string;
  formula: string;
  unit: '%' | 'COP ($)' | 'Unidades' | 'Días' | 'Índice (1-5)';
  periodicity: 'Mensual' | 'Bimensual' | 'Trimestral' | 'Semestral' | 'Anual';
  baseline: number;
  target: number;
  currentValue?: number;
  greenRange: string; // e.g. ">= 90%"
  yellowRange: string; // e.g. "75% - 89%"
  redRange: string; // e.g. "< 75%"
  dataSource: string;
  responsibleRole: string;
}

// Balanced Scorecard (Cuadro de Mando Integral)
export interface BSCObjective {
  id: string;
  code: string; // OBJ-FIN-01, OBJ-CLI-02
  perspective: BSCPerspective;
  title: string;
  description: string;
  matrixOrigin: string; // e.g. "DOFA: Estrategia FO-1 | PEYEA: Cuadrante Agresivo"
  primaryIndicatorId?: string;
  kpiCode?: string;
  targetAnnual: string;
  strategicInitiative: string;
  estimatedBudgetCOP: number;
  responsibleRole: string;
}

export interface BSCCauseEffectLink {
  id: string;
  fromObjectiveId: string; // Usually lower perspective
  toObjectiveId: string; // Higher perspective
  explanation: string;
}

// Motor de Auditoría y Retroalimentación Inteligente
export interface AuditFinding {
  id: string;
  type: 'exito' | 'advertencia' | 'critico';
  category: 'MEFI/MEFE' | 'PEYEA' | 'DOFA' | 'BSC Causa-Efecto' | 'Indicadores' | 'Datos Previos';
  message: string;
  detail: string;
  suggestion: string;
}

export interface StrategicAuditResult {
  overallScore: number; // 0 - 100
  mathematicalCoherence: {
    mefiWeightsSum: number;
    mefeWeightsSum: number;
    mpcWeightsSum: number;
    isMefiValid: boolean;
    isMefeValid: boolean;
    isMpcValid: boolean;
  };
  alignmentPEYEAvsMatrices: {
    coherent: boolean;
    explanation: string;
  };
  bscTraceabilityCoverage: number; // Percentage of BSC objectives tied to matrices
  findings: AuditFinding[];
  pedagogicalAdvice: string;
}

// Guía 16: Evaluación del Instructor SENA por Resultados de Aprendizaje (RAP)
export type EvaluativeJudgment = 'APROBADO' | 'NO APROBADO (CON PLAN DE MEJORAMIENTO)' | 'PENDIENTE DE EVALUACIÓN';

export interface InstructorCriteria {
  id: string;
  rapCode: string; // Código oficial SENA (e.g. 21060100303, 21010100503)
  title: string;
  description: string;
  asociacionTrabajoRealizado?: string; // Asociación con el trabajo integral realizado en la plataforma
  nucleoAsociado?: string; // Módulo o núcleo formativo
  toolsIncluded: string; // Herramientas SENA articuladas
  weight: number; // Porcentaje de ponderación oficial (e.g. 15%)
  score: number; // 0 - 100
  status: 'Cumple' | 'Por Mejorar' | 'No Evidenciado' | 'Pendiente de Evaluación';
  feedback: string;
}

export interface EvaluationAuditRecord {
  id: string;
  timestamp: string;
  action: string;
  evaluatedBy: string;
  instructorDocument?: string;
  judgment: EvaluativeJudgment;
  productScore: number;
  performanceScore: number;
  observationsNote?: string;
}

export interface InstructorEvaluation {
  evaluatedAt: string;
  instructorName: string;
  instructorDocument: string;
  finalJudgment: EvaluativeJudgment;
  productEvidenceScore: number; // 0 - 100
  performanceEvidenceScore: number; // 0 - 100
  criteria: InstructorCriteria[];
  productObservation: string;
  performanceObservation: string;
  improvementPlanDeadline?: string;
  improvementPlanActions?: string;
  isLocked: boolean;
  isDefinitiveSaved?: boolean;
  auditHistory?: EvaluationAuditRecord[];
  lastModifiedAt?: string;
  modifiedBy?: string;
}

export interface AuditContributionRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  gaesNumber: number;
  fichaNumber: string;
  phase: number;
  component: string;
  operationType: 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'EVALUAR' | 'REAPERTURA';
  previousVersion?: string;
  newVersion: string;
  description: string;
}

// Complete GAES Project State
export interface GAESProject {
  id: string;
  gaesNumber: number;
  fichaNumber: string;
  programName: string;
  centerName: string;
  regional: string;
  apprentices: Apprentice[];
  company: CompanyProfile;
  priorGuides: PriorGuidesData;
  learningGuidesDeliverables?: DeliverablePoint[];
  pesta: PESTAItem[];
  mefi: MEFIItem[];
  mefe: MEFEItem[];
  dofa: DOFAStrategy[];
  peyea: PEYEAMatrix;
  mpc: MPCMatrix;
  bcg: BCGItem[];
  indicators: IndicatorCard[];
  bscObjectives: BSCObjective[];
  bscLinks: BSCCauseEffectLink[];
  bscDashboardApproval?: {
    isApproved: boolean;
    approvedAt?: string;
    approvedBy?: string;
    notes?: string;
  };
  isMatricesValidated?: boolean;
  matricesValidatedAt?: string;
  instructorEvaluation: InstructorEvaluation;
  lastUpdated: string;
  currentStep: number; // 1 to 6
  version?: number;
  isLocked?: boolean;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  isRosterConfirmed?: boolean;
  rosterConfirmedAt?: string;
  rosterConfirmedBy?: string;
  isDemoProject?: boolean;
  collaborationHistory?: AuditContributionRecord[];
}
