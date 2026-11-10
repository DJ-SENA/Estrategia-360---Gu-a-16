import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Building2,
  Loader2,
  CheckCircle2,
  UserPlus,
  LogIn,
  FileSpreadsheet
} from 'lucide-react';
import { AuthUser, UserRole, GAESProject } from '../types';
import { SENA_LOGO_SVG } from '../assets/senaLogo';

interface AuthLoginGatewayProps {
  onLogin: (user: AuthUser) => void;
  availableProjects: GAESProject[];
}

export const AuthLoginGateway: React.FC<AuthLoginGatewayProps> = ({
  onLogin,
  availableProjects,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('APRENDIZ');
  const [apprenticeMode, setApprenticeMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedGaesId, setSelectedGaesId] = useState(availableProjects[0]?.id || '');

  // Leader new GAES registration state
  const [regFichaNumber, setRegFichaNumber] = useState('2687410');
  const [regGaesNumber, setRegGaesNumber] = useState(6);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regLeaderName, setRegLeaderName] = useState('');
  const [regLeaderEmail, setRegLeaderEmail] = useState('');
  const [regLeaderDoc, setRegLeaderDoc] = useState('');
  const [regLeaderPhone, setRegLeaderPhone] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const realProjects = availableProjects.filter((p) => !p.isDemoProject);
  const demoProjects = availableProjects.filter((p) => p.isDemoProject);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico institucional.');
      return;
    }

    if (selectedRole === 'APRENDIZ') {
      if (normalizedEmail.endsWith('@sena.edu.co')) {
        setErrorMessage('Acceso denegado: El dominio @sena.edu.co es exclusivo para Instructores. Los aprendices deben autenticarse con su cuenta institucional @soy.sena.edu.co.');
        return;
      }
      const apprenticeDomainRegex = /^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i;
      if (!apprenticeDomainRegex.test(normalizedEmail)) {
        setErrorMessage('Acceso denegado: Para el perfil Aprendiz se requiere obligatoriamente correo institucional @soy.sena.edu.co. Se rechazan correos comerciales (Gmail, Hotmail, Outlook) y dominios no autorizados.');
        return;
      }
      const trimmedDoc = documentNumber.trim();
      if (!trimmedDoc) {
        setErrorMessage('Verificación de identidad individual requerida: Debe ingresar su número de documento de identidad (C.C. o T.I.) registrado en la nómina del GAES para impedir accesos no autorizados por simple conocimiento del correo.');
        return;
      }
    } else if (selectedRole === 'INSTRUCTOR') {
      if (normalizedEmail.endsWith('@soy.sena.edu.co')) {
        setErrorMessage('Acceso denegado: El dominio @soy.sena.edu.co corresponde a Aprendices. Los instructores deben autenticarse con su cuenta institucional @sena.edu.co.');
        return;
      }
      const instructorDomainRegex = /^[a-zA-Z0-9._%+-]+@sena\.edu\.co$/i;
      if (!instructorDomainRegex.test(normalizedEmail)) {
        setErrorMessage('Acceso denegado: Para el perfil Instructor se requiere obligatoriamente correo institucional @sena.edu.co. Se rechazan correos comerciales y dominios no autorizados.');
        return;
      }
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        setErrorMessage('La contraseña de Instructor es obligatoria. No se permite el acceso sin credenciales.');
        return;
      }
    }

    const chosenProj = availableProjects.find((p) => p.id === selectedGaesId) || availableProjects[0];

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password.trim(),
          documentNumber: documentNumber.trim(),
          role: selectedRole,
          name: name.trim(),
          gaesNumber: chosenProj?.gaesNumber || 3,
          fichaNumber: chosenProj?.fichaNumber || '2687410',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Fallo de autenticación en el servidor. Verifique sus credenciales.');
        return;
      }

      // Successful server-side authentication
      const authenticatedUser: AuthUser = {
        ...data.user,
        token: data.token,
      };

      onLogin(authenticatedUser);
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      setErrorMessage('No fue posible comunicarse con el servicio de autenticación del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterGAESSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normLeaderEmail = regLeaderEmail.trim().toLowerCase();
    const cleanLeaderName = regLeaderName.trim();
    const cleanLeaderDoc = regLeaderDoc.trim();
    const cleanCompanyName = regCompanyName.trim();
    const cleanFicha = regFichaNumber.trim();
    const numGaes = Number(regGaesNumber);

    if (!cleanCompanyName) {
      setErrorMessage('Debe ingresar la razón social o nombre de la empresa previamente seleccionada por el GAES.');
      return;
    }
    if (!cleanLeaderName) {
      setErrorMessage('Debe ingresar el nombre y apellidos completos del aprendiz que actuará como Líder.');
      return;
    }
    if (!cleanLeaderDoc) {
      setErrorMessage('Debe ingresar el número de documento de identidad del Líder para verificación de identidad.');
      return;
    }
    if (!normLeaderEmail) {
      setErrorMessage('Debe ingresar el correo electrónico institucional del Líder.');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i.test(normLeaderEmail)) {
      setErrorMessage('El correo del Líder debe pertenecer obligatoriamente al dominio institucional autorizado: @soy.sena.edu.co');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaesNumber: numGaes,
          fichaNumber: cleanFicha,
          programName: 'Tecnólogo en Gestión Empresarial',
          centerName: 'Centro de Gestión y Desarrollo Agroindustrial',
          regional: 'Regional Valle del Cauca',
          company: {
            name: cleanCompanyName,
            sector: 'Servicios / Tecnología',
            size: 'Microempresa (1-10)',
            city: 'Cali',
          },
          apprentices: [
            {
              id: `app-leader-${Date.now()}`,
              name: cleanLeaderName,
              document: cleanLeaderDoc,
              email: normLeaderEmail,
              phone: regLeaderPhone.trim() || '300 000 0000',
              role: 'Líder GAES',
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'No fue posible registrar el nuevo GAES en el servidor.');
        return;
      }

      setSuccessMessage(`¡GAES ${numGaes} registrado exitosamente! Redirigiendo a la plataforma...`);

      // Automatically authenticate the leader with the token returned by the server
      const authenticatedLeader: AuthUser = {
        ...data.user,
        token: data.token,
      };

      setTimeout(() => {
        onLogin(authenticatedLeader);
      }, 700);
    } catch (err) {
      console.error('Error al registrar GAES:', err);
      setErrorMessage('Error de conexión con el servidor al registrar el GAES.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Institutional Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white px-4 py-2 text-xs flex items-center justify-between font-medium shadow-md">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-950/80 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded tracking-wide text-xs border border-emerald-400/30">
            SENA
          </span>
          <span className="hidden sm:inline font-semibold">Servicio Nacional de Aprendizaje</span>
          <span className="text-emerald-300 hidden md:inline">•</span>
          <span className="text-slate-100 truncate">
            Tecnólogo en Gestión Empresarial • Guía 16: Herramientas de Gestión y Evaluación Estratégica
          </span>
        </div>
        <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded font-mono">
          Portal Institucional
        </span>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-5">
          {/* Ambient background blur */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Platform Title */}
          <div className="text-center space-y-2 relative">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-emerald-500/30 mx-auto overflow-hidden">
              <img src={SENA_LOGO_SVG} alt="Logo SENA" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                <span>Estrategia 360</span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Guía 16 & CMI
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Autenticación y registro inicial de proyectos GAES con trazabilidad en servidor.
              </p>
            </div>
          </div>

          {/* Role Selection Tabs */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('APRENDIZ');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${
                selectedRole === 'APRENDIZ'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Aprendiz GAES</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('INSTRUCTOR');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${
                selectedRole === 'INSTRUCTOR'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Instructor SENA</span>
            </button>
          </div>

          {/* If Apprentice: Toggle between Login and Leader Registration */}
          {selectedRole === 'APRENDIZ' && (
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setApprenticeMode('LOGIN');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
                  apprenticeMode === 'LOGIN'
                    ? 'bg-slate-800 text-emerald-300 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingreso a GAES</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setApprenticeMode('REGISTER');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
                  apprenticeMode === 'REGISTER'
                    ? 'bg-slate-800 text-emerald-300 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrar Nuevo GAES (Líder)</span>
              </button>
            </div>
          )}

          {/* Role / Mode Scope Notice */}
          <div
            className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1 ${
              selectedRole === 'INSTRUCTOR'
                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                : apprenticeMode === 'REGISTER'
                ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {selectedRole === 'INSTRUCTOR'
                  ? 'Perfil: Instructor Técnico Evaluador SENA'
                  : apprenticeMode === 'REGISTER'
                  ? 'Registro Inicial por el Líder del GAES'
                  : 'Ingreso al Proyecto Compartido del GAES'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {selectedRole === 'INSTRUCTOR'
                ? 'Acceso directo a todos los GAES registrados, sus empresas, avances y aportes individuales. No requiere aprobar previamente la creación de los proyectos.'
                : apprenticeMode === 'REGISTER'
                ? 'El líder registra una sola vez el GAES y la empresa previamente seleccionada. No requiere aprobación del instructor para iniciar. Al ingresar, completará y confirmará la nómina.'
                : 'Cada aprendiz ingresa con su correo institucional (@soy.sena.edu.co) y documento para trabajar en el proyecto compartido de su GAES.'}
            </p>
          </div>

          {/* Leader Register GAES Form */}
          {selectedRole === 'APRENDIZ' && apprenticeMode === 'REGISTER' ? (
            <form onSubmit={handleRegisterGAESSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Número de Ficha:
                  </label>
                  <input
                    type="text"
                    value={regFichaNumber}
                    onChange={(e) => setRegFichaNumber(e.target.value)}
                    placeholder="2687410"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Número de GAES:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={regGaesNumber}
                    onChange={(e) => setRegGaesNumber(Number(e.target.value) || 1)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Empresa Objeto de Estudio (Razón Social):
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="Ej. Industrias Andinas S.A.S."
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <span className="text-[11px] font-bold text-emerald-400 block mb-2">
                  Datos del Aprendiz Líder del GAES:
                </span>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Nombre Completo:</label>
                    <input
                      type="text"
                      value={regLeaderName}
                      onChange={(e) => setRegLeaderName(e.target.value)}
                      placeholder="Nombre y apellidos del líder"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-slate-300 font-medium block mb-1">Documento (C.C./T.I.):</label>
                      <input
                        type="text"
                        value={regLeaderDoc}
                        onChange={(e) => setRegLeaderDoc(e.target.value)}
                        placeholder="1118293849"
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-medium block mb-1">Teléfono:</label>
                      <input
                        type="text"
                        value={regLeaderPhone}
                        onChange={(e) => setRegLeaderPhone(e.target.value)}
                        placeholder="310 123 4567"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Correo Institucional del Líder:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regLeaderEmail}
                        onChange={(e) => setRegLeaderEmail(e.target.value)}
                        placeholder="lider@soy.sena.edu.co"
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Registrando GAES en el servidor...</span>
                  </>
                ) : (
                  <>
                    <span>Registrar Proyecto del GAES e Ingresar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {/* Email input */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                  <span>Correo Electrónico Institucional:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Requerido</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'INSTRUCTOR'
                        ? 'instructor@sena.edu.co'
                        : 'aprendiz@soy.sena.edu.co'
                    }
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Nombre y Apellidos:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ingresa tu nombre completo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* If Apprentice: Select GAES */}
              {selectedRole === 'APRENDIZ' && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    Selecciona tu GAES Asignado:
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={selectedGaesId}
                      onChange={(e) => setSelectedGaesId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
                    >
                      {realProjects.length > 0 && (
                        <optgroup label="Proyectos Reales de la Ficha">
                          {realProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                              GAES {p.gaesNumber}: {p.company.name} (Ficha {p.fichaNumber})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {demoProjects.length > 0 && (
                        <optgroup label="Proyectos de Demostración (Pruebas)">
                          {demoProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                              [DEMO] GAES {p.gaesNumber}: {p.company.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* If Apprentice: Document Number (Identity Verification) */}
              {selectedRole === 'APRENDIZ' && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                    <span>Número de Documento de Identidad (C.C. / T.I.):</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Identidad Individual Verificable</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Ej. 1118293849"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Control de seguridad: El documento debe coincidir con la nómina oficial del GAES para impedir accesos por mero conocimiento del correo.
                  </p>
                </div>
              )}

              {/* If Instructor: Password */}
              {selectedRole === 'INSTRUCTOR' && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                    <span>Contraseña Institucional de Instructor:</span>
                    <span className="text-[10px] text-indigo-400 font-normal">Requerido</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña de instructor"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 ${
                  selectedRole === 'INSTRUCTOR'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-950'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Validando credenciales con el servidor...</span>
                  </>
                ) : (
                  <>
                    <span>Autenticarse y Acceder a la Plataforma</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Institutional note */}
          <div className="pt-2 border-t border-slate-800 space-y-1 text-center">
            <span className="text-[11px] text-slate-400 block leading-relaxed">
              Autenticación institucional exclusiva: Aprendices (<strong>@soy.sena.edu.co</strong>) e Instructores (<strong>@sena.edu.co</strong>).
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Para producción institucional se requiere vinculación oficial con Microsoft Entra ID / OpenID Connect SENA sin captura de contraseñas locales.
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-3 text-slate-500 text-[11px] border-t border-slate-900">
        Sistema de Evaluación Estratégica SENA • Servicio Nacional de Aprendizaje • Todos los derechos reservados
      </footer>
    </div>
  );
};
