import React, { useState } from 'react';
import { 
  Grid3X3, 
  Layers, 
  Sliders, 
  BarChart3, 
  Compass, 
  FileCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Info, 
  Sparkles,
  PieChart,
  HelpCircle,
  Eye,
  Edit2,
  FileSpreadsheet,
  Upload,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';
import { 
  GAESProject, 
  PESTAItem, 
  MEFIItem, 
  MEFEItem, 
  DOFAStrategy, 
  PEYEAMatrix, 
  MPCMatrix, 
  BCGItem, 
  IndicatorCard,
  BSCObjective,
  BSCPerspective
} from '../types';
import { 
  calculateMEFIScore, 
  calculateMEFEScore, 
  calculatePEYEACoordinates, 
  calculateMPCScores 
} from '../utils/strategicCalculations';
import { ExcelMatrixImportModal } from './ExcelMatrixImportModal';
import { MatrixExcelUploadBar } from './MatrixExcelUploadBar';

interface Step3Props {
  project: GAESProject;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onAuditClick: () => void;
}

export const Step3_Matrices: React.FC<Step3Props> = ({
  project,
  onUpdateProject,
  onNextStep,
  onPrevStep,
  onAuditClick,
}) => {
  const [activeMatrix, setActiveMatrix] = useState<
    'mefi' | 'mefe' | 'dofa' | 'peyea' | 'mpc' | 'bcg' | 'pesta'
  >('mefi');

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [validSuccessMessage, setValidSuccessMessage] = useState<string | null>(null);

  // Quick factor input state for DOFA / Matrices
  const [quickFactorText, setQuickFactorText] = useState('');
  const [quickFactorType, setQuickFactorType] = useState<'Fortaleza' | 'Debilidad' | 'Oportunidad' | 'Amenaza'>('Fortaleza');
  const [quickFactorWeight, setQuickFactorWeight] = useState(0.10);
  const [quickFactorRating, setQuickFactorRating] = useState(3);

  // New DOFA Strategy state
  const [newDofaType, setNewDofaType] = useState<'FO' | 'DO' | 'FA' | 'DA'>('FO');
  const [newDofaTitle, setNewDofaTitle] = useState('');
  const [newDofaDesc, setNewDofaDesc] = useState('');
  const [newDofaCrossed, setNewDofaCrossed] = useState('');
  const [newDofaPriority, setNewDofaPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');

  // Calculations
  const mefiCalc = calculateMEFIScore(project.mefi);
  const mefeCalc = calculateMEFEScore(project.mefe);
  const peyeaData = project.peyea;
  const mpcCalc = calculateMPCScores(project.mpc);

  // Validation before allowing step 4
  const validateMatricesBeforeStep4 = (): string[] => {
    const errors: string[] = [];
    const mefiWeightSum = Number(project.mefi.reduce((a, b) => a + b.weight, 0).toFixed(2));
    const mefeWeightSum = Number(project.mefe.reduce((a, b) => a + b.weight, 0).toFixed(2));

    if (Math.abs(mefiWeightSum - 1.0) >= 0.02) {
      errors.push(`Sumatoria de ponderaciones MEFI es ${mefiWeightSum.toFixed(2)} (debe ser exactamente 1.00).`);
    }
    if (Math.abs(mefeWeightSum - 1.0) >= 0.02) {
      errors.push(`Sumatoria de ponderaciones MEFE es ${mefeWeightSum.toFixed(2)} (debe ser exactamente 1.00).`);
    }

    const strengthsCount = project.mefi.filter((i) => i.type === 'Fortaleza').length;
    const weaknessesCount = project.mefi.filter((i) => i.type === 'Debilidad').length;
    if (strengthsCount === 0) errors.push('La matriz MEFI no tiene Fortalezas registradas.');
    if (weaknessesCount === 0) errors.push('La matriz MEFI no tiene Debilidades registradas.');

    const opportunitiesCount = project.mefe.filter((i) => i.type === 'Oportunidad').length;
    const threatsCount = project.mefe.filter((i) => i.type === 'Amenaza').length;
    if (opportunitiesCount === 0) errors.push('La matriz MEFE no tiene Oportunidades registradas.');
    if (threatsCount === 0) errors.push('La matriz MEFE no tiene Amenazas registradas.');

    if (project.dofa.length === 0) {
      errors.push('Debe registrar al menos una estrategia formulada en la DOFA.');
    }

    return errors;
  };

  const handleExplicitValidation = () => {
    const errors = validateMatricesBeforeStep4();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorsModal(true);
      setValidSuccessMessage(null);
    } else {
      onUpdateProject({
        isMatricesValidated: true,
        matricesValidatedAt: new Date().toISOString(),
      });
      setValidSuccessMessage('¡Matrices Estratégicas validadas con éxito! Cumplen sumatorias y parámetros de la Guía 16. Paso 4 (Balanced Scorecard) desbloqueado.');
      setTimeout(() => setValidSuccessMessage(null), 6000);
    }
  };

  const handleAdvanceToStep4 = () => {
    const errors = validateMatricesBeforeStep4();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorsModal(true);
    } else {
      onUpdateProject({
        isMatricesValidated: true,
        matricesValidatedAt: new Date().toISOString(),
      });
      onNextStep();
    }
  };

  // Reclassify factor between Fortaleza, Debilidad, Oportunidad, Amenaza
  const handleReclassifyFactor = (
    factorId: string,
    currentLocation: 'mefi' | 'mefe',
    targetType: 'Fortaleza' | 'Debilidad' | 'Oportunidad' | 'Amenaza'
  ) => {
    if (currentLocation === 'mefi') {
      const item = project.mefi.find((m) => m.id === factorId);
      if (!item) return;

      if (targetType === 'Fortaleza' || targetType === 'Debilidad') {
        const defaultRating = targetType === 'Fortaleza' ? (item.rating < 3 ? 3 : item.rating) : (item.rating > 2 ? 2 : item.rating);
        handleUpdateMEFIItem(factorId, {
          type: targetType,
          rating: defaultRating as any,
          weightedScore: Number((item.weight * defaultRating).toFixed(2)),
        });
      } else {
        // Transfer from MEFI to MEFE
        const newRating = targetType === 'Oportunidad' ? 3 : 2;
        const newMefeItem: MEFEItem = {
          id: `mefe-${Date.now()}`,
          type: targetType,
          factor: item.factor,
          weight: item.weight,
          rating: newRating as any,
          weightedScore: Number((item.weight * newRating).toFixed(2)),
          pestaCategory: 'Económico',
          validationStatus: item.validationStatus,
        };
        onUpdateProject({
          mefi: project.mefi.filter((m) => m.id !== factorId),
          mefe: [...project.mefe, newMefeItem],
        });
      }
    } else {
      const item = project.mefe.find((m) => m.id === factorId);
      if (!item) return;

      if (targetType === 'Oportunidad' || targetType === 'Amenaza') {
        const defaultRating = targetType === 'Oportunidad' ? (item.rating < 3 ? 3 : item.rating) : (item.rating > 2 ? 2 : item.rating);
        handleUpdateMEFEItem(factorId, {
          type: targetType,
          rating: defaultRating as any,
          weightedScore: Number((item.weight * defaultRating).toFixed(2)),
        });
      } else {
        // Transfer from MEFE to MEFI
        const newRating = targetType === 'Fortaleza' ? 3 : 2;
        const newMefiItem: MEFIItem = {
          id: `mefi-${Date.now()}`,
          type: targetType,
          factor: item.factor,
          weight: item.weight,
          rating: newRating as any,
          weightedScore: Number((item.weight * newRating).toFixed(2)),
          area: 'Operaciones',
          validationStatus: item.validationStatus,
        };
        onUpdateProject({
          mefe: project.mefe.filter((m) => m.id !== factorId),
          mefi: [...project.mefi, newMefiItem],
        });
      }
    }
  };

  // Add a quick factor from the classifier
  const handleAddQuickFactor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFactorText.trim()) return;

    if (quickFactorType === 'Fortaleza' || quickFactorType === 'Debilidad') {
      const newItem: MEFIItem = {
        id: `mefi-${Date.now()}`,
        type: quickFactorType,
        factor: quickFactorText.trim(),
        weight: Number(quickFactorWeight) || 0.1,
        rating: Number(quickFactorRating) as any,
        weightedScore: Number(((Number(quickFactorWeight) || 0.1) * Number(quickFactorRating)).toFixed(2)),
        area: 'Operaciones',
        validationStatus: 'Validado',
      };
      onUpdateProject({ mefi: [...project.mefi, newItem] });
    } else {
      const newItem: MEFEItem = {
        id: `mefe-${Date.now()}`,
        type: quickFactorType,
        factor: quickFactorText.trim(),
        weight: Number(quickFactorWeight) || 0.1,
        rating: Number(quickFactorRating) as any,
        weightedScore: Number(((Number(quickFactorWeight) || 0.1) * Number(quickFactorRating)).toFixed(2)),
        pestaCategory: 'Económico',
        validationStatus: 'Validado',
      };
      onUpdateProject({ mefe: [...project.mefe, newItem] });
    }

    setQuickFactorText('');
  };

  // Add DOFA Strategy
  const handleAddDofaStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDofaTitle.trim()) return;

    const newStrat: DOFAStrategy = {
      id: `dofa-${Date.now()}`,
      code: `${newDofaType}-${project.dofa.filter((s) => s.type === newDofaType).length + 1}`,
      type: newDofaType,
      title: newDofaTitle.trim(),
      description: newDofaDesc.trim() || 'Estrategia formulada a partir del cruce de factores.',
      crossedFactors: newDofaCrossed.split(',').map((s) => s.trim()).filter(Boolean),
      priority: newDofaPriority,
    };

    onUpdateProject({ dofa: [...project.dofa, newStrat] });
    setNewDofaTitle('');
    setNewDofaDesc('');
    setNewDofaCrossed('');
  };

  const handleRemoveDofaStrategy = (id: string) => {
    onUpdateProject({ dofa: project.dofa.filter((s) => s.id !== id) });
  };

  const handleSendDofaToBSC = (strat: DOFAStrategy) => {
    let perspective: BSCPerspective = 'Clientes';
    if (strat.type === 'FO') perspective = 'Clientes';
    else if (strat.type === 'DO') perspective = 'Procesos Internos';
    else if (strat.type === 'FA') perspective = 'Financiera';
    else if (strat.type === 'DA') perspective = 'Aprendizaje y Crecimiento';

    const exists = project.bscObjectives.some(
      (o) => o.title === strat.title || o.matrixOrigin.includes(strat.code)
    );
    if (exists) {
      setValidSuccessMessage(`La estrategia ${strat.code} ya está vinculada al Balanced Scorecard.`);
      setTimeout(() => setValidSuccessMessage(null), 4000);
      return;
    }

    const newObj: BSCObjective = {
      id: `bsc-dofa-${Date.now()}-${strat.id}`,
      code: `OBJ-${perspective.substring(0, 3).toUpperCase()}-${String(
        project.bscObjectives.length + 1
      ).padStart(2, '0')}`,
      perspective,
      title: strat.title,
      description: strat.description,
      matrixOrigin: `DOFA: Estrategia ${strat.code} (${strat.type})`,
      targetAnnual: '>= 90% cumplimiento',
      strategicInitiative: strat.description,
      estimatedBudgetCOP: 6000000,
      responsibleRole: 'Líder GAES',
    };

    onUpdateProject({
      bscObjectives: [...project.bscObjectives, newObj],
    });
    setValidSuccessMessage(`¡Estrategia ${strat.code} enviada al Balanced Scorecard en la perspectiva ${perspective}!`);
    setTimeout(() => setValidSuccessMessage(null), 5000);
  };

  const handleAutoCalibrateWeights = () => {
    // Calibrate MEFI to sum 1.00
    let adjustedMefi = [...project.mefi];
    const mefiLen = project.mefi.length;
    if (mefiLen > 0) {
      const avgWeight = Number((1.0 / mefiLen).toFixed(2));
      adjustedMefi = project.mefi.map((m, idx) => {
        if (idx === mefiLen - 1) {
          const sumRest = avgWeight * (mefiLen - 1);
          const finalW = Number((1.0 - sumRest).toFixed(2));
          return { ...m, weight: finalW, weightedScore: Number((finalW * m.rating).toFixed(2)) };
        }
        return { ...m, weight: avgWeight, weightedScore: Number((avgWeight * m.rating).toFixed(2)) };
      });
    }

    // Calibrate MEFE to sum 1.00
    let adjustedMefe = [...project.mefe];
    const mefeLen = project.mefe.length;
    if (mefeLen > 0) {
      const avgWeight = Number((1.0 / mefeLen).toFixed(2));
      adjustedMefe = project.mefe.map((m, idx) => {
        if (idx === mefeLen - 1) {
          const sumRest = avgWeight * (mefeLen - 1);
          const finalW = Number((1.0 - sumRest).toFixed(2));
          return { ...m, weight: finalW, weightedScore: Number((finalW * m.rating).toFixed(2)) };
        }
        return { ...m, weight: avgWeight, weightedScore: Number((avgWeight * m.rating).toFixed(2)) };
      });
    }

    onUpdateProject({
      mefi: adjustedMefi,
      mefe: adjustedMefe,
      isMatricesValidated: true,
      matricesValidatedAt: new Date().toISOString(),
    });

    setShowErrorsModal(false);
    setValidSuccessMessage('¡Ponderaciones calibradas automáticamente a 1.00! Matrices validadas y Paso 4 (Balanced Scorecard) desbloqueado.');
    setTimeout(() => setValidSuccessMessage(null), 6000);
  };

  const handleApplyImportedExcel = (importedData: {
    mefi: MEFIItem[];
    mefe: MEFEItem[];
    pesta: PESTAItem[];
    peyea: typeof project.peyea;
  }) => {
    onUpdateProject({
      mefi: importedData.mefi,
      mefe: importedData.mefe,
      pesta: importedData.pesta,
      peyea: importedData.peyea,
    });
  };

  // Handlers for MEFI
  const handleUpdateMEFIItem = (id: string, updates: Partial<MEFIItem>) => {
    const updated = project.mefi.map((item) => {
      if (item.id === id) {
        const next = { ...item, ...updates };
        next.weightedScore = Number((next.weight * next.rating).toFixed(2));
        return next;
      }
      return item;
    });
    onUpdateProject({ mefi: updated });
  };

  const handleAddMEFIItem = (type: 'Fortaleza' | 'Debilidad') => {
    const newItem: MEFIItem = {
      id: `mefi-${Date.now()}`,
      type,
      factor: type === 'Fortaleza' ? 'Nueva fortaleza competitiva...' : 'Nueva debilidad interna a superar...',
      weight: 0.10,
      rating: type === 'Fortaleza' ? 3 : 2,
      weightedScore: type === 'Fortaleza' ? 0.30 : 0.20,
      area: 'Operaciones',
      validationStatus: 'Supuesto por Verificar',
    };
    onUpdateProject({ mefi: [...project.mefi, newItem] });
  };

  const handleRemoveMEFIItem = (id: string) => {
    onUpdateProject({ mefi: project.mefi.filter((i) => i.id !== id) });
  };

  // Handlers for MEFE
  const handleUpdateMEFEItem = (id: string, updates: Partial<MEFEItem>) => {
    const updated = project.mefe.map((item) => {
      if (item.id === id) {
        const next = { ...item, ...updates };
        next.weightedScore = Number((next.weight * next.rating).toFixed(2));
        return next;
      }
      return item;
    });
    onUpdateProject({ mefe: updated });
  };

  const handleAddMEFEItem = (type: 'Oportunidad' | 'Amenaza') => {
    const newItem: MEFEItem = {
      id: `mefe-${Date.now()}`,
      type,
      factor: type === 'Oportunidad' ? 'Nueva oportunidad del entorno...' : 'Nueva amenaza externa latente...',
      weight: 0.10,
      rating: type === 'Oportunidad' ? 3 : 2,
      weightedScore: type === 'Oportunidad' ? 0.30 : 0.20,
      pestaCategory: 'Económico',
      validationStatus: 'Supuesto por Verificar',
    };
    onUpdateProject({ mefe: [...project.mefe, newItem] });
  };

  const handleRemoveMEFEItem = (id: string) => {
    onUpdateProject({ mefe: project.mefe.filter((i) => i.id !== id) });
  };

  // Handlers for PEYEA factor score
  const handleUpdatePEYEAScore = (
    category: 'financialStrength' | 'competitiveAdvantage' | 'environmentalStability' | 'industryStrength',
    factorId: string,
    newScore: number
  ) => {
    const updatedCategory = peyeaData[category].map((f) =>
      f.id === factorId ? { ...f, score: newScore } : f
    );
    const updatedMatrix = calculatePEYEACoordinates({
      ...peyeaData,
      [category]: updatedCategory,
    });
    onUpdateProject({ peyea: updatedMatrix });
  };

  // Handlers for MPC
  const handleUpdateMPCFactor = (
    factorId: string,
    field: 'weight' | 'companyRating' | 'competitor1Rating' | 'competitor2Rating' | 'factor',
    value: any
  ) => {
    const updatedFactors = project.mpc.factors.map((f) =>
      f.id === factorId ? { ...f, [field]: value } : f
    );
    onUpdateProject({
      mpc: {
        ...project.mpc,
        factors: updatedFactors,
      },
    });
  };

  // Handlers for BCG and PESTA
  const handleUpdateBCGItem = (id: string, updates: Partial<BCGItem>) => {
    const updated = project.bcg.map((b) => (b.id === id ? { ...b, ...updates } : b));
    onUpdateProject({ bcg: updated });
  };

  const handleUpdatePESTAItem = (id: string, updates: Partial<PESTAItem>) => {
    const updated = project.pesta.map((p) => (p.id === id ? { ...p, ...updates } : p));
    onUpdateProject({ pesta: updated });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/50 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                  Paso 3 de 6 • Eje Articulador Guía 16
                </span>
                <span className="text-xs text-slate-400 font-mono">Evaluación Estratégica SENA</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Generación & Validación de Matrices Estratégicas
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Calcula y valida las matrices de la Guía 16 (MEFI, MEFE, DOFA, PEYEA, MPC, BCG, PESTA y Fichas de Indicadores). Puedes ajustar pesos, calificaciones y supuestos. Los hallazgos aprobados aquí construirán el Balanced Scorecard.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow transition-all hover:border-emerald-500/50"
              title="Importar y clasificar factores desde archivo Excel o Google Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Subir Excel / Drive</span>
            </button>

            <button
              onClick={handleExplicitValidation}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow transition-all border ${
                project.isMatricesValidated
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30'
              }`}
              title="Validar sumatorias y reglas metodológicas antes de abrir el BSC"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{project.isMatricesValidated ? 'Matrices Validadas ✓' : 'Validar Matrices para BSC'}</span>
            </button>

            <button
              onClick={handleAdvanceToStep4}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
            >
              <span>Aprobar & Construir BSC (Paso 4)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Validation banner feedback */}
        {validSuccessMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{validSuccessMessage}</span>
            </div>
            <button
              onClick={() => setValidSuccessMessage(null)}
              className="text-emerald-400 hover:text-white text-xs ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {!project.isMatricesValidated && !validSuccessMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Validación Pendiente para Paso 4:</strong> Antes de formular el Balanced Scorecard, ejecuta la validación para verificar que las ponderaciones MEFI y MEFE sumen 1.00.
              </span>
            </div>
            <button
              onClick={handleExplicitValidation}
              className="underline hover:text-white font-semibold shrink-0 ml-2"
            >
              Validar ahora
            </button>
          </div>
        )}
      </div>

      {/* Sub-matrices Navigation bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-thin">
        {[
          { id: 'mefi', label: 'Matriz MEFI', badge: `${mefiCalc.weightedScore} pts`, valid: Math.abs(mefiCalc.totalWeight - 1.0) < 0.02 },
          { id: 'mefe', label: 'Matriz MEFE', badge: `${mefeCalc.weightedScore} pts`, valid: Math.abs(mefeCalc.totalWeight - 1.0) < 0.02 },
          { id: 'dofa', label: 'DOFA Cruzada', badge: `${project.dofa.length} est`, valid: true },
          { id: 'peyea', label: 'Matriz PEYEA', badge: peyeaData.quadrant, valid: true },
          { id: 'mpc', label: 'Perfil Competitivo (MPC)', badge: `Top #${mpcCalc.ranking[0]?.name.includes('Proyecto') ? '1' : '2'}`, valid: Math.abs(mpcCalc.totalWeight - 1.0) < 0.02 },
          { id: 'bcg', label: 'Matriz BCG', badge: `${project.bcg.length} líneas`, valid: true },
          { id: 'pesta', label: 'Entorno PESTA', badge: `${project.pesta.length} fac`, valid: true },
        ].map((m) => {
          const isActive = activeMatrix === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveMatrix(m.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{m.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                  m.valid
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}
              >
                {m.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* MATRIX VIEW: MEFI */}
      {activeMatrix === 'mefi' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="mefi"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          {/* Header & KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
              <span className="text-slate-400 block mb-0.5 font-medium">Puntuación Ponderada MEFI</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {mefiCalc.weightedScore}
                </span>
                <span className="text-slate-400 text-[11px]">/ 4.0 (Promedio: 2.50)</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-slate-400 block mb-0.5 font-medium">Suma de Ponderaciones</span>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      Math.abs(mefiCalc.totalWeight - 1.0) < 0.02
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {mefiCalc.totalWeight}
                  </span>
                  <span className="text-slate-400 text-[11px]">(Debe ser 1.00)</span>
                </div>
                {Math.abs(mefiCalc.totalWeight - 1.0) >= 0.02 && (
                  <button
                    onClick={handleAutoCalibrateWeights}
                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-1 rounded font-bold transition-all shrink-0"
                    title="Ajustar proporcionalmente los pesos a exactamente 1.00"
                  >
                    Calibrar a 1.00
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 col-span-1 md:col-span-2 flex flex-col justify-center">
              <span className="text-slate-400 font-medium block text-[11px] mb-1">Diagnóstico Interno:</span>
              <p className="text-xs text-slate-200 leading-snug font-medium">
                {mefiCalc.interpretation}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Factores Internos Críticos (MEFI)</span>
                <span className="text-xs text-slate-400">
                  Calificación: 4 = Fortaleza Mayor, 3 = Fortaleza Menor, 2 = Debilidad Menor, 1 = Debilidad Mayor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddMEFIItem('Fortaleza')}
                  className="bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Fortaleza</span>
                </button>
                <button
                  onClick={() => handleAddMEFIItem('Debilidad')}
                  className="bg-rose-600/80 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Debilidad</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Factor Interno Clave</th>
                    <th className="px-3 py-2.5">Área Funcional</th>
                    <th className="px-3 py-2.5 text-center">Peso (0-1)</th>
                    <th className="px-3 py-2.5 text-center">Calificación (1-4)</th>
                    <th className="px-3 py-2.5 text-center">Ponderado</th>
                    <th className="px-3 py-2.5">Estado Validación</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {project.mefi.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <select
                          value={item.type}
                          onChange={(e) => handleReclassifyFactor(item.id, 'mefi', e.target.value as any)}
                          className={`font-semibold px-2 py-1 rounded text-[10px] border focus:outline-none cursor-pointer ${
                            item.type === 'Fortaleza'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-950/80 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <option value="Fortaleza">Fortaleza (F)</option>
                          <option value="Debilidad">Debilidad (D)</option>
                          <option value="Oportunidad">➔ Cambiar a Oportunidad (MEFE)</option>
                          <option value="Amenaza">➔ Cambiar a Amenaza (MEFE)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={item.factor}
                          onChange={(e) => handleUpdateMEFIItem(item.id, { factor: e.target.value })}
                          className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.area}
                          onChange={(e) => handleUpdateMEFIItem(item.id, { area: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                        >
                          <option value="Operaciones">Operaciones</option>
                          <option value="Mercadeo">Mercadeo</option>
                          <option value="Financiera">Financiera</option>
                          <option value="Talento Humano">Talento Humano</option>
                          <option value="Direccionamiento">Direccionamiento</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1"
                          value={item.weight}
                          onChange={(e) =>
                            handleUpdateMEFIItem(item.id, { weight: Number(e.target.value) || 0 })
                          }
                          className="w-16 text-center bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={item.rating}
                          onChange={(e) =>
                            handleUpdateMEFIItem(item.id, {
                              rating: Number(e.target.value) as any,
                            })
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none"
                        >
                          <option value="1">1 (Debilidad Mayor)</option>
                          <option value="2">2 (Debilidad Menor)</option>
                          <option value="3">3 (Fortaleza Menor)</option>
                          <option value="4">4 (Fortaleza Mayor)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-100">
                        {item.weightedScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.validationStatus}
                          onChange={(e) =>
                            handleUpdateMEFIItem(item.id, {
                              validationStatus: e.target.value as any,
                            })
                          }
                          className={`text-[10px] font-medium px-2 py-1 rounded border ${
                            item.validationStatus === 'Validado'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="Validado">Validado con evidencia</option>
                          <option value="Supuesto por Verificar">Supuesto por Verificar</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveMEFIItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Eliminar factor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-bold text-slate-300 border-t border-slate-700">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-right">
                      Totales Ponderados:
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      <span
                        className={
                          Math.abs(mefiCalc.totalWeight - 1.0) < 0.02
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {mefiCalc.totalWeight.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center font-mono text-emerald-400 text-sm">
                      {mefiCalc.weightedScore.toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-3 py-3 text-xs text-slate-400">
                      Fortalezas: {mefiCalc.strengthsScore.toFixed(2)} | Debilidades: {mefiCalc.weaknessesScore.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW: MEFE */}
      {activeMatrix === 'mefe' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="mefe"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          {/* Header & KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
              <span className="text-slate-400 block mb-0.5 font-medium">Puntuación Ponderada MEFE</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-blue-400">
                  {mefeCalc.weightedScore}
                </span>
                <span className="text-slate-400 text-[11px]">/ 4.0 (Promedio: 2.50)</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-slate-400 block mb-0.5 font-medium">Suma de Ponderaciones</span>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      Math.abs(mefeCalc.totalWeight - 1.0) < 0.02
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {mefeCalc.totalWeight}
                  </span>
                  <span className="text-slate-400 text-[11px]">(Debe ser 1.00)</span>
                </div>
                {Math.abs(mefeCalc.totalWeight - 1.0) >= 0.02 && (
                  <button
                    onClick={handleAutoCalibrateWeights}
                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-1 rounded font-bold transition-all shrink-0"
                    title="Ajustar proporcionalmente los pesos a exactamente 1.00"
                  >
                    Calibrar a 1.00
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 col-span-1 md:col-span-2 flex flex-col justify-center">
              <span className="text-slate-400 font-medium block text-[11px] mb-1">Diagnóstico del Entorno:</span>
              <p className="text-xs text-slate-200 leading-snug font-medium">
                {mefeCalc.interpretation}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Factores Externos Críticos (MEFE)</span>
                <span className="text-xs text-slate-400">
                  Calificación: 4 = Respuesta Superior, 3 = Respuesta Sobre Media, 2 = Respuesta Media, 1 = Respuesta Deficiente
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddMEFEItem('Oportunidad')}
                  className="bg-blue-600/80 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Oportunidad</span>
                </button>
                <button
                  onClick={() => handleAddMEFEItem('Amenaza')}
                  className="bg-amber-600/80 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Amenaza</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Factor Externo</th>
                    <th className="px-3 py-2.5">Categoría PESTA</th>
                    <th className="px-3 py-2.5 text-center">Peso (0-1)</th>
                    <th className="px-3 py-2.5 text-center">Calificación (1-4)</th>
                    <th className="px-3 py-2.5 text-center">Ponderado</th>
                    <th className="px-3 py-2.5">Estado Validación</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {project.mefe.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <select
                          value={item.type}
                          onChange={(e) => handleReclassifyFactor(item.id, 'mefe', e.target.value as any)}
                          className={`font-semibold px-2 py-1 rounded text-[10px] border focus:outline-none cursor-pointer ${
                            item.type === 'Oportunidad'
                              ? 'bg-blue-950/80 text-blue-400 border-blue-500/30'
                              : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="Oportunidad">Oportunidad (O)</option>
                          <option value="Amenaza">Amenaza (A)</option>
                          <option value="Fortaleza">➔ Cambiar a Fortaleza (MEFI)</option>
                          <option value="Debilidad">➔ Cambiar a Debilidad (MEFI)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={item.factor}
                          onChange={(e) => handleUpdateMEFEItem(item.id, { factor: e.target.value })}
                          className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.pestaCategory}
                          onChange={(e) => handleUpdateMEFEItem(item.id, { pestaCategory: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                        >
                          <option value="Político">Político</option>
                          <option value="Económico">Económico</option>
                          <option value="Social">Social</option>
                          <option value="Tecnológico">Tecnológico</option>
                          <option value="Ambiental / Legal">Ambiental / Legal</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1"
                          value={item.weight}
                          onChange={(e) =>
                            handleUpdateMEFEItem(item.id, { weight: Number(e.target.value) || 0 })
                          }
                          className="w-16 text-center bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-blue-400 font-bold focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={item.rating}
                          onChange={(e) =>
                            handleUpdateMEFEItem(item.id, {
                              rating: Number(e.target.value) as any,
                            })
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none"
                        >
                          <option value="1">1 (Deficiente)</option>
                          <option value="2">2 (Media)</option>
                          <option value="3">3 (Sobre Media)</option>
                          <option value="4">4 (Superior)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-100">
                        {item.weightedScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.validationStatus}
                          onChange={(e) =>
                            handleUpdateMEFEItem(item.id, {
                              validationStatus: e.target.value as any,
                            })
                          }
                          className={`text-[10px] font-medium px-2 py-1 rounded border ${
                            item.validationStatus === 'Validado'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="Validado">Validado con evidencia</option>
                          <option value="Supuesto por Verificar">Supuesto por Verificar</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleRemoveMEFEItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Eliminar factor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-bold text-slate-300 border-t border-slate-700">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-right">
                      Totales Ponderados:
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      <span
                        className={
                          Math.abs(mefeCalc.totalWeight - 1.0) < 0.02
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {mefeCalc.totalWeight.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">-</td>
                    <td className="px-3 py-3 text-center font-mono text-blue-400 text-sm">
                      {mefeCalc.weightedScore.toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-3 py-3 text-xs text-slate-400">
                      Oportunidades: {mefeCalc.opportunitiesScore.toFixed(2)} | Amenazas: {mefeCalc.threatsScore.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW: DOFA CRUZADA */}
      {activeMatrix === 'dofa' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="dofa"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Matriz DOFA Estratégica (Cruces de Impacto)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Formulación de estrategias ofensivas (FO), de reorientación (DO), defensivas (FA) y de supervivencia (DA).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quadrant FO */}
            <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Estrategias FO (Maxi - Maxi) • Ofensivas
                </span>
                <span className="text-[10px] text-slate-400">Fortalezas + Oportunidades</span>
              </div>
              <div className="space-y-2.5">
                {project.dofa.filter((s) => s.type === 'FO').map((strat) => (
                  <div key={strat.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 font-mono">{strat.code} - {strat.title}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {strat.priority}
                        </span>
                        <button
                          onClick={() => handleRemoveDofaStrategy(strat.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Eliminar estrategia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{strat.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Cruces: <span className="text-emerald-300 font-mono">{strat.crossedFactors.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant DO */}
            <div className="bg-slate-800/90 border border-blue-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-blue-500/30 pb-2">
                <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Estrategias DO (Mini - Maxi) • Reorientación
                </span>
                <span className="text-[10px] text-slate-400">Debilidades + Oportunidades</span>
              </div>
              <div className="space-y-2.5">
                {project.dofa.filter((s) => s.type === 'DO').map((strat) => (
                  <div key={strat.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 font-mono">{strat.code} - {strat.title}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                          {strat.priority}
                        </span>
                        <button
                          onClick={() => handleRemoveDofaStrategy(strat.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Eliminar estrategia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{strat.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Cruces: <span className="text-blue-300 font-mono">{strat.crossedFactors.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant FA */}
            <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Estrategias FA (Maxi - Mini) • Defensivas
                </span>
                <span className="text-[10px] text-slate-400">Fortalezas + Amenazas</span>
              </div>
              <div className="space-y-2.5">
                {project.dofa.filter((s) => s.type === 'FA').map((strat) => (
                  <div key={strat.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 font-mono">{strat.code} - {strat.title}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {strat.priority}
                        </span>
                        <button
                          onClick={() => handleRemoveDofaStrategy(strat.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Eliminar estrategia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{strat.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Cruces: <span className="text-amber-300 font-mono">{strat.crossedFactors.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant DA */}
            <div className="bg-slate-800/90 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  Estrategias DA (Mini - Mini) • Supervivencia
                </span>
                <span className="text-[10px] text-slate-400">Debilidades + Amenazas</span>
              </div>
              <div className="space-y-2.5">
                {project.dofa.filter((s) => s.type === 'DA').map((strat) => (
                  <div key={strat.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 font-mono">{strat.code} - {strat.title}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {strat.priority}
                        </span>
                        <button
                          onClick={() => handleRemoveDofaStrategy(strat.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Eliminar estrategia"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{strat.description}</p>
                    <div className="text-[10px] text-slate-400">
                      Cruces: <span className="text-rose-300 font-mono">{strat.crossedFactors.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form to Add New DOFA Strategy */}
          <form onSubmit={handleAddDofaStrategy} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              + Formular Nueva Estrategia DOFA (Cruces de Factores)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tipo de Estrategia DOFA</label>
                <select
                  value={newDofaType}
                  onChange={(e) => setNewDofaType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold"
                >
                  <option value="FO">FO (Fortaleza + Oportunidad - Ofensiva)</option>
                  <option value="DO">DO (Debilidad + Oportunidad - Reorientación)</option>
                  <option value="FA">FA (Fortaleza + Amenaza - Defensiva)</option>
                  <option value="DA">DA (Debilidad + Amenaza - Supervivencia)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">Título de la Estrategia</label>
                <input
                  type="text"
                  placeholder="Ej. Alianza estratégica de distribución y fomento agropecuario"
                  value={newDofaTitle}
                  onChange={(e) => setNewDofaTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Prioridad</label>
                <select
                  value={newDofaPriority}
                  onChange={(e) => setNewDofaPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-slate-400 block mb-1">Descripción / Acción Estratégica</label>
                <input
                  type="text"
                  placeholder="Detalla cómo se combinan los factores para generar ventaja..."
                  value={newDofaDesc}
                  onChange={(e) => setNewDofaDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Factores Cruzados</label>
                <input
                  type="text"
                  placeholder="Ej. F1, O2, F3"
                  value={newDofaCrossed}
                  onChange={(e) => setNewDofaCrossed(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Guardar Estrategia DOFA</span>
              </button>
            </div>
          </form>

          {/* Integrated Factor Classifier & Fast Switcher (F, D, O, A) */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Clasificador Rápido de Factores Estratégicos (Fortaleza, Debilidad, Oportunidad, Amenaza)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cambia en cualquier momento la clasificación de cada factor mediante el selector desplegable. La plataforma reubica el factor entre MEFI y MEFE automáticamente.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {project.mefi.length + project.mefe.length} Factores Totales
              </span>
            </div>

            {/* Quick Add Factor Row */}
            <form onSubmit={handleAddQuickFactor} className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-200 block">+ Agregar Nuevo Factor Rápido:</span>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                <div className="md:col-span-3">
                  <select
                    value={quickFactorType}
                    onChange={(e) => setQuickFactorType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  >
                    <option value="Fortaleza">Fortaleza (F) • Interno (+)</option>
                    <option value="Debilidad">Debilidad (D) • Interno (-)</option>
                    <option value="Oportunidad">Oportunidad (O) • Externo (+)</option>
                    <option value="Amenaza">Amenaza (A) • Externo (-)</option>
                  </select>
                </div>

                <div className="md:col-span-7">
                  <input
                    type="text"
                    placeholder="Descripción del factor crítico..."
                    value={quickFactorText}
                    onChange={(e) => setQuickFactorText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Factor</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of all factors with classification dropdown */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {/* Internal MEFI Factors */}
              {project.mefi.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex-1 truncate">
                    <span className="text-white font-medium block truncate">{m.factor}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Área: {m.area} • Peso: {m.weight} • Calificación: {m.rating}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.type}
                      onChange={(e) => handleReclassifyFactor(m.id, 'mefi', e.target.value as any)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        m.type === 'Fortaleza'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                          : 'bg-rose-950/80 text-rose-400 border-rose-500/50'
                      }`}
                    >
                      <option value="Fortaleza">Fortaleza (F)</option>
                      <option value="Debilidad">Debilidad (D)</option>
                      <option value="Oportunidad">➔ Oportunidad (MEFE)</option>
                      <option value="Amenaza">➔ Amenaza (MEFE)</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMEFIItem(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Eliminar factor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* External MEFE Factors */}
              {project.mefe.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex-1 truncate">
                    <span className="text-white font-medium block truncate">{m.factor}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Categoría: {m.pestaCategory} • Peso: {m.weight} • Calificación: {m.rating}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.type}
                      onChange={(e) => handleReclassifyFactor(m.id, 'mefe', e.target.value as any)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        m.type === 'Oportunidad'
                          ? 'bg-blue-950/80 text-blue-400 border-blue-500/50'
                          : 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                      }`}
                    >
                      <option value="Oportunidad">Oportunidad (O)</option>
                      <option value="Amenaza">Amenaza (A)</option>
                      <option value="Fortaleza">➔ Fortaleza (MEFI)</option>
                      <option value="Debilidad">➔ Debilidad (MEFI)</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMEFEItem(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Eliminar factor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW: PEYEA */}
      {activeMatrix === 'peyea' && (
        <div className="space-y-5">
          <MatrixExcelUploadBar
            matrixKey="peyea"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          {/* Visual Vector and Quadrant */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SVG Graphic (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center justify-center shadow-xl">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                Plano Cartesiano Vectorial PEYEA
              </span>

              {/* Interactive SVG Cartesian Graphic */}
              <div className="relative w-full max-w-[320px] aspect-square bg-slate-900 rounded-xl border border-slate-700/80 p-2">
                <svg viewBox="-6 -6 12 12" className="w-full h-full overflow-visible">
                  {/* Grid quadrants with soft background highlights */}
                  {/* Top-right: Agresivo */}
                  <rect x="0" y="-6" width="6" height="6" fill={peyeaData.quadrant === 'Agresivo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.03)'} />
                  {/* Top-left: Conservador */}
                  <rect x="-6" y="-6" width="6" height="6" fill={peyeaData.quadrant === 'Conservador' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.03)'} />
                  {/* Bottom-left: Defensivo */}
                  <rect x="-6" y="0" width="6" height="6" fill={peyeaData.quadrant === 'Defensivo' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.03)'} />
                  {/* Bottom-right: Competitivo */}
                  <rect x="0" y="0" width="6" height="6" fill={peyeaData.quadrant === 'Competitivo' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.03)'} />

                  {/* Main Axis */}
                  <line x1="-6" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="0.15" />
                  <line x1="0" y1="-6" x2="0" y2="6" stroke="#475569" strokeWidth="0.15" />

                  {/* Axis labels */}
                  <text x="0" y="-5.2" fill="#94a3b8" fontSize="0.55" textAnchor="middle" fontWeight="bold">FF (+6)</text>
                  <text x="0" y="5.7" fill="#94a3b8" fontSize="0.55" textAnchor="middle" fontWeight="bold">EA (-6)</text>
                  <text x="-5.2" y="0.4" fill="#94a3b8" fontSize="0.55" textAnchor="middle" fontWeight="bold">VC (-6)</text>
                  <text x="5.2" y="0.4" fill="#94a3b8" fontSize="0.55" textAnchor="middle" fontWeight="bold">FI (+6)</text>

                  {/* Quadrant labels */}
                  <text x="3" y="-3" fill={peyeaData.quadrant === 'Agresivo' ? '#34d399' : '#64748b'} fontSize="0.65" textAnchor="middle" fontWeight="bold">AGRESIVO</text>
                  <text x="-3" y="-3" fill={peyeaData.quadrant === 'Conservador' ? '#60a5fa' : '#64748b'} fontSize="0.65" textAnchor="middle" fontWeight="bold">CONSERVADOR</text>
                  <text x="-3" y="3.5" fill={peyeaData.quadrant === 'Defensivo' ? '#f87171' : '#64748b'} fontSize="0.65" textAnchor="middle" fontWeight="bold">DEFENSIVO</text>
                  <text x="3" y="3.5" fill={peyeaData.quadrant === 'Competitivo' ? '#fbbf24' : '#64748b'} fontSize="0.65" textAnchor="middle" fontWeight="bold">COMPETITIVO</text>

                  {/* Vector Arrow from (0,0) to (coordinateX, -coordinateY in SVG coordinate system) */}
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="0"
                    x2={peyeaData.coordinateX}
                    y2={-peyeaData.coordinateY}
                    stroke="#10b981"
                    strokeWidth="0.25"
                    markerEnd="url(#arrow)"
                  />
                  {/* Point at vector tip */}
                  <circle cx={peyeaData.coordinateX} cy={-peyeaData.coordinateY} r="0.4" fill="#34d399" />
                </svg>
              </div>

              {/* Coordinates Pill */}
              <div className="mt-3 flex items-center gap-3 text-xs font-mono">
                <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300">
                  Vector (X: {peyeaData.coordinateX.toFixed(2)}, Y: {peyeaData.coordinateY.toFixed(2)})
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {peyeaData.quadrant}
                </span>
              </div>
            </div>

            {/* Calculations & Interpretations (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Postura Estratégica Determinada
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60">
                  {peyeaData.interpretation}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Promedio FF</span>
                    <span className="text-emerald-400 font-bold text-sm">+{peyeaData.avgFF}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Promedio VC</span>
                    <span className="text-blue-400 font-bold text-sm">{peyeaData.avgVC}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Promedio EA</span>
                    <span className="text-amber-400 font-bold text-sm">{peyeaData.avgEA}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Promedio FI</span>
                    <span className="text-purple-400 font-bold text-sm">+{peyeaData.avgFI}</span>
                  </div>
                </div>
              </div>

              {/* Factors editor accordions / grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* FF */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                  <span className="font-bold text-emerald-400 block text-[11px]">
                    Fuerza Financiera (FF: +1 a +6)
                  </span>
                  {peyeaData.financialStrength.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-300 truncate">{f.name}</span>
                      <select
                        value={f.score}
                        onChange={(e) => handleUpdatePEYEAScore('financialStrength', f.id, Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>+{n}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* VC */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                  <span className="font-bold text-blue-400 block text-[11px]">
                    Ventaja Competitiva (VC: -6 a -1)
                  </span>
                  {peyeaData.competitiveAdvantage.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-300 truncate">{f.name}</span>
                      <select
                        value={f.score}
                        onChange={(e) => handleUpdatePEYEAScore('competitiveAdvantage', f.id, Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-blue-400 font-mono font-bold px-1.5 py-0.5 rounded"
                      >
                        {[-1, -2, -3, -4, -5, -6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* EA */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                  <span className="font-bold text-amber-400 block text-[11px]">
                    Estabilidad Ambiental (EA: -6 a -1)
                  </span>
                  {peyeaData.environmentalStability.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-300 truncate">{f.name}</span>
                      <select
                        value={f.score}
                        onChange={(e) => handleUpdatePEYEAScore('environmentalStability', f.id, Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded"
                      >
                        {[-1, -2, -3, -4, -5, -6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* FI */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                  <span className="font-bold text-purple-400 block text-[11px]">
                    Fuerza de la Industria (FI: +1 a +6)
                  </span>
                  {peyeaData.industryStrength.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-300 truncate">{f.name}</span>
                      <select
                        value={f.score}
                        onChange={(e) => handleUpdatePEYEAScore('industryStrength', f.id, Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-purple-400 font-mono font-bold px-1.5 py-0.5 rounded"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>+{n}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW: MPC (Perfil Competitivo) */}
      {activeMatrix === 'mpc' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="mpc"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mpcCalc.ranking.map((r) => (
              <div
                key={r.name}
                className={`p-4 rounded-xl border ${
                  r.rank === 1
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Puesto #{r.rank}</span>
                  <span className="font-mono font-bold text-sm text-white">{r.score.toFixed(2)} pts</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-1 truncate">{r.name}</h4>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 bg-slate-900/60 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Factores Críticos de Éxito (MPC)</span>
              <span className="text-xs text-slate-400">Sumatoria de Pesos: {mpcCalc.totalWeight.toFixed(2)} (Debe ser 1.00)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Factor Crítico de Éxito (FCE)</th>
                    <th className="px-3 py-2.5 text-center">Peso</th>
                    <th className="px-3 py-2.5 text-center">{project.company.name}</th>
                    <th className="px-3 py-2.5 text-center">{project.mpc.competitor1Name}</th>
                    <th className="px-3 py-2.5 text-center">{project.mpc.competitor2Name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {project.mpc.factors.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-750/50">
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={f.factor}
                          onChange={(e) => handleUpdateMPCFactor(f.id, 'factor', e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={f.weight}
                          onChange={(e) => handleUpdateMPCFactor(f.id, 'weight', Number(e.target.value) || 0)}
                          className="w-16 text-center bg-slate-900 border border-slate-700 rounded px-1.5 py-1 font-mono text-emerald-400 font-bold"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={f.companyRating}
                          onChange={(e) => handleUpdateMPCFactor(f.id, 'companyRating', Number(e.target.value) as any)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono font-bold text-emerald-400"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={f.competitor1Rating}
                          onChange={(e) => handleUpdateMPCFactor(f.id, 'competitor1Rating', Number(e.target.value) as any)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select
                          value={f.competitor2Rating}
                          onChange={(e) => handleUpdateMPCFactor(f.id, 'competitor2Rating', Number(e.target.value) as any)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-bold text-slate-200 border-t border-slate-700">
                  <tr>
                    <td className="px-3 py-3 text-right">Puntajes Totales Ponderados:</td>
                    <td className="px-3 py-3 text-center font-mono">{mpcCalc.totalWeight.toFixed(2)}</td>
                    <td className="px-3 py-3 text-center font-mono text-emerald-400 text-sm">{mpcCalc.companyScore.toFixed(2)}</td>
                    <td className="px-3 py-3 text-center font-mono text-sm">{mpcCalc.comp1Score.toFixed(2)}</td>
                    <td className="px-3 py-3 text-center font-mono text-sm">{mpcCalc.comp2Score.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW: BCG */}
      {activeMatrix === 'bcg' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="bcg"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.bcg.map((item) => {
              const badgeColors = {
                'Estrella': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                'Vaca Lechera': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                'Interrogante': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                'Perro': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
              };

              return (
                <div key={item.id} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white truncate">{item.productName}</span>
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateBCGItem(item.id, { category: e.target.value as any })}
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border bg-slate-900 cursor-pointer ${badgeColors[item.category]}`}
                    >
                      <option value="Estrella">⭐ Estrella</option>
                      <option value="Vaca Lechera">🐄 Vaca Lechera</option>
                      <option value="Interrogante">❓ Interrogante</option>
                      <option value="Perro">🐕 Perro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Cuota Relativa</span>
                      <span className="font-bold text-white">{item.relativeMarketShare}x</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Crecimiento Merc.</span>
                      <span className="font-bold text-emerald-400">{item.marketGrowthRatePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">% Ventas Emp.</span>
                      <span className="font-bold text-blue-400">{item.companySalesPercent}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Acción recomendada:</strong> {item.strategicAction}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MATRIX VIEW: PESTA */}
      {activeMatrix === 'pesta' && (
        <div className="space-y-4">
          <MatrixExcelUploadBar
            matrixKey="pesta"
            project={project}
            onUpdateProject={onUpdateProject}
            onOpenGlobalImportModal={() => setIsExcelModalOpen(true)}
          />

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-700 bg-slate-900/60">
              <span className="font-bold text-sm text-white">Análisis del Macroentorno (PESTA)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Dimensión</th>
                    <th className="px-3 py-2.5">Factor del Macroentorno</th>
                    <th className="px-3 py-2.5">Impacto</th>
                    <th className="px-3 py-2.5">Intensidad</th>
                    <th className="px-3 py-2.5">Fundamentación / Rationale</th>
                    <th className="px-3 py-2.5">Fuente de Información</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {project.pesta.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-750/50">
                      <td className="px-3 py-2.5">
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdatePESTAItem(item.id, { category: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="Político">Político</option>
                          <option value="Económico">Económico</option>
                          <option value="Social">Social</option>
                          <option value="Tecnológico">Tecnológico</option>
                          <option value="Ambiental">Ambiental</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-slate-200 max-w-xs">
                        <input
                          type="text"
                          value={item.factor}
                          onChange={(e) => handleUpdatePESTAItem(item.id, { factor: e.target.value })}
                          className="w-full bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={item.impactType}
                          onChange={(e) => handleUpdatePESTAItem(item.id, { impactType: e.target.value as any })}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer ${
                            item.impactType === 'Oportunidad'
                              ? 'bg-blue-950/80 text-blue-400 border-blue-500/30'
                              : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="Oportunidad">Oportunidad</option>
                          <option value="Amenaza">Amenaza</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{item.intensity}</td>
                      <td className="px-3 py-2.5 text-slate-300 max-w-sm">{item.rationale}</td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{item.evidenceSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onPrevStep}
          className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          ← Volver a Insumos Previos (Paso 2)
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onAuditClick}
            className="text-xs text-emerald-400 hover:text-emerald-300 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors font-medium flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Auditar Coherencia de Matrices</span>
          </button>

          <button
            onClick={handleAdvanceToStep4}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
          >
            <span>Avanzar al Balanced Scorecard (Paso 4)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal for Excel / Drive Import */}
      <ExcelMatrixImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        project={project}
        onApplyImport={handleApplyImportedExcel}
      />

      {/* Modal for Blocking Validation before Step 4 */}
      {showErrorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs text-slate-200 relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Validación Obligatoria Guía 16
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  Inconsistencias en Matrices Estratégicas
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Para poder avanzar al <strong>Paso 4 (Balanced Scorecard)</strong>, las matrices deben cumplir los parámetros metodológicos y matemáticos requeridos:
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-rose-300 text-xs block">
                Puntos que impiden el avance ({validationErrors.length}):
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-200">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleAutoCalibrateWeights}
                className="w-full sm:w-auto bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                title="Ajustar pesos para que sumen 1.00 en MEFI y MEFE"
              >
                Auto-calibrar Pesos a 1.00
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowErrorsModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Corregir en Matrices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
