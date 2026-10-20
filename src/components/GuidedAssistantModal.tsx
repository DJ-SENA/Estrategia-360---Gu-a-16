import React from 'react';
import { 
  Sparkles, 
  X, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  FileText, 
  Grid3X3, 
  Target, 
  CheckSquare, 
  Award,
  BookOpen
} from 'lucide-react';
import { GAESProject } from '../types';

interface GuidedAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  project: GAESProject;
  onJumpToStep: (step: number) => void;
}

export const GuidedAssistantModal: React.FC<GuidedAssistantModalProps> = ({
  isOpen,
  onClose,
  currentStep,
  project,
  onJumpToStep,
}) => {
  if (!isOpen) return null;

  const stepDetails = [
    {
      step: 1,
      title: 'Fase 1: Registro GAES & Caracterización de la Empresa',
      icon: Building2,
      guiaRef: 'Guía de Inducción & Fase Inicial',
      solicitud: '¿Qué información debes aportar en este paso?',
      requisitos: [
        'Lista completa de aprendices con roles asignados (Líder, Financiero, Mercadeo, Operaciones).',
        'Razón social y NIT real o formulado para el proyecto formativo.',
        'Sector económico (CIIU) y tamaño de la organización.',
        'Propuesta de valor diferenciadora y producto estrella.',
      ],
      porqueImporta: 'Define la unidad de análisis empresarial sobre la cual se aplicarán todos los diagnósticos y proyecciones de la Guía 16.',
    },
    {
      step: 2,
      title: 'Fase 2: Incorporación de Productos de Guías Anteriores',
      icon: FileText,
      guiaRef: 'Guías 2 a 14 del Tecnólogo',
      solicitud: '¿Qué información debes aportar en este paso?',
      requisitos: [
        'Diagnóstico situacional y cadena de valor (Guías 2 a 5).',
        'Misión, Visión y Principios corporativos actuales.',
        'Hallazgos del estudio de mercado y competidores (Guías 8 y 9).',
        'Cifras contables: Ventas anuales, Margen bruto %, Margen neto %, Liquidez corriente y Endeudamiento (Guía 11).',
        'Cuellos de botella operativos y mermas porcentuales (Guías 10 y 14).',
      ],
      porqueImporta: 'Garantiza la articulación curricular: la Guía 16 no empieza de cero, sino que sintetiza todos los productos previos de tu formación.',
    },
    {
      step: 3,
      title: 'Fase 3: Generación & Ajuste de Matrices Estratégicas',
      icon: Grid3X3,
      guiaRef: 'Guía 16: Herramientas de Gestión y Evaluación Estratégica',
      solicitud: '¿Qué información debes aportar en este paso?',
      requisitos: [
        'Cargue desde Excel / Google Drive: Puedes subir tu archivo .xlsx o copiar y pegar las celdas directamente de tu hoja de cálculo.',
        'Clasificador Interactivo: Selector desplegable para elegir si cada ítem es Fortaleza, Debilidad, Oportunidad o Amenaza, o transferirlo al instante.',
        'Factores Macroentorno PESTA con impacto (Oportunidad / Amenaza) y justificación.',
        'Ponderación de la MEFI y MEFE: Pesos que sumen exactamente 1.00 (con botón de calibración automática).',
        'Validación Obligatoria: La plataforma exige validar las sumatorias y consistencias antes de desbloquear el paso al Balanced Scorecard.',
        'Cruces DOFA: Formulación de estrategias FO, DO, FA y DA en verbo infinitivo.',
        'Calificaciones PEYEA (+1 a +6 y -6 a -1), factores MPC y clasificación BCG.',
        'Hojas de vida de indicadores con fórmula matemática y rangos de semaforización verde/amarillo/rojo.',
      ],
      porqueImporta: 'Proporciona el rigor cuantitativo y el diagnóstico cruzado que sustentará el Cuadro de Mando Integral.',
    },
    {
      step: 4,
      title: 'Fase 4: Construcción del Balanced Scorecard & Mapa Estratégico',
      icon: Target,
      guiaRef: 'Kaplan & Norton • Metodología Oficial Guía 16',
      solicitud: '¿Qué información debes aportar en este paso?',
      requisitos: [
        'Cargue e inclusión de datos por el GAES: Los aprendices ingresan sus objetivos o los cargan desde Excel/Drive en las 4 perspectivas.',
        'Selector de Perspectiva: Elegir Financiera, Clientes, Procesos Internos, o Aprendizaje y Crecimiento en cada fila.',
        'Trazabilidad obligatoria: Indicar de qué matriz proviene cada objetivo (ej. DOFA FO-1 o PEYEA Agresivo).',
        'Relaciones de causa y efecto: Crear los vínculos ascendentes y justificar cómo el aprendizaje fortalece los procesos, la satisfacción del cliente y el rendimiento financiero.',
        'Metas anuales cuantificables, iniciativas estratégicas, presupuesto COP y rol responsable.',
      ],
      porqueImporta: 'Convierte el diagnóstico analítico en un plan de acción ejecutivo medible y articulado.',
    },
    {
      step: 5,
      title: 'Fase 5: Retroalimentación Inteligente & Auditoría de Coherencia',
      icon: CheckSquare,
      guiaRef: 'Control de Calidad Académica SENA',
      solicitud: '¿Qué información debes aportar en este paso?',
      requisitos: [
        'Verificación de sumas matemáticas (MEFI = 1.00, MEFE = 1.00).',
        'Validación de coherencia entre el cuadrante PEYEA y los puntajes MEFI/MEFE.',
        'Revisión de objetivos huérfanos sin Hoja de Vida de Indicador vinculada.',
        'Atención a supuestos marcados como "por verificar" antes del registro oficial.',
      ],
      porqueImporta: 'Evita rechazos en la evaluación del instructor al blindar la sustentación con consistencia numérica y lógica.',
    },
    {
      step: 6,
      title: 'Fase 6: Seguimiento & Evaluación por el Instructor SENA',
      icon: Award,
      guiaRef: 'Juicio Evaluativo & Resultados de Aprendizaje',
      solicitud: '¿Qué información se procesa en este paso?',
      requisitos: [
        'Calificación cuantitativa de Evidencias de Producto (0 a 100).',
        'Calificación de Evidencias de Desempeño y Sustentación (0 a 100).',
        'Rúbrica oficial diligenciada con los 6 criterios de la Guía 16.',
        'Dictamen oficial: APROBADO o NO APROBADO con plan de mejoramiento.',
        'Emisión del Acta Oficial de Evaluación en formato SENA imprimible.',
      ],
      porqueImporta: 'Cierra el ciclo pedagógico y registra formalmente el logro de las competencias técnicas del aprendiz.',
    },
  ];

  const currentDetail = stepDetails.find((s) => s.step === currentStep) || stepDetails[0];
  const StepIcon = currentDetail.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <StepIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                Asistente Guiado Paso a Paso
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Paso {currentDetail.step} de 6
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {currentDetail.title}
            </h3>
            <span className="text-[11px] text-emerald-300 font-medium">
              Ref: {currentDetail.guiaRef}
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/70">
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentDetail.solicitud}</span>
            </h4>
            <ul className="space-y-2">
              {currentDetail.requisitos.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {currentDetail.step === 4 && !project.isMatricesValidated && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="font-bold shrink-0">⚠️ Requisito Metodológico:</span>
              <span>Debes ingresar al Paso 3 y validar que las sumatorias MEFI y MEFE sean exactamente 1.00 para habilitar la formulación del Balanced Scorecard.</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-700/60">
            <span className="font-bold text-slate-300 block mb-1">
              ¿Por qué es fundamental para la Guía 16?
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {currentDetail.porqueImporta}
            </p>
          </div>
        </div>

        {/* Progress Navigation inside modal */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            {stepDetails.map((s) => (
              <button
                key={s.step}
                onClick={() => onJumpToStep(s.step)}
                className={`w-7 h-7 rounded-lg font-bold font-mono text-[11px] transition-all border ${
                  s.step === currentStep
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {s.step}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
          >
            <span>Continuar Diligenciamiento</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
