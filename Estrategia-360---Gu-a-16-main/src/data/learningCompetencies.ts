import { InstructorCriteria } from '../types';

/**
 * Competencias Organizacionales y Resultados de Aprendizaje Oficiales SENA
 * Programa: Tecnólogo en Gestión Empresarial / Asistencia Administrativa
 * Articulación con Insumos Previos (Guías 1 a 15), Matrices Estratégicas y Balanced Scorecard (Guía 16)
 */
export interface CompetenciaOrganizacionalDef {
  codigo: string;
  descripcion: string;
  tituloCorto: string;
  asociacionTrabajoRealizado: string;
  herramientasArticuladas: string;
  nucleoAsociado: string;
  pesoRecomendado: number;
  puntajePredeterminado: number;
  retroalimentacionPredeterminada: string;
}

export const SENA_COMPETENCIAS_ORGANIZACIONALES: CompetenciaOrganizacionalDef[] = [
  {
    codigo: '21060100303',
    descripcion:
      'Evaluar y ajustar la ejecución del plan de mejoramiento organizacional, de acuerdo con las políticas de la organización.',
    tituloCorto: 'Plan de mejoramiento organizacional y ajuste de políticas',
    asociacionTrabajoRealizado:
      'Articulado con el Cuadro de Mando Integral (Balanced Scorecard), iniciativas estratégicas presupuestadas ($ COP), metas anuales de los 8 objetivos, matriz de planes de mejora (Luc Brunet) y el motor de auditoría algorítmica para calibrar desviaciones de desempeño.',
    herramientasArticuladas:
      'Balanced Scorecard (Kaplan & Norton), Mapa Causa-Efecto, Iniciativas Estratégicas y Presupuesto, Plan de Mejora Organizacional',
    nucleoAsociado: 'Fase 4 (BSC) & Auditoría de Coherencia',
    pesoRecomendado: 15,
    puntajePredeterminado: 94,
    retroalimentacionPredeterminada:
      'El GAES estructura un plan de mejoramiento organizacional viable y medible, soportado en el Cuadro de Mando Integral y en iniciativas con presupuesto asignado.',
  },
  {
    codigo: '21010100503',
    descripcion:
      'Evaluar la gestión del talento según niveles de rendimiento, normas y procedimientos establecidos por la organización.',
    tituloCorto: 'Gestión del talento humano y evaluación del rendimiento',
    asociacionTrabajoRealizado:
      'Vinculado con la Perspectiva de Aprendizaje y Crecimiento del BSC, las Guías 4 a 6 de Talento Humano (manuales de funciones, perfiles de cargo, evaluación del desempeño por competencias 360°, KPIs de rotación y horas de capacitación técnica IND-APR-01).',
    herramientasArticuladas:
      'Perspectiva Aprendizaje & Crecimiento BSC, Ficha Técnica IND-APR-01, Macroprocesos de Talento Humano (Guías 4-6)',
    nucleoAsociado: 'Talento Humano & Perspectiva de Aprendizaje',
    pesoRecomendado: 15,
    puntajePredeterminado: 93,
    retroalimentacionPredeterminada:
      'Excelente integración de los macroprocesos de talento humano. Las fichas de capacitación y evaluación de desempeño responden a los requerimientos normativos.',
  },
  {
    codigo: '21060100904',
    descripcion:
      'Evaluar los resultados obtenidos del diagnóstico y de la implementación del plan de mejoramiento de acuerdo con las políticas de la organización, normas vigentes y el sistema de gestión de la calidad.',
    tituloCorto: 'Diagnóstico organizacional y sistema de gestión de calidad',
    asociacionTrabajoRealizado:
      'Conectado con las Matrices Diagnósticas MEFI (Σ=1.00) y MEFE (Σ=1.00), factores críticos del sistema de gestión de calidad (Buenas Prácticas de Manufactura BPM, normas técnicas sectoriales, aseguramiento de inocuidad en planta) y plan de acciones correctivas.',
    herramientasArticuladas:
      'Matriz MEFI (Factores Internos), Matriz MEFE (Factores Externos), Protocolos de Calidad e Inocuidad (Guías 1 y 11)',
    nucleoAsociado: 'Diagnóstico MEFI/MEFE & Gestión de Calidad',
    pesoRecomendado: 15,
    puntajePredeterminado: 95,
    retroalimentacionPredeterminada:
      'Diagnóstico situacional fundamentado con rigor metodológico. Ponderaciones matemáticas exactas (1.00) y articulación transparente con el sistema de gestión de la calidad.',
  },
  {
    codigo: '21060100905',
    descripcion:
      'Garantizar que el clima organizacional sea propicio para el cumplimiento de las actividades laborales, las políticas organizacionales y el desarrollo del talento humano, mediante las propuestas de mejoramiento del clima organizacional, de acuerdo con los resultados obtenidos.',
    tituloCorto: 'Clima organizacional propicio y desarrollo del talento humano',
    asociacionTrabajoRealizado:
      'Respaldado en el estudio y diagnóstico de Clima Organizacional bajo el modelo Luc Brunet (Guía 5: 8 dimensiones evaluadas), diseño del plan de bienestar laboral, programas de incentivos y retención, comités de convivencia y políticas corporativas formalizadas en la plataforma estratégica.',
    herramientasArticuladas:
      'Diagnóstico Clima Luc Brunet (8 Dimensiones), Plan de Bienestar y Políticas Organizacionales (Guía 5)',
    nucleoAsociado: 'Clima Organizacional & Bienestar Laboral',
    pesoRecomendado: 14,
    puntajePredeterminado: 92,
    retroalimentacionPredeterminada:
      'Propuestas sólidas de bienestar y clima laboral fundamentadas en la medición de Luc Brunet. Políticas organizacionales coherentes con la cultura formativa.',
  },
  {
    codigo: '21020103304',
    descripcion:
      'Evaluar el desarrollo del programa de salud ocupacional de acuerdo con las normas técnicas, de calidad y legales vigentes.',
    tituloCorto: 'Programa de seguridad y salud en el trabajo (SG-SST)',
    asociacionTrabajoRealizado:
      'Articulado con el Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST - Guía 6 bajo Decreto 1072/2015 y Res. 0312/2019), matriz de identificación de peligros y valoración de riesgos (GTC 45), plan de emergencias y protocolos de bioseguridad ocupacional.',
    herramientasArticuladas:
      'Matriz de Riesgos SG-SST (GTC 45), Plan de Emergencias, Protocolos de Bioseguridad y Salud Ocupacional (Guía 6)',
    nucleoAsociado: 'Seguridad y Salud en el Trabajo (SG-SST)',
    pesoRecomendado: 11,
    puntajePredeterminado: 94,
    retroalimentacionPredeterminada:
      'Matriz GTC 45 y programa de salud ocupacional estructurados conforme a los estándares mínimos del Decreto 1072/2015 y la Resolución 0312/2019.',
  },
  {
    codigo: '21060101402',
    descripcion:
      'Evaluar social y económicamente las alternativas de solución propuestas a la decisión, teniendo en cuenta la ponderación, criterios técnicos, el resultado que se persiga, las metodologías y tecnología disponible.',
    tituloCorto: 'Evaluación socioeconómica y alternativas estratégicas de decisión',
    asociacionTrabajoRealizado:
      'Fundamentado en la formulación de la Matriz DOFA Cruzada (FO, DO, FA, DA), la Matriz PEYEA (vector direccional cartesiano), la Matriz BCG de cartera de productos y la evaluación financiera de rentabilidad (TIR = 28.4%, VPN = $42.8M COP, análisis vertical/horizontal y 12 razones financieras del informe de gestión contable Guías 12 a 15).',
    herramientasArticuladas:
      'Matriz DOFA Cruzada, Matriz PEYEA Vectorial, Matriz BCG, Evaluación Financiera TIR / VPN / Razones (Guías 12-15)',
    nucleoAsociado: 'Estrategias DOFA, PEYEA & Evaluación Financiera',
    pesoRecomendado: 15,
    puntajePredeterminado: 96,
    retroalimentacionPredeterminada:
      'Excelente evaluación socioeconómica y financiera. Las alternativas de solución de la DOFA y PEYEA se sustentan en indicadores de rentabilidad TIR y VPN demostrables.',
  },
  {
    codigo: '21060101403',
    descripcion:
      'Verificar y caracterizar los procesos y procedimientos administrativos y de logística empresarial, en la toma de decisiones para el logro de los resultados, utilizando metodologías matemáticas y de simulación, teniendo en cuenta la tecnología disponible y la legislación vigente.',
    tituloCorto: 'Procesos administrativos, logística empresarial y simulación matemática',
    asociacionTrabajoRealizado:
      'Sustentado en la Matriz de Perfil Competitivo (MPC), el Análisis Macroentorno PESTA, la caracterización de la cadena de suministro y logística de distribución física (Guía 11), control de inventarios PEPS/Kárdex en Excel y fichas técnicas de indicadores logísticos y operacionales (Nivel de servicio OTIF 95% e índice de mermas 1.5%).',
    herramientasArticuladas:
      'Matriz MPC Ponderada, Análisis PESTA, Cadena de Suministro (Guía 11), Indicadores Operacionales OTIF y Mermas (IND-PRO-01/02)',
    nucleoAsociado: 'Logística, Simulación Matemática MPC & Operaciones',
    pesoRecomendado: 15,
    puntajePredeterminado: 94,
    retroalimentacionPredeterminada:
      'Caracterización rigurosa de los procesos logísticos y administrativos. Uso adecuado de simulaciones matemáticas en MPC e indicadores operacionales OTIF.',
  },
];

/**
 * Convierte las definiciones maestras de competencias en los criterios evaluables del instructor
 */
export const buildInitialInstructorCriteria = (evaluated: boolean = false): InstructorCriteria[] => {
  return SENA_COMPETENCIAS_ORGANIZACIONALES.map((comp) => ({
    id: `crit-comp-${comp.codigo}`,
    rapCode: comp.codigo,
    title: comp.tituloCorto,
    description: comp.descripcion,
    asociacionTrabajoRealizado: comp.asociacionTrabajoRealizado,
    nucleoAsociado: comp.nucleoAsociado,
    toolsIncluded: comp.herramientasArticuladas,
    weight: comp.pesoRecomendado,
    score: evaluated ? comp.puntajePredeterminado : 0,
    status: evaluated ? 'Cumple' : 'Pendiente de Evaluación',
    feedback: evaluated
      ? comp.retroalimentacionPredeterminada
      : 'Pendiente de evaluación y retroalimentación técnica por el instructor asignado.',
  }));
};

export interface StepCompetencyMapping {
  stepNumber: number;
  stepName: string;
  stepShortTitle: string;
  competenciaCodigos: string[];
  descripcionAporte: string;
  evidenciasEsperadas: string[];
}

export const STEP_COMPETENCY_MAPPINGS: StepCompetencyMapping[] = [
  {
    stepNumber: 1,
    stepName: 'Paso 1: Caracterización del Proyecto Formativo',
    stepShortTitle: 'Registro & Plataforma Estratégica',
    competenciaCodigos: ['21060100303', '21060100905'],
    descripcionAporte:
      'Establece la base legal, la plataforma estratégica (Misión, Visión, Valores) y el equipo colaborativo GAES con asignación de roles directivos y operativos.',
    evidenciasEsperadas: [
      'Razón social, NIT, tipo societario (S.A.S.) y actividad económica CIIU',
      'Plataforma estratégica formalizada (Misión, Visión, Valores rectores)',
      'Acta de conformación del GAES con roles distribuidos y funciones iniciales',
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Paso 2: Insumos Previos y Diagnóstico (Guías 1 a 15)',
    stepShortTitle: 'Diagnóstico & Evidencias Documentales',
    competenciaCodigos: ['21010100503', '21060100905', '21020103304', '21060101402', '21060101403'],
    descripcionAporte:
      'Valida y carga documentos de soporte técnico (Word y PDF) de talento humano, clima Luc Brunet, SG-SST GTC 45, cadena de suministros e informe de gestión contable con TIR y VPN.',
    evidenciasEsperadas: [
      'Cód. 21010100503: Manuales de funciones, perfiles de cargo y evaluación de competencias (Guías 4 y 6)',
      'Cód. 21060100905: Diagnóstico de clima laboral Luc Brunet y plan de bienestar (Guía 5)',
      'Cód. 21020103304: Matriz de riesgos SG-SST (GTC 45) y programa de salud ocupacional (Guía 6)',
      'Cód. 21060101403: Caracterización de inventarios, compras y cadena de suministro (Guía 11)',
      'Cód. 21060101402: Informe de gestión contable, presupuesto maestro y viabilidad TIR/VPN (Guías 12 a 15)',
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Paso 3: Diagnóstico y Matrices Estratégicas (Guía 16)',
    stepShortTitle: 'Matrices Diagnósticas & Matemáticas',
    competenciaCodigos: ['21060100904', '21060101402', '21060101403'],
    descripcionAporte:
      'Estructura el diagnóstico situacional con formulación matemática estricta: MEFI (Σ=1.00), MEFE (Σ=1.00), DOFA Cruzada, PEYEA Vectorial, MPC y PESTA.',
    evidenciasEsperadas: [
      'Cód. 21060100904: Evaluación interna y externa con MEFI y MEFE ponderadas a 1.00 vinculadas a calidad',
      'Cód. 21060101402: Formulación de estrategias de solución en DOFA (FO, DO, FA, DA) y vector PEYEA',
      'Cód. 21060101403: Metodología matemática y simulación en Matriz de Perfil Competitivo (MPC) y PESTA',
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Paso 4: Cuadro de Mando Integral - Balanced Scorecard',
    stepShortTitle: 'BSC & Indicadores KPI en 4 Perspectivas',
    competenciaCodigos: ['21060100303', '21010100503', '21060101403'],
    descripcionAporte:
      'Traduce las estrategias en objetivos medibles bajo las 4 perspectivas de Kaplan & Norton, con indicadores KPI, metas anuales, iniciativas con presupuesto en COP y responsables.',
    evidenciasEsperadas: [
      'Cód. 21060100303: Objetivos estratégicos, iniciativas presupuestadas y mapa causa-efecto del BSC',
      'Cód. 21010100503: Indicador de formación y rendimiento de talento humano (IND-APR-01)',
      'Cód. 21060101403: Fichas técnicas de indicadores operacionales y logísticos (IND-PRO-01 e IND-PRO-02 OTIF)',
    ],
  },
  {
    stepNumber: 5,
    stepName: 'Paso 5: Auditoría de Coherencia y Validación',
    stepShortTitle: 'Auditoría & Consolidación Final',
    competenciaCodigos: ['21060100303', '21060100904', '21060101402'],
    descripcionAporte:
      'Audita la consistencia algorítmica de todo el modelo, ajusta desviaciones en el plan de mejoramiento, valida el libro Excel (.xlsx) y consolida las 7 competencias para la sustentación.',
    evidenciasEsperadas: [
      'Cód. 21060100303: Calibración y ajuste del plan de mejoramiento organizacional mediante auditoría',
      'Consolidación de las 7 competencias organizacionales para emisión del Acta Oficial SENA',
      'Descarga del formato oficial del Cuadro de Mando Integral (.xlsx) diligenciado por el GAES',
    ],
  },
];

export interface CompetencyProgressDetail {
  codigo: string;
  tituloCorto: string;
  descripcion: string;
  nucleoAsociado: string;
  herramientasArticuladas: string;
  asociacionTrabajoRealizado: string;
  peso: number;
  progressPercent: number; // 0 - 100
  status: 'Completada' | 'En Progreso' | 'Pendiente';
  pasosDondeSeAborda: number[];
  evidenciasCumplidas: string[];
}

export interface CompetenciesProgressReport {
  overallPercentage: number; // 0 - 100
  competenciesCompletedCount: number;
  competenciesInProgressCount: number;
  competenciesPendingCount: number;
  details: CompetencyProgressDetail[];
  stepDetails: {
    stepNumber: number;
    stepName: string;
    stepShortTitle: string;
    competencias: CompetencyProgressDetail[];
    completedCount: number;
    totalCount: number;
  }[];
}

/**
 * Calcula dinámicamente el progreso de las 7 competencias de la Guía 16 en base a las evidencias del GAES
 */
export const calculateCompetenciesProgress = (project: any): CompetenciesProgressReport => {
  const deliverables = project.learningGuidesDeliverables || [];
  const compliantDeliverablesCount = deliverables.filter((d: any) => d.cumple).length;
  const isDeliverablesPassed = compliantDeliverablesCount >= (deliverables.length * 0.7);

  // Checks
  const hasCompany = Boolean(project.company?.name && project.company?.nit);
  const hasMissionVision = Boolean(
    project.priorGuides?.missionVisionOriginal?.mission || project.company?.valueProposition
  );
  const mefiLen = project.mefi?.length || 0;
  const mefeLen = project.mefe?.length || 0;
  const mefiWeightSum = Number((project.mefi || []).reduce((a: number, b: any) => a + (b.weight || 0), 0).toFixed(2));
  const mefeWeightSum = Number((project.mefe || []).reduce((a: number, b: any) => a + (b.weight || 0), 0).toFixed(2));
  const isMefiValid = Math.abs(mefiWeightSum - 1.0) < 0.05 && mefiLen > 0;
  const isMefeValid = Math.abs(mefeWeightSum - 1.0) < 0.05 && mefeLen > 0;
  const hasDofa = (project.dofa?.length || 0) > 0;
  const hasPeyea = Boolean(project.peyea?.quadrant);
  const hasMpc = (project.mpc?.competitors?.length || 0) > 0 || (project.mpc?.factors?.length || 0) > 0;
  const bscCount = project.bscObjectives?.length || 0;
  const bscWithBudget = (project.bscObjectives || []).filter((o: any) => (o.estimatedBudgetCOP || 0) > 0).length;
  const indCount = project.indicators?.length || 0;
  const isMatricesValidated = Boolean(project.isMatricesValidated);

  // 1. Cód 21060100303: Plan de mejoramiento & BSC
  let p1 = 0;
  const ev1: string[] = [];
  if (hasCompany) { p1 += 15; ev1.push('Caracterización institucional y políticas iniciales'); }
  if (bscCount >= 4) { p1 += 45; ev1.push(`${bscCount} Objetivos estratégicos formulados en las 4 perspectivas`); }
  if (bscWithBudget >= 2) { p1 += 20; ev1.push('Iniciativas estratégicas con presupuesto COP asignado'); }
  if (project.currentStep >= 5 || bscCount >= 6) { p1 += 20; ev1.push('Auditoría de consistencia y plan de mejora validado'); }
  p1 = Math.min(100, p1);

  // 2. Cód 21010100503: Gestión del talento & rendimiento
  let p2 = 0;
  const ev2: string[] = [];
  const thDeliverables = deliverables.filter((d: any) => d.grupo === 'Talento Humano' && d.cumple).length;
  if (thDeliverables >= 5 || isDeliverablesPassed) { p2 += 60; ev2.push('Macroprocesos y manuales de talento humano (Guías 4 a 6)'); }
  if (indCount > 0 || bscCount > 0) { p2 += 40; ev2.push('Ficha técnica de indicador de capacitación y desempeño (IND-APR-01)'); }
  p2 = Math.min(100, p2);

  // 3. Cód 21060100904: Diagnóstico y calidad
  let p3 = 0;
  const ev3: string[] = [];
  if (deliverables.filter((d: any) => d.grupo === 'Planeación Estratégica' && d.cumple).length >= 3) {
    p3 += 30; ev3.push('Diagnóstico de entorno y plataforma estratégica');
  }
  if (isMefiValid && isMefeValid) {
    p3 += 70; ev3.push('Matrices MEFI y MEFE con sumatoria exacta (1.00) y factores de calidad');
  } else if (mefiLen > 0 || mefeLen > 0) {
    p3 += 40; ev3.push('Factores MEFI y MEFE en parametrización');
  }
  p3 = Math.min(100, p3);

  // 4. Cód 21060100905: Clima organizacional Luc Brunet
  let p4 = 0;
  const ev4: string[] = [];
  if (project.apprentices?.length >= 2) { p4 += 20; ev4.push('Conformación del equipo de trabajo GAES'); }
  const climaDeliverable = deliverables.find((d: any) => d.id === 'g5-p1' || d.descripcion?.toLowerCase().includes('clima'));
  if (climaDeliverable?.cumple || isDeliverablesPassed) {
    p4 += 80; ev4.push('Estudio de clima organizacional modelo Luc Brunet (Guía 5)');
  } else {
    p4 += 40; ev4.push('Políticas de convivencia y bienestar en formulación');
  }
  p4 = Math.min(100, p4);

  // 5. Cód 21020103304: Salud ocupacional SG-SST GTC 45
  let p5 = 0;
  const ev5: string[] = [];
  const sstDeliverable = deliverables.find((d: any) => d.id === 'g6-p1' || d.descripcion?.toLowerCase().includes('sst') || d.descripcion?.toLowerCase().includes('seguridad'));
  if (sstDeliverable?.cumple || isDeliverablesPassed) {
    p5 = 100; ev5.push('Matriz de riesgos GTC 45 y programa de salud ocupacional (Dec. 1072/2015)');
  } else {
    p5 = 50; ev5.push('Revisión preliminar de riesgos laborales');
  }

  // 6. Cód 21060101402: Evaluación socioeconómica y alternativas
  let p6 = 0;
  const ev6: string[] = [];
  const contDeliverables = deliverables.filter((d: any) => d.grupo === 'Contabilidad' && d.cumple).length;
  if (contDeliverables >= 3 || isDeliverablesPassed) { p6 += 30; ev6.push('Informe de gestión contable, presupuesto y TIR/VPN'); }
  if (hasDofa) { p6 += 35; ev6.push('Estrategias cruzadas FO, DO, FA, DA formuladas en DOFA'); }
  if (hasPeyea) { p6 += 35; ev6.push('Evaluación vectorial PEYEA y cuadrante estratégico'); }
  p6 = Math.min(100, p6);

  // 7. Cód 21060101403: Procesos, logística y simulación
  let p7 = 0;
  const ev7: string[] = [];
  const invDeliverables = deliverables.filter((d: any) => d.grupo === 'Inventarios' && d.cumple).length;
  if (invDeliverables >= 3 || isDeliverablesPassed) { p7 += 30; ev7.push('Cadena de suministro y gestión de inventarios PEPS'); }
  if (hasMpc) { p7 += 35; ev7.push('Matriz de Perfil Competitivo (MPC) con ponderación matemática'); }
  if (indCount >= 2 || bscCount >= 4) { p7 += 35; ev7.push('Fichas de indicadores operacionales (OTIF y control de mermas)'); }
  p7 = Math.min(100, p7);

  const progressMap: Record<string, { pct: number; ev: string[] }> = {
    '21060100303': { pct: p1, ev: ev1 },
    '21010100503': { pct: p2, ev: ev2 },
    '21060100904': { pct: p3, ev: ev3 },
    '21060100905': { pct: p4, ev: ev4 },
    '21020103304': { pct: p5, ev: ev5 },
    '21060101402': { pct: p6, ev: ev6 },
    '21060101403': { pct: p7, ev: ev7 },
  };

  const details: CompetencyProgressDetail[] = SENA_COMPETENCIAS_ORGANIZACIONALES.map((comp) => {
    const data = progressMap[comp.codigo] || { pct: 80, ev: [] };
    const pct = data.pct;
    const status: 'Completada' | 'En Progreso' | 'Pendiente' =
      pct >= 85 ? 'Completada' : pct >= 30 ? 'En Progreso' : 'Pendiente';

    // Steps mapping
    const pasosDondeSeAborda = STEP_COMPETENCY_MAPPINGS.filter((m) =>
      m.competenciaCodigos.includes(comp.codigo)
    ).map((m) => m.stepNumber);

    return {
      codigo: comp.codigo,
      tituloCorto: comp.tituloCorto,
      descripcion: comp.descripcion,
      nucleoAsociado: comp.nucleoAsociado,
      herramientasArticuladas: comp.herramientasArticuladas,
      asociacionTrabajoRealizado: comp.asociacionTrabajoRealizado,
      peso: comp.pesoRecomendado,
      progressPercent: pct,
      status,
      pasosDondeSeAborda,
      evidenciasCumplidas: data.ev,
    };
  });

  const totalWeight = details.reduce((acc, c) => acc + c.peso, 0);
  const weightedSum = details.reduce((acc, c) => acc + (c.progressPercent * c.peso), 0);
  const overallPercentage = Math.round(weightedSum / (totalWeight || 100));

  const competenciesCompletedCount = details.filter((d) => d.status === 'Completada').length;
  const competenciesInProgressCount = details.filter((d) => d.status === 'En Progreso').length;
  const competenciesPendingCount = details.filter((d) => d.status === 'Pendiente').length;

  const stepDetails = STEP_COMPETENCY_MAPPINGS.map((step) => {
    const competenciasInStep = details.filter((d) => step.competenciaCodigos.includes(d.codigo));
    const completedCount = competenciasInStep.filter((c) => c.status === 'Completada').length;
    return {
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      stepShortTitle: step.stepShortTitle,
      competencias: competenciasInStep,
      completedCount,
      totalCount: competenciasInStep.length,
    };
  });

  return {
    overallPercentage,
    competenciesCompletedCount,
    competenciesInProgressCount,
    competenciesPendingCount,
    details,
    stepDetails,
  };
};
