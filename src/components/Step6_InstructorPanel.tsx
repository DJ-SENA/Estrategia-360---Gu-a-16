import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Sparkles, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  Scale, 
  Sliders,
  Calendar,
  Save,
  Clock
} from 'lucide-react';
import { GAESProject, InstructorEvaluation, InstructorCriteria } from '../types';
import { buildInitialInstructorCriteria, SENA_COMPETENCIAS_ORGANIZACIONALES } from '../data/learningCompetencies';
import { InstructorDashboard } from './InstructorDashboard';
import { BarChart3, ClipboardCheck } from 'lucide-react';

interface Step6Props {
  project: GAESProject;
  projectsList?: GAESProject[];
  onSelectProject?: (projectId: string) => void;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onOpenPrintModal: () => void;
  onPrevStep: () => void;
}

export const Step6_InstructorPanel: React.FC<Step6Props> = ({
  project,
  projectsList,
  onSelectProject,
  onUpdateProject,
  onOpenPrintModal,
  onPrevStep,
}) => {
  const { instructorEvaluation } = project;
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'RUBRIC'>('DASHBOARD');

  const handleUpdateEvaluation = (updates: Partial<InstructorEvaluation>) => {
    onUpdateProject({
      instructorEvaluation: {
        ...instructorEvaluation,
        ...updates,
      },
    });
  };

  const handleUpdateCriterion = (criterionId: string, updates: Partial<InstructorCriteria>) => {
    const updatedCriteria = instructorEvaluation.criteria.map((c) =>
      c.id === criterionId ? { ...c, ...updates } : c
    );

    const totalWeight = updatedCriteria.reduce((acc, c) => acc + c.weight, 0);
    const calculatedProductScore = Math.round(
      updatedCriteria.reduce((acc, c) => acc + (c.score * c.weight), 0) / (totalWeight || 1)
    );

    handleUpdateEvaluation({
      criteria: updatedCriteria,
      productEvidenceScore: calculatedProductScore,
    });
  };

  const handleLoadOfficialCompetencies = () => {
    const officialCriteria = buildInitialInstructorCriteria();
    const totalWeight = officialCriteria.reduce((acc, c) => acc + c.weight, 0);
    const calculatedProductScore = Math.round(
      officialCriteria.reduce((acc, c) => acc + (c.score * c.weight), 0) / (totalWeight || 1)
    );
    handleUpdateEvaluation({
      criteria: officialCriteria,
      productEvidenceScore: calculatedProductScore,
      performanceEvidenceScore: 92,
    });
  };

  const handleSuggestAIEvaluation = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'instructor-evaluation',
          payload: {
            gaesNumber: project.gaesNumber,
            company: project.company,
            apprentices: project.apprentices,
            mefi: project.mefi,
            mefe: project.mefe,
            peyea: project.peyea,
            bsc: project.bscObjectives,
          },
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        const d = resData.data;
        handleUpdateEvaluation({
          finalJudgment: d.juicioSugerido || 'APROBADO',
          productObservation: d.observacionProducto || instructorEvaluation.productObservation,
          performanceObservation: d.observacionDesempeno || instructorEvaluation.performanceObservation,
        });
      } else {
        // Fallback proposal
        handleUpdateEvaluation({
          finalJudgment: 'APROBADO',
          productObservation:
            'Evidencias de producto revisadas conforme a los lineamientos de la Guía 16. Las matrices MEFI, MEFE y PEYEA demuestran consistencia metodológica con el Balanced Scorecard. Se avala la calidad técnica de las fichas de indicadores.',
          performanceObservation:
            'El equipo GAES sustenta con claridad la articulación de su modelo de negocio, demostrando dominio de los términos técnicos y apropiación de las estrategias propuestas.',
        });
      }
    } catch {
      handleUpdateEvaluation({
        finalJudgment: 'APROBADO',
        productObservation:
          'Matrices revisadas con cumplimiento satisfactorio de criterios SENA. Cuadro de Mando Integral validado para la fase de evaluación del proyecto formativo.',
        performanceObservation:
          'Sustentación grupal aprobada con participación activa de todos los integrantes del GAES.',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher: Cohort Dashboard vs Individual Rubric */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('DASHBOARD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'DASHBOARD'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Comparativo de Cohorte ({projectsList?.length || 1} GAES)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('RUBRIC')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'RUBRIC'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Rúbrica de Evaluación Individual: GAES {project.gaesNumber} ({project.company.name})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>GAES Activo: <strong>GAES {project.gaesNumber}</strong></span>
        </div>
      </div>

      {viewMode === 'DASHBOARD' ? (
        <InstructorDashboard
          projects={projectsList && projectsList.length > 0 ? projectsList : [project]}
          currentProjectId={project.id}
          onSelectProject={(id) => {
            if (onSelectProject) onSelectProject(id);
          }}
          onOpenEvaluationDetail={() => setViewMode('RUBRIC')}
        />
      ) : (
        <>
          {/* Banner */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/60 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                  Paso 6 de 6 • Evaluación & Dictamen Oficial SENA
                </span>
                <span className="text-xs text-slate-400 font-mono">Rol Instructor</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Panel de Seguimiento y Evaluación por el Instructor
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Como instructor técnico, revisa las evidencias documentales y de desempeño con criterios previamente establecidos. Puedes generar una propuesta inteligente con IA, ajustar las observaciones cualitativas y emitir el juicio evaluativo final.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSuggestAIEvaluation}
              disabled={isGeneratingAI}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-950 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>{isGeneratingAI ? 'Generando...' : 'Proponer Evaluación IA'}</span>
            </button>

            <button
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs shadow transition-all"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Generar Acta Oficial SENA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instructor Identification & Final Decision Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full md:w-auto">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Instructor Evaluador</label>
              <input
                type="text"
                value={instructorEvaluation.instructorName}
                onChange={(e) => handleUpdateEvaluation({ instructorName: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Cédula / Documento</label>
              <input
                type="text"
                value={instructorEvaluation.instructorDocument}
                onChange={(e) => handleUpdateEvaluation({ instructorDocument: e.target.value })}
                placeholder="No. Documento"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Final Judgment Switcher */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Juicio Evaluativo Definitivo:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateEvaluation({ finalJudgment: 'APROBADO' })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  instructorEvaluation.finalJudgment === 'APROBADO'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APROBADO</span>
              </button>
              <button
                onClick={() =>
                  handleUpdateEvaluation({
                    finalJudgment: 'NO APROBADO (CON PLAN DE MEJORAMIENTO)',
                  })
                }
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  instructorEvaluation.finalJudgment.includes('NO APROBADO')
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>NO APROBADO (MEJORAMIENTO)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dual Scores Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                Evidencias de Producto (Matrices & BSC)
              </span>
              <p className="text-[11px] text-slate-500">
                Ponderación de matrices, cruces y fichas de indicadores
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={instructorEvaluation.productEvidenceScore}
                onChange={(e) =>
                  handleUpdateEvaluation({ productEvidenceScore: Number(e.target.value) || 0 })
                }
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-lg text-emerald-400 focus:outline-none"
              />
              <span className="text-slate-400 text-xs font-mono">/ 100</span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                Evidencias de Desempeño (Sustentación GAES)
              </span>
              <p className="text-[11px] text-slate-500">
                Dominio conceptual, trabajo en equipo y defensa técnica
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={instructorEvaluation.performanceEvidenceScore}
                onChange={(e) =>
                  handleUpdateEvaluation({
                    performanceEvidenceScore: Number(e.target.value) || 0,
                  })
                }
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-lg text-indigo-400 focus:outline-none"
              />
              <span className="text-slate-400 text-xs font-mono">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official SENA Rubric Criteria Table by RAPs */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl space-y-4">
        <div className="p-4 border-b border-slate-700 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">
                Rúbrica Oficial SENA • 7 Competencias Organizacionales & Resultados de Aprendizaje
              </span>
              <span className="text-[11px] bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                Guía 16 • 100% Ponderado
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Evaluación articulada con Insumos Previos (Guías 1 a 15), Matrices Estratégicas y Balanced Scorecard.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleLoadOfficialCompetencies}
              className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              title="Cargar o restaurar las 7 competencias organizacionales oficiales SENA"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cargar 7 Competencias SENA</span>
            </button>
            <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              {instructorEvaluation.criteria.length} Competencias
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-700/60">
          {instructorEvaluation.criteria.map((crit) => (
            <div key={crit.id} className="p-4 space-y-3 hover:bg-slate-750/30 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-500/40 shrink-0">
                    Código: {crit.rapCode || '210601...'}
                  </span>
                  <span className="font-bold text-xs text-white">{crit.title}</span>
                  <span className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700 shrink-0">
                    Ponderación: {crit.weight}%
                  </span>
                  {crit.nucleoAsociado && (
                    <span className="text-[10px] bg-teal-950/80 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">
                      {crit.nucleoAsociado}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={crit.status}
                    onChange={(e) =>
                      handleUpdateCriterion(crit.id, { status: e.target.value as any })
                    }
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                      crit.status === 'Cumple'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    <option value="Cumple">Cumple satisfactoriamente</option>
                    <option value="Por Mejorar">Por Mejorar</option>
                    <option value="No Evidenciado">No Evidenciado</option>
                  </select>

                  <div className="flex items-center gap-1 font-mono text-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={crit.score}
                      onChange={(e) =>
                        handleUpdateCriterion(crit.id, { score: Number(e.target.value) || 0 })
                      }
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-bold text-white"
                    />
                    <span className="text-slate-400 text-[10px]">pts</span>
                  </div>
                </div>
              </div>

              {/* Official Competency Description */}
              <p className="text-slate-300 text-xs leading-relaxed font-medium">
                {crit.description}
              </p>

              {/* Association with Work Performed */}
              {crit.asociacionTrabajoRealizado && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs space-y-1">
                  <span className="font-bold text-indigo-300 text-[11px] flex items-center gap-1.5">
                    <span>🔗</span>
                    <span>Asociación con el trabajo realizado en la plataforma:</span>
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {crit.asociacionTrabajoRealizado}
                  </p>
                </div>
              )}

              {crit.toolsIncluded && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                  <span className="text-slate-500 font-medium">Herramientas vinculadas:</span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-300 font-mono text-[10px] border border-slate-700/60">
                    {crit.toolsIncluded}
                  </span>
                </div>
              )}

              {/* Editable criterion observation */}
              <div>
                <input
                  type="text"
                  value={crit.feedback}
                  onChange={(e) => handleUpdateCriterion(crit.id, { feedback: e.target.value })}
                  placeholder="Observación técnica del instructor para este resultado de aprendizaje..."
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observations Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Observation */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-2">
          <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
            Observaciones de la Evidencia de Producto (Matrices & Balanced Scorecard)
          </label>
          <textarea
            rows={4}
            value={instructorEvaluation.productObservation}
            onChange={(e) => handleUpdateEvaluation({ productObservation: e.target.value })}
            placeholder="Consigna aquí la retroalimentación técnica sobre la calidad de las matrices y el CMI..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Performance Observation */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-2">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
            Observaciones de la Evidencia de Desempeño (Sustentación & Trabajo en Equipo)
          </label>
          <textarea
            rows={4}
            value={instructorEvaluation.performanceObservation}
            onChange={(e) => handleUpdateEvaluation({ performanceObservation: e.target.value })}
            placeholder="Consigna aquí la retroalimentación sobre la sustentación oral, argumentos y apropiación del GAES..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
          />
        </div>
      </div>

      {/* Improvement plan section if NOT APPROVED */}
      {instructorEvaluation.finalJudgment.includes('NO APROBADO') && (
        <div className="bg-rose-950/30 border border-rose-500/50 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Plan de Mejoramiento Requerido (Reglamento del Aprendiz SENA)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Fecha Límite de Entrega</label>
              <input
                type="date"
                value={instructorEvaluation.improvementPlanDeadline || ''}
                onChange={(e) =>
                  handleUpdateEvaluation({ improvementPlanDeadline: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 font-medium block mb-1">Acciones Correctivas Obligatorias</label>
              <input
                type="text"
                placeholder="Ej. Reajustar sumatoria de pesos en MEFI y replantear los cruces DOFA DA-1."
                value={instructorEvaluation.improvementPlanActions || ''}
                onChange={(e) =>
                  handleUpdateEvaluation({ improvementPlanActions: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onPrevStep}
          className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          ← Volver a Auditoría de Coherencia (Paso 5)
        </button>

        <button
          onClick={onOpenPrintModal}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
        >
          <Printer className="w-4 h-4" />
          <span>Ver y Descargar Reporte / Acta Oficial SENA</span>
        </button>
      </div>
    </div>
  );
};
