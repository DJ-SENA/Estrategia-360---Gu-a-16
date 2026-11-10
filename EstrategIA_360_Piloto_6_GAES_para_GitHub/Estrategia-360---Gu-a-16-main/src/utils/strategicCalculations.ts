import {
  MEFIItem,
  MEFEItem,
  PEYEAMatrix,
  MPCMatrix,
  StrategicAuditResult,
  GAESProject,
  AuditFinding,
} from '../types';

export function calculateMEFIScore(items: MEFIItem[]): {
  totalWeight: number;
  weightedScore: number;
  strengthsScore: number;
  weaknessesScore: number;
  interpretation: string;
} {
  const totalWeight = Number(items.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const weightedScore = Number(
    items.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );
  
  const strengths = items.filter((i) => i.type === 'Fortaleza');
  const weaknesses = items.filter((i) => i.type === 'Debilidad');
  
  const strengthsScore = Number(
    strengths.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );
  const weaknessesScore = Number(
    weaknesses.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );

  let interpretation = '';
  if (weightedScore >= 2.8) {
    interpretation = 'Posición interna sólida. La organización capitaliza eficazmente sus fortalezas para superar debilidades.';
  } else if (weightedScore >= 2.5) {
    interpretation = 'Posición interna promedio. La organización mantiene equilibrio pero debe priorizar la corrección de debilidades críticas.';
  } else {
    interpretation = 'Posición interna vulnerable. Las debilidades internas predominan y comprometen la competitividad del proyecto.';
  }

  return { totalWeight, weightedScore, strengthsScore, weaknessesScore, interpretation };
}

export function calculateMEFEScore(items: MEFEItem[]): {
  totalWeight: number;
  weightedScore: number;
  opportunitiesScore: number;
  threatsScore: number;
  interpretation: string;
} {
  const totalWeight = Number(items.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const weightedScore = Number(
    items.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );
  
  const opportunities = items.filter((i) => i.type === 'Oportunidad');
  const threats = items.filter((i) => i.type === 'Amenaza');

  const opportunitiesScore = Number(
    opportunities.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );
  const threatsScore = Number(
    threats.reduce((acc, curr) => acc + curr.weight * curr.rating, 0).toFixed(2)
  );

  let interpretation = '';
  if (weightedScore >= 2.8) {
    interpretation = 'Respuesta externa sobresaliente. Las estrategias del proyecto aprovechan eficazmente las oportunidades y mitigan amenazas.';
  } else if (weightedScore >= 2.5) {
    interpretation = 'Respuesta externa media. Se atienden factores del entorno pero existen amenazas latentes con baja preparación.';
  } else {
    interpretation = 'Respuesta externa deficiente. El proyecto está expuesto a choques del entorno macro y micro sin planes de contingencia.';
  }

  return { totalWeight, weightedScore, opportunitiesScore, threatsScore, interpretation };
}

export function calculatePEYEACoordinates(matrix: PEYEAMatrix): PEYEAMatrix {
  const avgFF = Number(
    (matrix.financialStrength.reduce((acc, curr) => acc + curr.score, 0) /
      (matrix.financialStrength.length || 1)).toFixed(2)
  );
  const avgVC = Number(
    (matrix.competitiveAdvantage.reduce((acc, curr) => acc + curr.score, 0) /
      (matrix.competitiveAdvantage.length || 1)).toFixed(2)
  );
  const avgEA = Number(
    (matrix.environmentalStability.reduce((acc, curr) => acc + curr.score, 0) /
      (matrix.environmentalStability.length || 1)).toFixed(2)
  );
  const avgFI = Number(
    (matrix.industryStrength.reduce((acc, curr) => acc + curr.score, 0) /
      (matrix.industryStrength.length || 1)).toFixed(2)
  );

  // X axis: VC + FI
  const coordinateX = Number((avgVC + avgFI).toFixed(2));
  // Y axis: EA + FF
  const coordinateY = Number((avgEA + avgFF).toFixed(2));

  let quadrant: 'Agresivo' | 'Conservador' | 'Defensivo' | 'Competitivo' = 'Agresivo';
  let interpretation = '';

  if (coordinateX >= 0 && coordinateY >= 0) {
    quadrant = 'Agresivo';
    interpretation = 'Postura Agresiva: Organización financieramente fuerte con ventajas competitivas relevantes en una industria atractiva. Estrategias: penetración de mercado, desarrollo de productos, integración vertical y expansión.';
  } else if (coordinateX < 0 && coordinateY >= 0) {
    quadrant = 'Conservador';
    interpretation = 'Postura Conservadora: Estabilidad financiera en industria de crecimiento moderado, con ventajas competitivas por consolidar. Estrategias: desarrollo de mercado, diversificación concéntrica y mejora de márgenes.';
  } else if (coordinateX < 0 && coordinateY < 0) {
    quadrant = 'Defensivo';
    interpretation = 'Postura Defensiva: La empresa enfrenta debilidades internas y entorno inestable. Estrategias: reducción de costos, atrincheramiento, desinversión de líneas no rentables y alianzas de rescate.';
  } else {
    quadrant = 'Competitivo';
    interpretation = 'Postura Competitiva: Ventaja competitiva alta en industria dinámica pero con recursos financieros ajustados. Estrategias: alianzas estratégicas, liderazgo en costos, diferenciación de nicho e integración hacia adelante.';
  }

  return {
    ...matrix,
    avgFF,
    avgVC,
    avgEA,
    avgFI,
    coordinateX,
    coordinateY,
    quadrant,
    interpretation,
  };
}

export function calculateMPCScores(mpc: MPCMatrix): {
  totalWeight: number;
  companyScore: number;
  comp1Score: number;
  comp2Score: number;
  ranking: { name: string; score: number; rank: number }[];
} {
  const totalWeight = Number(mpc.factors.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const companyScore = Number(
    mpc.factors.reduce((acc, curr) => acc + curr.weight * curr.companyRating, 0).toFixed(2)
  );
  const comp1Score = Number(
    mpc.factors.reduce((acc, curr) => acc + curr.weight * curr.competitor1Rating, 0).toFixed(2)
  );
  const comp2Score = Number(
    mpc.factors.reduce((acc, curr) => acc + curr.weight * curr.competitor2Rating, 0).toFixed(2)
  );

  const list = [
    { name: 'Empresa Proyecto', score: companyScore },
    { name: mpc.competitor1Name || 'Competidor 1', score: comp1Score },
    { name: mpc.competitor2Name || 'Competidor 2', score: comp2Score },
  ].sort((a, b) => b.score - a.score);

  const ranking = list.map((item, idx) => ({ ...item, rank: idx + 1 }));

  return { totalWeight, companyScore, comp1Score, comp2Score, ranking };
}

export function runStrategicAudit(project: GAESProject): StrategicAuditResult {
  const findings: AuditFinding[] = [];
  let score = 100;

  // 1. MEFI weights check
  const mefiWeight = Number(project.mefi.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const isMefiValid = Math.abs(mefiWeight - 1.0) < 0.02;
  if (!isMefiValid) {
    score -= 15;
    findings.push({
      id: 'audit-mefi-weight',
      type: 'critico',
      category: 'MEFI/MEFE',
      message: `La sumatoria de ponderaciones en la MEFI es ${mefiWeight.toFixed(2)} (debe ser exactamente 1.00)`,
      detail: 'En la Guía 16 del SENA, los pesos relativos de la MEFI representan el 100% de la importancia de los factores internos.',
      suggestion: 'Ajusta los pesos de cada fortaleza y debilidad para que sumen exactamente 1.00.',
    });
  } else {
    findings.push({
      id: 'audit-mefi-ok',
      type: 'exito',
      category: 'MEFI/MEFE',
      message: 'Sumatoria de pesos en la matriz MEFI balanceada en 1.00.',
      detail: `MEFI Ponderado total: ${project.mefi.reduce((a, b) => a + b.weight * b.rating, 0).toFixed(2)}`,
      suggestion: 'Consistencia matemática interna validada.',
    });
  }

  // 2. MEFE weights check
  const mefeWeight = Number(project.mefe.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const isMefeValid = Math.abs(mefeWeight - 1.0) < 0.02;
  if (!isMefeValid) {
    score -= 15;
    findings.push({
      id: 'audit-mefe-weight',
      type: 'critico',
      category: 'MEFI/MEFE',
      message: `La sumatoria de ponderaciones en la MEFE es ${mefeWeight.toFixed(2)} (debe ser exactamente 1.00)`,
      detail: 'La matriz MEFE exige que los pesos asignados a oportunidades y amenazas sumen exactamente la unidad.',
      suggestion: 'Revisa y redistribuye los pesos en la matriz MEFE hasta completar 1.00.',
    });
  } else {
    findings.push({
      id: 'audit-mefe-ok',
      type: 'exito',
      category: 'MEFI/MEFE',
      message: 'Sumatoria de pesos en la matriz MEFE balanceada en 1.00.',
      detail: `MEFE Ponderado total: ${project.mefe.reduce((a, b) => a + b.weight * b.rating, 0).toFixed(2)}`,
      suggestion: 'Consistencia matemática externa validada.',
    });
  }

  // 3. MPC weights check
  const mpcWeight = Number(project.mpc.factors.reduce((acc, curr) => acc + curr.weight, 0).toFixed(2));
  const isMpcValid = Math.abs(mpcWeight - 1.0) < 0.02;
  if (!isMpcValid) {
    score -= 10;
    findings.push({
      id: 'audit-mpc-weight',
      type: 'advertencia',
      category: 'MEFI/MEFE',
      message: `Los pesos de la Matriz del Perfil Competitivo (MPC) suman ${mpcWeight.toFixed(2)}`,
      detail: 'Los factores críticos de éxito deben totalizar 1.00 para una ponderación comparativa equitativa.',
      suggestion: 'Revisa las ponderaciones de los factores competitivos en la MPC.',
    });
  }

  // 4. Coherence between MEFI/MEFE and PEYEA Quadrant
  const mefiScore = project.mefi.reduce((a, b) => a + b.weight * b.rating, 0);
  const mefeScore = project.mefe.reduce((a, b) => a + b.weight * b.rating, 0);
  const peyeaQuadrant = project.peyea.quadrant;

  let coherentPEYEA = true;
  let peyeaExplanation = '';

  if (mefiScore < 2.3 && peyeaQuadrant === 'Agresivo') {
    coherentPEYEA = false;
    score -= 15;
    findings.push({
      id: 'audit-peyea-mefi-mismatch',
      type: 'critico',
      category: 'PEYEA',
      message: 'Inconsistencia metodológica: MEFI débil (< 2.3) con cuadrante PEYEA Agresivo.',
      detail: 'Una organización con posición interna débil no posee la fuerza operativa ni financiera para adoptar una postura agresiva de expansión.',
      suggestion: 'Revalúa las calificaciones de Fuerza Financiera (FF) y Ventaja Competitiva (VC) en PEYEA o revisa las debilidades en MEFI.',
    });
    peyeaExplanation = 'Discrepancia detectada entre diagnóstico interno y postura estratégica PEYEA.';
  } else if (mefeScore < 2.3 && peyeaQuadrant === 'Agresivo') {
    coherentPEYEA = false;
    score -= 10;
    findings.push({
      id: 'audit-peyea-mefe-mismatch',
      type: 'advertencia',
      category: 'PEYEA',
      message: 'Atención: MEFE con baja respuesta al entorno (< 2.3) pero postura Agresiva.',
      detail: 'El entorno presenta amenazas no controladas. Una postura agresiva en un entorno adverso requiere contingencias estrictas.',
      suggestion: 'Verifica los factores de Estabilidad Ambiental (EA) en la matriz PEYEA.',
    });
    peyeaExplanation = 'Entorno hostil requiere cautela en estrategias agresivas.';
  } else {
    peyeaExplanation = `La postura PEYEA (${peyeaQuadrant}) es coherente con los resultados MEFI (${mefiScore.toFixed(2)}) y MEFE (${mefeScore.toFixed(2)}).`;
    findings.push({
      id: 'audit-peyea-ok',
      type: 'exito',
      category: 'PEYEA',
      message: `Alineación confirmada entre PEYEA (${peyeaQuadrant}), MEFI y MEFE.`,
      detail: peyeaExplanation,
      suggestion: 'La dirección estratégica guarda correlación lógica.',
    });
  }

  // 5. BSC traceability check (Do all BSC objectives have matrix origins?)
  const totalBSCObjectives = project.bscObjectives.length;
  const tracedObjectives = project.bscObjectives.filter(
    (obj) => obj.matrixOrigin && obj.matrixOrigin.trim().length > 5
  );
  const coveragePercent = totalBSCObjectives > 0 ? Math.round((tracedObjectives.length / totalBSCObjectives) * 100) : 0;

  if (coveragePercent < 80) {
    score -= 15;
    findings.push({
      id: 'audit-bsc-traceability',
      type: 'critico',
      category: 'BSC Causa-Efecto',
      message: `Solo el ${coveragePercent}% de los objetivos del BSC justifican su origen en las matrices.`,
      detail: 'En la Guía 16, cada objetivo del Cuadro de Mando Integral debe derivarse de la DOFA, PEYEA o BCG. No pueden surgir objetivos aislados.',
      suggestion: 'Vincula cada objetivo con la estrategia FO, DO, FA, DA o el cuadrante PEYEA correspondiente.',
    });
  } else {
    findings.push({
      id: 'audit-bsc-trace-ok',
      type: 'exito',
      category: 'BSC Causa-Efecto',
      message: `Excelente trazabilidad: ${coveragePercent}% de los objetivos del BSC sustentados en matrices.`,
      detail: `${tracedObjectives.length} de ${totalBSCObjectives} objetivos documentan su fuente estratégica.`,
      suggestion: 'Cumplimiento estricto del principio de articulación de la Guía 16.',
    });
  }

  // 6. Indicators completeness (Does each BSC objective have an indicator sheet?)
  const objectiveIdsWithIndicators = new Set(project.indicators.map((i) => i.associatedObjectiveId));
  const objectivesWithoutKPI = project.bscObjectives.filter((obj) => !objectiveIdsWithIndicators.has(obj.id));

  if (objectivesWithoutKPI.length > 0) {
    score -= 10;
    findings.push({
      id: 'audit-orphan-objectives',
      type: 'advertencia',
      category: 'Indicadores',
      message: `${objectivesWithoutKPI.length} objetivos del BSC no tienen Hoja de Vida de Indicador vinculada.`,
      detail: `Objetivos sin medición: ${objectivesWithoutKPI.map((o) => o.code).join(', ')}. Lo que no se mide, no se puede gestionar.`,
      suggestion: 'Crea la ficha técnica (Hoja de Vida) del indicador con fórmula, periodicidad y rangos de semaforización.',
    });
  } else {
    findings.push({
      id: 'audit-kpi-ok',
      type: 'exito',
      category: 'Indicadores',
      message: 'Todos los objetivos estratégicos cuentan con Hoja de Vida de Indicador asignada.',
      detail: `${project.indicators.length} indicadores formulados con fórmula matemática y metas semaforizadas.`,
      suggestion: 'Evidencia técnica completa para la Guía 16.',
    });
  }

  // 7. Perspective Balance in BSC
  const perspectivesCovered = new Set(project.bscObjectives.map((o) => o.perspective));
  if (perspectivesCovered.size < 4) {
    score -= 10;
    findings.push({
      id: 'audit-perspective-balance',
      type: 'advertencia',
      category: 'BSC Causa-Efecto',
      message: `El Balanced Scorecard no cubre las 4 perspectivas (solo tiene ${perspectivesCovered.size} de 4).`,
      detail: 'El CMI de Kaplan & Norton requiere visión integral: Financiera, Clientes, Procesos y Aprendizaje/Crecimiento.',
      suggestion: 'Formula al menos un objetivo estratégico en las perspectivas faltantes.',
    });
  }

  // 8. Learning Guides Deliverables Check (Insumos previos obligatorios)
  if (project.learningGuidesDeliverables && project.learningGuidesDeliverables.length > 0) {
    const unfulfilled = project.learningGuidesDeliverables.filter((d) => !d.cumple);
    if (unfulfilled.length > 0) {
      score -= 20;
      findings.push({
        id: 'audit-prior-deliverables-unfulfilled',
        type: 'critico',
        category: 'Datos Previos',
        message: `${unfulfilled.length} entregable(s) de las guías de formación previas no cumplen los parámetros.`,
        detail: `Incumplimiento detectado en: ${Array.from(new Set(unfulfilled.map((u) => `Guía ${u.guiaNumero}`))).join(', ')}. No se puede consolidar la Guía 16 sin completar los insumos base.`,
        suggestion: 'Ingresa a Insumos Previos (Paso 2) y verifica los entregables pendientes en Planeación Estratégica, Talento Humano, Mercadeo, Inventarios y Contabilidad.',
      });
    } else {
      findings.push({
        id: 'audit-prior-deliverables-ok',
        type: 'exito',
        category: 'Datos Previos',
        message: '100% de los entregables de las guías previas cumplidos y validados.',
        detail: 'Los productos de Planeación, Talento Humano, Mercadeo, Inventarios y Contabilidad alimentan coherentemente las matrices.',
        suggestion: 'Articulación curricular completa según lineamientos SENA.',
      });
    }
  }

  score = Math.max(0, Math.min(100, score));

  let pedagogicalAdvice = '';
  if (score >= 90) {
    pedagogicalAdvice = 'Proyecto con excelencia metodológica. Las matrices guardan rigor aritmético y el Balanced Scorecard refleja una articulación causa-efecto impecable acorde a los lineamientos SENA.';
  } else if (score >= 70) {
    pedagogicalAdvice = 'Proyecto viable con buen avance. Se sugiere revisar las advertencias señaladas para asegurar el 100% de coherencia antes de la sustentación final ante el instructor.';
  } else {
    pedagogicalAdvice = 'Se requiere plan de mejoramiento inmediato. Corregir las sumas de ponderación de las matrices y fundamentar el origen de los objetivos del BSC a partir de los cruces DOFA.';
  }

  return {
    overallScore: score,
    mathematicalCoherence: {
      mefiWeightsSum: mefiWeight,
      mefeWeightsSum: mefeWeight,
      mpcWeightsSum: mpcWeight,
      isMefiValid,
      isMefeValid,
      isMpcValid,
    },
    alignmentPEYEAvsMatrices: {
      coherent: coherentPEYEA,
      explanation: peyeaExplanation,
    },
    bscTraceabilityCoverage: coveragePercent,
    findings,
    pedagogicalAdvice,
  };
}
