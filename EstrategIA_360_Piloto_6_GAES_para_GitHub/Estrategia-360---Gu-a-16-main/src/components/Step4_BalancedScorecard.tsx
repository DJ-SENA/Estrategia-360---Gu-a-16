import React, { useState } from 'react';
import { 
  Target, 
  ArrowRight, 
  GitFork, 
  Layers, 
  DollarSign, 
  Users, 
  Cog, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Info, 
  CheckCircle2,
  Sparkles,
  Link2,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
  Edit3
} from 'lucide-react';
import { GAESProject, BSCObjective, BSCPerspective, BSCCauseEffectLink, IndicatorCard } from '../types';
import { ExcelBSCImportModal } from './ExcelBSCImportModal';
import { IndicatorCardModal } from './IndicatorCardModal';

interface Step4Props {
  project: GAESProject;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const Step4_BalancedScorecard: React.FC<Step4Props> = ({
  project,
  onUpdateProject,
  onNextStep,
  onPrevStep,
}) => {
  const [viewMode, setViewMode] = useState<'mapa' | 'tabla'>('mapa');
  const [isBSCExcelModalOpen, setIsBSCExcelModalOpen] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [editingObjectiveForKpi, setEditingObjectiveForKpi] = useState<BSCObjective | null>(null);
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);

  // New Objective Form
  const [newObjPerspective, setNewObjPerspective] = useState<BSCPerspective>('Financiera');
  const [newObjTitle, setNewObjTitle] = useState('');
  const [newObjMatrixOrigin, setNewObjMatrixOrigin] = useState('');
  const [newObjTarget, setNewObjTarget] = useState('');
  const [newObjInitiative, setNewObjInitiative] = useState('');
  const [newObjBudget, setNewObjBudget] = useState(5000000);
  const [newObjResponsible, setNewObjResponsible] = useState('Líder GAES');

  // New Cause-Effect Link Form
  const [newLinkFromId, setNewLinkFromId] = useState('');
  const [newLinkToId, setNewLinkToId] = useState('');
  const [newLinkExplanation, setNewLinkExplanation] = useState('');

  const perspectivesList: {
    name: BSCPerspective;
    icon: any;
    color: string;
    bg: string;
    border: string;
    description: string;
  }[] = [
    {
      name: 'Financiera',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/40',
      description: 'Maximizar valor económico, liquidez y márgenes operativos.',
    },
    {
      name: 'Clientes',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-950/40',
      border: 'border-blue-500/40',
      description: 'Satisfacción, fidelización y cobertura en el mercado objetivo.',
    },
    {
      name: 'Procesos Internos',
      icon: Cog,
      color: 'text-purple-400',
      bg: 'bg-purple-950/40',
      border: 'border-purple-500/40',
      description: 'Eficiencia en planta, control de mermas y calidad de entrega.',
    },
    {
      name: 'Aprendizaje y Crecimiento',
      icon: GraduationCap,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/40',
      description: 'Capacitación en BPM, tecnología y competencias del talento humano.',
    },
  ];

  // In-line update of an existing objective
  const handleUpdateObjective = (id: string, updates: Partial<BSCObjective>) => {
    const updated = project.bscObjectives.map((obj) => {
      if (obj.id === id) {
        return { ...obj, ...updates };
      }
      return obj;
    });
    onUpdateProject({ bscObjectives: updated });
  };

  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjTitle.trim()) return;

    const newObj: BSCObjective = {
      id: `bsc-${Date.now()}`,
      code: `OBJ-${newObjPerspective.substring(0, 3).toUpperCase()}-${String(
        project.bscObjectives.length + 1
      ).padStart(2, '0')}`,
      perspective: newObjPerspective,
      title: newObjTitle.trim(),
      description: 'Objetivo estratégico formulado a partir de las matrices.',
      matrixOrigin: newObjMatrixOrigin.trim() || 'Derivado de análisis de matrices Guía 16',
      targetAnnual: newObjTarget.trim() || 'Meta anual por definir',
      strategicInitiative: newObjInitiative.trim() || 'Iniciativa institucional',
      estimatedBudgetCOP: Number(newObjBudget) || 5000000,
      responsibleRole: newObjResponsible.trim() || 'Líder GAES / Cargo responsable',
    };

    // Auto-create initial indicator card according to SENA Guía 16
    const newIndicator: IndicatorCard = {
      id: `ind-${Date.now()}`,
      code: `IND-${newObjPerspective.substring(0, 3).toUpperCase()}-${String(
        (project.indicators?.length || 0) + 1
      ).padStart(2, '0')}`,
      name: `Índice de ${newObjTitle.trim()}`,
      perspective: newObjPerspective,
      associatedObjectiveId: newObj.id,
      definition: `Mide el cumplimiento cuantitativo del objetivo ${newObj.code}: ${newObjTitle.trim()}`,
      formula: newObjPerspective === 'Financiera'
        ? '(Utilidad Operativa / Ventas Netas) * 100'
        : '(Metas Alcanzadas / Metas Planificadas) * 100',
      unit: newObjPerspective === 'Financiera' ? '%' : '%',
      periodicity: 'Trimestral',
      baseline: 75,
      target: 90,
      currentValue: 85,
      greenRange: '>= 90%',
      yellowRange: '75% - 89%',
      redRange: '< 75%',
      dataSource: 'Reportes de Gestión del Proyecto Formativo',
      responsibleRole: newObjResponsible.trim() || 'Líder GAES',
    };

    onUpdateProject({
      bscObjectives: [...project.bscObjectives, newObj],
      indicators: [...(project.indicators || []), newIndicator],
    });

    setNewObjTitle('');
    setNewObjMatrixOrigin('');
    setNewObjTarget('');
    setNewObjInitiative('');
  };

  const handleRemoveObjective = (id: string) => {
    onUpdateProject({
      bscObjectives: project.bscObjectives.filter((o) => o.id !== id),
      bscLinks: project.bscLinks.filter((l) => l.fromObjectiveId !== id && l.toObjectiveId !== id),
      indicators: (project.indicators || []).filter((i) => i.associatedObjectiveId !== id),
    });
  };

  const handleOpenIndicatorModal = (obj: BSCObjective) => {
    setEditingObjectiveForKpi(obj);
    setIsIndicatorModalOpen(true);
  };

  const handleSaveIndicator = (savedInd: IndicatorCard) => {
    const list = project.indicators || [];
    const existingIdx = list.findIndex(
      (i) => i.id === savedInd.id || i.associatedObjectiveId === savedInd.associatedObjectiveId
    );
    let updatedList: IndicatorCard[];
    if (existingIdx >= 0) {
      updatedList = [...list];
      updatedList[existingIdx] = savedInd;
    } else {
      updatedList = [...list, savedInd];
    }
    onUpdateProject({ indicators: updatedList });
  };

  // Add Causal Link
  const handleAddCausalLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkFromId || !newLinkToId || newLinkFromId === newLinkToId) return;

    const newLink: BSCCauseEffectLink = {
      id: `link-${Date.now()}`,
      fromObjectiveId: newLinkFromId,
      toObjectiveId: newLinkToId,
      explanation: newLinkExplanation.trim() || 'Relación de causa y efecto directa entre objetivos estratégicos.',
    };

    onUpdateProject({
      bscLinks: [...project.bscLinks, newLink],
    });

    setNewLinkFromId('');
    setNewLinkToId('');
    setNewLinkExplanation('');
  };

  const handleRemoveCausalLink = (linkId: string) => {
    onUpdateProject({
      bscLinks: project.bscLinks.filter((l) => l.id !== linkId),
    });
  };

  const handleApplyBSCImport = (importedObjectives: BSCObjective[]) => {
    onUpdateProject({
      bscObjectives: importedObjectives,
    });
  };

  // Pre-load common matrix origin recommendations
  const availableMatrixOrigins = [
    ...project.dofa.map((d) => `DOFA: ${d.code} (${d.type})`),
    ...project.mefi.filter((m) => m.type === 'Fortaleza').map((m) => `MEFI: Fortaleza - ${m.factor.substring(0, 30)}...`),
    ...project.mefe.filter((m) => m.type === 'Oportunidad').map((m) => `MEFE: Oportunidad - ${m.factor.substring(0, 30)}...`),
    `PEYEA: Cuadrante ${project.peyea.quadrant}`,
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-emerald-950/50 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded">
                  Paso 4 de 6 • CMI & Mapa Estratégico
                </span>
                <span className="text-xs text-slate-400 font-mono">Kaplan & Norton • Guía 16</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Construcción del Balanced Scorecard (Cuadro de Mando Integral)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Los aprendices ingresan directamente sus objetivos en las 4 perspectivas, importan o pegan desde su Excel en Google Drive, eligen la perspectiva y conectan las relaciones de causa y efecto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Button to open Excel import modal for BSC */}
            <button
              onClick={() => setIsBSCExcelModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-purple-950 transition-all hover:scale-[1.02]"
              title="Cargar archivo Excel (.xlsx) o pegar datos del Scorecard desde Google Drive"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cargar BSC desde Excel / Drive</span>
            </button>

            {/* View toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('mapa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'mapa'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Mapa Causa-Efecto</span>
              </button>
              <button
                onClick={() => setViewMode('tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'tabla'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tabla CMI Interactiva</span>
              </button>
            </div>

            <button
              onClick={onNextStep}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
            >
              <span>Verificar Coherencia (Paso 5)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: MAPA CAUSA-EFECTO */}
      {viewMode === 'mapa' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-purple-400" />
                  <span>Mapa Estratégico de Causa y Efecto (Lectura Ascendente)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  El talento humano capacitado y la tecnología mejoran los procesos internos; estos optimizan el servicio al cliente y, como consecuencia, generan los resultados financieros de la empresa.
                </p>
              </div>
              <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-lg border border-purple-500/30">
                {project.bscLinks.length} Vínculos Causales Registrados
              </span>
            </div>

            {/* 4 Layers Rendered in Standard Strategy Order: Top = Financiera, Bottom = Aprendizaje */}
            <div className="space-y-4">
              {perspectivesList.map((p) => {
                const Icon = p.icon;
                const objs = project.bscObjectives.filter((o) => o.perspective === p.name);

                return (
                  <div
                    key={p.name}
                    className={`rounded-2xl p-4 border transition-all ${p.bg} ${p.border}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-700 ${p.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`font-bold text-sm tracking-tight ${p.color}`}>
                          Perspectiva {p.name}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          — {p.description}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        {objs.length} Objetivos
                      </span>
                    </div>

                    {/* Objective Cards in this perspective */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                      {objs.map((obj) => {
                        const isSelected = selectedObjectiveId === obj.id;
                        const associatedKpi = project.indicators.find((i) => i.associatedObjectiveId === obj.id);

                        return (
                          <div
                            key={obj.id}
                            onClick={() => setSelectedObjectiveId(isSelected ? null : obj.id)}
                            className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all shadow-md ${
                              isSelected
                                ? 'bg-slate-850 border-white ring-2 ring-purple-500/50 shadow-purple-950/50'
                                : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono font-bold text-slate-400 text-[11px]">
                                {obj.code}
                              </span>
                              {/* Matrix origin tag */}
                              <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 font-medium truncate max-w-[210px]">
                                🎯 {obj.matrixOrigin}
                              </span>
                            </div>

                            <h4 className="font-bold text-white text-xs mt-1.5 line-clamp-2">
                              {obj.title}
                            </h4>

                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                              <span className="truncate">
                                Meta: <strong className="text-emerald-400">{obj.targetAnnual}</strong>
                              </span>
                              {associatedKpi ? (
                                <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                                  {associatedKpi.code}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                                  {obj.strategicInitiative}
                                </span>
                              )}
                            </div>

                            {/* Action to view / edit Indicator Ficha */}
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenIndicatorModal(obj);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[10px] font-semibold transition-all hover:scale-102"
                                title="Abrir y editar la Ficha Técnica de Indicador oficial SENA"
                              >
                                <Target className="w-3 h-3 text-purple-400" />
                                <span>Ficha Indicador ({associatedKpi?.code || 'Configurar'})</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveObjective(obj.id);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                title="Eliminar objetivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Causal relation badges if selected */}
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-300 space-y-1 bg-slate-950/70 p-2 rounded-lg">
                                <span className="font-bold text-purple-300 block">Vínculos de Causa y Efecto:</span>
                                {project.bscLinks
                                  .filter((l) => l.fromObjectiveId === obj.id || l.toObjectiveId === obj.id)
                                  .map((l) => (
                                    <div key={l.id} className="text-slate-300">
                                      • {l.explanation}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Causal Links Manager */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-400" />
                  <span>Articulación y Vínculos de Causa y Efecto ({project.bscLinks.length})</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Conecta cómo el logro de un objetivo en una perspectiva inferior impulsa el éxito de un objetivo superior.
                </p>
              </div>
            </div>

            {/* Existing Links List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {project.bscLinks.map((link) => {
                const fromObj = project.bscObjectives.find((o) => o.id === link.fromObjectiveId);
                const toObj = project.bscObjectives.find((o) => o.id === link.toObjectiveId);

                return (
                  <div key={link.id} className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 space-y-1 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] text-purple-300">
                        <span>{fromObj?.code || 'Origen'} ({fromObj?.perspective})</span>
                        <span>➔</span>
                        <span>{toObj?.code || 'Destino'} ({toObj?.perspective})</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCausalLink(link.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 opacity-80 group-hover:opacity-100 transition-opacity"
                        title="Eliminar vínculo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {link.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Form to add a new causal link */}
            <form onSubmit={handleAddCausalLink} className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl space-y-3">
              <span className="text-[11px] font-bold text-purple-400 block">
                + Crear Nuevo Enlace de Causa y Efecto entre Objetivos:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">1. Objetivo Origen (Causa):</label>
                  <select
                    value={newLinkFromId}
                    onChange={(e) => setNewLinkFromId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="">Selecciona objetivo de origen...</option>
                    {project.bscObjectives.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.title} ({o.perspective})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">2. Objetivo Destino (Efecto):</label>
                  <select
                    value={newLinkToId}
                    onChange={(e) => setNewLinkToId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  >
                    <option value="">Selecciona objetivo de destino...</option>
                    {project.bscObjectives.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.title} ({o.perspective})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">3. Justificación de Causa-Efecto:</label>
                  <input
                    type="text"
                    value={newLinkExplanation}
                    onChange={(e) => setNewLinkExplanation(e.target.value)}
                    placeholder="Ej. La optimización del proceso reduce tiempos y eleva la satisfacción..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newLinkFromId || !newLinkToId || newLinkFromId === newLinkToId}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Vincular Causalidad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW: TABLA COMPLETA DEL CMI */}
      {viewMode === 'tabla' && (
        <div className="space-y-5">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-white">
                  Cuadro de Mando Integral Completo ({project.bscObjectives.length} Objetivos)
                </span>
                <p className="text-xs text-slate-400">
                  Edita directamente cada celda o usa el selector desplegable de Perspectiva (Financiera, Clientes, Procesos, Aprendizaje) y la Matriz de Origen.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBSCExcelModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar / Pegar desde Drive</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Código</th>
                    <th className="px-3 py-2.5">Perspectiva (Elegir)</th>
                    <th className="px-3 py-2.5">Objetivo Estratégico</th>
                    <th className="px-3 py-2.5">Indicador / Ficha SENA</th>
                    <th className="px-3 py-2.5">Matriz de Origen (Sustento)</th>
                    <th className="px-3 py-2.5">Meta Cuantitativa</th>
                    <th className="px-3 py-2.5">Iniciativa / Proyecto</th>
                    <th className="px-3 py-2.5">Presupuesto (COP)</th>
                    <th className="px-3 py-2.5">Responsable</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {project.bscObjectives.map((obj) => (
                    <tr key={obj.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-purple-400 whitespace-nowrap">
                        {obj.code}
                      </td>

                      {/* Perspective Dropdown */}
                      <td className="px-3 py-2.5">
                        <select
                          value={obj.perspective}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, {
                              perspective: e.target.value as BSCPerspective,
                            })
                          }
                          className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                            obj.perspective === 'Financiera'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                              : obj.perspective === 'Clientes'
                              ? 'bg-blue-950/80 text-blue-400 border-blue-500/50'
                              : obj.perspective === 'Procesos Internos'
                              ? 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                              : 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                          }`}
                        >
                          <option value="Financiera">Financiera</option>
                          <option value="Clientes">Clientes</option>
                          <option value="Procesos Internos">Procesos Internos</option>
                          <option value="Aprendizaje y Crecimiento">Aprendizaje y Crecimiento</option>
                        </select>
                      </td>

                      {/* Title input */}
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <input
                          type="text"
                          value={obj.title}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, { title: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-medium focus:border-purple-500 focus:outline-none"
                        />
                      </td>

                      {/* Indicator Ficha button and info */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {(() => {
                          const ind = (project.indicators || []).find((i) => i.associatedObjectiveId === obj.id);
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenIndicatorModal(obj)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all hover:scale-102"
                              title="Ver y editar la Ficha Técnica de Indicador"
                            >
                              <Target className="w-3.5 h-3.5 text-purple-400" />
                              <span>{ind ? ind.code : '+ Ficha'}</span>
                              {ind && <span className="text-[10px] text-slate-400 truncate max-w-[90px]">({ind.unit})</span>}
                            </button>
                          );
                        })()}
                      </td>

                      {/* Matrix origin input */}
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <input
                          type="text"
                          value={obj.matrixOrigin}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, { matrixOrigin: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono text-[11px] focus:border-emerald-500 focus:outline-none"
                        />
                      </td>

                      {/* Target annual */}
                      <td className="px-3 py-2.5 min-w-[130px]">
                        <input
                          type="text"
                          value={obj.targetAnnual}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, { targetAnnual: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </td>

                      {/* Initiative */}
                      <td className="px-3 py-2.5 min-w-[170px]">
                        <input
                          type="text"
                          value={obj.strategicInitiative}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, { strategicInitiative: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </td>

                      {/* Budget */}
                      <td className="px-3 py-2.5 w-28">
                        <input
                          type="number"
                          value={obj.estimatedBudgetCOP}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, {
                              estimatedBudgetCOP: Number(e.target.value) || 0,
                            })
                          }
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs text-right focus:border-purple-500 focus:outline-none"
                        />
                      </td>

                      {/* Responsible */}
                      <td className="px-3 py-2.5 min-w-[140px]">
                        <input
                          type="text"
                          value={obj.responsibleRole}
                          onChange={(e) =>
                            handleUpdateObjective(obj.id, { responsibleRole: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveObjective(obj.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-700/50 transition-colors"
                          title="Eliminar objetivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick add objective form */}
          <form onSubmit={handleAddObjective} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
              + Agregar Nuevo Objetivo Estratégico al Balanced Scorecard
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Perspectiva BSC</label>
                <select
                  value={newObjPerspective}
                  onChange={(e) => setNewObjPerspective(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="Financiera">Financiera</option>
                  <option value="Clientes">Clientes</option>
                  <option value="Procesos Internos">Procesos Internos</option>
                  <option value="Aprendizaje y Crecimiento">Aprendizaje y Crecimiento</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Título del Objetivo</label>
                <input
                  type="text"
                  placeholder="Ej. Incrementar la rentabilidad neta al 15%"
                  value={newObjTitle}
                  onChange={(e) => setNewObjTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Matriz de Origen</label>
                <input
                  type="text"
                  placeholder="Ej. DOFA FO-1 | PEYEA Agresivo"
                  value={newObjMatrixOrigin}
                  onChange={(e) => setNewObjMatrixOrigin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Iniciativa Estratégica</label>
                <input
                  type="text"
                  placeholder="Proyecto o acción concreta a implementar"
                  value={newObjInitiative}
                  onChange={(e) => setNewObjInitiative(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Meta Cuantitativa</label>
                <input
                  type="text"
                  placeholder="Ej. 15% a diciembre 2026"
                  value={newObjTarget}
                  onChange={(e) => setNewObjTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insertar Objetivo</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onPrevStep}
          className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          ← Volver a Matrices Guía 16 (Paso 3)
        </button>

        <button
          onClick={onNextStep}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
        >
          <span>Ir a Auditoría de Coherencia (Paso 5)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal: Excel BSC Import */}
      <ExcelBSCImportModal
        isOpen={isBSCExcelModalOpen}
        onClose={() => setIsBSCExcelModalOpen(false)}
        project={project}
        onApplyBSCImport={handleApplyBSCImport}
      />

      {/* Modal: Ficha Técnica de Indicador SENA */}
      <IndicatorCardModal
        isOpen={isIndicatorModalOpen}
        onClose={() => {
          setIsIndicatorModalOpen(false);
          setEditingObjectiveForKpi(null);
        }}
        objective={editingObjectiveForKpi}
        existingIndicator={(project.indicators || []).find(
          (i) => i.associatedObjectiveId === editingObjectiveForKpi?.id
        )}
        onSaveIndicator={handleSaveIndicator}
      />
    </div>
  );
};
