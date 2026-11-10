import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  FileCheck, 
  Target, 
  Grid3X3, 
  Compass, 
  BookOpen,
  Info,
  Check
} from 'lucide-react';
import { GAESProject } from '../types';
import { 
  calculateCompetenciesProgress, 
  CompetencyProgressDetail,
  STEP_COMPETENCY_MAPPINGS 
} from '../data/learningCompetencies';

interface ApprenticeCompetencyProgressViewProps {
  project: GAESProject;
  currentStep: number;
  onNavigateStep: (stepNumber: number) => void;
  initiallyExpanded?: boolean;
}

export const ApprenticeCompetencyProgressView: React.FC<ApprenticeCompetencyProgressViewProps> = ({
  project,
  currentStep,
  onNavigateStep,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [selectedStepFilter, setSelectedStepFilter] = useState<number>(currentStep <= 5 ? currentStep : 3);
  const [activeTab, setActiveTab] = useState<'por-paso' | 'por-competencia' | 'matriz'>('por-paso');

  const report = calculateCompetenciesProgress(project);
  const currentStepData = report.stepDetails.find((s) => s.stepNumber === selectedStepFilter) || report.stepDetails[0];
  const activeStepMapped = report.stepDetails.find((s) => s.stepNumber === currentStep);

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl transition-all mb-4">
      {/* Top Banner & Main Progress Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Guía 16 SENA • Resultados de Aprendizaje
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {report.competenciesCompletedCount} de 7 Competencias Completadas
              </span>
              {activeStepMapped && (
                <span className="text-[10px] bg-slate-800 text-teal-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                  Paso Actual ({currentStep}): {activeStepMapped.totalCount} Competencias abordadas
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Progreso de Competencias Organizacionales del GAES {project.gaesNumber}</span>
              </h3>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {report.overallPercentage}%
              </span>
            </div>

            {/* Global Gradient Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-700 rounded-full"
                style={{ width: `${Math.max(5, report.overallPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toggle Expand / Collapse Button */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow"
          >
            <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Competencias por Paso'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick compact active step competency preview (visible when not expanded) */}
      {!isExpanded && activeStepMapped && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">Competencias abordadas en este Paso {currentStep}:</span>
            {activeStepMapped.competencias.map((comp) => (
              <span
                key={comp.codigo}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                  comp.status === 'Completada'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                }`}
                title={comp.descripcion}
              >
                {comp.status === 'Completada' ? '✓' : '🟡'} Cód. {comp.codigo} ({comp.progressPercent}%)
              </span>
            ))}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline"
          >
            Explorar todas las competencias ➔
          </button>
        </div>
      )}

      {/* Expanded Interactive View */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
          {/* Subtabs Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('por-paso')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'por-paso'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Competencias por Paso del Proceso
              </button>
              <button
                onClick={() => setActiveTab('por-competencia')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'por-competencia'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Las 7 Competencias Organizacionales
              </button>
              <button
                onClick={() => setActiveTab('matriz')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'matriz'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Matriz Cruzada de Trazabilidad
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Base curricular: Normas Laborales SENA
            </div>
          </div>

          {/* TAB 1: POR PASO DEL PROCESO */}
          {activeTab === 'por-paso' && (
            <div className="space-y-3.5">
              {/* Stepper buttons (Steps 1 to 5) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {report.stepDetails.map((step) => {
                  const isSelected = selectedStepFilter === step.stepNumber;
                  const isStepCurrentInApp = currentStep === step.stepNumber;

                  return (
                    <button
                      key={step.stepNumber}
                      onClick={() => setSelectedStepFilter(step.stepNumber)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      {isStepCurrentInApp && (
                        <span className="absolute -top-1.5 -right-1 bg-teal-500 text-slate-950 font-bold text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Paso Actual
                        </span>
                      )}
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold font-mono">Paso {step.stepNumber}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {step.completedCount}/{step.totalCount}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold block truncate">
                        {step.stepShortTitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Step Detail Panel */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {currentStepData.stepName}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {currentStepData.competencias.length} Competencias Abordadas
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {STEP_COMPETENCY_MAPPINGS.find((s) => s.stepNumber === selectedStepFilter)?.descripcionAporte}
                    </p>
                  </div>

                  {currentStep !== selectedStepFilter && (
                    <button
                      onClick={() => onNavigateStep(selectedStepFilter)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow shrink-0 self-start sm:self-auto"
                    >
                      <span>Ir al Paso {selectedStepFilter}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Cards for competencies addressed in this step */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {currentStepData.competencias.map((comp) => {
                    const mapping = STEP_COMPETENCY_MAPPINGS.find((s) => s.stepNumber === selectedStepFilter);
                    return (
                      <div
                        key={comp.codigo}
                        className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                          comp.status === 'Completada'
                            ? 'bg-slate-900/90 border-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                                Cód. {comp.codigo}
                              </span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                Peso: {comp.peso}%
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1">
                              {comp.tituloCorto}
                            </h4>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              comp.status === 'Completada'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : comp.status === 'En Progreso'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {comp.status === 'Completada' ? '✓ Completada' : comp.status}
                          </span>
                        </div>

                        {/* Official Description */}
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {comp.descripcion}
                        </p>

                        {/* Progress Bar of this competency */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Avance de la Competencia:</span>
                            <span className="font-bold text-emerald-400">{comp.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                              style={{ width: `${comp.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Evidencias cumplidas */}
                        {comp.evidenciasCumplidas.length > 0 && (
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] space-y-1">
                            <span className="font-bold text-slate-400 block">
                              Evidencias registradas en la plataforma:
                            </span>
                            <ul className="space-y-0.5 text-slate-300">
                              {comp.evidenciasCumplidas.map((ev, idx) => (
                                <li key={idx} className="flex items-start gap-1 leading-snug">
                                  <span className="text-emerald-400 font-bold">✓</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Herramientas asociadas */}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-500">Herramientas:</span>
                          <span className="text-emerald-300 font-mono">{comp.herramientasArticuladas}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LAS 7 COMPETENCIAS ORGANIZACIONALES */}
          {activeTab === 'por-competencia' && (
            <div className="space-y-3">
              {report.details.map((comp) => (
                <div
                  key={comp.codigo}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                        Cód. {comp.codigo}
                      </span>
                      <strong className="text-xs text-white">{comp.tituloCorto}</strong>
                      <span className="text-[10px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                        Ponderación: {comp.peso}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          {comp.progressPercent}%
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {comp.status}
                        </span>
                      </div>
                      <div className="w-20 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${comp.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {comp.descripcion}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/20 text-xs space-y-1">
                    <span className="font-bold text-indigo-300 text-[11px] block">
                      🔗 Asociación con el trabajo realizado:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {comp.asociacionTrabajoRealizado}
                    </p>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">Abordada en los Pasos:</span>
                      {comp.pasosDondeSeAborda.map((pNum) => (
                        <button
                          key={pNum}
                          onClick={() => {
                            setSelectedStepFilter(pNum);
                            setActiveTab('por-paso');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          Paso {pNum}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] text-emerald-400 font-mono">
                      Herramientas: {comp.herramientasArticuladas}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MATRIZ CRUZADA DE TRAZABILIDAD */}
          {activeTab === 'matriz' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 overflow-x-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">
                  Matriz de Cobertura Curricular: Pasos de la Plataforma vs 7 Competencias SENA
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Guía 16 • Tecnólogo en Gestión Empresarial
                </span>
              </div>

              <table className="w-full text-xs text-left border border-slate-800">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 w-44">Código Competencia</th>
                    <th className="p-2.5">Título / Propósito</th>
                    <th className="p-2 text-center">Paso 1</th>
                    <th className="p-2 text-center">Paso 2</th>
                    <th className="p-2 text-center">Paso 3</th>
                    <th className="p-2 text-center">Paso 4</th>
                    <th className="p-2 text-center">Paso 5</th>
                    <th className="p-2.5 text-center">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {report.details.map((comp) => (
                    <tr key={comp.codigo} className="hover:bg-slate-900/50">
                      <td className="p-2.5 font-mono font-bold text-indigo-300">
                        {comp.codigo}
                      </td>
                      <td className="p-2.5 font-medium text-white">
                        {comp.tituloCorto}
                      </td>
                      {[1, 2, 3, 4, 5].map((pNum) => {
                        const isAddressed = comp.pasosDondeSeAborda.includes(pNum);
                        return (
                          <td key={pNum} className="p-2 text-center">
                            {isAddressed ? (
                              <button
                                onClick={() => {
                                  setSelectedStepFilter(pNum);
                                  setActiveTab('por-paso');
                                }}
                                className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center justify-center font-bold text-xs hover:scale-110 transition-transform"
                                title={`Abordada en el Paso ${pNum}. Haz clic para ver detalles.`}
                              >
                                ✓
                              </button>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                        {comp.progressPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
