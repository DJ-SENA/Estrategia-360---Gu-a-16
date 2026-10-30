import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Clock, 
  BarChart3, 
  ClipboardCheck,
  Users,
  Search,
  Filter,
  History,
  Eye,
  X,
  AlertCircle,
  Building2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { GAESProject, InstructorEvaluation, InstructorCriteria, AuthUser, AuditContributionRecord, EvaluationAuditRecord } from '../types';
import { buildInitialInstructorCriteria, SENA_COMPETENCIAS_ORGANIZACIONALES } from '../data/learningCompetencies';
import { InstructorDashboard } from './InstructorDashboard';

interface Step6Props {
  project: GAESProject;
  projectsList?: GAESProject[];
  onSelectProject?: (projectId: string) => void;
  onUpdateProject: (
    updated: Partial<GAESProject>,
    changeSummary?: string,
    phaseIntervened?: number,
    componentIntervened?: string
  ) => Promise<{ success: boolean; error?: string; project?: GAESProject }> | void;
  onOpenPrintModal: () => void;
  onPrevStep: () => void;
  currentUser?: AuthUser | null;
  onReopenProject?: (projectId: string, reason: string) => Promise<void> | void;
  isLoadingProjects?: boolean;
  projectsLoadError?: string | null;
  onRefreshProjects?: () => void;
}

export const Step6_InstructorPanel: React.FC<Step6Props> = ({
  project,
  projectsList,
  onSelectProject,
  onUpdateProject,
  onOpenPrintModal,
  onPrevStep,
  currentUser,
  onReopenProject,
  isLoadingProjects,
  projectsLoadError,
  onRefreshProjects,
}) => {
  const [localEvaluation, setLocalEvaluation] = useState<InstructorEvaluation>(project.instructorEvaluation);
  const instructorEvaluation = localEvaluation;
  const [isSavingDefinitive, setIsSavingDefinitive] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when project.id changes (switching GAES) or when refreshed from server
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalEvaluation(project.instructorEvaluation);
  }, [
    project.id,
    project.version,
    project.instructorEvaluation?.lastModifiedAt,
    project.instructorEvaluation?.isDefinitiveSaved,
  ]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'RUBRIC' | 'TRACKING'>('DASHBOARD');
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    juicioSugerido?: string;
    observacionProducto?: string;
    observacionDesempeno?: string;
  } | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Tracking and Reopen state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenTargetProject, setReopenTargetProject] = useState<GAESProject>(project);
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [trackingSearch, setTrackingSearch] = useState('');
  const [filterGaesTrack, setFilterGaesTrack] = useState<number | 'ALL'>('ALL');
  const [filterPhaseTrack, setFilterPhaseTrack] = useState<number | 'ALL'>('ALL');

  const cohortProjects = projectsList && projectsList.length > 0 ? projectsList : [project];

  const allAuditRecords: AuditContributionRecord[] = useMemo(() => {
    const list: AuditContributionRecord[] = [];
    cohortProjects.forEach((p) => {
      if (Array.isArray(p.collaborationHistory)) {
        p.collaborationHistory.forEach((rec) => list.push(rec));
      }
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [cohortProjects]);

  const filteredAuditRecords = useMemo(() => {
    return allAuditRecords.filter((rec) => {
      if (filterGaesTrack !== 'ALL' && rec.gaesNumber !== filterGaesTrack) return false;
      if (filterPhaseTrack !== 'ALL' && rec.phase !== filterPhaseTrack) return false;
      if (trackingSearch.trim()) {
        const q = trackingSearch.toLowerCase();
        const match =
          rec.userName.toLowerCase().includes(q) ||
          rec.userEmail.toLowerCase().includes(q) ||
          rec.description.toLowerCase().includes(q) ||
          rec.component.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allAuditRecords, filterGaesTrack, filterPhaseTrack, trackingSearch]);

  const handleUpdateEvaluation = (updates: Partial<InstructorEvaluation>) => {
    setLocalEvaluation((prev) => {
      const nextEval = {
        ...prev,
        ...updates,
      };

      // Debounce draft save to server (1200ms) only if not locked or definitive saved
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (!project.isLocked && !project.instructorEvaluation?.isDefinitiveSaved) {
          onUpdateProject({
            instructorEvaluation: nextEval,
          }, 'Borrador de evaluación actualizado', 6, 'Panel de Evaluación (Fase 6)');
        }
      }, 1200);

      return nextEval;
    });
  };

  const handleUpdateCriterion = (criterionId: string, updates: Partial<InstructorCriteria>) => {
    const updatedCriteria = localEvaluation.criteria.map((c) =>
      c.id === criterionId ? { ...c, ...updates } : c
    );

    const evaluatedCriteria = updatedCriteria.filter(
      (c) => c.status !== 'Pendiente de Evaluación' && c.score > 0
    );
    const totalWeightEvaluated = evaluatedCriteria.reduce((acc, c) => acc + c.weight, 0);
    const calculatedProductScore =
      evaluatedCriteria.length > 0
        ? Math.round(
            evaluatedCriteria.reduce((acc, c) => acc + (c.score * c.weight), 0) / (totalWeightEvaluated || 1)
          )
        : localEvaluation.productEvidenceScore;

    handleUpdateEvaluation({
      criteria: updatedCriteria,
      productEvidenceScore: calculatedProductScore,
    });
  };

  const handleLoadOfficialCompetencies = () => {
    // Preserve any existing evaluations already registered by the instructor (scores, feedback, status)
    const existingCriteriaMap = new Map<string, InstructorCriteria>();
    (localEvaluation.criteria || []).forEach((c) => {
      if (c.rapCode) existingCriteriaMap.set(c.rapCode, c);
      if (c.id) existingCriteriaMap.set(c.id, c);
    });

    const officialDefs = buildInitialInstructorCriteria(false); // evaluated: false -> score 0, status: 'Pendiente de Evaluación'
    const mergedCriteria: InstructorCriteria[] = officialDefs.map((def) => {
      const existing = existingCriteriaMap.get(def.rapCode) || existingCriteriaMap.get(def.id);
      if (existing) {
        // PRESERVE existing evaluation, score, feedback and status intact!
        return {
          ...def,
          score: existing.score,
          status: existing.status,
          feedback: existing.feedback,
        };
      }
      // New competency initialized without fictitious scores:
      return {
        ...def,
        score: 0,
        status: 'Pendiente de Evaluación',
        feedback: 'Pendiente de evaluación y retroalimentación técnica por el instructor asignado.',
      };
    });

    // Calculate product score only from criteria that have been actually evaluated
    const evaluatedCriteria = mergedCriteria.filter(
      (c) => c.status !== 'Pendiente de Evaluación' && c.score > 0
    );
    const totalWeightEvaluated = evaluatedCriteria.reduce((acc, c) => acc + c.weight, 0);
    const calculatedProductScore =
      evaluatedCriteria.length > 0
        ? Math.round(
            evaluatedCriteria.reduce((acc, c) => acc + (c.score * c.weight), 0) / (totalWeightEvaluated || 1)
          )
        : localEvaluation.productEvidenceScore > 0
        ? localEvaluation.productEvidenceScore
        : 0;

    handleUpdateEvaluation({
      criteria: mergedCriteria,
      productEvidenceScore: calculatedProductScore,
      // CRITICAL: Preserve existing performanceEvidenceScore, NEVER set default 92
      performanceEvidenceScore: localEvaluation.performanceEvidenceScore || 0,
    });
  };

  const handleSuggestAIEvaluation = async () => {
    if (project.isLocked || localEvaluation.isDefinitiveSaved) {
      setAiErrorMessage('La evaluación definitiva ya se encuentra registrada y formalizada. Para solicitar o aplicar nuevas sugerencias de IA, el instructor debe habilitar modificación primero.');
      return;
    }

    setIsGeneratingAI(true);
    setAiErrorMessage(null);
    setAiSuggestion(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
        },
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

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          errData.error ||
          `El servicio de IA respondió con error (Código HTTP ${response.status}). No se generó dictamen automático. Continúe con la evaluación manual del instructor.`;
        setAiErrorMessage(errMsg);
        // Do NOT assign APROBADO or default scores. Maintain state intact.
        return;
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        const d = resData.data;
        // AI provides an advisory recommendation (Nivel 2), never the definitive judgment (Nivel 3)
        setAiSuggestion({
          juicioSugerido: d.juicioSugerido || 'APROBADO',
          observacionProducto: d.observacionProducto || '',
          observacionDesempeno: d.observacionDesempeno || '',
        });
        // The project's official finalJudgment remains unchanged or as PENDIENTE DE EVALUACIÓN
        // until the instructor explicitly selects their decision
      } else {
        const errMsg =
          resData.error ||
          'Respuesta incompleta del servicio de IA. No se asignó ningún juicio automático. Por favor, realice la evaluación manual.';
        setAiErrorMessage(errMsg);
      }
    } catch (err: any) {
      console.error('Error al solicitar propuesta de IA:', err);
      setAiErrorMessage(
        `Fallo en la comunicación con el servicio de IA: ${err.message || 'Error de red'}. El proyecto se mantiene en estado actual sin aprobación automática. Realice la evaluación manual.`
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (project.isLocked || localEvaluation.isDefinitiveSaved) {
      setAiErrorMessage('No se puede aplicar una propuesta de IA sobre una evaluación definitiva ya formalizada. Debe habilitar modificación primero.');
      return;
    }
    if (!aiSuggestion) return;
    handleUpdateEvaluation({
      productObservation: aiSuggestion.observacionProducto || localEvaluation.productObservation,
      performanceObservation: aiSuggestion.observacionDesempeno || localEvaluation.performanceObservation,
    });
    setAiSuggestion(null);
  };

  const handleSaveDefinitiveEvaluation = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!localEvaluation.instructorName.trim()) {
      setAiErrorMessage('Debe ingresar el nombre del instructor evaluador antes de guardar la evaluación definitiva.');
      return;
    }
    if (localEvaluation.finalJudgment === 'PENDIENTE DE EVALUACIÓN') {
      setAiErrorMessage('Debe seleccionar un dictamen oficial (APROBADO o NO APROBADO) para registrar la evaluación definitiva.');
      return;
    }

    setIsSavingDefinitive(true);
    setAiErrorMessage(null);

    const now = new Date().toISOString();
    const auditRecord: EvaluationAuditRecord = {
      id: `audit-${Date.now()}`,
      timestamp: now,
      action: 'REGISTRO_EVALUACION_DEFINITIVA',
      evaluatedBy: currentUser?.name || localEvaluation.instructorName || 'Instructor Técnico',
      instructorDocument: localEvaluation.instructorDocument,
      judgment: localEvaluation.finalJudgment,
      productScore: localEvaluation.productEvidenceScore,
      performanceScore: localEvaluation.performanceEvidenceScore,
      observationsNote: 'Dictamen registrado en plataforma. Formalización física pendiente de impresión y firma manuscrita.',
    };

    const finalDefinitiveEvaluation: InstructorEvaluation = {
      ...localEvaluation,
      isDefinitiveSaved: true,
      isLocked: true,
      evaluatedAt: now,
      lastModifiedAt: now,
      modifiedBy: currentUser?.name || localEvaluation.instructorName || 'Instructor Técnico',
      auditHistory: [...(localEvaluation.auditHistory || []), auditRecord],
    };

    // Optimistically update local state so UI immediately indicates saving definitive state
    setLocalEvaluation(finalDefinitiveEvaluation);

    try {
      const result = await onUpdateProject({
        isLocked: true,
        instructorEvaluation: finalDefinitiveEvaluation,
      }, 'Evaluación definitiva registrada por el instructor', 6, 'Panel de Evaluación (Fase 6)');

      if (result && !result.success) {
        // PRESERVE the entered values in the form, do NOT revert them to 92!
        setLocalEvaluation((prev) => ({
          ...prev,
          isDefinitiveSaved: false,
          isLocked: false,
        }));
        setAiErrorMessage(result.error || 'Error del servidor al registrar la evaluación definitiva. Se conservan los valores ingresados.');
        return;
      }

      // ONLY display success when the server confirms the operation!
      setAiErrorMessage(null);
      setSaveNotification('Evaluación definitiva registrada exitosamente. El proyecto ha sido bloqueado para modificaciones ordinarias. Imprima el acta para la firma física del instructor.');
      setTimeout(() => setSaveNotification(null), 7000);
    } catch (err: any) {
      console.error('Error al guardar evaluación definitiva:', err);
      setLocalEvaluation((prev) => ({
        ...prev,
        isDefinitiveSaved: false,
        isLocked: false,
      }));
      setAiErrorMessage(`Error de comunicación con el servidor: ${err.message || 'Error de red'}. Los valores modificados se mantienen en pantalla.`);
    } finally {
      setIsSavingDefinitive(false);
    }
  };

  const handleOpenReopenModal = (target: GAESProject) => {
    setReopenTargetProject(target);
    setReopenReasonText('');
    setReopenError(null);
    setIsReopenModalOpen(true);
  };

  const handleConfirmReopen = async () => {
    if (!reopenReasonText.trim()) {
      setReopenError('Debe ingresar obligatoriamente una justificación pedagógica para la reapertura (ej. Plan de Mejoramiento Formativo).');
      return;
    }
    setIsSubmittingReopen(true);
    setReopenError(null);

    try {
      if (onReopenProject) {
        await onReopenProject(reopenTargetProject.id, reopenReasonText.trim());
      } else {
        handleUpdateEvaluation({
          isDefinitiveSaved: false,
          isLocked: false,
        });
      }
      setIsReopenModalOpen(false);
      setSaveNotification(`Reapertura del GAES ${reopenTargetProject.gaesNumber} registrada exitosamente.`);
      setTimeout(() => setSaveNotification(null), 5000);
    } catch (err: any) {
      setReopenError(err.message || 'Error al procesar la reapertura.');
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  const handleUnlockEvaluation = () => {
    handleOpenReopenModal(project);
  };

  return (
    <div className="space-y-6">
      {/* View Switcher: Cohort Dashboard vs Individual Rubric vs Tracking */}
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
            <span>Dashboard Comparativo ({projectsList?.length || 1} GAES)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('TRACKING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'TRACKING'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Seguimiento Colaborativo & Trazabilidad</span>
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
            <span>Rúbrica de Evaluación: GAES {project.gaesNumber} ({project.company.name})</span>
          </button>
        </div>

        {/* Active GAES Fast Selector */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="text-slate-400 font-medium hidden sm:inline">GAES a Evaluar:</span>
          <select
            value={project.id}
            onChange={(e) => onSelectProject && onSelectProject(e.target.value)}
            disabled={Boolean(isLoadingProjects || cohortProjects.length === 0)}
            className="bg-slate-900 border border-slate-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[240px] truncate"
            title="Cambiar GAES para evaluar y calificar"
          >
            {isLoadingProjects && cohortProjects.length === 0 ? (
              <option value="" disabled className="bg-slate-800 text-slate-400">Cargando proyectos...</option>
            ) : projectsLoadError && cohortProjects.length === 0 ? (
              <option value="" disabled className="bg-slate-800 text-rose-300">Error de carga de proyectos</option>
            ) : cohortProjects.length === 0 ? (
              <option value="" disabled className="bg-slate-800 text-slate-400">Sin proyectos disponibles</option>
            ) : (
              cohortProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  GAES {p.gaesNumber}: {p.company?.name || `GAES ${p.gaesNumber}`} (Ficha {p.fichaNumber})
                </option>
              ))
            )}
          </select>
          {onRefreshProjects && (
            <button
              type="button"
              onClick={onRefreshProjects}
              disabled={isLoadingProjects}
              title="Refrescar listado de proyectos desde el servidor"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProjects ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {viewMode === 'DASHBOARD' && (
        <InstructorDashboard
          projects={cohortProjects}
          currentProjectId={project.id}
          onSelectProject={(id) => {
            if (onSelectProject) onSelectProject(id);
          }}
          onOpenEvaluationDetail={() => setViewMode('RUBRIC')}
        />
      )}

      {viewMode === 'TRACKING' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Institutional Tracking Banner */}
          <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-cyan-950/60 border border-teal-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2 py-0.5 rounded">
                      Seguimiento Académico & Trazabilidad de GAES
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Ficha {project.fichaNumber}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">
                    Supervisión Colaborativa y Auditoría de Aportes Individuales
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                    Monitorea el progreso de los GAES pre-conformados, la vinculación de cuentas institucionales (@soy.sena.edu.co), las intervenciones efectivas y el estado de bloqueo de proyectos evaluados.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('RUBRIC')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Ir a Rúbrica de Evaluación</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block">GAES Supervisados</span>
              <span className="text-xl font-bold text-white">{cohortProjects.length}</span>
              <span className="text-[10px] text-teal-400 font-medium block">Pre-constituidos</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block">Evaluados / Bloqueados</span>
              <span className="text-xl font-bold text-amber-400">
                {cohortProjects.filter((p) => p.isLocked || p.instructorEvaluation?.isDefinitiveSaved).length}
              </span>
              <span className="text-[10px] text-slate-500 block">Requieren reapertura para edición</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block">En Proceso / Borrador</span>
              <span className="text-xl font-bold text-emerald-400">
                {cohortProjects.filter((p) => !p.instructorEvaluation?.isDefinitiveSaved).length}
              </span>
              <span className="text-[10px] text-slate-500 block">Pendientes de dictamen definitivo</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block">Aportes en Servidor</span>
              <span className="text-xl font-bold text-cyan-400">{allAuditRecords.length}</span>
              <span className="text-[10px] text-slate-500 block">Registros inmutables</span>
            </div>
          </div>

          {/* GAES Cohort Status Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  <span>Estado de Equipos GAES Asignados</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Identificación de integrantes por cuenta institucional, avance y control de bloqueo formativo.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">GAES & Empresa</th>
                    <th className="py-2.5 px-3">Integrantes Reconocidos (@soy.sena.edu.co)</th>
                    <th className="py-2.5 px-3 text-center">Fase / Progreso</th>
                    <th className="py-2.5 px-3">Última Sincronización</th>
                    <th className="py-2.5 px-3 text-center">Dictamen</th>
                    <th className="py-2.5 px-3 text-center">Control de Bloqueo</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {cohortProjects.map((p) => {
                    const isEvalSaved = p.instructorEvaluation?.isDefinitiveSaved;
                    const isLocked = p.isLocked || isEvalSaved;
                    const lastUpdatedDate = p.lastUpdated ? new Date(p.lastUpdated) : null;
                    const isInactive = lastUpdatedDate ? Date.now() - lastUpdatedDate.getTime() > 48 * 60 * 60 * 1000 : false;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">GAES {p.gaesNumber}: {p.company.name}</span>
                          <span className="text-[10px] text-slate-400">{p.company.sector} • Ficha {p.fichaNumber}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {p.apprentices.map((a) => (
                              <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-medium text-slate-200">{a.name}</span>
                                <span className="text-[10px] text-teal-400 font-mono">({a.email})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono">
                            Fase {p.currentStep || 1} de 6
                          </span>
                          <span className={`block text-[9px] mt-1 ${p.isMatricesValidated ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {p.isMatricesValidated ? 'Matrices Validadas' : 'Matrices en Proceso'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <span className="text-slate-300 block">
                            {lastUpdatedDate ? lastUpdatedDate.toLocaleDateString() + ' ' + lastUpdatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin registro'}
                          </span>
                          {isInactive && (
                            <span className="text-[9px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              Alerta: Sin actividad &gt; 48h
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.instructorEvaluation?.finalJudgment === 'APROBADO' && isEvalSaved
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : p.instructorEvaluation?.finalJudgment?.includes('NO APROBADO') && isEvalSaved
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isEvalSaved
                              ? p.instructorEvaluation.finalJudgment
                              : 'BORRADOR FORMATIVO'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLocked ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Bloqueado
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenReopenModal(p)}
                                className="text-[10px] text-amber-300 hover:text-white underline font-semibold transition-colors"
                              >
                                Reabrir proyecto
                              </button>
                            </div>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                              <Unlock className="w-3 h-3" /> Editable
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectProject) onSelectProject(p.id);
                              setViewMode('RUBRIC');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow transition-all inline-flex items-center gap-1"
                          >
                            <span>Evaluar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Individual Contribution Audit Trail */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Historial Inmutable de Auditoría & Trazabilidad Individual</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro de operaciones verificadas por el servidor por aprendiz, fase, recurso y versión.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    placeholder="Buscar por aprendiz o componente..."
                    className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={filterGaesTrack}
                  onChange={(e) => setFilterGaesTrack(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todos los GAES</option>
                  {cohortProjects.map((p) => (
                    <option key={p.id} value={p.gaesNumber}>
                      GAES {p.gaesNumber}
                    </option>
                  ))}
                </select>

                <select
                  value={filterPhaseTrack}
                  onChange={(e) => setFilterPhaseTrack(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Todas las Fases</option>
                  <option value={1}>Fase 1: Registro</option>
                  <option value={2}>Fase 2: Entregables</option>
                  <option value={3}>Fase 3: Matrices</option>
                  <option value={4}>Fase 4: BSC</option>
                  <option value={5}>Fase 5: Auditoría</option>
                  <option value={6}>Fase 6: Evaluación</option>
                </select>
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Fecha y Hora</th>
                    <th className="py-2 px-3">Autor (Cuenta Institucional)</th>
                    <th className="py-2 px-3 text-center">GAES</th>
                    <th className="py-2 px-3 text-center">Fase</th>
                    <th className="py-2 px-3">Componente Intervenido</th>
                    <th className="py-2 px-3 text-center">Operación</th>
                    <th className="py-2 px-3 text-center">Versión</th>
                    <th className="py-2 px-3">Descripción Verificable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-[11px]">
                  {filteredAuditRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                        No se encontraron registros de auditoría que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">
                          {new Date(rec.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-white block">{rec.userName}</span>
                          <span className="text-[10px] text-teal-400 font-mono">{rec.userEmail}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-300">
                          GAES {rec.gaesNumber}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">
                            Fase {rec.phase}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-medium">
                          {rec.component}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              rec.operationType === 'CREAR'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                : rec.operationType === 'EVALUAR'
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                : rec.operationType === 'REAPERTURA'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {rec.operationType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400">
                          {rec.previousVersion ? `v${rec.previousVersion} → v${rec.newVersion}` : `v${rec.newVersion}`}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {rec.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pedagogical Principle Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Principio Pedagógico Institucional:</strong> La cantidad de modificaciones registradas no representa automáticamente la calidad del aporte ni produce calificaciones individuales automáticas. La trazabilidad opera como evidencia complementaria para la retroalimentación formativa y seguimiento del instructor SENA.
              </span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'RUBRIC' && (
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
                Como instructor técnico, revisa las evidencias documentales y de desempeño con criterios previamente establecidos. Puedes solicitar una propuesta orientativa de IA (Nivel 2), emitir tu dictamen manual (Nivel 3) y formalizar la evaluación mediante firma física manuscrita.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSuggestAIEvaluation}
              disabled={isGeneratingAI || Boolean(project.isLocked || localEvaluation.isDefinitiveSaved)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-950 transition-all disabled:opacity-50"
              title={
                project.isLocked || localEvaluation.isDefinitiveSaved
                  ? "Evaluación definitiva registrada. Debe habilitar modificación para solicitar nuevas propuestas de IA."
                  : "Solicitar propuesta pedagógica de apoyo a la IA (No emite calificaciones automáticas)"
              }
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>{isGeneratingAI ? 'Consultando IA...' : 'Proponer Evaluación IA'}</span>
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

      {/* AI Error Alert (Transparent failure without automatic approval) */}
      {aiErrorMessage && (
        <div className="bg-rose-950/60 border border-rose-500/60 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-rose-200 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-white font-bold">Fallo en el Servicio de Inteligencia Artificial</strong>
              <p className="text-rose-200 leading-relaxed">{aiErrorMessage}</p>
              <span className="text-[11px] text-rose-300/80 block font-mono">
                Regla SENA: Ningún fallo de la IA genera aprobación automática ni puntuaciones ficticias. El proyecto se preserva en su estado actual para evaluación manual por el instructor.
              </span>
            </div>
          </div>
          <button
            onClick={() => setAiErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs font-bold px-2 py-1 bg-rose-900/40 rounded-lg hover:bg-rose-900/60"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* AI Advisory Suggestion Banner (Nivel 2 - No vinculante) */}
      {aiSuggestion && (
        <div className="bg-indigo-950/50 border border-indigo-500/40 rounded-2xl p-4 space-y-3 text-xs text-indigo-200 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <strong className="text-white font-bold uppercase tracking-wider text-[11px]">
                Propuesta Orientativa Sugerida por IA (Nivel 2 - Asistencia Pedagógica)
              </strong>
            </div>
            <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              Juicio propuesto: <strong>{aiSuggestion.juicioSugerido}</strong> (Sujeto a decisión del instructor)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
              <span className="font-bold text-emerald-300 block mb-1">Borrador Producto (Matrices/BSC):</span>
              <p className="text-slate-300 leading-relaxed italic">{aiSuggestion.observacionProducto || 'Sin observaciones de producto generadas.'}</p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
              <span className="font-bold text-indigo-300 block mb-1">Borrador Desempeño (Sustentación):</span>
              <p className="text-slate-300 leading-relaxed italic">{aiSuggestion.observacionDesempeno || 'Sin observaciones de desempeño generadas.'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-[10px] text-slate-400">
              La IA no emite dictámenes definitivos. Usted como instructor debe revisar, validar y decidir.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Descartar Sugerencia
              </button>
              <button
                type="button"
                onClick={handleApplyAiSuggestion}
                disabled={Boolean(project.isLocked || localEvaluation.isDefinitiveSaved)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copiar Observaciones al Formulario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Notification Alert */}
      {saveNotification && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveNotification}</span>
          </div>
          <button
            onClick={() => setSaveNotification(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1 bg-emerald-900/40 rounded-lg hover:bg-emerald-900/60"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Empty / Error state alert when no GAES are found or on load error */}
      {projectsLoadError ? (
        <div className="bg-rose-950/60 border border-rose-500/60 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-rose-200 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-white font-bold">Error al Cargar Proyectos del Servidor</strong>
              <p className="text-rose-200 leading-relaxed">{projectsLoadError}</p>
              <span className="text-[11px] text-rose-300/80 block font-mono">
                Compruebe la conectividad con la base de datos o el backend.
              </span>
            </div>
          </div>
          {onRefreshProjects && (
            <button
              type="button"
              onClick={onRefreshProjects}
              className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      ) : cohortProjects.length === 0 ? (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 text-center space-y-3 shadow-xl animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Ausencia de Proyectos GAES Registrados</h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
            Actualmente no hay proyectos formativos registrados en la Ficha <strong>{project.fichaNumber || 'de formación'}</strong>.
            Para que aparezcan en este módulo de revisión, los líderes de cada GAES deben ingresar a la plataforma y formalizar el registro inicial en la <strong>Fase 1 (Registro Inicial de Proyecto)</strong>.
          </p>
          {onRefreshProjects && (
            <button
              type="button"
              onClick={onRefreshProjects}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar Lista</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Tarjeta de Identificación, Empresa Asignada, Integrantes y Avances del GAES Activo */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Selector Desplegable en el Módulo de Revisión */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-500/30">
                Módulo de Revisión • GAES Activo
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Ficha {project.fichaNumber} • {project.regional || 'SENA'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">
              Expediente Formativo: GAES {project.gaesNumber} — {project.company?.name || `Empresa GAES ${project.gaesNumber}`}
            </h3>
          </div>

          {/* Selector de cambio directo entre GAES sin regresar al panel inicial */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
            <label htmlFor="select-gaes-rubric-view" className="text-xs font-semibold text-slate-300 whitespace-nowrap hidden sm:inline">
              Cambiar GAES a Evaluar:
            </label>
            <select
              id="select-gaes-rubric-view"
              value={project.id}
              onChange={(e) => {
                if (onSelectProject) {
                  onSelectProject(e.target.value);
                }
              }}
              disabled={Boolean(isLoadingProjects || cohortProjects.length === 0)}
              className="bg-slate-900 border border-slate-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[240px] max-w-xs truncate"
              title="Selecciona otro GAES para revisar y calificar directamente"
            >
              {cohortProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  GAES {p.gaesNumber}: {p.company?.name || `GAES ${p.gaesNumber}`} (Ficha {p.fichaNumber})
                </option>
              ))}
            </select>
            {onRefreshProjects && (
              <button
                type="button"
                onClick={onRefreshProjects}
                disabled={isLoadingProjects}
                title="Actualizar listado desde el servidor"
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProjects ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Grid de 3 Columnas: Empresa, Integrantes y Avances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Empresa Asignada */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Empresa Proyecto Formativo
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                GAES {project.gaesNumber}
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm leading-snug">
                {project.company?.name || `Empresa GAES ${project.gaesNumber}`}
              </h4>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">NIT:</strong>{' '}
                <span className="font-mono text-slate-200">{project.company?.nit || 'Pendiente de asignación'}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">Sector Económico:</strong>{' '}
                <span className="text-slate-200">{project.company?.sector || 'No especificado'}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">Tamaño / Ciudad:</strong>{' '}
                <span className="text-slate-200">{project.company?.size || 'Microempresa'} • {project.company?.city || 'Valle del Cauca'}</span>
              </p>
              {project.company?.mainProduct && (
                <p className="text-[11px] text-slate-400 pt-0.5 truncate">
                  <strong className="text-slate-300">Producto Principal:</strong>{' '}
                  <span className="text-slate-200">{project.company.mainProduct}</span>
                </p>
              )}
            </div>
          </div>

          {/* 2. Integrantes del GAES */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                Integrantes del GAES ({project.apprentices?.length || 0})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                @soy.sena.edu.co
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {project.apprentices && project.apprentices.length > 0 ? (
                project.apprentices.map((a) => (
                  <div key={a.id || a.document} className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg text-[11px] flex items-center justify-between gap-1">
                    <div className="truncate min-w-0">
                      <span className="font-semibold text-white block truncate">{a.name}</span>
                      <span className="text-[10px] text-teal-400 font-mono truncate block">{a.email}</span>
                      <span className="text-[9px] text-slate-500 font-mono block">Doc: {a.document}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                      a.role === 'Líder GAES'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {a.role}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-slate-500 italic text-[11px] block py-3 text-center">
                  Sin aprendices registrados en este GAES.
                </span>
              )}
            </div>
          </div>

          {/* 3. Avances Registrados & Métricas */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                Avances Registrados
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                project.isLocked
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
              }`}>
                {project.isLocked ? 'Bloqueado (Definitivo)' : 'En Proceso Formativo'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Fase de Avance:</span>
                <strong className="text-indigo-300 font-mono">Fase {project.currentStep || 1} de 6</strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Matrices Estratégicas:</span>
                <strong className={project.isMatricesValidated ? 'text-emerald-400' : 'text-amber-400'}>
                  {project.isMatricesValidated ? 'Validadas (1.00)' : 'En Calibración'}
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Vector PEYEA:</span>
                <strong className="text-purple-300 truncate block">
                  {project.peyea?.quadrant || 'Diagnóstico Pendiente'}
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Entregables Previos:</span>
                <strong className="text-teal-300 font-mono">
                  {Array.isArray(project.learningGuidesDeliverables)
                    ? `${project.learningGuidesDeliverables.filter((d) => d.cumple).length} / 48`
                    : 'En revisión'}
                </strong>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Puntajes Actuales:</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">Prod: {localEvaluation.productEvidenceScore || 0}/100</span>
                <span className="text-slate-600">•</span>
                <span className="text-blue-400 font-bold">Desemp: {localEvaluation.performanceEvidenceScore || 0}/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Identification & Final Decision Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full lg:w-auto">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Instructor Evaluador</label>
              <input
                type="text"
                value={instructorEvaluation.instructorName}
                onChange={(e) => handleUpdateEvaluation({ instructorName: e.target.value })}
                placeholder="Nombre y Apellidos del Instructor"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:border-indigo-500 focus:outline-none w-full"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Cédula / Documento</label>
              <input
                type="text"
                value={instructorEvaluation.instructorDocument}
                onChange={(e) => handleUpdateEvaluation({ instructorDocument: e.target.value })}
                placeholder="No. Documento C.C."
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-indigo-500 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Final Judgment Switcher (3 options: Aprobado, No Aprobado, Pendiente) */}
          <div className="flex flex-col items-start lg:items-end gap-1.5 w-full lg:w-auto">
            <span className="text-xs text-slate-400 font-medium">Juicio Evaluativo Oficial (Decisión Exclusiva del Instructor):</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleUpdateEvaluation({ finalJudgment: 'APROBADO' })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  instructorEvaluation.finalJudgment === 'APROBADO'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APROBADO</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateEvaluation({
                    finalJudgment: 'NO APROBADO (CON PLAN DE MEJORAMIENTO)',
                  })
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  instructorEvaluation.finalJudgment.includes('NO APROBADO')
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>NO APROBADO (MEJORAMIENTO)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateEvaluation({
                    finalJudgment: 'PENDIENTE DE EVALUACIÓN',
                  })
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  instructorEvaluation.finalJudgment === 'PENDIENTE DE EVALUACIÓN'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-950/60 ring-2 ring-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>PENDIENTE DE EVALUACIÓN</span>
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
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  handleUpdateEvaluation({ productEvidenceScore: val });
                }}
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
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  handleUpdateEvaluation({ performanceEvidenceScore: val });
                }}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-lg text-indigo-400 focus:outline-none"
              />
              <span className="text-slate-400 text-xs font-mono">/ 100</span>
            </div>
          </div>
        </div>

        {/* Definitive Evaluation Save Bar */}
        <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div className="flex items-center gap-2 text-xs">
            {instructorEvaluation.isDefinitiveSaved ? (
              <span className="bg-emerald-950 text-emerald-400 font-bold px-3 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>EVALUACIÓN DEFINITIVA GUARDADA • PENDIENTE DE FIRMA FÍSICA</span>
              </span>
            ) : (
              <span className="bg-amber-950 text-amber-400 font-bold px-3 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1.5 font-mono">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>ESTADO: BORRADOR PRELIMINAR (SIN GUARDADO DEFINITIVO)</span>
              </span>
            )}
            {instructorEvaluation.lastModifiedAt && (
              <span className="text-slate-400 font-mono text-[10px] hidden md:inline">
                Último registro: {new Date(instructorEvaluation.lastModifiedAt).toLocaleString('es-CO')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {instructorEvaluation.isDefinitiveSaved ? (
              <button
                type="button"
                onClick={handleUnlockEvaluation}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Habilitar edición de la evaluación guardada"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Habilitar Modificación</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveDefinitiveEvaluation}
                disabled={isSavingDefinitive}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDefinitive ? (
                  <RefreshCw className="w-4 h-4 text-emerald-200 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-emerald-200" />
                )}
                <span>{isSavingDefinitive ? 'Guardando en Servidor...' : 'Guardar Evaluación Definitiva'}</span>
              </button>
            )}
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

      {/* Modal de Reapertura Autorizada por Instructor */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Reapertura Pedagógica Autorizada
                  </h3>
                  <p className="text-xs text-slate-400">
                    GAES {reopenTargetProject.gaesNumber} • {reopenTargetProject.company?.name || 'Empresa Asignada'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200/90 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Protocolo de Integridad Académica SENA</span>
              </p>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Este proyecto cuenta con evaluación registrada y bloqueo de seguridad. La reapertura habilitará nuevamente la edición para los integrantes de este GAES. Quedará registrada de forma inmutable la justificación pedagógica, su usuario institucional y la marca de tiempo oficial.
              </p>
            </div>

            {reopenError && (
              <div className="bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{reopenError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Motivo / Justificación Pedagógica Obligatoria:
              </label>
              <textarea
                rows={4}
                value={reopenReasonText}
                onChange={(e) => setReopenReasonText(e.target.value)}
                placeholder="Ej. Plan de Mejoramiento Formativo concertado según Reglamento del Aprendiz SENA (Acuerdo 007/2012) para ajustar formulación de objetivos estratégicos del BSC..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 block">
                Mínimo recomendado: describir la actividad pedagógica o correctiva acordada.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                disabled={isSubmittingReopen}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={isSubmittingReopen}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
              >
                {isSubmittingReopen ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registrando Reapertura...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autorizar y Reabrir Proyecto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
