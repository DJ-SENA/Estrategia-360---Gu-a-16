import React, { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  FileCheck, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calculator, 
  Calendar, 
  UserCheck, 
  Database,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';
import { IndicatorCard, BSCObjective, BSCPerspective } from '../types';

interface IndicatorCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  objective: BSCObjective | null;
  existingIndicator?: IndicatorCard;
  onSaveIndicator: (indicator: IndicatorCard) => void;
}

export const IndicatorCardModal: React.FC<IndicatorCardModalProps> = ({
  isOpen,
  onClose,
  objective,
  existingIndicator,
  onSaveIndicator,
}) => {
  if (!isOpen || !objective) return null;

  const defaultCode = `IND-${objective.perspective.substring(0, 3).toUpperCase()}-${objective.code.split('-').pop() || '01'}`;

  const [code, setCode] = useState(existingIndicator?.code || defaultCode);
  const [name, setName] = useState(existingIndicator?.name || `Índice de ${objective.title}`);
  const [definition, setDefinition] = useState(
    existingIndicator?.definition || `Mide el grado de cumplimiento del objetivo estratégico: ${objective.title}.`
  );
  const [formula, setFormula] = useState(
    existingIndicator?.formula || `(Valor Obtenido / Meta Proyectada) * 100`
  );
  const [unit, setUnit] = useState<IndicatorCard['unit']>(existingIndicator?.unit || '%');
  const [periodicity, setPeriodicity] = useState<IndicatorCard['periodicity']>(
    existingIndicator?.periodicity || 'Trimestral'
  );
  const [baseline, setBaseline] = useState<number>(existingIndicator?.baseline ?? 75);
  const [target, setTarget] = useState<number>(existingIndicator?.target ?? 90);
  const [currentValue, setCurrentValue] = useState<number>(existingIndicator?.currentValue ?? 88);
  const [greenRange, setGreenRange] = useState(existingIndicator?.greenRange || '>= 90%');
  const [yellowRange, setYellowRange] = useState(existingIndicator?.yellowRange || '75% - 89%');
  const [redRange, setRedRange] = useState(existingIndicator?.redRange || '< 75%');
  const [dataSource, setDataSource] = useState(
    existingIndicator?.dataSource || 'Sistema Contable / Reporte Operativo Mensual del GAES'
  );
  const [responsibleRole, setResponsibleRole] = useState(
    existingIndicator?.responsibleRole || objective.responsibleRole || 'Líder GAES'
  );

  useEffect(() => {
    if (existingIndicator) {
      setCode(existingIndicator.code);
      setName(existingIndicator.name);
      setDefinition(existingIndicator.definition);
      setFormula(existingIndicator.formula);
      setUnit(existingIndicator.unit);
      setPeriodicity(existingIndicator.periodicity);
      setBaseline(existingIndicator.baseline);
      setTarget(existingIndicator.target);
      setCurrentValue(existingIndicator.currentValue ?? existingIndicator.target);
      setGreenRange(existingIndicator.greenRange);
      setYellowRange(existingIndicator.yellowRange);
      setRedRange(existingIndicator.redRange);
      setDataSource(existingIndicator.dataSource);
      setResponsibleRole(existingIndicator.responsibleRole);
    } else {
      setCode(defaultCode);
      setName(`Índice de ${objective.title}`);
      setDefinition(`Mide el grado de cumplimiento del objetivo: ${objective.title}.`);
      setFormula(`(Valor Alcanzado / Meta Planificada) * 100`);
      setUnit(objective.perspective === 'Financiera' ? 'COP ($)' : '%');
      setPeriodicity('Trimestral');
      setBaseline(70);
      setTarget(90);
      setCurrentValue(85);
      setGreenRange('>= 90%');
      setYellowRange('70% - 89%');
      setRedRange('< 70%');
      setDataSource('Informes de Gestión del Proyecto Formatibo SENA');
      setResponsibleRole(objective.responsibleRole || 'Líder GAES');
    }
  }, [existingIndicator, objective]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCard: IndicatorCard = {
      id: existingIndicator?.id || `ind-${Date.now()}`,
      code: code.trim() || defaultCode,
      name: name.trim() || `Indicador de ${objective.title}`,
      perspective: objective.perspective,
      associatedObjectiveId: objective.id,
      definition: definition.trim(),
      formula: formula.trim(),
      unit,
      periodicity,
      baseline: Number(baseline),
      target: Number(target),
      currentValue: Number(currentValue),
      greenRange: greenRange.trim(),
      yellowRange: yellowRange.trim(),
      redRange: redRange.trim(),
      dataSource: dataSource.trim(),
      responsibleRole: responsibleRole.trim(),
    };

    onSaveIndicator(updatedCard);
    onClose();
  };

  // Determine current status
  let statusBadge = { label: 'En Meta (Verde)', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40' };
  if (currentValue < baseline) {
    statusBadge = { label: 'Crítico (Rojo)', color: 'text-rose-400 bg-rose-950/80 border-rose-500/40' };
  } else if (currentValue < target) {
    statusBadge = { label: 'En Alerta (Amarillo)', color: 'text-amber-400 bg-amber-950/80 border-amber-500/40' };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 text-xs text-slate-200 p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Ficha Técnica de Indicador de Gestión SENA
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{code}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {name || 'Configuración del Indicador'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-lg">
                Asociado a: <strong className="text-slate-300">{objective.code}</strong> — {objective.title} ({objective.perspective})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Preview */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-xs">Simulación de Semáforo Actual:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.color}`}>
              {statusBadge.label} ({currentValue} {unit})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Línea Base: <strong className="text-slate-300">{baseline} {unit}</strong> | Meta: <strong className="text-emerald-400">{target} {unit}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Código del Indicador:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                placeholder="IND-FIN-01"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nombre Oficial del Indicador:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
                placeholder="Ej. Rentabilidad Operativa sobre Ventas"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Definición / Propósito Estratégico:</label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={2}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
              placeholder="Explica qué mide este indicador y por qué es crítico para el negocio..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">
                Fórmula de Cálculo Matemática (Guía 16):
              </label>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-purple-300 font-mono text-xs focus:border-purple-500 focus:outline-none"
                placeholder="(Utilidad Operativa / Ventas Netas) * 100"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Unidad de Medida:</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="%">% (Porcentaje)</option>
                <option value="COP ($)">COP ($ Pesos)</option>
                <option value="Unidades">Unidades / Cantidad</option>
                <option value="Días">Días / Tiempo</option>
                <option value="Índice (1-5)">Índice Escalar (1-5)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Frecuencia de Medición:</label>
              <select
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="Mensual">Mensual</option>
                <option value="Bimensual">Bimensual</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Línea Base (Valor Inicial):</label>
              <input
                type="number"
                value={baseline}
                onChange={(e) => setBaseline(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Meta Cuantitativa (Target):</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Valor Actual Registrado:</label>
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-purple-300 font-mono text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Fuente de los Datos:</label>
              <input
                type="text"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
                placeholder="Software Contable / Registro Operativo"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Cargo Responsable:</label>
              <input
                type="text"
                value={responsibleRole}
                onChange={(e) => setResponsibleRole(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
                placeholder="Líder GAES / Jefe de Área"
              />
            </div>
          </div>

          {/* Semaforización Ranges */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="font-bold text-white text-xs block">
              Parámetros de Semaforización (Rangos de Control):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rango Verde (Satisfactorio)
                </span>
                <input
                  type="text"
                  value={greenRange}
                  onChange={(e) => setGreenRange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  placeholder=">= 90%"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rango Amarillo (Alerta)
                </span>
                <input
                  type="text"
                  value={yellowRange}
                  onChange={(e) => setYellowRange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  placeholder="75% - 89%"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Rango Rojo (Crítico)
                </span>
                <input
                  type="text"
                  value={redRange}
                  onChange={(e) => setRedRange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  placeholder="< 75%"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4 text-purple-200" />
              <span>Guardar Ficha del Indicador</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
