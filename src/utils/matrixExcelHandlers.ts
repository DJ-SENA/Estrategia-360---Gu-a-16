import * as XLSX from 'xlsx';
import { 
  GAESProject, 
  MEFIItem, 
  MEFEItem, 
  DOFAStrategy, 
  PEYEAMatrix, 
  MPCMatrix, 
  BCGItem, 
  PESTAItem, 
  IndicatorCard 
} from '../types';
import { calculatePEYEACoordinates } from './strategicCalculations';

export type MatrixTypeKey = 'mefi' | 'mefe' | 'dofa' | 'peyea' | 'mpc' | 'bcg' | 'pesta' | 'indicadores';

export const MATRIX_TITLES: Record<MatrixTypeKey, string> = {
  mefi: 'Matriz MEFI (Factores Internos)',
  mefe: 'Matriz MEFE (Factores Externos)',
  dofa: 'Matriz DOFA Cruzada (Estrategias FO, DO, FA, DA)',
  peyea: 'Matriz PEYEA (Posición Estratégica & Vector)',
  mpc: 'Matriz de Perfil Competitivo (MPC)',
  bcg: 'Matriz BCG (Portafolio de Productos)',
  pesta: 'Análisis del Macroentorno (PESTA)',
  indicadores: 'Hojas de Vida Técnicas de Indicadores (KPI)',
};

/**
 * Genera y descarga una plantilla Excel específica para la matriz seleccionada.
 */
export function downloadSpecificMatrixTemplate(matrixKey: MatrixTypeKey, companyName: string = 'AgroLácteos del Valle S.A.S.') {
  const wb = XLSX.utils.book_new();

  if (matrixKey === 'mefi') {
    const data = [
      ['Tipo', 'Factor_Interno_Clave', 'Area_Funcional', 'Peso', 'Calificacion', 'Estado_Validacion'],
      ['Fortaleza', 'Certificación INVIMA en BPM y altos estándares de inocuidad.', 'Operaciones', 0.20, 4, 'Validado'],
      ['Fortaleza', 'Alianzas directas con hatos lecheros y campesinos locales.', 'Operaciones', 0.15, 4, 'Validado'],
      ['Fortaleza', 'Equipo técnico capacitado por instructores SENA.', 'Talento Humano', 0.15, 3, 'Validado'],
      ['Debilidad', 'Capacidad limitada de almacenamiento en frío y logística.', 'Operaciones', 0.15, 1, 'Validado'],
      ['Debilidad', 'Bajo presupuesto publicitario y falta de marca digital.', 'Mercadeo', 0.15, 2, 'Validado'],
      ['Debilidad', 'Falta de sistema ERP integrado de control de costos.', 'Financiera', 0.20, 2, 'Validado'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_MEFI');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_MEFI_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'mefe') {
    const data = [
      ['Tipo', 'Factor_Externo_Clave', 'Categoria_PESTA', 'Peso', 'Calificacion', 'Estado_Validacion'],
      ['Oportunidad', 'Crecimiento de la demanda de lácteos funcionales y saludables.', 'Social', 0.20, 4, 'Validado'],
      ['Oportunidad', 'Líneas de crédito blando institucionales para fomento agroindustrial.', 'Económico', 0.15, 3, 'Validado'],
      ['Oportunidad', 'Apertura de nuevos canales retail y minimercados saludables.', 'Económico', 0.15, 3, 'Validado'],
      ['Amenaza', 'Entrada de competidores industriales con estrategias de precios bajos.', 'Económico', 0.20, 2, 'Validado'],
      ['Amenaza', 'Volatilidad en costos de combustibles e insumos de empaque.', 'Ambiental / Legal', 0.15, 2, 'Validado'],
      ['Amenaza', 'Variabilidad climática que afecta el suministro de leche en invierno.', 'Ambiental / Legal', 0.15, 2, 'Validado'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_MEFE');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_MEFE_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'dofa') {
    const data = [
      ['Codigo', 'Tipo', 'Titulo_Estrategia', 'Descripcion_Detallada', 'Factores_Cruzados', 'Prioridad'],
      ['FO-1', 'FO', 'Alianzas retail premium con certificación INVIMA', 'Aprovechar la certificación sanitaria para negociar con cadenas de supermercados saludables.', 'F1, O1', 'Alta'],
      ['DO-1', 'DO', 'Ampliación de cadena de frío con crédito blando', 'Financiar cuartos fríos y transporte refrigerado con líneas de crédito agropecuario.', 'D1, O2', 'Alta'],
      ['FA-1', 'FA', 'Fidelización por diferenciación artesanal', 'Contrarrestar competidores masivos destacando la pureza y origen campesino.', 'F2, A1', 'Media'],
      ['DA-1', 'DA', 'Optimización de empaques y contratos forward', 'Reducir mermas y asegurar precios fijos con proveedores locales.', 'D3, A2', 'Alta'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 35 }, { wch: 50 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_DOFA');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_DOFA_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'peyea') {
    const data = [
      ['Dimension', 'Factor_PEYEA', 'Calificacion'],
      ['FF', 'Rendimiento sobre la inversión (ROI)', 4.5],
      ['FF', 'Apalancamiento y liquidez corriente', 4.0],
      ['FF', 'Flujo de caja operativo disponible', 3.5],
      ['VC', 'Participación de mercado en nicho', -2.5],
      ['VC', 'Calidad del producto artesanal', -1.5],
      ['VC', 'Fidelidad de clientes institucionales', -2.0],
      ['EA', 'Tasa de inflación y costos de insumos', -3.5],
      ['EA', 'Barreras de entrada de nuevos competidores', -2.5],
      ['EA', 'Estabilidad de precios de materia prima', -3.0],
      ['FI', 'Potencial de crecimiento del sector lácteo', 4.5],
      ['FI', 'Aprovechamiento de capacidad instalada', 3.5],
      ['FI', 'Intensidad de capital y tecnología', 4.0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_PEYEA');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_PEYEA_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'mpc') {
    const data = [
      ['Factor_Critico_Exito', 'Peso', 'Calificacion_Empresa', 'Calificacion_Competidor1', 'Calificacion_Competidor2'],
      ['Calidad del Producto e Inocuidad', 0.20, 4, 3, 4],
      ['Competitividad de Precios', 0.15, 3, 4, 3],
      ['Posición Financiera y Liquidez', 0.15, 3, 4, 3],
      ['Fidelidad y Satisfacción del Cliente', 0.15, 4, 3, 3],
      ['Red de Distribución y Puntos de Venta', 0.20, 2, 4, 3],
      ['Diferenciación y Empaque Sostenible', 0.15, 4, 2, 3],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 38 }, { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_MPC');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_MPC_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'bcg') {
    const data = [
      ['Producto_o_Linea', 'Categoria', 'Cuota_Relativa_Mercado', 'Tasa_Crecimiento_Mercado_Pct', 'Ventas_Empresa_Pct', 'Accion_Estrategica'],
      ['Yogur Griego Artesanal 150g', 'Estrella', 1.4, 22.5, 45, 'Invertir en capacidad y posicionar marca'],
      ['Queso Campesino Tradicional 500g', 'Vaca Lechera', 1.8, 4.0, 35, 'Ordeñar flujo de caja para financiar yogures'],
      ['Arequipe Funcional 0% Azúcar', 'Interrogante', 0.6, 18.0, 15, 'Evaluar aceptación o reformular empaque'],
      ['Bebida Láctea Económica', 'Perro', 0.4, 2.0, 5, 'Liquidar línea o descontinuar'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_BCG');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_BCG_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'pesta') {
    const data = [
      ['Dimension', 'Factor_Macroentorno', 'Impacto', 'Intensidad', 'Fundamentacion_Tecnica', 'Fuente_Informacion'],
      ['Político', 'Políticas de fomento a compras públicas locales (Ley 2046)', 'Oportunidad', 'Alta', 'Prioridad a pequeños productores en PAE e ICBF', 'MinAgricultura / Guía 2'],
      ['Económico', 'Inflación de alimentos y aumento en costos de concentrado', 'Amenaza', 'Media', 'Presión en costos de leche cruda campesina', 'DANE IPC / Guía 12'],
      ['Social', 'Preferencia de consumidores por alimentos limpios y con probióticos', 'Oportunidad', 'Alta', 'Aumento de diabetes y búsqueda de bienestar', 'Estudio de mercado Guía 8'],
      ['Tecnológico', 'Adopción de software libre y comercio electrónico local', 'Oportunidad', 'Media', 'Ventas directas por WhatsApp y Shopify', 'MinTIC / Diagnóstico'],
      ['Ambiental / Legal', 'Resolución 2674 de 2013 (BPM INVIMA para alimentos)', 'Oportunidad', 'Alta', 'La planta ya cumple estándar, ventaja frente a informales', 'INVIMA / Guía 6'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 14 }, { wch: 14 }, { wch: 45 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz_PESTA');
    XLSX.writeFile(wb, `SENA_Plantilla_Matriz_PESTA_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  if (matrixKey === 'indicadores') {
    const data = [
      ['Codigo', 'Nombre_Indicador', 'Perspectiva', 'Definicion', 'Formula', 'Periodicidad', 'Unidad', 'Linea_Base', 'Meta_Anual', 'Verde_Optimo', 'Amarillo_Tolerable', 'Rojo_Critico', 'Responsable'],
      ['KPI-FIN-01', 'Margen Neto de Utilidad', 'Financiera', 'Porcentaje de ganancia líquida sobre ventas', '(Utilidad Neta / Ventas) * 100', 'Trimestral', '%', '9.5%', '14.5%', '>= 14.5%', '11.0% - 14.4%', '< 11.0%', 'Coordinador Financiero'],
      ['KPI-CLI-01', 'Índice de Satisfacción CSAT', 'Clientes', 'Grado de conformidad del cliente con el producto', '(Clientes Satisfechos / Encuestados) * 100', 'Bimestral', '%', '78%', '92%', '>= 92%', '80% - 91%', '< 80%', 'Coordinador de Mercadeo'],
      ['KPI-INT-01', 'Tasa de Lotes Conformes BPM', 'Procesos Internos', 'Porcentaje de producción sin no conformidades', '(Lotes Conformes / Total Lotes) * 100', 'Mensual', '%', '94%', '100%', '100%', '96% - 99%', '< 96%', 'Coordinador de Calidad'],
      ['KPI-APR-01', 'Cobertura de Capacitación BPM', 'Aprendizaje y Crecimiento', 'Personal certificado en inocuidad y SG-SST', '(Horas Ejecutadas / Programadas) * 100', 'Semestral', '%', '70%', '100%', '100%', '85% - 99%', '< 85%', 'Coordinador de TH'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 35 }, { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Hojas_Vida_KPI');
    XLSX.writeFile(wb, `SENA_Plantilla_Hojas_Vida_KPI_${companyName.replace(/\s+/g, '_')}.xlsx`);
    return;
  }
}

/**
 * Lee y procesa un archivo Excel directamente para la matriz indicada, retornando
 * los datos actualizados del proyecto.
 */
export async function parseExcelForMatrix(
  file: File,
  matrixKey: MatrixTypeKey,
  project: GAESProject
): Promise<{ success: boolean; message: string; updatedData: Partial<GAESProject> }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          resolve({ success: false, message: 'El archivo Excel no contiene filas de datos.', updatedData: {} });
          return;
        }

        if (matrixKey === 'mefi') {
          const items: MEFIItem[] = rows.map((r, i) => {
            const type = (r.Tipo || r.tipo || (String(r.Factor_Interno_Clave || '').toLowerCase().includes('fortaleza') ? 'Fortaleza' : 'Debilidad')) === 'Fortaleza' ? 'Fortaleza' : 'Debilidad';
            const factor = r.Factor_Interno_Clave || r.Factor || r.factor || r.Descripcion || `Factor interno #${i + 1}`;
            const weight = Number(r.Peso || r.peso || (1 / rows.length).toFixed(2)) || 0.1;
            const rating = Number(r.Calificacion || r.calificacion || (type === 'Fortaleza' ? 3 : 2)) as any;
            return {
              id: `mefi-imp-${i}-${Date.now()}`,
              type,
              factor: String(factor),
              weight,
              rating,
              weightedScore: Number((weight * rating).toFixed(2)),
              area: r.Area_Funcional || r.Area || r.area || 'Operaciones',
              validationStatus: r.Estado_Validacion || 'Validado',
            };
          });

          resolve({
            success: true,
            message: `¡Matriz MEFI actualizada con éxito desde Excel! Se importaron ${items.length} factores internos.`,
            updatedData: { mefi: items },
          });
          return;
        }

        if (matrixKey === 'mefe') {
          const items: MEFEItem[] = rows.map((r, i) => {
            const type = (r.Tipo || r.tipo || (String(r.Factor_Externo_Clave || '').toLowerCase().includes('oportunidad') ? 'Oportunidad' : 'Amenaza')) === 'Oportunidad' ? 'Oportunidad' : 'Amenaza';
            const factor = r.Factor_Externo_Clave || r.Factor || r.factor || r.Descripcion || `Factor externo #${i + 1}`;
            const weight = Number(r.Peso || r.peso || (1 / rows.length).toFixed(2)) || 0.1;
            const rating = Number(r.Calificacion || r.calificacion || (type === 'Oportunidad' ? 3 : 2)) as any;
            return {
              id: `mefe-imp-${i}-${Date.now()}`,
              type,
              factor: String(factor),
              weight,
              rating,
              weightedScore: Number((weight * rating).toFixed(2)),
              pestaCategory: r.Categoria_PESTA || r.Categoria || 'Económico',
              validationStatus: r.Estado_Validacion || 'Validado',
            };
          });

          resolve({
            success: true,
            message: `¡Matriz MEFE actualizada con éxito desde Excel! Se importaron ${items.length} factores del entorno.`,
            updatedData: { mefe: items },
          });
          return;
        }

        if (matrixKey === 'dofa') {
          const items: DOFAStrategy[] = rows.map((r, i) => ({
            id: `dofa-imp-${i}-${Date.now()}`,
            code: r.Codigo || `EST-${i + 1}`,
            type: (r.Tipo || 'FO') as any,
            title: r.Titulo_Estrategia || r.Titulo || `Estrategia #${i + 1}`,
            description: r.Descripcion_Detallada || r.Descripcion || 'Estrategia formulada en Excel.',
            crossedFactors: String(r.Factores_Cruzados || 'F1, O1').split(',').map((s: string) => s.trim()),
            priority: (r.Prioridad || 'Alta') as any,
          }));

          resolve({
            success: true,
            message: `¡Matriz DOFA actualizada con éxito desde Excel! Se importaron ${items.length} estrategias.`,
            updatedData: { dofa: items },
          });
          return;
        }

        if (matrixKey === 'peyea') {
          const currentPeyea = project.peyea;
          const newFF = [...currentPeyea.financialStrength];
          const newVC = [...currentPeyea.competitiveAdvantage];
          const newEA = [...currentPeyea.environmentalStability];
          const newFI = [...currentPeyea.industryStrength];

          rows.forEach((r, idx) => {
            const dim = String(r.Dimension || r.dimension || '').toUpperCase();
            const factorName = r.Factor_PEYEA || r.Factor || `Factor PEYEA ${idx + 1}`;
            const score = Number(r.Calificacion || r.score || 3);

            if (dim.includes('FF')) {
              newFF.push({ id: `ff-${idx}`, name: factorName, score });
            } else if (dim.includes('VC')) {
              newVC.push({ id: `vc-${idx}`, name: factorName, score: score > 0 ? -score : score });
            } else if (dim.includes('EA')) {
              newEA.push({ id: `ea-${idx}`, name: factorName, score: score > 0 ? -score : score });
            } else if (dim.includes('FI')) {
              newFI.push({ id: `fi-${idx}`, name: factorName, score });
            }
          });

          const recalculated = calculatePEYEACoordinates({
            ...currentPeyea,
            financialStrength: newFF.slice(-4),
            competitiveAdvantage: newVC.slice(-4),
            environmentalStability: newEA.slice(-4),
            industryStrength: newFI.slice(-4),
          });

          resolve({
            success: true,
            message: `¡Matriz PEYEA actualizada con éxito! Vector calculado en cuadrante: ${recalculated.quadrant}.`,
            updatedData: { peyea: recalculated },
          });
          return;
        }

        if (matrixKey === 'mpc') {
          const toRating = (val: any): 1 | 2 | 3 | 4 => {
            const n = Math.round(Number(val));
            if (n >= 4) return 4;
            if (n === 3) return 3;
            if (n === 2) return 2;
            return 1;
          };

          const factors = rows.map((r, i) => ({
            id: `mpc-imp-${i}`,
            factor: String(r.Factor_Critico_Exito || r.Factor || `Factor FCE #${i + 1}`),
            weight: Number(r.Peso || 0.15),
            companyRating: toRating(r.Calificacion_Empresa || 3),
            competitor1Rating: toRating(r.Calificacion_Competidor1 || 3),
            competitor2Rating: toRating(r.Calificacion_Competidor2 || 3),
          }));

          resolve({
            success: true,
            message: `¡Matriz MPC actualizada con éxito desde Excel! Se importaron ${factors.length} factores competitivos.`,
            updatedData: {
              mpc: {
                ...project.mpc,
                factors,
              },
            },
          });
          return;
        }

        if (matrixKey === 'bcg') {
          const items: BCGItem[] = rows.map((r, i) => ({
            id: `bcg-imp-${i}`,
            productName: r.Producto_o_Linea || r.Producto || `Producto ${i + 1}`,
            category: (r.Categoria || 'Estrella') as any,
            relativeMarketShare: Number(r.Cuota_Relativa_Mercado || 1.0),
            marketGrowthRatePercent: Number(r.Tasa_Crecimiento_Mercado_Pct || 10),
            companySalesPercent: Number(r.Ventas_Empresa_Pct || 25),
            strategicAction: r.Accion_Estrategica || 'Estrategia definida en Excel',
          }));

          resolve({
            success: true,
            message: `¡Matriz BCG actualizada con éxito desde Excel! Se importaron ${items.length} productos del portafolio.`,
            updatedData: { bcg: items },
          });
          return;
        }

        if (matrixKey === 'pesta') {
          const items: PESTAItem[] = rows.map((r, i) => ({
            id: `pesta-imp-${i}`,
            category: (r.Dimension || 'Económico') as any,
            factor: String(r.Factor_Macroentorno || r.Factor || `Factor macroentorno ${i + 1}`),
            impactType: (String(r.Impacto || '').toLowerCase().includes('amenaza') ? 'Amenaza' : 'Oportunidad') as 'Oportunidad' | 'Amenaza',
            intensity: (r.Intensidad || 'Media') as any,
            rationale: String(r.Fundamentacion_Tecnica || r.Fundamentacion || 'Análisis del macroentorno SENA'),
            evidenceSource: String(r.Fuente_Informacion || 'DANE / MinComercio'),
          }));

          resolve({
            success: true,
            message: `¡Análisis PESTA actualizado con éxito desde Excel! Se importaron ${items.length} factores del entorno.`,
            updatedData: { pesta: items },
          });
          return;
        }

        if (matrixKey === 'indicadores') {
          const items: IndicatorCard[] = rows.map((r, i) => ({
            id: `ind-imp-${i}`,
            code: r.Codigo || `KPI-${i + 1}`,
            name: r.Nombre_Indicador || r.Nombre || `Indicador ${i + 1}`,
            perspective: (r.Perspectiva || 'Financiera') as any,
            associatedObjectiveId: project.bscObjectives?.[i % (project.bscObjectives?.length || 1)]?.id || `obj-${i + 1}`,
            definition: r.Definicion || 'Definición técnica del indicador.',
            formula: r.Formula || '(Resultado / Meta) * 100',
            periodicity: (r.Periodicidad || 'Trimestral') as any,
            unit: (r.Unidad || '%') as any,
            baseline: Number(parseFloat(String(r.Linea_Base || '0').replace('%', ''))) || 0,
            target: Number(parseFloat(String(r.Meta_Anual || '100').replace('%', ''))) || 100,
            greenRange: String(r.Verde_Optimo || '>= 90%'),
            yellowRange: String(r.Amarillo_Tolerable || '75% - 89%'),
            redRange: String(r.Rojo_Critico || '< 75%'),
            responsibleRole: String(r.Responsable || 'Líder GAES'),
            dataSource: 'Registros contables y de producción',
          }));

          resolve({
            success: true,
            message: `¡Hojas de vida de indicadores actualizadas con éxito! Se importaron ${items.length} fichas técnicas KPI.`,
            updatedData: { indicators: items },
          });
          return;
        }

        resolve({ success: false, message: 'Tipo de matriz no reconocido.', updatedData: {} });
      } catch (err: any) {
        resolve({
          success: false,
          message: `Error al procesar el archivo Excel: ${err.message || 'Formato inválido'}`,
          updatedData: {},
        });
      }
    };

    reader.readAsBinaryString(file);
  });
}
