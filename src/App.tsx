import React, { useState, useEffect } from 'react';
import { 
  mockProjectAgroLacteos, 
  createBlankGAESProject 
} from './data/mockProjects';
import { INITIAL_COHORT_PROJECTS } from './data/cohortMockProjects';
import { GAESProject, AuthUser } from './types';
import { runStrategicAudit } from './utils/strategicCalculations';
import { synthesizePriorGuidesToMatrices } from './utils/strategicSynthesis';
import { Header } from './components/Header';
import { StepProgressBar } from './components/StepProgressBar';
import { Step1_Registration } from './components/Step1_Registration';
import { Step2_PriorGuides } from './components/Step2_PriorGuides';
import { Step3_Matrices } from './components/Step3_Matrices';
import { Step4_BalancedScorecard } from './components/Step4_BalancedScorecard';
import { Step5_CoherenceAudit } from './components/Step5_CoherenceAudit';
import { Step6_InstructorPanel } from './components/Step6_InstructorPanel';
import { GuidedAssistantModal } from './components/GuidedAssistantModal';
import { PrintReportModal } from './components/PrintReportModal';
import { AuthLoginGateway } from './components/AuthLoginGateway';
import { ApprenticeCompetencyProgressView } from './components/ApprenticeCompetencyProgressView';
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<GAESProject[]>(() => {
    const saved = localStorage.getItem('sena_guia16_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed;
        }
      } catch (e) {
        console.error('Error loading saved projects:', e);
      }
    }
    return INITIAL_COHORT_PROJECTS;
  });

  // Authentication State with Email
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('sena_guia16_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading user session:', e);
      }
    }
    return null;
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(
    mockProjectAgroLacteos.id
  );
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isInstructorMode, setIsInstructorMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sena_guia16_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.role === 'INSTRUCTOR';
      } catch {}
    }
    return false;
  });
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Ahora');
  const [notification, setNotification] = useState<string | null>(null);

  // Load centralized projects from server
  useEffect(() => {
    if (!currentUser?.token) return;

    fetch('/api/projects', {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar proyectos del servidor');
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects);
          if (currentUser.role === 'APRENDIZ' && currentUser.gaesNumber) {
            const userProj = data.projects.find((p: GAESProject) => p.gaesNumber === currentUser.gaesNumber);
            if (userProj) setCurrentProjectId(userProj.id);
          }
        }
      })
      .catch((err) => {
        console.warn('Utilizando caché local de proyectos:', err);
      });
  }, [currentUser]);

  // Sync projects with localStorage as secondary backup
  useEffect(() => {
    localStorage.setItem('sena_guia16_projects', JSON.stringify(projects));
    const now = new Date();
    setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [projects]);

  // Sync user with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sena_guia16_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sena_guia16_auth_user');
    }
  }, [currentUser]);

  // Verify session validity with server on startup (anti-tamper)
  useEffect(() => {
    if (!currentUser?.token) return;

    fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Sesión no autorizada');
        return res.json();
      })
      .then((data) => {
        if (!data.valid || !data.user) {
          setCurrentUser(null);
          setIsInstructorMode(false);
          localStorage.removeItem('sena_guia16_auth_user');
          showNotification('Sesión finalizada por el servidor. Por favor inicie sesión nuevamente.');
        } else {
          // Sync server authoritative user role
          if (data.user.role !== currentUser.role) {
            setCurrentUser((prev) => prev ? { ...prev, role: data.user.role } : null);
            setIsInstructorMode(data.user.role === 'INSTRUCTOR');
          }
        }
      })
      .catch(() => {
        // In case token is expired or altered in localStorage
        setCurrentUser(null);
        setIsInstructorMode(false);
        localStorage.removeItem('sena_guia16_auth_user');
      });
  }, []);

  // Strict role-based protection: apprentices never see or access step 6
  useEffect(() => {
    if (currentUser?.role === 'APRENDIZ') {
      setIsInstructorMode(false);
      if (currentStep === 6) {
        setCurrentStep(5);
        showNotification('Acceso restringido: La pestaña Evaluación Instructor es de uso exclusivo para el docente.');
      }
      // Lock apprentice to their own assigned GAES
      if (currentUser.gaesNumber) {
        const userGaesProj = projects.find((p) => p.gaesNumber === currentUser.gaesNumber);
        if (userGaesProj && currentProjectId !== userGaesProj.id) {
          setCurrentProjectId(userGaesProj.id);
        }
      }
    }
  }, [currentUser, currentStep, projects, currentProjectId]);

  const currentProject =
    projects.find((p) => p.id === currentProjectId) || projects[0] || mockProjectAgroLacteos;

  const auditResult = runStrategicAudit(currentProject);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'INSTRUCTOR') {
      setIsInstructorMode(true);
      setCurrentStep(6);
      showNotification(`Bienvenido Instructor (${user.email}). Panel de Evaluación habilitado.`);
    } else {
      setIsInstructorMode(false);
      setCurrentStep(1);
      if (user.gaesNumber) {
        const found = projects.find((p) => p.gaesNumber === user.gaesNumber);
        if (found) setCurrentProjectId(found.id);
      }
      showNotification(`Bienvenido Aprendiz (${user.email}). Fases 1 a 5 habilitadas.`);
    }
  };

  const handleLogout = async () => {
    if (currentUser?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
      } catch {}
    }
    setCurrentUser(null);
    setIsInstructorMode(false);
    setCurrentStep(1);
    localStorage.removeItem('sena_guia16_auth_user');
    showNotification('Sesión cerrada correctamente. Autentícate para continuar.');
  };

  const handleSelectProject = (projectId: string) => {
    // If apprentice, only permit selecting their own assigned GAES
    if (currentUser?.role === 'APRENDIZ') {
      const userGaes = projects.find((p) => p.gaesNumber === currentUser.gaesNumber);
      if (userGaes && projectId !== userGaes.id) {
        showNotification(`Acceso restringido: Sólo puedes consultar el proyecto de tu GAES ${currentUser.gaesNumber}.`);
        return;
      }
    }
    setCurrentProjectId(projectId);
  };

  const handleUpdateCurrentProject = async (
    updated: Partial<GAESProject>,
    changeSummary?: string,
    phaseIntervened?: number,
    componentIntervened?: string
  ) => {
    // If apprentice attempts to alter instructor evaluation, block and discard
    if (currentUser?.role === 'APRENDIZ' && 'instructorEvaluation' in updated) {
      const { instructorEvaluation: _, ...allowedUpdates } = updated;
      updated = allowedUpdates;
      showNotification('Acceso denegado: Los aprendices no tienen autorización para modificar la evaluación del instructor.');
    }

    const currentProj = projects.find((p) => p.id === currentProjectId) || currentProject;
    const clientVersion = currentProj.version || 1;

    // Optimistic local update
    const optimisticProj = {
      ...currentProj,
      ...updated,
      lastUpdated: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === currentProj.id ? optimisticProj : p)));

    if (!currentUser?.token) return;

    try {
      const response = await fetch(`/api/projects/${currentProj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          updatedProject: updated,
          clientVersion,
          changeSummary,
          phaseIntervened: phaseIntervened || currentStep,
          componentIntervened,
        }),
      });

      const resData = await response.json();

      if (response.status === 409) {
        showNotification('Conflicto de concurrencia: Otro integrante del GAES modificó y guardó este proyecto recientemente.');
        if (resData.serverProject) {
          setProjects((prev) => prev.map((p) => (p.id === currentProj.id ? resData.serverProject : p)));
        }
        return;
      }

      if (response.status === 423) {
        showNotification('Proyecto bloqueado: La evaluación definitiva ya ha sido registrada por el instructor.');
        return;
      }

      if (resData.success && resData.project) {
        setProjects((prev) => prev.map((p) => (p.id === currentProj.id ? resData.project : p)));
      }
    } catch (err) {
      console.error('Error al sincronizar con el servidor:', err);
    }
  };

  const handleReopenProject = async (projectId: string, reason: string) => {
    if (!currentUser?.token || currentUser.role !== 'INSTRUCTOR') {
      showNotification('Acceso denegado: Solo el instructor puede autorizar la reapertura.');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showNotification(data.error || 'Error al reabrir el proyecto.');
        return;
      }

      setProjects((prev) => prev.map((p) => (p.id === projectId ? data.project : p)));
      showNotification('Proyecto reabierto exitosamente para plan de mejoramiento.');
    } catch (err) {
      showNotification('Error de conexión al reabrir el proyecto.');
    }
  };

  const handleNewProject = async () => {
    const nextNumber = projects.length + 1;
    const newProj = createBlankGAESProject(nextNumber, currentProject.fichaNumber || '2687410');

    if (currentUser?.token) {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify(newProj),
        });
        const data = await response.json();
        if (data.success && data.project) {
          setProjects((prev) => [data.project, ...prev]);
          setCurrentProjectId(data.project.id);
          setCurrentStep(1);
          showNotification(`Se ha registrado el GAES ${nextNumber} exitosamente en el servidor.`);
          return;
        }
      } catch (err) {
        console.error('Error al crear proyecto en servidor:', err);
      }
    }

    setProjects((prev) => [newProj, ...prev]);
    setCurrentProjectId(newProj.id);
    setCurrentStep(1);
    showNotification(`Se ha creado el GAES ${nextNumber} exitosamente.`);
  };

  const handleResetToDemo = () => {
    setIsConfirmResetOpen(true);
  };

  const executeResetToDemo = () => {
    setProjects((prev) =>
      prev.map((p) => (p.id === currentProject.id ? { ...mockProjectAgroLacteos, id: p.id } : p))
    );
    setIsConfirmResetOpen(false);
    showNotification('Datos modelo de AgroLácteos del Valle restaurados exitosamente.');
  };

  const handleSynthesizeMatrices = () => {
    const { updatedProject, summary } = synthesizePriorGuidesToMatrices(currentProject);
    handleUpdateCurrentProject(updatedProject);
    setCurrentStep(3);
    showNotification(summary.message);
  };

  const handleToggleInstructorMode = () => {
    if (currentUser?.role !== 'INSTRUCTOR') {
      showNotification('Acceso denegado: Solo el instructor autenticado puede activar este modo.');
      return;
    }

    const nextMode = !isInstructorMode;
    setIsInstructorMode(nextMode);
    if (nextMode) {
      setCurrentStep(6);
      showNotification('Modo Instructor SENA activado. Panel de Evaluación y Rúbrica Guía 16.');
    } else {
      setCurrentStep(1);
      showNotification('Vista previa de Aprendiz GAES activa (Paso 6 oculto).');
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentProject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const cleanName = (currentProject.company?.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
    downloadAnchor.setAttribute('download', `GAES_${currentProject.gaesNumber}_${cleanName}_Respaldo.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Copia de seguridad del proyecto exportada en JSON.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.company && parsed.mefi) {
          handleUpdateCurrentProject(parsed);
          showNotification(`Proyecto ${parsed.company?.name || ''} restaurado exitosamente.`);
        } else {
          showNotification('El archivo JSON no corresponde a la estructura de un proyecto GAES SENA.');
        }
      } catch (err) {
        showNotification('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // If not authenticated, require email login first
  if (!currentUser) {
    return (
      <AuthLoginGateway
        onLogin={handleLogin}
        availableProjects={projects}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        currentProject={currentProject}
        projectsList={projects}
        onSelectProject={(id) => {
          setCurrentProjectId(id);
          showNotification(`Cambiado a GAES ${projects.find((p) => p.id === id)?.gaesNumber}`);
        }}
        onNewProject={handleNewProject}
        isInstructorMode={isInstructorMode}
        onToggleInstructorMode={handleToggleInstructorMode}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onResetToDemo={handleResetToDemo}
        overallScore={auditResult.overallScore}
        currentUser={currentUser}
        onLogout={handleLogout}
        lastSavedTime={lastSavedTime}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Step Progress Stepper (hides step 6 completely for apprentices) */}
      <StepProgressBar
        currentStep={currentStep}
        onSelectStep={(step) => {
          if (step === 6 && currentUser.role !== 'INSTRUCTOR') {
            showNotification('Acceso restringido: La pestaña Evaluación Instructor es exclusiva para el docente.');
            return;
          }
          if (step >= 4 && !currentProject.isMatricesValidated && currentUser.role !== 'INSTRUCTOR') {
            showNotification('Requisito Metodológico: Debes ingresar y validar las Matrices Estratégicas (Paso 3) para habilitar el Balanced Scorecard.');
            setCurrentStep(3);
            return;
          }
          setCurrentStep(step);
          if (step === 6 && currentUser.role === 'INSTRUCTOR') {
            setIsInstructorMode(true);
          }
        }}
        isInstructorMode={isInstructorMode && currentUser.role === 'INSTRUCTOR'}
        isMatricesValidated={!!currentProject.isMatricesValidated}
      />

      {/* Interactive notification toast */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 text-emerald-200 border border-emerald-500/40 px-4 py-2.5 rounded-2xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Banner with contextual prompt assistant trigger */}
        <div className="mb-4 flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-semibold text-white">
              {currentUser.role === 'INSTRUCTOR' ? 'Panel de Evaluación Oficial SENA' : `Ruta de Aprendizaje GAES ${currentProject.gaesNumber}:`}
            </span>
            <span className="text-slate-400 truncate hidden sm:inline">
              {currentStep === 1 && 'Identifica los aprendices y la actividad económica de la empresa.'}
              {currentStep === 2 && 'Carga diagnósticos, presupuestos contables y estudios de mercado.'}
              {currentStep === 3 && 'Valida MEFI, MEFE, DOFA, PEYEA y los cálculos de la Guía 16.'}
              {currentStep === 4 && 'Estructura el Balanced Scorecard y las relaciones causa-efecto.'}
              {currentStep === 5 && 'Audita la consistencia matemática y trazabilidad estratégica.'}
              {currentStep === 6 && 'El instructor revisa la rúbrica y emite el juicio oficial.'}
            </span>
          </div>

          <button
            onClick={() => setIsAssistantModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Qué debo aportar ahora?</span>
          </button>
        </div>

        {/* Apprentice Learning Outcomes & Competencies Progress Tracker (Guía 16) */}
        {currentStep <= 5 && (
          <ApprenticeCompetencyProgressView
            project={currentProject}
            currentStep={currentStep}
            onNavigateStep={(step) => {
              if (step >= 4 && !currentProject.isMatricesValidated && currentUser.role !== 'INSTRUCTOR') {
                showNotification('Requisito Metodológico: Debes ingresar y validar las Matrices Estratégicas (Paso 3) para habilitar el Balanced Scorecard.');
                setCurrentStep(3);
                return;
              }
              setCurrentStep(step);
            }}
          />
        )}

        {/* Step Views */}
        {currentStep === 1 && (
          <Step1_Registration
            project={currentProject}
            onUpdateProject={handleUpdateCurrentProject}
            onNextStep={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2_PriorGuides
            project={currentProject}
            onUpdatePriorGuides={(prior) =>
              handleUpdateCurrentProject({
                priorGuides: { ...currentProject.priorGuides, ...prior },
              })
            }
            onUpdateDeliverables={(updatedDeliverables) =>
              handleUpdateCurrentProject({
                learningGuidesDeliverables: updatedDeliverables,
              })
            }
            onSynthesizeMatrices={handleSynthesizeMatrices}
            onNextStep={() => setCurrentStep(3)}
            onPrevStep={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3_Matrices
            project={currentProject}
            onUpdateProject={handleUpdateCurrentProject}
            onNextStep={() => setCurrentStep(4)}
            onPrevStep={() => setCurrentStep(2)}
            onAuditClick={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 4 && (
          <Step4_BalancedScorecard
            project={currentProject}
            onUpdateProject={handleUpdateCurrentProject}
            onNextStep={() => setCurrentStep(5)}
            onPrevStep={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <Step5_CoherenceAudit
            project={currentProject}
            onUpdateProject={handleUpdateCurrentProject}
            onNextStep={() => {
              if (currentUser.role === 'INSTRUCTOR') {
                setIsInstructorMode(true);
                setCurrentStep(6);
              }
            }}
            onPrevStep={() => setCurrentStep(4)}
            isInstructorMode={currentUser.role === 'INSTRUCTOR'}
          />
        )}

        {/* Step 6: Exclusively accessible to authenticated Instructors */}
        {currentStep === 6 && currentUser.role === 'INSTRUCTOR' && (
          <Step6_InstructorPanel
            project={currentProject}
            projectsList={projects}
            currentUser={currentUser}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              showNotification(`Seleccionado GAES ${projects.find((p) => p.id === id)?.gaesNumber} (${projects.find((p) => p.id === id)?.company.name})`);
            }}
            onUpdateProject={handleUpdateCurrentProject}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            onPrevStep={() => setCurrentStep(5)}
            onReopenProject={handleReopenProject}
          />
        )}
      </main>

      {/* Floating Guided Assistant trigger button */}
      <button
        onClick={() => setIsAssistantModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3.5 rounded-2xl shadow-2xl shadow-emerald-950 flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 border border-emerald-400/30"
        title="Abrir Asistente Guiado Paso a Paso"
      >
        <Sparkles className="w-4 h-4 text-emerald-200" />
        <span className="hidden sm:inline">Guía Paso a Paso</span>
      </button>

      {/* Guided Assistant Modal */}
      <GuidedAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        currentStep={currentStep}
        project={currentProject}
        onJumpToStep={(s) => {
          if (s === 6 && currentUser.role !== 'INSTRUCTOR') {
            showNotification('La Fase 6 es de acceso exclusivo para el Instructor.');
            return;
          }
          if (s >= 4 && !currentProject.isMatricesValidated && currentUser.role !== 'INSTRUCTOR') {
            showNotification('Requisito Metodológico: Debes validar las sumatorias de las Matrices Estratégicas (Paso 3) antes de construir el Balanced Scorecard.');
            setCurrentStep(3);
            return;
          }
          setCurrentStep(s);
          if (s === 6 && currentUser.role === 'INSTRUCTOR') {
            setIsInstructorMode(true);
          }
        }}
      />

      {/* Official SENA Dossier & Evaluation Report Printable Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        project={currentProject}
      />

      {/* Reset Confirmation Modal */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs text-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Restaurar Proyecto Modelo?</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Esta acción restaurará los datos del proyecto formativo modelo <strong>AgroLácteos del Valle (GAES 3)</strong> con todas sus matrices y Balanced Scorecard calibrados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeResetToDemo}
                className="bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-amber-950 transition-all hover:scale-[1.02]"
              >
                Sí, Restaurar Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 text-slate-500 text-[11px] py-4 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            SENA • Tecnólogo en Gestión Empresarial • Articulación Guía 16 de Gestión Estratégica & Balanced Scorecard
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto-guardado: {lastSavedTime}
            </span>
            <span className="text-slate-400 font-mono">
              Usuario: {currentUser.email} ({currentUser.role === 'INSTRUCTOR' ? 'Instructor' : 'Aprendiz'})
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
