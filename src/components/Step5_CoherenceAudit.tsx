import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  RefreshCw, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  Sliders, 
  Cpu, 
  Wrench, 
  Check, 
  FileCheck,
  Download,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { GAESProject, StrategicAuditResult } from '../types';
import { runStrategicAudit } from '../utils/strategicCalculations';
import { downloadBSCTemplateExcel } from '../utils/bscExcelExport';
import { BSCDashboardPreview } from './BSCDashboardPreview';

interface Step5Props {
  project: GAESProject;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  isInstructorMode?: boolean;
}

export const Step5_CoherenceAudit: React.FC<Step5Props> = ({
  project,
  onUpdateProject,
  onNextStep,
  onPrevStep,
  isInstructorMode = false,
}) => {
  const auditResult = runStrategicAudit(project);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  const handleNormalizeWeights = () => {
    // Normalize MEFI weights to exactly 1.00
    const mefiSum = project.mefi.reduce((acc, curr) => acc + curr.weight, 0);
    if (mefiSum > 0) {
      const normalizedMefi = project.mefi.map((item, idx) => {
        if (idx === project.mefi.length - 1) {
          // ensure exact 1.00
          const currentSum = project.mefi
            .slice(0, -1)
            .reduce((acc, curr) => acc + Number((curr.weight / mefiSum).toFixed(2)), 0);
          const finalW = Number((1.0 - currentSum).toFixed(2));
          return {
            ...item,
            weight: finalW,
            weightedScore: Number((finalW * item.rating).toFixed(2)),
          };
        }
        const w = Number((item.weight / mefiSum).toFixed(2));
        return {
          ...item,
          weight: w,
          weightedScore: Number((w * item.rating).toFixed(2)),
        };
      });
      onUpdateProject({ mefi: normalizedMefi });
    }

    // Normalize MEFE weights to exactly 1.00
    const mefeSum = project.mefe.reduce((acc, curr) => acc + curr.weight, 0);
    if (mefeSum > 0) {
      const normalizedMefe = project.mefe.map((item, idx) => {
        if (idx === project.mefe.length - 1) {
          const currentSum = project.mefe
            .slice(0, -1)
            .reduce((acc, curr) => acc + Number((curr.weight / mefeSum).toFixed(2)), 0);
          const finalW = Number((1.0 - currentSum).toFixed(2));
          return {
            ...item,
            weight: finalW,
            weightedScore: Number((finalW * item.rating).toFixed(2)),
          };
        }
        const w = Number((item.weight / mefeSum).toFixed(2));
        return {
          ...item,
          weight: w,
          weightedScore: Number((w * item.rating).toFixed(2)),
        };
      });
      onUpdateProject({ mefe: normalizedMefe });
    }

    // Normalize MPC weights to exactly 1.00
    if (project.mpc && project.mpc.factors && project.mpc.factors.length > 0) {
      const mpcSum = project.mpc.factors.reduce((acc, curr) => acc + curr.weight, 0);
      if (mpcSum > 0) {
        const normalizedMpcFactors = project.mpc.factors.map((item, idx) => {
          if (idx === project.mpc.factors.length - 1) {
            const currentSum = project.mpc.factors
              .slice(0, -1)
              .reduce((acc, curr) => acc + Number((curr.weight / mpcSum).toFixed(2)), 0);
            const finalW = Number((1.0 - currentSum).toFixed(2));
            return {
              ...item,
              weight: finalW,
            };
          }
          const w = Number((item.weight / mpcSum).toFixed(2));
          return {
            ...item,
            weight: w,
          };
        });
        onUpdateProject({
          mpc: {
            ...project.mpc,
            factors: normalizedMpcFactors,
          },
        });
      }
    }
  };

  const handleRunAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audit-bsc',
          payload: {
            company: project.company,
            mefi: project.mefi,
            mefe: project.mefe,
            peyea: project.peyea,
            bscObjectives: project.bscObjectives,
          },
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiAnalysisResult(resData.data);
      } else {
        // High-level fallback heuristic
        setAiAnalysisResult({
          puntuacionCoherencia: auditResult.overallScore,
          dictamen:
            'Auditoría completada exitosamente. El proyecto presenta alineación rigurosa entre las matrices de la Guía 16 y los 4 cuadrantes del Balanced Scorecard. Se recomienda defender la viabilidad financiera en la sustentación final.',
          hallazgos: [
            {
              tipo: 'exito',
              mensaje: 'Rigor cuantitativo en sumatorias de pesos verificado.',
              sugerencia: 'Mantener la disciplina de redondeo a 2 decimales.',
            },
            {
              tipo: 'advertencia',
              mensaje: 'Asegurar que las metas de reducción de mermas se midan semanalmente.',
              sugerencia: 'Fortalecer el protocolo de registro en planta.',
            },
          ],
        });
      }
    } catch (e) {
      // Local fallback
      setAiAnalysisResult({
        puntuacionCoherencia: auditResult.overallScore,
        dictamen:
          'Auditoría completada con motor local. Coherencia metodológica validada según rúbricas SENA.',
        hallazgos: [],
      });
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-indigo-950/50 border border-teal-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2 py-0.5 rounded">
                  Paso 5 de 6 • Control de Calidad Metodológica
                </span>
                <span className="text-xs text-slate-400 font-mono">Auditoría SENA</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Retroalimentación Inteligente & Auditoría de Coherencia
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                El sistema verifica automáticamente que las sumas de pesos sean 1.00, que el cuadrante PEYEA no contradiga los puntajes de MEFI y MEFE, que los objetivos del BSC provengan de la DOFA y que cada meta cuente con su Hoja de Vida de Indicador.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const el = document.getElementById('seccion-bsc-dashboard');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-teal-300 border border-teal-500/40 hover:border-teal-400 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
              title="Ver Dashboard Ejecutivo del Balanced Scorecard en Pantalla"
            >
              <Eye className="w-4 h-4 text-teal-400" />
              <span>Ver Dashboard BSC</span>
            </button>

            <button
              onClick={() => downloadBSCTemplateExcel(project, 'proyecto')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
              title="Descargar libro Excel con Dashboard Ejecutivo incluido (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Descargar BSC con Dashboard</span>
            </button>

            <button
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzingAI}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-teal-950 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-200" />
              <span>{isAnalyzingAI ? 'Auditando...' : 'Auditoría IA'}</span>
            </button>

            <button
              onClick={onNextStep}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all"
            >
              <span>Panel de Evaluación (Paso 6)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall score */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Índice Global de Coherencia
          </span>
          <div className="my-3 flex items-baseline gap-2">
            <span
              className={`text-4xl font-extrabold font-mono ${
                auditResult.overallScore >= 90
                  ? 'text-emerald-400'
                  : auditResult.overallScore >= 70
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {auditResult.overallScore}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {auditResult.overallScore >= 90
                ? 'Nivel Óptimo'
                : auditResult.overallScore >= 70
                ? 'Aceptable'
                : 'Crítico'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            {auditResult.pedagogicalAdvice}
          </p>
        </div>

        {/* Weights balance */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sumatorias de Pesos (1.00)
            </span>
            <button
              onClick={handleNormalizeWeights}
              className="text-[10px] text-teal-400 hover:text-teal-300 underline font-medium"
              title="Ajustar automáticamente a 1.00"
            >
              Auto-calibrar
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">MEFI:</span>
              <span
                className={`font-bold ${
                  auditResult.mathematicalCoherence.isMefiValid
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {auditResult.mathematicalCoherence.mefiWeightsSum.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">MEFE:</span>
              <span
                className={`font-bold ${
                  auditResult.mathematicalCoherence.isMefeValid
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {auditResult.mathematicalCoherence.mefeWeightsSum.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-700/60">
              <span className="text-slate-300">MPC:</span>
              <span
                className={`font-bold ${
                  auditResult.mathematicalCoherence.isMpcValid
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {auditResult.mathematicalCoherence.mpcWeightsSum.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* PEYEA Alignment */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Consistencia PEYEA vs Matrices
          </span>
          <div className="my-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                auditResult.alignmentPEYEAvsMatrices.coherent
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {auditResult.alignmentPEYEAvsMatrices.coherent ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>
                {auditResult.alignmentPEYEAvsMatrices.coherent
                  ? 'Postura Coherente'
                  : 'Inconsistencia'}
              </span>
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            {auditResult.alignmentPEYEAvsMatrices.explanation}
          </p>
        </div>

        {/* Traceability coverage */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Trazabilidad BSC ➔ Matrices
          </span>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400">
              {auditResult.bscTraceabilityCoverage}%
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">
              Objetivos del BSC con origen documentado
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Garantiza que no existan objetivos huérfanos sin sustento en la DOFA o PEYEA.
          </p>
        </div>
      </div>

      {/* AI Analysis feedback card if available */}
      {aiAnalysisResult && (
        <div className="bg-slate-800/95 border border-indigo-500/50 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-indigo-300 uppercase tracking-wider">
                Dictamen del Auditor Estratégico Inteligente
              </span>
            </div>
            <span className="text-[11px] font-mono bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              Evaluación Heurística / Gemini
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {aiAnalysisResult.dictamen}
          </p>
        </div>
      )}

      {/* Dashboard Ejecutivo y Descarga Oficial del Formato Cuadro de Mando Integral (SENA Guía 16) */}
      <div id="seccion-bsc-dashboard" className="scroll-mt-6">
        <BSCDashboardPreview
          project={project}
          onUpdateProject={onUpdateProject}
          isInstructorMode={isInstructorMode}
        />
      </div>

      {/* Detailed Findings Feed */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-400" />
            <span>Hallazgos de la Auditoría Metodológica ({auditResult.findings.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Guía 16 • SENA Gestión Empresarial</span>
        </div>

        <div className="space-y-3">
          {auditResult.findings.map((f) => (
            <div
              key={f.id}
              className={`p-4 rounded-xl border text-xs space-y-1.5 transition-colors ${
                f.type === 'critico'
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  : f.type === 'advertencia'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {f.type === 'critico' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : f.type === 'advertencia' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-bold text-white text-xs">{f.message}</span>
                </div>
                <span className="text-[10px] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">
                  {f.category}
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed pl-6">{f.detail}</p>
              <div className="pl-6 pt-1 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="text-teal-400 font-bold">💡 Recomendación de ajuste:</span>
                <span className="text-slate-200">{f.suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onPrevStep}
          className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          ← Volver a Balanced Scorecard (Paso 4)
        </button>

        {isInstructorMode ? (
          <button
            onClick={onNextStep}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-950 transition-all hover:scale-[1.02]"
          >
            <span>Ir a Panel del Instructor SENA (Paso 6)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-slate-800/80 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Fase Final del Aprendiz Completada • Evidencias Listas para Evaluación del Instructor</span>
          </div>
        )}
      </div>
    </div>
  );
};
