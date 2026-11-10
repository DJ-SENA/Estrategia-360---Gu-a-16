import React from 'react';
import { 
  Building2, 
  FileText, 
  Grid3X3, 
  Target, 
  CheckCircle2, 
  Award,
  ChevronRight,
  Lock
} from 'lucide-react';

interface StepProgressBarProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  isInstructorMode: boolean;
  isMatricesValidated?: boolean;
}

export const STEPS = [
  {
    number: 1,
    title: 'Registro GAES',
    subtitle: 'Integrantes & Empresa',
    icon: Building2,
    guideRef: 'Fase Inicial',
  },
  {
    number: 2,
    title: 'Insumos Previos',
    subtitle: 'Diagnóstico & Finanzas',
    icon: FileText,
    guideRef: 'Guías 2 a 14',
  },
  {
    number: 3,
    title: 'Matrices Estratégicas',
    subtitle: 'PESTA, MEFI, PEYEA...',
    icon: Grid3X3,
    guideRef: 'Guía 16 Articulador',
  },
  {
    number: 4,
    title: 'Balanced Scorecard',
    subtitle: 'Mapa Causa-Efecto & CMI',
    icon: Target,
    guideRef: '4 Perspectivas',
  },
  {
    number: 5,
    title: 'Auditoría & Coherencia',
    subtitle: 'Verificación Metodológica',
    icon: CheckCircle2,
    guideRef: 'Consistencia SENA',
  },
  {
    number: 6,
    title: 'Evaluación Instructor',
    subtitle: 'Rúbrica & Juicio Oficial',
    icon: Award,
    guideRef: 'Dictamen Oficial',
  },
];

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  onSelectStep,
  isInstructorMode,
  isMatricesValidated = false,
}) => {
  // If not instructor, Step 6 (Evaluación Instructor) is completely hidden
  const visibleSteps = STEPS.filter((step) => {
    if (step.number === 6) return isInstructorMode;
    return true;
  });

  return (
    <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {visibleSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isInstructorStep = step.number === 6;
            const isStep4Locked = step.number >= 4 && !isMatricesValidated && !isInstructorMode;

            return (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => onSelectStep(step.number)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all min-w-[170px] sm:min-w-0 flex-1 border ${
                    isActive
                      ? isInstructorStep
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                      : isCompleted
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Step badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isActive
                        ? isInstructorStep
                          ? 'bg-indigo-500 text-white'
                          : 'bg-emerald-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>

                  {/* Step labels */}
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs tracking-tight truncate">
                        {step.title}
                      </span>
                      {isStep4Locked && (
                        <span title="Requiere validación de matrices en Paso 3" className="inline-flex items-center text-amber-400">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate hidden md:block">
                      {isStep4Locked ? 'Requiere validar matrices' : step.subtitle}
                    </p>
                  </div>
                </button>

                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 hidden lg:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
