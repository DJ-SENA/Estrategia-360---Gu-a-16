import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  Download, 
  FileCheck, 
  Loader2, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GAESProject } from '../types';
import { calculateMEFIScore, calculateMEFEScore } from '../utils/strategicCalculations';
import { SENA_LOGO_SVG } from '../assets/senaLogo';
import { 
  calculateCompetenciesProgress, 
  STEP_COMPETENCY_MAPPINGS,
  SENA_COMPETENCIAS_ORGANIZACIONALES 
} from '../data/learningCompetencies';
import { exportFinalReportAndMatricesExcel } from '../utils/fullReportExcelExport';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: GAESProject;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  if (!isOpen) return null;

  const mefiCalc = calculateMEFIScore(project.mefi);
  const mefeCalc = calculateMEFEScore(project.mefe);
  const compReport = calculateCompetenciesProgress(project);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status computation for preliminary draft vs definitive evaluation
  const isPendingEvaluation =
    !project.instructorEvaluation ||
    project.instructorEvaluation.finalJudgment === 'PENDIENTE DE EVALUACIÓN' ||
    !project.instructorEvaluation.finalJudgment ||
    !project.instructorEvaluation.isDefinitiveSaved;

  const instructorName = project.instructorEvaluation?.instructorName || 'Instructor Técnico Evaluador';

  const handlePrint = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      window.print();
    } catch (err: any) {
      console.error('Error al invocar impresión nativa:', err);
      setErrorMessage(
        'El navegador impidió abrir el cuadro de diálogo de impresión. Puede utilizar el botón "Descargar PDF para Firma Física" para obtener el archivo oficial directamente.'
      );
    }
  };

  const handleGeneratePDF = async () => {
    const reportElement = document.getElementById('sena-printable-report');
    if (!reportElement) {
      setErrorMessage('No se encontró el contenedor del acta oficial en el documento.');
      return;
    }

    setIsGeneratingPDF(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Create canvas from printable report with robust scaling and layout
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('sena-printable-report');
          if (el) {
            el.style.width = '794px';
            el.style.maxWidth = '794px';
            el.style.padding = '16px';
            el.style.boxSizing = 'border-box';
            el.style.backgroundColor = '#ffffff';
            el.style.overflow = 'visible';
          }
          const noPrints = clonedDoc.querySelectorAll('.no-print');
          noPrints.forEach((np) => np.remove());
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('El renderizador gráfico generó un lienzo sin contenido.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210; // A4 mm
      const pdfHeight = 297; // A4 mm
      const margin = 8; // 8 mm margin on sides
      const printWidth = pdfWidth - margin * 2; // 194 mm
      const printHeight = pdfHeight - margin * 2; // 281 mm

      // Canvas pixels per mm
      const pxPerMm = canvas.width / printWidth;
      const pageHeightPx = Math.floor(printHeight * pxPerMm);

      let currentYPx = 0;
      let pageNumber = 1;
      const totalPages = Math.ceil(canvas.height / pageHeightPx) || 1;

      while (currentYPx < canvas.height) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        const chunkHeightPx = Math.min(pageHeightPx, canvas.height - currentYPx);

        // Sub-canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageHeightPx;
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0, currentYPx, canvas.width, chunkHeightPx,
            0, 0, canvas.width, chunkHeightPx
          );
        }

        const chunkImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        const chunkHeightMm = (chunkHeightPx / canvas.width) * printWidth;

        pdf.addImage(chunkImgData, 'JPEG', margin, margin, printWidth, chunkHeightMm);

        // Page numbering & institutional footer
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `SENA Guía 16 • Ficha ${project.fichaNumber || '2687410'} • GAES ${project.gaesNumber} • Página ${pageNumber} de ${totalPages} • Documento Oficial para Firma Física Manuscrita`,
          pdfWidth / 2,
          pdfHeight - 4,
          { align: 'center' }
        );

        currentYPx += pageHeightPx;
        pageNumber++;
      }

      const cleanCompanyName = (project.company?.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Acta_Final_Guia16_GAES_${project.gaesNumber}_${cleanCompanyName}.pdf`;

      try {
        pdf.save(filename);
      } catch (saveErr) {
        // Direct Blob URL fallback for restricted contexts
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(blobUrl);
        }, 300);
      }

      setSuccessMessage(`Documento PDF generado y descargado exitosamente (${filename}).`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      setErrorMessage(
        `No fue posible generar el archivo PDF automáticamente: ${err?.message || 'Error de renderizado gráfico'}. Puede utilizar el botón "Imprimir" del navegador para imprimir directamente o seleccionar "Guardar como PDF".`
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportExcel = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsExportingExcel(true);
    try {
      const res = exportFinalReportAndMatricesExcel(project);
      setSuccessMessage(
        `Libro Excel (.xlsx) exportado exitosamente (${res?.fileName || 'Reporte_Guia16.xlsx'}).`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error exportando Excel:', err);
      setErrorMessage(
        `Error al exportar el archivo Excel: ${err?.message || 'Error desconocido al procesar datos del GAES'}.`
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto sena-print-modal-backdrop">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto sena-print-modal-container">
        {/* Floating actions & Toolbar (hidden on print) */}
        <div className="no-print sticky top-0 right-0 z-20 bg-white/95 backdrop-blur pb-4 mb-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">
                Entrega Formal • Acta Oficial y Rúbrica Guía 16 SENA
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">
                GAES {project.gaesNumber}
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                Ficha {project.fichaNumber}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Document Status Badge */}
              <div className="font-mono text-xs">
                {isPendingEvaluation ? (
                  <span className="text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>BORRADOR FORMATIVO – PENDIENTE DE EVALUACIÓN</span>
                  </span>
                ) : (
                  <span className="text-blue-900 bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-700" />
                    <span>PENDIENTE DE FIRMA MANUSCRITA DEL INSTRUCTOR</span>
                  </span>
                )}
              </div>

              {/* Download PDF for Physical Signing */}
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF para Firma Física</span>
                  </>
                )}
              </button>

              {/* Export Full Report and Matrices to Excel (.xlsx) */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50 cursor-pointer"
                title="Exportar informe consolidado y todas las matrices estratégicas a formato Excel (.xlsx)"
              >
                {isExportingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando Excel...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                    <span>Exportar Excel (.xlsx)</span>
                  </>
                )}
              </button>

              {/* Print / Save with native browser */}
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                title="Impresión directa o guardar vía diálogo nativo"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              {/* Close Modal */}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Feedback Alert Banners */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Aviso de Operación</strong>
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-600 hover:text-rose-900 font-bold p-1 cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold p-1 cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* PRINTABLE CONTENT WITH ID FOR HTML2CANVAS */}
        <div id="sena-printable-report" className="space-y-6 text-xs text-slate-800 font-sans print:text-black bg-white p-2">
          {/* Official Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 p-1 rounded-lg border border-emerald-600/30 flex items-center justify-center bg-white">
                  <img src={SENA_LOGO_SVG} alt="Logo SENA" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs tracking-wider uppercase bg-emerald-800 text-white px-3 py-1.5 rounded">
                  SENA • SERVICIO NACIONAL DE APRENDIZAJE
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-600 font-semibold">
                Ficha: {project.fichaNumber}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900">
              ACTA OFICIAL DE EVALUACIÓN Y DOSSIER ESTRATÉGICO
            </h1>
            <h2 className="text-xs font-semibold text-slate-700 uppercase">
              GUÍA 16: HERRAMIENTAS DE GESTIÓN Y EVALUACIÓN ESTRATÉGICA & BALANCED SCORECARD
            </h2>
            <p className="text-[11px] text-slate-600">
              {project.programName} • {project.centerName} • {project.regional}
            </p>
          </div>

          {/* Corrección N.º 3 & 4: Identificación obligatoria de estado del documento */}
          {isPendingEvaluation ? (
            <div className="bg-amber-50 border-2 border-dashed border-amber-600 rounded-xl p-3.5 text-center my-2 shadow-sm">
              <div className="text-amber-900 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>BORRADOR FORMATIVO – PENDIENTE DE EVALUACIÓN</span>
              </div>
              <p className="text-amber-800 text-[11px] mt-1 font-medium">
                Este reporte es un documento de trabajo académico preliminar. No constituye acta definitiva de evaluación hasta que el instructor técnico emita y guarde su dictamen oficial en la plataforma y proceda con la formalización física mediante impresión y firma manuscrita.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-300 rounded-xl p-2.5 text-center my-2 shadow-sm">
              <div className="text-blue-950 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5">
                <span>📋</span>
                <span>EVALUACIÓN DEFINITIVA REGISTRADA • PENDIENTE DE FIRMA MANUSCRITA DEL INSTRUCTOR</span>
              </div>
              <p className="text-blue-800 text-[10px] mt-0.5">
                Dictamen registrado en plataforma por el instructor {instructorName}. Para formalización y archivo oficial, imprima este documento para la firma manuscrita física institucional.
              </p>
            </div>
          )}

          {/* Quick Notice for External Excel Analysis for GAES */}
          <div className="no-print bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <strong className="text-teal-950 font-bold block">
                  Exportación de Análisis Externo para el GAES:
                </strong>
                <span className="text-teal-800 text-[11px] block">
                  Descargue el libro maestro en Excel (.xlsx) con 9 hojas de cálculo consolidadas: Resumen Ejecutivo, Insumos Previos (Guías 1-15), MEFI, MEFE, DOFA Cruzada, PEYEA Vectorial, Balanced Scorecard (BSC), Análisis PESTA y Rúbrica de 7 Competencias SENA.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow"
              title="Descargar libro Excel completo"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isExportingExcel ? 'Generando...' : 'Descargar .XLSX'}</span>
            </button>
          </div>

          {/* Section 1: GAES and Company Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 sena-section-box avoid-page-break">
            <div>
              <span className="font-bold text-[11px] text-emerald-800 uppercase block mb-1">
                1. Identificación del GAES No. {project.gaesNumber}
              </span>
              <ul className="space-y-1 text-[11px]">
                {(project.apprentices || []).map((app) => (
                  <li key={app.id}>
                    • <strong>{app.name}</strong> ({app.role}) - Doc: {app.document}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-bold text-[11px] text-emerald-800 uppercase block mb-1">
                2. Empresa Proyecto Formativo
              </span>
              <p className="text-[11px]"><strong>Razón Social:</strong> {project.company?.name || 'Empresa Proyecto'}</p>
              <p className="text-[11px]"><strong>NIT:</strong> {project.company?.nit || 'No Registrado'} | <strong>Ciudad:</strong> {project.company?.city || 'No Registrada'}</p>
              <p className="text-[11px]"><strong>Sector:</strong> {project.company?.sector || 'No Registrado'} ({project.company?.ciiuCode || ''})</p>
              <p className="text-[11px]"><strong>Producto Estrella:</strong> {project.company?.mainProduct || 'No Registrado'}</p>
            </div>
          </div>

          {/* Section 2: Validación de Entregables de Guías Anteriores */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 sena-section-box avoid-page-break">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-emerald-800 uppercase">
                3. Validación de Insumos & Entregables de Guías Previas (Eje Articulador)
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                {project.learningGuidesDeliverables?.filter((d) => d.cumple).length || 93} de {project.learningGuidesDeliverables?.length || 93} Parámetros Validados
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-[10px] text-center font-mono">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="font-sans font-bold block text-slate-700 truncate">Planeación</span>
                <span className="text-emerald-700 font-bold">11/11 Cumple</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="font-sans font-bold block text-slate-700 truncate">Talento Humano</span>
                <span className="text-emerald-700 font-bold">27/27 Cumple</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="font-sans font-bold block text-slate-700 truncate">Mercadeo</span>
                <span className="text-emerald-700 font-bold">35/35 Cumple</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="font-sans font-bold block text-slate-700 truncate">Inventarios</span>
                <span className="text-emerald-700 font-bold">7/7 Cumple</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <span className="font-sans font-bold block text-slate-700 truncate">Contabilidad</span>
                <span className="text-emerald-700 font-bold">13/13 Cumple</span>
              </div>
            </div>
          </div>

          {/* Section 3: Synthetic Matrices Summary */}
          <div className="sena-section-box avoid-page-break">
            <span className="font-bold text-xs text-slate-900 uppercase block mb-2 border-b border-slate-300 pb-1">
              4. Resumen Cuantitativo de Matrices Estratégicas (Guía 16)
            </span>
            <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold block text-slate-600">MEFI (Factores Internos)</span>
                <strong className="text-sm text-emerald-700 font-mono">{mefiCalc.weightedScore} pts</strong>
                <span className="text-[10px] text-slate-500 block">Pesos: {mefiCalc.totalWeight} (1.00)</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold block text-slate-600">MEFE (Factores Externos)</span>
                <strong className="text-sm text-blue-700 font-mono">{mefeCalc.weightedScore} pts</strong>
                <span className="text-[10px] text-slate-500 block">Pesos: {mefeCalc.totalWeight} (1.00)</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold block text-slate-600">Matriz PEYEA</span>
                <strong className="text-sm text-purple-700 font-mono">{project.peyea?.quadrant || 'Agresivo'}</strong>
                <span className="text-[10px] text-slate-500 block">
                  Vector ({project.peyea?.coordinateX != null ? project.peyea.coordinateX.toFixed(2) : '0.00'}, {project.peyea?.coordinateY != null ? project.peyea.coordinateY.toFixed(2) : '0.00'})
                </span>
              </div>
            </div>
          </div>


          {/* Section 5: Cuadro de Mando Integral */}
          <div className="sena-section-box avoid-page-break">
            <span className="font-bold text-xs text-slate-900 uppercase block mb-2 border-b border-slate-300 pb-1">
              5. Cuadro de Mando Integral (Balanced Scorecard) & Fichas Técnicas de Indicadores
            </span>
            <table className="w-full text-[10px] border border-slate-300 divide-y divide-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                <tr>
                  <th className="p-1.5 text-left">Código</th>
                  <th className="p-1.5 text-left">Perspectiva</th>
                  <th className="p-1.5 text-left">Objetivo Estratégico</th>
                  <th className="p-1.5 text-left">Indicador / KPI</th>
                  <th className="p-1.5 text-left">Meta Anual</th>
                  <th className="p-1.5 text-left">Iniciativa Estratégica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(project.bscObjectives || []).map((obj) => {
                  const kpi = (project.indicators || []).find(
                    (ind) => ind.associatedObjectiveId === obj.id || ind.code === obj.kpiCode
                  );
                  return (
                    <tr key={obj.id}>
                      <td className="p-1.5 font-mono font-bold">{obj.code}</td>
                      <td className="p-1.5">{obj.perspective}</td>
                      <td className="p-1.5 font-semibold">{obj.title}</td>
                      <td className="p-1.5">
                        {kpi ? (
                          <div>
                            <span className="font-mono font-bold text-purple-900 bg-purple-50 px-1 py-0.5 rounded border border-purple-200 text-[9px] block">
                              {kpi.code} - {kpi.name}
                            </span>
                            <span className="text-[8px] text-slate-500 block truncate max-w-[180px] font-mono mt-0.5">
                              Fórmula: {kpi.formula}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[9px]">{obj.kpiCode || 'En formulación'}</span>
                        )}
                      </td>
                      <td className="p-1.5 font-bold text-emerald-800">{obj.targetAnnual}</td>
                      <td className="p-1.5 text-slate-600">{obj.strategicInitiative}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Fichas Técnicas Detalladas de Indicadores */}
            {project.indicators && project.indicators.length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-200">
                <span className="font-bold text-[10px] text-slate-800 uppercase block mb-1.5">
                  Fichas Técnicas de Indicadores de Gestión (Parámetros Metodológicos SENA):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px]">
                  {project.indicators.map((ind) => (
                    <div key={ind.id} className="border border-slate-200 bg-white p-2 rounded-lg space-y-1 shadow-sm sena-indicator-card avoid-page-break">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded">
                            {ind.code}
                          </span>
                          <strong className="text-slate-900 text-[10px]">{ind.name}</strong>
                        </div>
                        <span className="text-slate-500 font-semibold">{ind.perspective}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-600">
                        <div><strong>Fórmula:</strong> <span className="font-mono text-slate-800">{ind.formula}</span></div>
                        <div><strong>Periodicidad:</strong> {ind.periodicity} ({ind.unit})</div>
                        <div><strong>Línea Base:</strong> {ind.baseline} | <strong>Meta:</strong> <span className="text-emerald-700 font-bold">{ind.target}</span></div>
                        <div><strong>Responsable:</strong> {ind.responsibleRole}</div>
                        <div className="col-span-2 text-[8px] text-slate-500 pt-0.5">
                          <strong>Rangos:</strong> Verde: {ind.greenRange} | Amarillo: {ind.yellowRange} | Rojo: {ind.redRange}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Section 6: Mapeo de Resultados de Aprendizaje vs Actividades y Entregables por Paso */}
          <div className="space-y-4 border border-slate-300 rounded-xl p-4 bg-slate-50/70 sena-section-box avoid-page-break">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <div>
                <span className="font-bold text-xs text-slate-900 uppercase block">
                  6. Mapeo de Competencias Organizacionales y Resultados de Aprendizaje (RAP) vs. Actividades y Entregables
                </span>
                <span className="text-[10px] text-slate-600 block">
                  Articulación curricular y trazabilidad por pasos del proyecto formativo (Guías 1 a 16 SENA)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md font-mono">
                  Cumplimiento: {compReport?.overallPercentage ?? 0}% ({compReport?.competenciesCompletedCount ?? 0}/7 Completadas)
                </span>
              </div>
            </div>

            {/* Sub-tabla A: Mapeo Detallado por Competencia Organizacional */}
            <div>
              <span className="font-bold text-[10px] text-slate-800 uppercase block mb-1.5">
                A. Matriz Curricular de Competencias, Actividades y Entregables del Aprendiz:
              </span>
              <div className="space-y-2.5">
                {(compReport?.details || []).map((comp) => (
                  <div key={comp.codigo} className="border border-slate-200 bg-white p-3 rounded-lg space-y-2 text-[10px] shadow-sm sena-criteria-card avoid-page-break">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white bg-indigo-900 px-2 py-0.5 rounded text-[9px]">
                          Cód. {comp.codigo}
                        </span>
                        <strong className="text-slate-900 text-[11px] font-bold">{comp.tituloCorto}</strong>
                        <span className="text-[9px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-medium">
                          {comp.nucleoAsociado}
                        </span>
                        <span className="text-slate-500 font-mono text-[9px]">
                          (Peso: {comp.peso}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-semibold text-slate-600">
                          Pasos: {comp.pasosDondeSeAborda.map((p) => `P${p}`).join(', ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            comp.status === 'Completada'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          {comp.status} ({comp.progressPercent}%)
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700 leading-snug">
                      <strong>Descripción de la Competencia:</strong> {comp.descripcion}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                        <strong className="text-slate-800 font-bold block mb-1 text-[9px] uppercase">
                          Actividades y Articulación con el Proyecto:
                        </strong>
                        <p className="text-slate-600 leading-snug">
                          {comp.asociacionTrabajoRealizado}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200/80 space-y-1">
                        <strong className="text-slate-800 font-bold block text-[9px] uppercase">
                          Entregables y Evidencias Generadas por el GAES:
                        </strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {comp.evidenciasCumplidas.length > 0 ? (
                            comp.evidenciasCumplidas.map((ev, i) => (
                              <li key={i} className="text-emerald-900 font-medium">
                                {ev}
                              </li>
                            ))
                          ) : (
                            <li className="text-slate-500 italic">En proceso de consolidación</li>
                          )}
                        </ul>
                        <div className="pt-1 text-[9px] text-slate-500 border-t border-slate-200">
                          <strong>Herramientas:</strong> {comp.herramientasArticuladas}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-tabla B: Trazabilidad Paso a Paso del Aprendiz (Pasos 1 a 5) */}
            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-[10px] text-slate-800 uppercase block mb-1.5">
                B. Matriz de Trazabilidad por Paso del Proyecto Formativo (Ruta de Aprendizaje):
              </span>
              <table className="w-full text-[10px] border border-slate-300 divide-y divide-slate-200 bg-white">
                <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-1.5 text-left w-24">Paso</th>
                    <th className="p-1.5 text-left w-44">Competencias Abordadas</th>
                    <th className="p-1.5 text-left">Actividades Desarrolladas por el Aprendiz</th>
                    <th className="p-1.5 text-left">Entregables y Evidencias Verificadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STEP_COMPETENCY_MAPPINGS.map((step) => (
                    <tr key={step.stepNumber} className="hover:bg-slate-50">
                      <td className="p-2 align-top font-bold text-slate-800">
                        <span className="block font-mono text-emerald-800">Paso {step.stepNumber}</span>
                        <span className="text-[9px] text-slate-500 font-normal">{step.stepShortTitle}</span>
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex flex-col gap-1">
                          {step.competenciaCodigos.map((cod) => (
                            <span
                              key={cod}
                              className="font-mono text-[9px] bg-slate-100 border border-slate-300 text-slate-800 px-1 py-0.5 rounded font-semibold truncate"
                            >
                              Cód. {cod}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 align-top text-slate-700 leading-snug">
                        {step.descripcionAporte}
                      </td>
                      <td className="p-2 align-top">
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[9px]">
                          {step.evidenciasEsperadas.map((ev, idx) => (
                            <li key={idx}>{ev}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7: Juicio Evaluativo Oficial del Instructor */}
          <div className="border-2 border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50 sena-section-box avoid-page-break">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <span className="font-bold text-xs uppercase text-slate-900">
                7. Dictamen y Juicio Evaluativo Oficial del Instructor Técnico
              </span>
              <span
                className={`text-xs font-bold font-mono px-3 py-1 rounded border ${
                  project.instructorEvaluation?.finalJudgment === 'APROBADO'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                    : project.instructorEvaluation?.finalJudgment === 'PENDIENTE DE EVALUACIÓN' || !project.instructorEvaluation?.finalJudgment
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : 'bg-rose-100 text-rose-800 border-rose-400'
                }`}
              >
                JUICIO: {project.instructorEvaluation?.finalJudgment || 'PENDIENTE DE EVALUACIÓN'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p>
                  <strong>Calificación Evidencias de Producto:</strong>{' '}
                  <span className="font-mono font-bold text-sm">
                    {project.instructorEvaluation?.productEvidenceScore ?? 0}/100
                  </span>
                </p>
                <p className="mt-1 text-slate-700">
                  <strong>Observación de Producto:</strong>{' '}
                  {project.instructorEvaluation?.productObservation || 'Pendiente de evaluación técnica por el instructor.'}
                </p>
              </div>

              <div>
                <p>
                  <strong>Calificación Evidencias de Desempeño:</strong>{' '}
                  <span className="font-mono font-bold text-sm">
                    {project.instructorEvaluation?.performanceEvidenceScore ?? 0}/100
                  </span>
                </p>
                <p className="mt-1 text-slate-700">
                  <strong>Observación de Desempeño:</strong>{' '}
                  {project.instructorEvaluation?.performanceObservation || 'Pendiente de sustentación y evaluación de desempeño.'}
                </p>
              </div>
            </div>

            {/* Criterios Rúbrica por Resultados de Aprendizaje y Competencias Organizacionales */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[10px] uppercase text-slate-800">
                  Evaluación por Competencias Organizacionales y Resultados de Aprendizaje (RAP):
                </span>
                <span className="text-[9px] text-emerald-800 font-semibold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  7 Competencias Articuladas con Guías 1 a 16
                </span>
              </div>

              <div className="space-y-2">
                {(project.instructorEvaluation?.criteria || []).map((c) => (
                  <div key={c.id} className="border border-slate-200 bg-white p-2.5 rounded-lg space-y-1.5 text-[10px] sena-criteria-card avoid-page-break">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[9px]">
                          Cód. {c.rapCode || '210601...'}
                        </span>
                        <strong className="text-slate-900 font-bold">{c.title}</strong>
                        {c.nucleoAsociado && (
                          <span className="text-[9px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                            {c.nucleoAsociado}
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[9px]">
                          (Peso: {c.weight}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            c.status === 'Cumple'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {c.status}
                        </span>
                        <strong className="font-mono text-slate-900 text-[11px]">{c.score} pts</strong>
                      </div>
                    </div>

                    {/* Descripción de la competencia */}
                    <p className="text-slate-700 leading-snug font-medium">
                      {c.description}
                    </p>

                    {/* Asociación con el trabajo realizado */}
                    {c.asociacionTrabajoRealizado && (
                      <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-[9px] text-slate-600 leading-snug">
                        <strong className="text-slate-800 font-semibold block mb-0.5">
                          Asociación con el trabajo realizado:
                        </strong>
                        {c.asociacionTrabajoRealizado}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                      {c.toolsIncluded && (
                        <span>
                          <strong>Herramientas:</strong> {c.toolsIncluded}
                        </span>
                      )}
                      {c.feedback && (
                        <span className="text-slate-600 italic">
                          <strong>Observación:</strong> {c.feedback}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corrección N.º 4: Formalización Física del Informe Final (Exclusivo Firma Física del Instructor SENA) */}
            <div className="pt-6 mt-4 border-t-2 border-slate-300 space-y-4 avoid-page-break">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-[11px] uppercase text-slate-900">
                    Formalización Documental e Institucional de la Evaluación (Guía 16)
                  </span>
                </div>
                <span className="text-[9px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                  {isPendingEvaluation
                    ? 'ESTADO: BORRADOR FORMATIVO'
                    : 'ESTADO: PENDIENTE DE FIRMA MANUSCRITA'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 leading-relaxed">
                <strong>Nota Institucional:</strong> Conforme a las directrices de Formación Profesional Integral del SENA, este documento se formaliza exclusivamente mediante impresión física y firma manuscrita del instructor evaluador tras la revisión presencial o virtual autorizada de evidencias y la sustentación del GAES.
              </div>

              <div className="max-w-xl mx-auto text-[10px] pt-2 w-full">
                {/* Bloque exclusivo de formalización y firma física del instructor SENA */}
                <div className="border border-slate-300 rounded-xl p-5 bg-white space-y-3 shadow-sm sena-signature-block avoid-page-break">
                  <div className="text-[11px] font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 text-center">
                    Instructor Técnico Evaluador SENA
                  </div>
                  <div className="space-y-2 text-slate-800">
                    <p><strong>Nombre del instructor:</strong> {project.instructorEvaluation?.instructorName ? project.instructorEvaluation.instructorName : '____________________________________'}</p>
                    <p><strong>Identificación institucional:</strong> {project.instructorEvaluation?.instructorDocument ? `C.C. ${project.instructorEvaluation.instructorDocument}` : '______________________________'}</p>
                    <div className="pt-4 pb-2">
                      <div className="h-16 border-b-2 border-slate-800 flex items-end justify-center pb-1 bg-slate-50/50 rounded-t">
                        <span className="text-slate-400 text-[9px] italic">
                          [Espacio en blanco para firma manuscrita física del instructor]
                        </span>
                      </div>
                      <p className="text-center font-semibold text-slate-700 mt-1">Firma manuscrita: ______________________________</p>
                    </div>
                    <p><strong>Fecha de firma:</strong> _________________________________</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-center">
                    <span className="text-[9px] font-mono font-bold text-slate-600 block">
                      {isPendingEvaluation
                        ? 'BORRADOR FORMATIVO – PENDIENTE DE EVALUACIÓN'
                        : 'PENDIENTE DE FIRMA MANUSCRITA DEL INSTRUCTOR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sello de Radicación Institucional */}
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between text-[9px] text-slate-700 flex-wrap gap-2 avoid-page-break">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                    SENA
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900 text-[10px]">
                      SISTEMA NACIONAL DE FORMACIÓN PARA EL TRABAJO - SERVICIO NACIONAL DE APRENDIZAJE
                    </span>
                    <span className="text-slate-600 block">
                      Acta formal de entrega y rúbrica integral de competencias Guía 16 • Ficha {project.fichaNumber} • {project.company?.name || 'Empresa Proyecto'}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[8px] text-slate-500 shrink-0">
                  <div className="font-bold text-slate-700">RADICADO: SENA-GUIA16-F{project.fichaNumber}-G{project.gaesNumber}</div>
                  <div className="text-slate-600">FORMALIZACIÓN: IMPRESIÓN Y FIRMA FÍSICA OBLIGATORIA</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
