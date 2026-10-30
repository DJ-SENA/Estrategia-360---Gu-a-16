import React from 'react';
import { 
  GraduationCap, 
  Users, 
  UserCheck, 
  Printer, 
  RotateCcw, 
  PlusCircle, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  LogOut,
  Mail,
  Shield,
  Upload
} from 'lucide-react';
import { GAESProject, AuthUser } from '../types';
import { SENA_LOGO_SVG } from '../assets/senaLogo';

interface HeaderProps {
  currentProject: GAESProject;
  projectsList: GAESProject[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  isInstructorMode: boolean;
  onToggleInstructorMode: () => void;
  onOpenPrintModal: () => void;
  onResetToDemo: () => void;
  overallScore: number;
  currentUser: AuthUser | null;
  onLogout: () => void;
  lastSavedTime?: string;
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoadingProjects?: boolean;
  projectsLoadError?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projectsList,
  onSelectProject,
  onNewProject,
  isInstructorMode,
  onToggleInstructorMode,
  onOpenPrintModal,
  onResetToDemo,
  overallScore,
  currentUser,
  onLogout,
  lastSavedTime,
  onExportJson,
  onImportJson,
  isLoadingProjects,
  projectsLoadError,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl">
      {/* Top institutional strip */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between font-medium">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-950/60 text-emerald-300 font-bold px-2 py-0.5 rounded tracking-wide text-[11px] border border-emerald-500/30">
            SENA
          </span>
          <span className="hidden sm:inline">Servicio Nacional de Aprendizaje</span>
          <span className="text-emerald-300 hidden md:inline">|</span>
          <span className="font-semibold truncate max-w-[260px] md:max-w-none">
            Tecnólogo en Gestión Empresarial • Guía 16: Herramientas de Gestión y Evaluación Estratégica
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="bg-black/20 px-2 py-0.5 rounded">Ficha: {currentProject.fichaNumber}</span>
          <span className="hidden lg:inline text-emerald-200">{currentProject.regional}</span>
        </div>
      </div>

      {/* Main header toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Branding & Project picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/30 overflow-hidden shrink-0">
              <img src={SENA_LOGO_SVG} alt="Logo SENA" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg text-white tracking-tight flex items-center gap-1.5">
                  Estrategia 360
                  <span className="text-emerald-400 font-extrabold text-xs px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    Guía 16
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[250px] sm:max-w-xs">
                {currentProject.company.name} (GAES {currentProject.gaesNumber})
              </p>
            </div>
          </div>

          {/* Project Selector dropdown: Instructors can switch GAES; Apprentices are scoped to their assigned GAES */}
          {currentUser?.role === 'INSTRUCTOR' ? (
            <div className="relative inline-flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/80">
              <Users className="w-3.5 h-3.5 text-indigo-400 ml-2 mr-1.5 shrink-0" />
              <select
                value={currentProject.id}
                onChange={(e) => onSelectProject(e.target.value)}
                disabled={Boolean(isLoadingProjects && projectsList.length === 0)}
                className="bg-transparent text-xs text-slate-200 font-medium py-1 pr-6 pl-1 focus:outline-none cursor-pointer max-w-[240px] truncate"
                title="Seleccionar GAES a evaluar"
              >
                {isLoadingProjects && projectsList.length === 0 ? (
                  <option value="" disabled className="bg-slate-800 text-slate-400">
                    Cargando proyectos...
                  </option>
                ) : projectsLoadError && projectsList.length === 0 ? (
                  <option value="" disabled className="bg-slate-800 text-rose-300">
                    Error al cargar proyectos
                  </option>
                ) : projectsList.length === 0 ? (
                  <option value="" disabled className="bg-slate-800 text-slate-400">
                    No hay proyectos registrados
                  </option>
                ) : (
                  <>
                    {projectsList.some((p) => !p.isDemoProject) && (
                      <optgroup label="Proyectos Formativos Registrados" className="bg-slate-900 text-emerald-400 font-semibold">
                        {projectsList
                          .filter((p) => !p.isDemoProject)
                          .map((p) => (
                            <option key={p.id} value={p.id} className="bg-slate-800 text-slate-200">
                              GAES {p.gaesNumber}: {p.company?.name || `GAES ${p.gaesNumber}`} (Ficha {p.fichaNumber})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {projectsList.some((p) => p.isDemoProject) && (
                      <optgroup label="Proyectos de Demostración" className="bg-slate-900 text-amber-400 font-semibold">
                        {projectsList
                          .filter((p) => p.isDemoProject)
                          .map((p) => (
                            <option key={p.id} value={p.id} className="bg-slate-800 text-slate-200">
                              [DEMO] GAES {p.gaesNumber}: {p.company?.name || `GAES ${p.gaesNumber}`}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {/* Ensure currentProject is always selectable even if pending server sync */}
                    {!projectsList.some((p) => p.id === currentProject.id) && (
                      <option key={currentProject.id} value={currentProject.id} className="bg-slate-800 text-slate-200">
                        GAES {currentProject.gaesNumber}: {currentProject.company?.name || `GAES ${currentProject.gaesNumber}`}
                      </option>
                    )}
                  </>
                )}
              </select>
              <button
                onClick={onNewProject}
                title="Crear nuevo GAES"
                className="p-1 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center bg-slate-800/80 rounded-lg px-2.5 py-1.5 border border-slate-700/80 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shrink-0"></span>
              <span>GAES Asignado: <strong>GAES {currentProject.gaesNumber}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Mode Switcher & Global Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Coherence score pill */}
          <div 
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              overallScore >= 90
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : overallScore >= 70
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title="Puntaje de coherencia estratégica global"
          >
            {overallScore >= 90 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>Coherencia: {overallScore}%</span>
          </div>

          {/* Authenticated User Session Pill */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[210px] sm:max-w-xs">
                {currentUser.role === 'INSTRUCTOR' ? (
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <div className="truncate">
                  <span className="text-white font-semibold truncate block text-[11px]">
                    {currentUser.email}
                  </span>
                  <span className={`text-[10px] font-bold block ${
                    currentUser.role === 'INSTRUCTOR' ? 'text-indigo-400' : 'text-emerald-400'
                  }`}>
                    {currentUser.role === 'INSTRUCTOR' ? 'Instructor Técnico SENA' : `Aprendiz GAES ${currentUser.gaesNumber || currentProject.gaesNumber}`}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-500/30 ml-1"
                title="Cerrar sesión / Cambiar de usuario"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Role Toggle: Only accessible to INSTRUCTORS */}
          {currentUser?.role === 'INSTRUCTOR' && (
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-indigo-500/40 text-xs">
              <button
                onClick={() => isInstructorMode && onToggleInstructorMode()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  !isInstructorMode
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ver plataforma como un Aprendiz (oculta paso 6)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Vista Aprendiz</span>
              </button>
              <button
                onClick={() => !isInstructorMode && onToggleInstructorMode()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isInstructorMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vista Instructor (activa pestaña Paso 6)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Panel Instructor</span>
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {lastSavedTime && (
              <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Guardado: {lastSavedTime}
              </span>
            )}

            {onExportJson && (
              <button
                type="button"
                onClick={onExportJson}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                title="Descargar copia de seguridad del proyecto formativo en archivo JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {onImportJson && (
              <label
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-teal-400 rounded-lg transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
                title="Cargar copia de seguridad de proyecto desde archivo JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={onImportJson}
                  className="hidden"
                />
              </label>
            )}

            <button
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              title="Generar Acta y Reporte Técnico Guía 16"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Reporte SENA</span>
            </button>

            <button
              onClick={onResetToDemo}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
              title="Recargar datos modelo de AgroLácteos (GAES 3)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
