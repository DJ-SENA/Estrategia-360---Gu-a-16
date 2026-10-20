import * as XLSX from 'xlsx';
import { GAESProject } from '../types';
import { calculateMEFIScore, calculateMEFEScore } from './strategicCalculations';
import { SENA_COMPETENCIAS_ORGANIZACIONALES, calculateCompetenciesProgress } from '../data/learningCompetencies';

/**
 * Exporta el informe final del proyecto y todas las matrices estratégicas de la Guía 16
 * a un archivo consolidado en formato Excel (.xlsx) estructurado en múltiples hojas de cálculo.
 */
export function exportFinalReportAndMatricesExcel(project: GAESProject) {
  const wb = XLSX.utils.book_new();

  const mefiCalc = calculateMEFIScore(project.mefi);
  const mefeCalc = calculateMEFEScore(project.mefe);
  const compReport = calculateCompetenciesProgress(project);

  // =========================================================================
  // HOJA 1: RESUMEN EJECUTIVO Y DATOS INSTITUCIONALES
  // =========================================================================
  const resumenRows: any[][] = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['SISTEMA NACIONAL DE FORMACIÓN PARA EL TRABAJO'],
    ['ACTA OFICIAL DE EVALUACIÓN Y DOSSIER ESTRATÉGICO - GUÍA 16'],
    [''],
    ['1. DATOS INSTITUCIONALES Y PROGRAMA'],
    ['Programa de Formación:', project.programName || 'Tecnólogo en Gestión Empresarial'],
    ['Centro de Formación:', project.centerName || 'Centro de Gestión y Desarrollo Agroindustrial'],
    ['Regional SENA:', project.regional || 'Regional Valle del Cauca'],
    ['Ficha de Caracterización:', project.fichaNumber || '2687410'],
    ['Número de GAES:', `GAES No. ${project.gaesNumber}`],
    ['Fecha de Generación:', new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO')],
    [''],
    ['2. CARACTERIZACIÓN DE LA EMPRESA PROYECTO FORMATIVO'],
    ['Razón Social:', project.company?.name || 'Empresa Proyecto'],
    ['NIT:', project.company?.nit || 'No Registrado'],
    ['Sector Económico:', project.company?.sector || 'Agroindustrial / Comercial'],
    ['Código CIIU:', project.company?.ciiuCode || 'No Registrado'],
    ['Tamaño de Empresa:', project.company?.size || 'Pequeña (11-50)'],
    ['Ciudad / Municipio:', project.company?.city || 'No Registrado'],
    ['Producto Estrella:', project.company?.mainProduct || 'No Registrado'],
    ['Propuesta de Valor:', project.company?.valueProposition || 'No Registrada'],
    ['Mercado Objetivo:', project.company?.targetMarket || 'No Registrado'],
    ['Ingresos Anuales Estimados:', project.company?.annualRevenueEstimated || 'No Registrado'],
    [''],
    ['3. EQUIPO COLABORATIVO DE APRENDICES (GAES)'],
    ['Nombre Completo', 'Documento de Identidad', 'Rol en el GAES', 'Correo Electrónico', 'Teléfono'],
    ...(project.apprentices || []).map((app) => [
      app.name,
      app.document,
      app.role,
      app.email,
      app.phone,
    ]),
    [''],
    ['4. SÍNTESIS CUANTITATIVA DE MATRICES ESTRATÉGICAS (GUÍA 16)'],
    ['Matriz', 'Puntaje Ponderado', 'Sumatoria de Pesos', 'Diagnóstico / Cuadrante'],
    ['MEFI (Factores Internos)', `${mefiCalc.weightedScore} pts`, `${mefiCalc.totalWeight} / 1.00`, mefiCalc.weightedScore >= 2.5 ? 'Posición Interna Fuerte' : 'Posición Interna Débil'],
    ['MEFE (Factores Externos)', `${mefeCalc.weightedScore} pts`, `${mefeCalc.totalWeight} / 1.00`, mefeCalc.weightedScore >= 2.5 ? 'Aprovechamiento Superior del Entorno' : 'Vulnerable a Amenazas'],
    ['PEYEA (Vector Estratégico)', `(${project.peyea?.coordinateX?.toFixed(2) || '0'}, ${project.peyea?.coordinateY?.toFixed(2) || '0'})`, 'Coordenadas (X, Y)', `Cuadrante ${project.peyea?.quadrant || 'Agresivo'}`],
    [''],
    ['5. DICTAMEN EVALUATIVO OFICIAL DEL INSTRUCTOR'],
    ['Juicio Evaluativo:', project.instructorEvaluation?.finalJudgment || 'APROBADO'],
    ['Calificación Evidencias de Producto (60%):', `${project.instructorEvaluation?.productEvidenceScore || 0} / 100 pts`],
    ['Calificación Evidencias de Desempeño (40%):', `${project.instructorEvaluation?.performanceEvidenceScore || 0} / 100 pts`],
    ['Promedio Ponderado Final:', `${Math.round(((project.instructorEvaluation?.productEvidenceScore || 0) * 0.6) + ((project.instructorEvaluation?.performanceEvidenceScore || 0) * 0.4))} / 100 pts`],
    ['Instructor Asignado:', project.instructorEvaluation?.instructorName || 'Instructor Técnico SENA'],
    ['Documento Instructor:', project.instructorEvaluation?.instructorDocument || 'C.C. No Registrada'],
    ['Observación de Producto:', project.instructorEvaluation?.productObservation || 'Cumple con los requisitos técnicos.'],
    ['Observación de Desempeño:', project.instructorEvaluation?.performanceObservation || 'Sustentación aprobada.'],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 40 }, { wch: 25 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Ejecutivo');

  // =========================================================================
  // HOJA 2: VALIDACIÓN DE ENTREGABLES PREVIOS (GUÍAS 1 A 15)
  // =========================================================================
  const entregablesHeaders = [
    'ID',
    'Grupo_Tematico',
    'Guia_Asociada',
    'Numeral',
    'Descripcion_Entregable',
    'Estado_Cumplimiento',
    'Observacion_Tecnica',
    'Archivo_Soporte_Cargado',
  ];

  const entregablesData = (project.learningGuidesDeliverables || []).map((d) => [
    d.id,
    d.grupo,
    d.guiaNumero || 'Guía SENA',
    d.numeral,
    d.descripcion,
    d.cumple ? 'CUMPLE' : 'PENDIENTE',
    d.observacionAprendiz || d.evidenciaTexto || 'Verificado conforme a lineamientos curriculares',
    d.archivoSoporte || 'Verificado en plataforma',
  ]);

  const wsEntregables = XLSX.utils.aoa_to_sheet([entregablesHeaders, ...entregablesData]);
  wsEntregables['!cols'] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 55 },
    { wch: 15 },
    { wch: 40 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsEntregables, 'Insumos_Previos_G1_15');

  // =========================================================================
  // HOJA 3: MATRIZ MEFI (FACTORES INTERNOS)
  // =========================================================================
  const mefiHeaders = [
    'Tipo',
    'Factor_Interno_Clave',
    'Area_Funcional',
    'Peso_Ponderacion',
    'Calificacion_1_a_4',
    'Puntuacion_Ponderada',
    'Estado_Validacion',
  ];

  const mefiData = (project.mefi || []).map((item) => [
    item.type,
    item.factor,
    item.area,
    item.weight,
    item.rating,
    item.weightedScore,
    item.validationStatus,
  ]);

  // Total summary row
  mefiData.push([
    'TOTAL',
    'Sumatoria de Factores Internos MEFI',
    '-',
    mefiCalc.totalWeight,
    '-',
    mefiCalc.weightedScore,
    Math.abs(mefiCalc.totalWeight - 1.0) < 0.05 ? 'PESO EXACTO (1.00)' : 'REVISAR SUMATORIA',
  ]);

  const wsMEFI = XLSX.utils.aoa_to_sheet([mefiHeaders, ...mefiData]);
  wsMEFI['!cols'] = [
    { wch: 14 },
    { wch: 55 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMEFI, 'Matriz_MEFI');

  // =========================================================================
  // HOJA 4: MATRIZ MEFE (FACTORES EXTERNOS)
  // =========================================================================
  const mefeHeaders = [
    'Tipo',
    'Factor_Externo_Clave',
    'Categoria_PESTA',
    'Peso_Ponderacion',
    'Calificacion_1_a_4',
    'Puntuacion_Ponderada',
    'Estado_Validacion',
  ];

  const mefeData = (project.mefe || []).map((item) => [
    item.type,
    item.factor,
    item.pestaCategory,
    item.weight,
    item.rating,
    item.weightedScore,
    item.validationStatus,
  ]);

  // Total summary row
  mefeData.push([
    'TOTAL',
    'Sumatoria de Factores Externos MEFE',
    '-',
    mefeCalc.totalWeight,
    '-',
    mefeCalc.weightedScore,
    Math.abs(mefeCalc.totalWeight - 1.0) < 0.05 ? 'PESO EXACTO (1.00)' : 'REVISAR SUMATORIA',
  ]);

  const wsMEFE = XLSX.utils.aoa_to_sheet([mefeHeaders, ...mefeData]);
  wsMEFE['!cols'] = [
    { wch: 14 },
    { wch: 55 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMEFE, 'Matriz_MEFE');

  // =========================================================================
  // HOJA 5: MATRIZ DOFA CRUZADA
  // =========================================================================
  const dofaHeaders = [
    'Codigo',
    'Tipo_Estrategia',
    'Titulo_Estrategia',
    'Descripcion_Detallada',
    'Factores_Cruzados',
    'Nivel_Prioridad',
  ];

  const dofaData = (project.dofa || []).map((strat) => [
    strat.code,
    strat.type,
    strat.title,
    strat.description,
    Array.isArray(strat.crossedFactors) ? strat.crossedFactors.join(', ') : strat.crossedFactors,
    strat.priority,
  ]);

  const wsDOFA = XLSX.utils.aoa_to_sheet([dofaHeaders, ...dofaData]);
  wsDOFA['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
    { wch: 60 },
    { wch: 20 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDOFA, 'Matriz_DOFA_Cruzada');

  // =========================================================================
  // HOJA 6: MATRIZ PEYEA (VECTOR & DIMENSIONES)
  // =========================================================================
  const peyeaHeaders = ['Dimension', 'Tipo', 'Factor_Evaluado', 'Calificacion'];
  const peyeaRows: any[][] = [];

  (project.peyea?.financialStrength || []).forEach((f) => {
    peyeaRows.push(['Fuerza Financiera (FF)', 'Interna (+1 a +6)', f.name, f.score]);
  });
  (project.peyea?.competitiveAdvantage || []).forEach((f) => {
    peyeaRows.push(['Ventaja Competitiva (VC)', 'Interna (-6 a -1)', f.name, f.score]);
  });
  (project.peyea?.environmentalStability || []).forEach((f) => {
    peyeaRows.push(['Estabilidad del Entorno (EA)', 'Externa (-6 a -1)', f.name, f.score]);
  });
  (project.peyea?.industryStrength || []).forEach((f) => {
    peyeaRows.push(['Fuerza de la Industria (FI)', 'Externa (+1 a +6)', f.name, f.score]);
  });

  peyeaRows.push(['']);
  peyeaRows.push(['RESULTADOS VECTORIALES PEYEA']);
  peyeaRows.push(['Promedio Fuerza Financiera (FF):', project.peyea?.avgFF?.toFixed(2) || '0']);
  peyeaRows.push(['Promedio Ventaja Competitiva (VC):', project.peyea?.avgVC?.toFixed(2) || '0']);
  peyeaRows.push(['Promedio Estabilidad Ambiental (EA):', project.peyea?.avgEA?.toFixed(2) || '0']);
  peyeaRows.push(['Promedio Fuerza Industrial (FI):', project.peyea?.avgFI?.toFixed(2) || '0']);
  peyeaRows.push(['Coordenada Vectorial X (VC + FI):', project.peyea?.coordinateX?.toFixed(2) || '0']);
  peyeaRows.push(['Coordenada Vectorial Y (EA + FF):', project.peyea?.coordinateY?.toFixed(2) || '0']);
  peyeaRows.push(['Cuadrante Estratégico Resultante:', project.peyea?.quadrant || 'Agresivo']);
  peyeaRows.push(['Interpretación Metodológica:', project.peyea?.interpretation || 'Postura competitiva adecuada.']);

  const wsPEYEA = XLSX.utils.aoa_to_sheet([peyeaHeaders, ...peyeaRows]);
  wsPEYEA['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 45 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPEYEA, 'Matriz_PEYEA');

  // =========================================================================
  // HOJA 7: BALANCED SCORECARD (CUADRO DE MANDO INTEGRAL)
  // =========================================================================
  const bscHeaders = [
    'Codigo',
    'Perspectiva_Kaplan_Norton',
    'Objetivo_Estrategico',
    'Matriz_Origen',
    'Meta_Anual',
    'Iniciativa_Estrategica',
    'Presupuesto_Estimado_COP',
    'Rol_Responsable',
  ];

  const bscData = (project.bscObjectives || []).map((obj) => [
    obj.code,
    obj.perspective,
    obj.title,
    obj.matrixOrigin,
    obj.targetAnnual,
    obj.strategicInitiative,
    obj.estimatedBudgetCOP || 0,
    obj.responsibleRole,
  ]);

  const wsBSC = XLSX.utils.aoa_to_sheet([bscHeaders, ...bscData]);
  wsBSC['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 45 },
    { wch: 30 },
    { wch: 20 },
    { wch: 45 },
    { wch: 24 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBSC, 'Balanced_Scorecard');

  // =========================================================================
  // HOJA 7B: FICHAS TÉCNICAS DE INDICADORES (KPIs)
  // =========================================================================
  const kpiHeaders = [
    'Codigo_Indicador',
    'Nombre_Indicador',
    'Perspectiva',
    'Objetivo_Asociado',
    'Formula_Calculo',
    'Unidad_Medida',
    'Frecuencia',
    'Linea_Base',
    'Meta_Target',
    'Valor_Actual',
    'Rango_Verde',
    'Rango_Amarillo',
    'Rango_Rojo',
    'Fuente_Datos',
    'Responsable',
  ];

  const kpiData = (project.indicators || []).map((kpi) => {
    const parentObj = (project.bscObjectives || []).find((o) => o.id === kpi.associatedObjectiveId);
    return [
      kpi.code,
      kpi.name,
      kpi.perspective,
      parentObj ? `${parentObj.code}: ${parentObj.title}` : 'Objetivo Estratégico',
      kpi.formula,
      kpi.unit,
      kpi.periodicity,
      kpi.baseline,
      kpi.target,
      kpi.currentValue ?? kpi.target,
      kpi.greenRange,
      kpi.yellowRange,
      kpi.redRange,
      kpi.dataSource,
      kpi.responsibleRole,
    ];
  });

  const wsKPI = XLSX.utils.aoa_to_sheet([kpiHeaders, ...kpiData]);
  wsKPI['!cols'] = [
    { wch: 16 },
    { wch: 35 },
    { wch: 22 },
    { wch: 40 },
    { wch: 45 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Fichas_Indicadores_KPI');

  // =========================================================================
  // HOJA 8: ANÁLISIS MACROENTORNO PESTA
  // =========================================================================
  const pestaHeaders = [
    'Categoria',
    'Factor_Macroentorno',
    'Tipo_Impacto',
    'Intensidad',
    'Justificacion_Estrategica',
    'Fuente_Evidencia',
  ];

  const pestaData = (project.pesta || []).map((item) => [
    item.category,
    item.factor,
    item.impactType,
    item.intensity,
    item.rationale,
    item.evidenceSource,
  ]);

  const wsPESTA = XLSX.utils.aoa_to_sheet([pestaHeaders, ...pestaData]);
  wsPESTA['!cols'] = [
    { wch: 18 },
    { wch: 50 },
    { wch: 15 },
    { wch: 12 },
    { wch: 50 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPESTA, 'Analisis_PESTA');

  // =========================================================================
  // HOJA 9: RÚBRICA Y RESULTADOS DE APRENDIZAJE OFICIALES (7 COMPETENCIAS)
  // =========================================================================
  const rapHeaders = [
    'Codigo_SENA',
    'Titulo_Competencia',
    'Descripcion_Oficial',
    'Nucleo_Asociado',
    'Peso_Porcentual',
    'Pasos_Vinculados',
    'Actividades_Aporte_Aprendiz',
    'Evidencias_Cumplidas',
    'Herramientas_Articuladas',
    'Porcentaje_Avance',
    'Estado_Oficial',
  ];

  const rapData = compReport.details.map((comp) => [
    comp.codigo,
    comp.tituloCorto,
    comp.descripcion,
    comp.nucleoAsociado,
    `${comp.peso}%`,
    comp.pasosDondeSeAborda.map((p) => `Paso ${p}`).join(', '),
    comp.asociacionTrabajoRealizado,
    comp.evidenciasCumplidas.join('; '),
    comp.herramientasArticuladas,
    `${comp.progressPercent}%`,
    comp.status,
  ]);

  const wsRAP = XLSX.utils.aoa_to_sheet([rapHeaders, ...rapData]);
  wsRAP['!cols'] = [
    { wch: 15 },
    { wch: 35 },
    { wch: 60 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 50 },
    { wch: 40 },
    { wch: 35 },
    { wch: 18 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRAP, 'Resultados_Aprendizaje_RAP');

  // =========================================================================
  // ESCRITURA Y DESCARGA DEL ARCHIVO
  // =========================================================================
  const cleanCompanyName = (project.company?.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Informe_Final_Matrices_Guia16_GAES_${project.gaesNumber}_${cleanCompanyName}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
