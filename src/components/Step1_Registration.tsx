import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  ArrowRight, 
  MapPin, 
  DollarSign, 
  Layers, 
  Sparkles,
  Info,
  Edit2,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { GAESProject, Apprentice, EconomicSector, CompanySize } from '../types';

interface Step1Props {
  project: GAESProject;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onNextStep: () => void;
}

const SECTORS: EconomicSector[] = [
  'Agropecuario / Agroindustrial',
  'Manufactura / Industrial',
  'Comercial',
  'Servicios / Tecnología',
];

const SIZES: CompanySize[] = [
  'Microempresa (1-10)',
  'Pequeña (11-50)',
  'Mediana (51-200)',
  'Gran Empresa (>200)',
];

const ROLES: Apprentice['role'][] = [
  'Líder GAES',
  'Coordinador Financiero',
  'Coordinador de Mercadeo',
  'Coordinador de Operaciones / Calidad',
  'Coordinador de Talento Humano',
];

export const Step1_Registration: React.FC<Step1Props> = ({
  project,
  onUpdateProject,
  onNextStep,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDocument, setNewMemberDocument] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Apprentice['role']>('Coordinador de Mercadeo');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [step1ValidationMsg, setStep1ValidationMsg] = useState<string | null>(null);

  const handleValidateAndNext = () => {
    if (!project.company?.name || !project.company.name.trim()) {
      setStep1ValidationMsg('Por favor ingresa la razón social o nombre de la empresa antes de avanzar.');
      setTimeout(() => setStep1ValidationMsg(null), 5000);
      return;
    }
    if (!project.apprentices || project.apprentices.length === 0) {
      setStep1ValidationMsg('Debes registrar al menos un aprendiz en el GAES para continuar.');
      setTimeout(() => setStep1ValidationMsg(null), 5000);
      return;
    }
    setStep1ValidationMsg(null);
    onNextStep();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMemberError(null);

    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    if (trimmedEmail && !/^[a-zA-Z0-9._%+-]+@soy\.sena\.edu\.co$/i.test(trimmedEmail)) {
      setMemberError('El correo del aprendiz debe pertenecer al dominio institucional autorizado: @soy.sena.edu.co');
      return;
    }

    const newApprentice: Apprentice = {
      id: `app-${Date.now()}`,
      name: newMemberName.trim(),
      document: newMemberDocument.trim() || 'Por asignar',
      email: trimmedEmail || `aprendiz_${Date.now().toString().slice(-4)}@soy.sena.edu.co`,
      phone: newMemberPhone.trim() || '300 000 0000',
      role: newMemberRole,
    };

    onUpdateProject({
      apprentices: [...project.apprentices, newApprentice],
    });

    setNewMemberName('');
    setNewMemberDocument('');
    setNewMemberEmail('');
    setNewMemberPhone('');
  };

  const handleUpdateMember = (id: string, updates: Partial<Apprentice>) => {
    onUpdateProject({
      apprentices: project.apprentices.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    });
  };

  const handleRemoveMember = (id: string) => {
    if (project.apprentices.length <= 1) {
      setMemberError('El GAES debe mantener al menos un aprendiz líder registrado.');
      setTimeout(() => setMemberError(null), 4000);
      return;
    }
    setMemberError(null);
    onUpdateProject({
      apprentices: project.apprentices.filter((a) => a.id !== id),
    });
  };

  const updateCompanyField = (field: keyof typeof project.company, value: any) => {
    onUpdateProject({
      company: {
        ...project.company,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Step Guide Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                  Paso 1 de 6 • Plan de Trabajo Guía 16
                </span>
                <span className="text-xs text-slate-400 font-mono">Fase de Identificación</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Registro del Proyecto Formativo & Caracterización del GAES
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Cada Grupo Autónomo de Estudio SENA (GAES) registra sus integrantes y la información base de la empresa proyecto. Esta información alimentará de forma coherente las matrices de la Guía 16 y el Balanced Scorecard.
              </p>
            </div>
          </div>
          <button
            onClick={handleValidateAndNext}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-lg shadow-emerald-950 transition-all shrink-0 hover:translate-x-0.5"
          >
            <span>Continuar al Paso 2</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: GAES Info & Members (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* GAES Administrative Data */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Identificación del Grupo SENA</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Número de GAES</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={project.gaesNumber}
                  onChange={(e) => onUpdateProject({ gaesNumber: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Ficha de Formación</label>
                <input
                  type="text"
                  value={project.fichaNumber}
                  onChange={(e) => onUpdateProject({ fichaNumber: e.target.value })}
                  placeholder="Ej. 2687410"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Programa de Formación</label>
                <input
                  type="text"
                  value={project.programName}
                  onChange={(e) => onUpdateProject({ programName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Centro & Regional SENA</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={project.centerName}
                    onChange={(e) => onUpdateProject({ centerName: e.target.value })}
                    placeholder="Centro de Formación"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={project.regional}
                    onChange={(e) => onUpdateProject({ regional: e.target.value })}
                    placeholder="Regional"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Apprentices Roster */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Integrantes del GAES ({project.apprentices.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Roles por competencia</span>
            </div>

            {/* Error Alert */}
            {memberError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{memberError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberError(null)}
                  className="text-rose-400 hover:text-white text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {project.apprentices.map((app) => {
                const isEditing = editingMemberId === app.id;

                if (isEditing) {
                  return (
                    <div
                      key={app.id}
                      className="bg-slate-900 border border-teal-500/50 rounded-xl p-3 space-y-2 text-xs shadow-lg animate-in fade-in"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={app.name}
                          onChange={(e) => handleUpdateMember(app.id, { name: e.target.value })}
                          placeholder="Nombre"
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-400"
                        />
                        <input
                          type="text"
                          value={app.document}
                          onChange={(e) => handleUpdateMember(app.id, { document: e.target.value })}
                          placeholder="Documento"
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-400 font-mono"
                        />
                        <input
                          type="email"
                          value={app.email}
                          onChange={(e) => handleUpdateMember(app.id, { email: e.target.value })}
                          placeholder="Correo"
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-400"
                        />
                        <select
                          value={app.role}
                          onChange={(e) => handleUpdateMember(app.id, { role: e.target.value as any })}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-teal-400"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingMemberId(null)}
                          className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium text-[11px] flex items-center gap-1 shadow"
                        >
                          <Check className="w-3 h-3" />
                          <span>Listo</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={app.id}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-2 text-xs hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-0.5 truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 truncate">{app.name}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          {app.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Doc: {app.document}</span>
                        <span className="truncate">{app.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(app.id)}
                        className="text-slate-400 hover:text-teal-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar datos del aprendiz"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(app.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Eliminar aprendiz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add member form */}
            <form onSubmit={handleAddMember} className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide block">
                + Agregar Aprendiz al GAES
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="No. Documento / T.I. / C.C."
                  value={newMemberDocument}
                  onChange={(e) => setNewMemberDocument(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="email"
                  placeholder="aprendiz@soy.sena.edu.co"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Integrante</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Company Data (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Información Básica de la Empresa Objeto de Estudio</span>
              </h3>
              <span className="text-[11px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
                Proyecto Formativo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Razón Social de la Empresa</label>
                <input
                  type="text"
                  value={project.company.name}
                  onChange={(e) => updateCompanyField('name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">NIT (Real o Proyectado)</label>
                <input
                  type="text"
                  value={project.company.nit}
                  onChange={(e) => updateCompanyField('nit', e.target.value)}
                  placeholder="Ej. 901.482.391-4"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Sector Económico</label>
                <select
                  value={project.company.sector}
                  onChange={(e) => updateCompanyField('sector', e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Código CIIU & Actividad</label>
                <input
                  type="text"
                  value={project.company.ciiuCode}
                  onChange={(e) => updateCompanyField('ciiuCode', e.target.value)}
                  placeholder="Ej. 1050 - Elaboración de productos lácteos"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Tamaño de la Empresa</label>
                <select
                  value={project.company.size}
                  onChange={(e) => updateCompanyField('size', e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Municipio / Ciudad Sede</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={project.company.city}
                    onChange={(e) => updateCompanyField('city', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Producto o Servicio Estrella</label>
                <input
                  type="text"
                  value={project.company.mainProduct}
                  onChange={(e) => updateCompanyField('mainProduct', e.target.value)}
                  placeholder="Nombre y características del producto estrella"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Propuesta de Valor Diferenciadora</label>
                <textarea
                  rows={2}
                  value={project.company.valueProposition}
                  onChange={(e) => updateCompanyField('valueProposition', e.target.value)}
                  placeholder="¿Por qué los clientes eligen esta empresa sobre la competencia?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Segmento de Mercado Objetivo</label>
                <textarea
                  rows={2}
                  value={project.company.targetMarket}
                  onChange={(e) => updateCompanyField('targetMarket', e.target.value)}
                  placeholder="Perfil de clientes, canales y alcance geográfico"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Ventas Anuales Estimadas</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={project.company.annualRevenueEstimated}
                    onChange={(e) => updateCompanyField('annualRevenueEstimated', e.target.value)}
                    placeholder="Ej. $ 420.000.000 COP"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom info callout */}
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>Nota formativa SENA:</strong> Todos los datos de la empresa alimentarán directamente la formulación de las matrices de la Guía 16 en el Paso 3. Asegúrate de que el sector y la propuesta de valor coincidan con los diagnósticos de las guías anteriores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Validation Strip */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {step1ValidationMsg ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {step1ValidationMsg}
            </span>
          ) : (
            <span className="text-slate-400">
              Paso 1: Todos los cambios en aprendices y empresa se guardan en tiempo real.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleValidateAndNext}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
        >
          <span>Continuar a Insumos Previos (Paso 2)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
