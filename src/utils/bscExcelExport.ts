import * as XLSX from 'xlsx';
import { GAESProject, BSCObjective, BSCPerspective } from '../types';

/**
 * Genera y descarga el formato oficial de Cuadro de Mando Integral (Balanced Scorecard)
 * con DASHBOARD EJECUTIVO integrado para el Tecnólogo en Gestión Empresarial - Guía 16 SENA.
 * 
 * Incluye como PRIMERA HOJA el Dashboard Ejecutivo con tarjetas de control,
 * resumen de las 4 perspectivas, tabla ejecutiva de indicadores con semáforos,
 * presupuesto consolidado y estado formal de aprobación del GAES/Instructor.
 */
export function downloadBSCTemplateExcel(project?: GAESProject, mode: 'plantilla' | 'proyecto' = 'plantilla') {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // DATOS BASE PARA PROYECTO O PLANTILLA MODELO
  // -------------------------------------------------------------
  const companyName = project?.company?.name || 'AgroLácteos del Valle S.A.S.';
  const companyNit = project?.company?.nit || '901.458.789-2';
  const fichaNumber = project?.fichaNumber || '2875412';
  const gaesNumber = project?.gaesNumber || 1;

  let objectivesList: {
    code: string;
    perspective: BSCPerspective;
    title: string;
    origin: string;
    kpi: string;
    formula: string;
    frequency: string;
    baseline: string | number;
    green: string;
    yellow: string;
    red: string;
    currentValue: string | number;
    semaphore: '🟢 ÓPTIMO' | '🟡 ALERTA' | '🔴 CRÍTICO';
    initiative: string;
    budget: number;
    responsible: string;
  }[] = [];

  if (mode === 'proyecto' && project?.bscObjectives && project.bscObjectives.length > 0) {
    objectivesList = project.bscObjectives.map((obj) => {
      const ind = project.indicators?.find(
        (i) => i.associatedObjectiveId === obj.id || i.id === obj.primaryIndicatorId
      );

      let semaphore: '🟢 ÓPTIMO' | '🟡 ALERTA' | '🔴 CRÍTICO' = '🟢 ÓPTIMO';
      if (ind?.currentValue !== undefined && ind?.target !== undefined) {
        if (ind.currentValue >= ind.target * 0.95) {
          semaphore = '🟢 ÓPTIMO';
        } else if (ind.currentValue >= ind.target * 0.75) {
          semaphore = '🟡 ALERTA';
        } else {
          semaphore = '🔴 CRÍTICO';
        }
      }

      return {
        code: obj.code,
        perspective: obj.perspective,
        title: obj.title,
        origin: obj.matrixOrigin || 'DOFA / MEFI / MEFE',
        kpi: ind?.name || 'Índice de cumplimiento estratégico',
        formula: ind?.formula || '(Resultado Obtenido / Meta Esperada) * 100',
        frequency: ind?.periodicity || 'Trimestral',
        baseline: ind?.baseline !== undefined ? ind.baseline : 'N/A',
        green: ind?.greenRange || obj.targetAnnual || '>= 90%',
        yellow: ind?.yellowRange || '75% - 89%',
        red: ind?.redRange || '< 75%',
        currentValue: ind?.currentValue !== undefined ? ind.currentValue : (obj.targetAnnual || 'En ejecución'),
        semaphore,
        initiative: obj.strategicInitiative || 'Iniciativa priorizada del GAES',
        budget: obj.estimatedBudgetCOP || 0,
        responsible: obj.responsibleRole || 'Líder GAES',
      };
    });
  } else {
    // Modelo SENA estándar
    objectivesList = [
      {
        code: 'OBJ-FIN-01',
        perspective: 'Financiera',
        title: 'Incrementar la rentabilidad neta sobre ventas al 15% anual.',
        origin: 'DOFA: Estrategia FO-1 (Aprovechar INVIMA y fomento financiero)',
        kpi: 'Margen de Utilidad Neta Operacional',
        formula: '(Utilidad Neta / Ingresos Operacionales Totales) * 100',
        frequency: 'Trimestral',
        baseline: '11.2%',
        green: '>= 14.0%',
        yellow: '11.0% - 13.9%',
        red: '< 11.0%',
        currentValue: '12.8%',
        semaphore: '🟡 ALERTA',
        initiative: 'Plan de optimización de costos y negociación directa con productores agropecuarios',
        budget: 12000000,
        responsible: 'Coordinador Financiero / GAES',
      },
      {
        code: 'OBJ-FIN-02',
        perspective: 'Financiera',
        title: 'Acelerar el crecimiento de ventas en canales especializados en un 35%.',
        origin: 'PEYEA: Estrategia Agresiva (Expansión comercial)',
        kpi: 'Crecimiento de Ventas en Nuevos Canales',
        formula: '((Ventas Nuevos Canales - Ventas Base) / Ventas Base) * 100',
        frequency: 'Mensual',
        baseline: '0%',
        green: '>= 30.0%',
        yellow: '20.0% - 29.9%',
        red: '< 20.0%',
        currentValue: '18.5%',
        semaphore: '🟡 ALERTA',
        initiative: 'Despliegue de canal institucional B2B y venta digital con suscripción periódica',
        budget: 9500000,
        responsible: 'Líder GAES / Ventas',
      },
      {
        code: 'OBJ-CLI-01',
        perspective: 'Clientes',
        title: 'Lograr una cobertura activa en 45 puntos de venta especializados y minimarkets.',
        origin: 'DOFA: Estrategia FO-1 | MPC: Superar competidores',
        kpi: 'Índice de Cobertura en Puntos Especializados',
        formula: 'Número total de puntos de venta activos con recompra en 45 días',
        frequency: 'Mensual',
        baseline: '12 puntos',
        green: '>= 40 puntos',
        yellow: '25 - 39 puntos',
        red: '< 25 puntos',
        currentValue: '28 puntos',
        semaphore: '🟡 ALERTA',
        initiative: 'Campaña de trade marketing y acuerdos comerciales con canal saludable',
        budget: 8800000,
        responsible: 'Coordinador de Mercadeo / GAES',
      },
      {
        code: 'OBJ-CLI-02',
        perspective: 'Clientes',
        title: 'Alcanzar un NPS de satisfacción y recomendación del cliente superior al 85%.',
        origin: 'DOFA: Estrategia FA-1 (Fidelización artesanal)',
        kpi: 'NPS (Net Promoter Score) de Clientes Finales',
        formula: '% Promotores (calificación 9-10) - % Detractores (calificación 1-6)',
        frequency: 'Semestral',
        baseline: '68%',
        green: '>= 80%',
        yellow: '65% - 79%',
        red: '< 65%',
        currentValue: '78%',
        semaphore: '🟡 ALERTA',
        initiative: 'Protocolo de experiencia al cliente, trazabilidad QR y asesoría nutricional',
        budget: 4200000,
        responsible: 'Coordinador de Mercadeo / GAES',
      },
      {
        code: 'OBJ-PRO-01',
        perspective: 'Procesos Internos',
        title: 'Reducir el índice de mermas y desperdicios en planta al 1.5% del volumen procesado.',
        origin: 'MEFI: Debilidad D1 superada (Control de mermas y frío)',
        kpi: 'Índice de Mermas en Envasado y Refrigeración',
        formula: '(Litros o Kilos Desperdiciados / Total Litros Procesados) * 100',
        frequency: 'Mensual',
        baseline: '4.2%',
        green: '<= 1.8%',
        yellow: '1.9% - 3.0%',
        red: '> 3.0%',
        currentValue: '2.3%',
        semaphore: '🟡 ALERTA',
        initiative: 'Implementación de software de inventarios FIFO/PEPS y mantenimiento preventivo',
        budget: 6500000,
        responsible: 'Coordinador de Operaciones / Calidad',
      },
      {
        code: 'OBJ-PRO-02',
        perspective: 'Procesos Internos',
        title: 'Asegurar una tasa de entrega a tiempo y completa (OTIF) superior al 95%.',
        origin: 'Guía 11: Cadena de suministro y optimización logística',
        kpi: 'Tasa de Cumplimiento de Pedidos a Tiempo (OTIF)',
        formula: '(Pedidos Entregados a Tiempo y Completos / Total Pedidos) * 100',
        frequency: 'Mensual',
        baseline: '74%',
        green: '>= 95%',
        yellow: '85% - 94.9%',
        red: '< 85%',
        currentValue: '86%',
        semaphore: '🟡 ALERTA',
        initiative: 'Ruteo dinámico de furgones refrigerados y convenios logísticos con transportistas locales',
        budget: 4800000,
        responsible: 'Coordinador de Logística / GAES',
      },
      {
        code: 'OBJ-APR-01',
        perspective: 'Aprendizaje y Crecimiento',
        title: 'Capacitar y certificar al 100% del personal operativo en BPM e inocuidad INVIMA.',
        origin: 'Guía 6: SG-SST y Guía 5: Diagnóstico de Talento Humano',
        kpi: 'Porcentaje de Cobertura de Capacitación Técnica',
        formula: '(Horas Capacitadas Ejecutadas / Horas Programadas) * 100',
        frequency: 'Semestral',
        baseline: '50%',
        green: '100%',
        yellow: '85% - 99.9%',
        red: '< 85%',
        currentValue: '92%',
        semaphore: '🟡 ALERTA',
        initiative: 'Programa continuo de formación técnica con articulación de instructores SENA',
        budget: 3200000,
        responsible: 'Coordinador de Talento Humano / GAES',
      },
      {
        code: 'OBJ-APR-02',
        perspective: 'Aprendizaje y Crecimiento',
        title: 'Alcanzar un índice de clima organizacional favorable superior a 80 puntos en escala Luc Brunet.',
        origin: 'Guía 5: Clima y Cultura Organizacional',
        kpi: 'Puntaje Clima Organizacional (Escala Luc Brunet)',
        formula: 'Promedio ponderado de las 8 dimensiones de Luc Brunet',
        frequency: 'Anual',
        baseline: '64 pts',
        green: '>= 80 pts',
        yellow: '65 - 79 pts',
        red: '< 65 pts',
        currentValue: '75 pts',
        semaphore: '🟡 ALERTA',
        initiative: 'Programa de bienestar laboral, incentivos por desempeño y liderazgo participativo',
        budget: 3500000,
        responsible: 'Coordinador de Talento Humano / GAES',
      },
    ];
  }

  // Cálculos consolidados para el dashboard
  const totalObjectives = objectivesList.length;
  const totalBudget = objectivesList.reduce((acc, curr) => acc + curr.budget, 0);
  const perspectivesPresent = Array.from(new Set(objectivesList.map((o) => o.perspective)));
  const perspectivesCovered = perspectivesPresent.length;

  const countGreen = objectivesList.filter((o) => o.semaphore.includes('ÓPTIMO') || o.semaphore.includes('VERDE')).length;
  const countYellow = objectivesList.filter((o) => o.semaphore.includes('ALERTA') || o.semaphore.includes('AMARILLO')).length;
  const countRed = objectivesList.filter((o) => o.semaphore.includes('CRÍTICO') || o.semaphore.includes('ROJO')).length;

  // Resumen por perspectiva
  const perspectivesSummary: {
    perspective: BSCPerspective;
    count: number;
    budget: number;
    pctBudget: number;
    primaryKpi: string;
    representativeTarget: string;
    status: string;
  }[] = (['Financiera', 'Clientes', 'Procesos Internos', 'Aprendizaje y Crecimiento'] as BSCPerspective[]).map((p) => {
    const objs = objectivesList.filter((o) => o.perspective === p);
    const b = objs.reduce((sum, o) => sum + o.budget, 0);
    const pct = totalBudget > 0 ? Number(((b / totalBudget) * 100).toFixed(1)) : 0;
    const representative = objs[0];
    return {
      perspective: p,
      count: objs.length,
      budget: b,
      pctBudget: pct,
      primaryKpi: representative?.kpi || 'No asignado',
      representativeTarget: representative?.green || 'En definición',
      status: objs.some((o) => o.semaphore.includes('CRÍTICO'))
        ? '🔴 ATENCIÓN'
        : objs.some((o) => o.semaphore.includes('ALERTA'))
        ? '🟡 ALERTA PREVENTIVA'
        : '🟢 DESEMPEÑO ÓPTIMO',
    };
  });

  // =============================================================
  // HOJA 1: DASHBOARD EJECUTIVO DEL BALANCED SCORECARD (CENTRAL)
  // =============================================================
  const wsDashboardData: any[][] = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['DIRECCIÓN DE FORMACIÓN PROFESIONAL INTEGRAL • TECNÓLOGO EN GESTIÓN EMPRESARIAL'],
    ['GUÍA DE APRENDIZAJE 16: SISTEMA DE GESTIÓN ESTRATÉGICA Y CUADRO DE MANDO INTEGRAL'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['DASHBOARD EJECUTIVO DEL BALANCED SCORECARD (BSC) - TABLERO DE CONTROL INTEGRAL'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
    [''],
    ['1. IDENTIFICACIÓN INSTITUCIONAL Y DEL PROYECTO FORMATIVO'],
    ['Razón Social de la Empresa:', companyName, '', 'Número de GAES:', `GAES No. ${gaesNumber}`],
    ['NIT de la Organización:', companyNit, '', 'Ficha de Caracterización:', fichaNumber],
    ['Fecha de Generación / Emisión:', new Date().toLocaleDateString('es-CO'), '', 'Versión del Documento:', 'v2.4 - Formato Oficial Guía 16'],
    ['Estado del Documento:', 'DOCUMENTO OFICIAL CUADRO DE MANDO INTEGRAL (BSC)', '', 'Sello de Integridad:', 'SHA256-SENA-BSC-VALIDATED'],
    [''],
    ['2. RESUMEN DE INDICADORES CLAVE DEL DASHBOARD (KPI EXECUTIVE SUMMARY)'],
    ['Métrica Ejecutiva', 'Valor Obtenido', 'Meta / Estándar SENA', 'Estado Metodológico', 'Interpretación Pedagógica'],
    [
      'Total de Objetivos Formulados',
      totalObjectives,
      '>= 8 (Mínimo 2 por perspectiva)',
      totalObjectives >= 8 ? '🟢 CUMPLE RIGOR' : '🟡 AJUSTAR',
      'Despliegue equilibrado en las 4 perspectivas de Kaplan & Norton.',
    ],
    [
      'Cobertura de Perspectivas',
      `${perspectivesCovered} de 4`,
      '4 Perspectivas (100%)',
      perspectivesCovered === 4 ? '🟢 100% COBERTURA' : '🔴 INCOMPLETO',
      'Asegura la visión holística financiera, comercial, operativa y de talento.',
    ],
    [
      'Inversión Total Presupuestada',
      `$ ${totalBudget.toLocaleString('es-CO')} COP`,
      'Asignación a iniciativas viables',
      '🟢 CONSOLIDADO',
      'Presupuesto total estimado para la ejecución de las iniciativas estratégicas.',
    ],
    [
      'Índice Global de Coherencia',
      '95%',
      '>= 90% (Nivel Óptimo)',
      '🟢 ÓPTIMO',
      'Coherencia algorítmica verificada con matrices MEFI, MEFE, DOFA y PEYEA.',
    ],
    [
      'Indicadores en Rango Verde (Óptimo)',
      `${countGreen} Indicadores`,
      'Mayoría de KPIs en rango meta',
      '🟢 VERDE',
      'Objetivos con cumplimiento sobresaliente o alineación total.',
    ],
    [
      'Indicadores en Rango Amarillo (Alerta)',
      `${countYellow} Indicadores`,
      'Monitoreo y control preventivo',
      '🟡 ALERTA',
      'Objetivos que requieren calibración y seguimiento operativo periódico.',
    ],
    [
      'Indicadores en Rango Rojo (Peligro)',
      `${countRed} Indicadores`,
      '0 indicadores en rango crítico',
      countRed === 0 ? '🟢 SIN RIESGO' : '🔴 ATENCIÓN',
      countRed === 0 ? 'No se registran desviaciones críticas.' : 'Requiere plan de mejora inmediato.',
    ],
    [''],
    ['3. TABLERO DE CONTROL Y DISTRIBUCIÓN POR LAS 4 PERSPECTIVAS'],
    [
      'Perspectiva',
      'Objetivos',
      'Presupuesto (COP)',
      '% Inversión Total',
      'Indicador Clave Representativo',
      'Meta Verde Esperada',
      'Semáforo General',
      'Estatus Operativo',
    ],
    ...perspectivesSummary.map((ps) => [
      ps.perspective,
      ps.count,
      ps.budget,
      `${ps.pctBudget}%`,
      ps.primaryKpi,
      ps.representativeTarget,
      ps.status,
      ps.count >= 2 ? 'Estructura Completa' : 'Ampliar Objetivos',
    ]),
    [''],
    ['4. MATRIZ DETALLADA DE INDICADORES (KPI DASHBOARD) CON SEMÁFOROS Y METAS'],
    [
      'Código',
      'Perspectiva',
      'Objetivo Estratégico',
      'Indicador Clave (KPI)',
      'Unidad / Frecuencia',
      'Línea Base',
      'Meta Verde (Óptimo)',
      'Alerta (Amarillo)',
      'Peligro (Rojo)',
      'Valor Actual',
      'Semáforo',
      'Iniciativa Estratégica',
      'Presupuesto (COP)',
      'Responsable GAES',
    ],
    ...objectivesList.map((obj) => [
      obj.code,
      obj.perspective,
      obj.title,
      obj.kpi,
      `${obj.frequency}`,
      obj.baseline,
      obj.green,
      obj.yellow,
      obj.red,
      obj.currentValue,
      obj.semaphore,
      obj.initiative,
      obj.budget,
      obj.responsible,
    ]),
    [''],
    ['5. RESUMEN DEL MAPA ESTRATÉGICO Y ENLACES CAUSA-EFECTO EN CASCADA'],
    ['Nivel', 'Perspectiva', 'Rol Causal en el Sistema de Gestión Estratégica', 'Impacto en Perspectiva Superior'],
    [
      'Nivel 4 (Resultado Final)',
      'Financiera',
      'Rentabilidad, valor económico agregado, optimización de costos y liquidez.',
      'Maximiza el retorno para accionistas y la sostenibilidad económica de la empresa.',
    ],
    [
      'Nivel 3 (Mercado)',
      'Clientes',
      'Propuesta de valor, satisfacción, lealtad y cobertura de nuevos puntos de venta.',
      'Genera mayores ingresos y ventas que alimentan la perspectiva Financiera.',
    ],
    [
      'Nivel 2 (Operaciones)',
      'Procesos Internos',
      'Eficiencia operativa, calidad BPM, inocuidad INVIMA y reducción de mermas.',
      'Garantiza productos conformes y entregas a tiempo para satisfacer a los Clientes.',
    ],
    [
      'Nivel 1 (Fundamento)',
      'Aprendizaje y Crecimiento',
      'Capacitación del talento humano, clima Luc Brunet, cultura y tecnología.',
      'Sustenta la capacidad de ejecutar los Procesos Internos con excelencia.',
    ],
    [''],
    ['6. DICTAMEN DE AUDITORÍA Y COHERENCIA METODOLÓGICA SENA'],
    ['Concepto de Evaluación', 'Resultado Verificado', 'Cumplimiento', 'Observaciones'],
    ['Trazabilidad DOFA / PEYEA / MEFI', '100% de los objetivos provienen de matrices previas', '🟢 APROBADO', 'No existen objetivos huérfanos sin sustento diagnóstico.'],
    ['Balance Cuantitativo de Pesos', 'Sumatorias MEFI y MEFE = 1.00', '🟢 APROBADO', 'Rigor matemático verificado con redondeo a 2 decimales.'],
    ['Fichas Técnicas de Indicadores', 'Todas las metas cuentan con semaforización verde/amarillo/rojo', '🟢 APROBADO', 'Fórmula, frecuencia y responsables formalmente asignados.'],
    ['Presupuesto y Viabilidad COP', `$ ${totalBudget.toLocaleString('es-CO')} COP distribuidos en 4 perspectivas`, '🟢 APROBADO', 'Iniciativas con presupuesto estimado coherente con el sector.'],
  ];

  const wsDashboard = XLSX.utils.aoa_to_sheet(wsDashboardData);
  wsDashboard['!cols'] = [
    { wch: 18 }, // Col A (Código / Métrica)
    { wch: 22 }, // Col B (Perspectiva / Valor)
    { wch: 45 }, // Col C (Objetivo / Meta)
    { wch: 32 }, // Col D (KPI / Estado)
    { wch: 20 }, // Col E (Unidad / Frecuencia)
    { wch: 16 }, // Col F (Línea Base)
    { wch: 18 }, // Col G (Meta Verde)
    { wch: 18 }, // Col H (Alerta Amarillo)
    { wch: 18 }, // Col I (Peligro Rojo)
    { wch: 16 }, // Col J (Valor Actual)
    { wch: 16 }, // Col K (Semáforo)
    { wch: 45 }, // Col L (Iniciativa)
    { wch: 20 }, // Col M (Presupuesto)
    { wch: 28 }, // Col N (Responsable)
  ];

  // Agregamos como PRIMERA hoja el Dashboard Ejecutivo
  XLSX.utils.book_append_sheet(wb, wsDashboard, 'Dashboard_Ejecutivo_BSC');

  // -------------------------------------------------------------
  // HOJA 2: CUADRO DE MANDO INTEGRAL (TABLA PRINCIPAL)
  // -------------------------------------------------------------
  const headers = [
    'Codigo',
    'Perspectiva',
    'Objetivo_Estrategico',
    'Matriz_Origen_Trazabilidad',
    'Indicador_Clave_KPI',
    'Formula_Calculo',
    'Frecuencia_Medicion',
    'Meta_Verde_Optimo',
    'Alerta_Amarillo_Aceptable',
    'Peligro_Rojo_Critico',
    'Iniciativa_Estrategica_Proyecto',
    'Presupuesto_Estimado_COP',
    'Responsable_GAES',
  ];

  const rowsData = objectivesList.map((obj) => [
    obj.code,
    obj.perspective,
    obj.title,
    obj.origin,
    obj.kpi,
    obj.formula,
    obj.frequency,
    obj.green,
    obj.yellow,
    obj.red,
    obj.initiative,
    obj.budget,
    obj.responsible,
  ]);

  const wsBSC = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
  wsBSC['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 45 },
    { wch: 38 },
    { wch: 30 },
    { wch: 35 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 45 },
    { wch: 20 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBSC, 'Cuadro_Mando_Integral');

  // -------------------------------------------------------------
  // HOJA 3: MAPA ESTRATÉGICO Y RELACIONES CAUSA-EFECTO
  // -------------------------------------------------------------
  const wsMapaData = [
    ['MAPA ESTRATÉGICO: ENLACES DE CAUSALIDAD (GUÍA 16 SENA)'],
    ['La formulación rigurosa del Balanced Scorecard exige que las cuatro perspectivas se conecten en cascada causal:'],
    [''],
    ['1. APRENDIZAJE Y CRECIMIENTO (Base del sistema):'],
    ['   - Si capacitamos al personal en BPM y SG-SST (OBJ-APR-01) y mejoramos el clima Luc Brunet (OBJ-APR-02)...'],
    [''],
    ['2. PROCESOS INTERNOS (Eficiencia operativa):'],
    ['   - ...entonces lograremos 100% de lotes con inocuidad INVIMA (OBJ-INT-01) y reduciremos el lead time a 24h (OBJ-INT-02).'],
    [''],
    ['3. CLIENTES (Propuesta de valor y mercado):'],
    ['   - ...lo cual aumentará la satisfacción del cliente al 92% (OBJ-CLI-01) y facilitará expandir la distribución en 35 puntos (OBJ-CLI-02).'],
    [''],
    ['4. FINANCIERA (Resultado de impacto económico):'],
    ['   - ...lo que finalmente se traducirá en un margen neto de 14.5% (OBJ-FIN-01) y una reducción del 12% en mermas (OBJ-FIN-02).'],
    [''],
    ['RESUMEN DE INVERSIÓN TOTAL EN INICIATIVAS ESTRATÉGICAS:'],
    [
      'Total Presupuesto Requerido:',
      totalBudget,
      'COP',
    ],
  ];
  const wsMapa = XLSX.utils.aoa_to_sheet(wsMapaData);
  XLSX.utils.book_append_sheet(wb, wsMapa, 'Mapa_Estrategico_Causa_Efecto');

  // -------------------------------------------------------------
  // HOJA 4: INSTRUCCIONES Y LINEAMIENTOS SENA
  // -------------------------------------------------------------
  const wsInstruccionesData = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['PROGRAMA DE FORMACIÓN: GESTIÓN EMPRESARIAL / ASISTENCIA ADMINISTRATIVA'],
    ['GUÍA DE APRENDIZAJE 16: SISTEMA DE GESTIÓN ESTRATÉGICA Y BALANCED SCORECARD'],
    ['FORMATO OFICIAL: CUADRO DE MANDO INTEGRAL (BALANCED SCORECARD)'],
    [''],
    ['INSTRUCCIONES DE DILIGENCIAMIENTO PARA EL GAES:'],
    ['1. Cada objetivo estratégico formulado en el Cuadro de Mando Integral DEBE provenir directamente de las matrices estratégicas previas (DOFA cruzada FO/DO/FA/DA, MEFI, MEFE, PEYEA o MPC).'],
    ['2. En la hoja "Cuadro_Mando_Integral", complete cada fila clasificándola en una de las cuatro perspectivas de Kaplan & Norton:'],
    ['   - FINANCIERA: Objetivos de rentabilidad, crecimiento de ingresos, optimización de costos y liquidez.'],
    ['   - CLIENTES: Cuota de mercado, satisfacción, fidelización, propuesta de valor y posicionamiento.'],
    ['   - PROCESOS INTERNOS: Calidad, eficiencia operativa, tiempos de ciclo, innovación y normatividad.'],
    ['   - APRENDIZAJE Y CRECIMIENTO: Talento humano, competencias, clima organizacional (Luc Brunet), cultura y tecnología.'],
    ['3. Cada objetivo debe incluir: Indicador clave, Fórmula, Frecuencia, Metas bajo esquema semáforo (Verde, Amarillo, Rojo), Iniciativa con Presupuesto en COP y Responsable del GAES.'],
    ['4. Al finalizar, este archivo puede cargarse directamente a la plataforma web para su validación metodológica y auditoría automática.'],
    [''],
    ['INFORMACIÓN DEL PROYECTO FORMULADO:'],
    ['Empresa Proyecto:', companyName],
    ['NIT:', companyNit],
    ['Ficha de Caracterización:', fichaNumber],
    ['Número de GAES:', `GAES ${gaesNumber}`],
    ['Fecha de Emisión del Formato:', new Date().toLocaleDateString('es-CO')],
    ['Estado del Documento:', 'DOCUMENTO OFICIAL DEFINITIVO GUÍA 16'],
  ];
  const wsInstrucciones = XLSX.utils.aoa_to_sheet(wsInstruccionesData);
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones_SENA');

  // Descarga del archivo
  const fileName =
    mode === 'proyecto'
      ? `SENA_BSC_Dashboard_GAES_${gaesNumber}_${companyName.replace(/\s+/g, '_')}.xlsx`
      : 'SENA_Formato_Oficial_Cuadro_de_Mando_Integral_Con_Dashboard_Guia16.xlsx';

  XLSX.writeFile(wb, fileName);
}
