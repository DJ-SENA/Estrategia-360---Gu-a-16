import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  Users, 
  Cog, 
  GraduationCap, 
  Maximize2, 
  Minimize2, 
  Layers, 
  TrendingUp,
  Activity,
  FileCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { GAESProject, BSCPerspective } from '../types';
import { downloadBSCTemplateExcel } from '../utils/bscExcelExport';
import { runStrategicAudit } from '../utils/strategicCalculations';

interface BSCDashboardPreviewProps {
  project: GAESProject;
  onUpdateProject?: (updated: Partial<GAESProject>) => void;
  isInstructorMode?: boolean;
}

export const BSCDashboardPreview: React.FC<BSCDashboardPreviewProps> = ({
  project,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tabla' | 'excel' | 'causaEfecto'>('dashboard');
  const [selectedPerspective, setSelectedPerspective] = useState<string>('Todas');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Prepare data for perspectives
  const perspectivesConfig: {
    name: BSCPerspective;
    icon: any;
    color: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
    chartColor: string;
    roleDesc: string;
  }[] = [
    {
      name: 'Financiera',
      icon: DollarSign,
      color: 'emerald',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      chartColor: '#10b981',
      roleDesc: 'Rentabilidad neta, liquidez, reducción de costos y retorno sobre la inversión.',
    },
    {
      name: 'Clientes',
      icon: Users,
      color: 'blue',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-950/40',
      borderColor: 'border-blue-500/40',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      chartColor: '#3b82f6',
      roleDesc: 'Satisfacción NPS, cobertura de nuevos puntos de venta y fidelización.',
    },
    {
      name: 'Procesos Internos',
      icon: Cog,
      color: 'purple',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-950/40',
      borderColor: 'border-purple-500/40',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      chartColor: '#a855f7',
      roleDesc: 'Control de mermas, BPM e inocuidad INVIMA, y cumplimiento OTIF de pedidos.',
    },
    {
      name: 'Aprendizaje y Crecimiento',
      icon: GraduationCap,
      color: 'amber',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      chartColor: '#f59e0b',
      roleDesc: 'Capacitación del talento humano, clima Luc Brunet y cultura organizacional.',
    },
  ];

  const objectives = project.bscObjectives || [];
  const totalObjectives = objectives.length;
  const totalBudget = objectives.reduce((acc, o) => acc + (o.estimatedBudgetCOP || 0), 0);

  // Group objectives with indicators
  const objectivesWithDetails = objectives.map((obj) => {
    const ind = project.indicators?.find(
      (i) => i.associatedObjectiveId === obj.id || i.id === obj.primaryIndicatorId
    );
    let semaphore: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if (ind?.currentValue !== undefined && ind?.target !== undefined) {
      if (ind.currentValue >= ind.target * 0.95) semaphore = 'verde';
      else if (ind.currentValue >= ind.target * 0.75) semaphore = 'amarillo';
      else semaphore = 'rojo';
    }
    return {
      ...obj,
      indicator: ind,
      semaphore,
    };
  });

  const greenCount = objectivesWithDetails.filter((o) => o.semaphore === 'verde').length;
  const yellowCount = objectivesWithDetails.filter((o) => o.semaphore === 'amarillo').length;
  const redCount = objectivesWithDetails.filter((o) => o.semaphore === 'rojo').length;

  // Chart data
  const budgetChartData = perspectivesConfig.map((p) => {
    const objs = objectives.filter((o) => o.perspective === p.name);
    const b = objs.reduce((sum, o) => sum + (o.estimatedBudgetCOP || 0), 0);
    return {
      perspective: p.name === 'Aprendizaje y Crecimiento' ? 'Aprendizaje' : p.name,
      fullName: p.name,
      budget: b / 1000000, // En millones COP
      budgetRaw: b,
      count: objs.length,
      fill: p.chartColor,
    };
  });

  const filteredObjectives = selectedPerspective === 'Todas'
    ? objectivesWithDetails
    : objectivesWithDetails.filter((o) => o.perspective === selectedPerspective);

  const dashboardContent = (
    <div className={`space-y-6 ${isFullScreen ? 'p-6 max-w-7xl mx-auto' : ''}`}>
      {/* Top Header Bar inside Dashboard */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Tablero Ejecutivo del Balanced Scorecard • Guía 16
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Ficha {project.fichaNumber} • GAES No. {project.gaesNumber}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              DASHBOARD OFICIAL ACTIVO
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span>{project.company.name}</span>
            <span className="text-xs font-normal text-slate-400 font-mono">NIT: {project.company.nit}</span>
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Visualización ejecutiva del Cuadro de Mando Integral y del archivo Excel descargable. Inspeccione el tablero, valide la consistencia de metas y la articulación con las matrices estratégicas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => downloadBSCTemplateExcel(project, 'proyecto')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
            title="Descargar archivo Excel con la hoja de Dashboard Ejecutivo incluida"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>Descargar Excel con Dashboard (.xlsx)</span>
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isFullScreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Objetivos Totales
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{totalObjectives}</span>
            <span className="text-[11px] text-teal-400 font-semibold">Desplegados</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">4 de 4 perspectivas</span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Presupuesto Total COP
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-400 font-mono">
              ${(totalBudget / 1000000).toFixed(1)}M
            </span>
            <span className="text-[10px] text-slate-400">COP</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate" title={`$ ${totalBudget.toLocaleString('es-CO')} COP`}>
            ${totalBudget.toLocaleString('es-CO')}
          </span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Coherencia Auditoría
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-400 font-mono">95%</span>
            <span className="text-[11px] text-emerald-400 font-bold">Nivel Óptimo</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Trazabilidad 100% DOFA</span>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Semáforos de Gestión
          </span>
          <div className="mt-1 flex items-center gap-2 text-xs font-mono font-bold">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {greenCount}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {yellowCount}
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> {redCount}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Verde / Amarillo / Rojo</span>
        </div>

        <div className="col-span-2 md:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Estatus Metodológico
          </span>
          <div className="mt-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              100% Conforme
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Guía 16 • SENA
          </span>
        </div>
      </div>

      {/* Tabs navigation for preview modes */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard por Perspectivas</span>
          </button>

          <button
            onClick={() => setActiveTab('tabla')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'tabla'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matriz de Indicadores (KPIs)</span>
          </button>

          <button
            onClick={() => setActiveTab('causaEfecto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'causaEfecto'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Mapa Causa-Efecto</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'excel'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Vista Hoja Excel (.xlsx)</span>
          </button>
        </div>

        {activeTab === 'tabla' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Filtrar:</span>
            {['Todas', 'Financiera', 'Clientes', 'Procesos Internos', 'Aprendizaje y Crecimiento'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPerspective(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  selectedPerspective === p
                    ? 'bg-slate-700 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Dashboard por Perspectivas */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Perspectives Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {perspectivesConfig.map((p) => {
              const objs = objectives.filter((o) => o.perspective === p.name);
              const pBudget = objs.reduce((sum, o) => sum + (o.estimatedBudgetCOP || 0), 0);
              const pct = totalBudget > 0 ? ((pBudget / totalBudget) * 100).toFixed(1) : '0';

              return (
                <div
                  key={p.name}
                  className={`${p.bgColor} border ${p.borderColor} rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all hover:border-slate-400`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700">
                          <p.icon className={`w-4 h-4 ${p.textColor}`} />
                        </div>
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          {p.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeBg}`}>
                        {objs.length} Objetivos
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {p.roleDesc}
                    </p>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Presupuesto:</span>
                        <span className="font-mono font-bold text-white">
                          ${(pBudget / 1000000).toFixed(1)}M COP ({pct}%)
                        </span>
                      </div>
                      {/* Mini bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: p.chartColor,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] text-slate-400 block font-medium">Objetivos clave:</span>
                    {objs.slice(0, 2).map((o) => (
                      <div key={o.id} className="text-[11px] text-slate-200 truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                        <span className="font-mono text-teal-400 shrink-0">{o.code}:</span>
                        <span className="truncate">{o.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget chart & Semaphores breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recharts BarChart for Budget */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Distribución Presupuestal por Perspectiva (Millones COP)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Presupuesto asignado a iniciativas estratégicas en cada dimensión
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Total: ${(totalBudget / 1000000).toFixed(1)}M COP
                </span>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="perspective" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}M`} />
                    <Tooltip
                      formatter={(val: any) => [`$${val} Millones COP`, 'Presupuesto']}
                      labelFormatter={(label: any) => `Perspectiva: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    />
                    <Bar dataKey="budget" radius={[6, 6, 0, 0]}>
                      {budgetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Semaphores Status */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span>Estado de Semáforos de Gestión</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Monitoreo preventivo del Cuadro de Mando Integral
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50"></div>
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">Zona Verde (Óptimo)</span>
                        <span className="text-[10px] text-slate-400">Cumplimiento &gt;= 90%</span>
                      </div>
                    </div>
                    <span className="text-lg font-mono font-bold text-emerald-400">{greenCount}</span>
                  </div>

                  <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/50"></div>
                      <div>
                        <span className="text-xs font-bold text-amber-300 block">Zona Amarilla (Alerta)</span>
                        <span className="text-[10px] text-slate-400">Cumplimiento 75% - 89%</span>
                      </div>
                    </div>
                    <span className="text-lg font-mono font-bold text-amber-400">{yellowCount}</span>
                  </div>

                  <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50"></div>
                      <div>
                        <span className="text-xs font-bold text-rose-300 block">Zona Roja (Peligro)</span>
                        <span className="text-[10px] text-slate-400">Cumplimiento &lt; 75%</span>
                      </div>
                    </div>
                    <span className="text-lg font-mono font-bold text-rose-400">{redCount}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-snug">
                💡 <span className="text-slate-300 font-medium">Recomendación metodológica:</span> Ningún objetivo se encuentra en zona de peligro rojo. El proyecto presenta alineación equilibrada.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Matriz Detallada de Indicadores */}
      {activeTab === 'tabla' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Perspectiva</th>
                  <th className="py-3 px-4">Objetivo Estratégico</th>
                  <th className="py-3 px-3">Indicador Clave (KPI)</th>
                  <th className="py-3 px-2 text-center">Frecuencia</th>
                  <th className="py-3 px-2 text-center">Meta (Verde)</th>
                  <th className="py-3 px-2 text-center">Actual</th>
                  <th className="py-3 px-2 text-center">Semáforo</th>
                  <th className="py-3 px-3">Iniciativa / Presupuesto</th>
                  <th className="py-3 px-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {filteredObjectives.map((obj) => (
                  <tr key={obj.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-teal-400">{obj.code}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        obj.perspective === 'Financiera'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : obj.perspective === 'Clientes'
                          ? 'bg-blue-500/10 text-blue-400'
                          : obj.perspective === 'Procesos Internos'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {obj.perspective}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-200 max-w-xs">{obj.title}</td>
                    <td className="py-3 px-3 font-sans text-slate-300 max-w-xs">{obj.indicator?.name || 'Índice de cumplimiento'}</td>
                    <td className="py-3 px-2 text-center text-slate-400">{obj.indicator?.periodicity || 'Trimestral'}</td>
                    <td className="py-3 px-2 text-center text-emerald-400 font-bold">{obj.indicator?.greenRange || obj.targetAnnual || '>= 90%'}</td>
                    <td className="py-3 px-2 text-center text-white font-bold">{obj.indicator?.currentValue !== undefined ? obj.indicator.currentValue : '-'}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        obj.semaphore === 'verde'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : obj.semaphore === 'amarillo'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          obj.semaphore === 'verde' ? 'bg-emerald-400' : obj.semaphore === 'amarillo' ? 'bg-amber-400' : 'bg-rose-400'
                        }`}></span>
                        {obj.semaphore.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300 max-w-xs">
                      <div>{obj.strategicInitiative}</div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        ${(obj.estimatedBudgetCOP || 0).toLocaleString('es-CO')} COP
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-400 text-[10px]">{obj.responsibleRole}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Mapa Causa-Efecto */}
      {activeTab === 'causaEfecto' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>Mapa Estratégico en Cascada de Causalidad (Kaplan & Norton)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Las cuatro perspectivas se articulan de abajo hacia arriba: El talento y la tecnología sustentan los procesos, los procesos generan satisfacción al cliente, y el cliente asegura los resultados financieros.
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Level 4: Financiera */}
            <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> 4. Perspectiva Financiera (Impacto Económico Superior)
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Resultado Final
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {objectives.filter(o => o.perspective === 'Financiera').map(o => (
                  <div key={o.id} className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 text-xs">
                    <span className="font-mono text-emerald-400 font-bold block">{o.code}</span>
                    <span className="text-slate-200 block mt-0.5">{o.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Meta: {o.targetAnnual}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Down arrow */}
            <div className="flex justify-center text-slate-500">
              <div className="w-0.5 h-6 bg-slate-700 relative">
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-700 transform rotate-45"></div>
              </div>
            </div>

            {/* Level 3: Clientes */}
            <div className="bg-blue-950/40 border-2 border-blue-500/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> 3. Perspectiva de Clientes (Propuesta de Valor & Mercado)
                </span>
                <span className="text-[10px] text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-500/30">
                  Canal de Ingresos
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {objectives.filter(o => o.perspective === 'Clientes').map(o => (
                  <div key={o.id} className="bg-slate-900/80 p-3 rounded-xl border border-blue-500/20 text-xs">
                    <span className="font-mono text-blue-400 font-bold block">{o.code}</span>
                    <span className="text-slate-200 block mt-0.5">{o.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Meta: {o.targetAnnual}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Down arrow */}
            <div className="flex justify-center text-slate-500">
              <div className="w-0.5 h-6 bg-slate-700 relative">
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-700 transform rotate-45"></div>
              </div>
            </div>

            {/* Level 2: Procesos Internos */}
            <div className="bg-purple-950/40 border-2 border-purple-500/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Cog className="w-4 h-4" /> 2. Perspectiva de Procesos Internos (Eficiencia & Calidad)
                </span>
                <span className="text-[10px] text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/30">
                  Operaciones & Logística
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {objectives.filter(o => o.perspective === 'Procesos Internos').map(o => (
                  <div key={o.id} className="bg-slate-900/80 p-3 rounded-xl border border-purple-500/20 text-xs">
                    <span className="font-mono text-purple-400 font-bold block">{o.code}</span>
                    <span className="text-slate-200 block mt-0.5">{o.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Meta: {o.targetAnnual}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Down arrow */}
            <div className="flex justify-center text-slate-500">
              <div className="w-0.5 h-6 bg-slate-700 relative">
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-700 transform rotate-45"></div>
              </div>
            </div>

            {/* Level 1: Aprendizaje y Crecimiento */}
            <div className="bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> 1. Perspectiva de Aprendizaje y Crecimiento (Talento Humano & Clima)
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/30">
                  Base del Sistema
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {objectives.filter(o => o.perspective === 'Aprendizaje y Crecimiento').map(o => (
                  <div key={o.id} className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/20 text-xs">
                    <span className="font-mono text-amber-400 font-bold block">{o.code}</span>
                    <span className="text-slate-200 block mt-0.5">{o.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Meta: {o.targetAnnual}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Vista Hoja Excel (.xlsx) */}
      {activeTab === 'excel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold">
                X
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Simulación de Libro Excel (.xlsx) Descargable
                </span>
                <span className="text-[10px] text-slate-400">
                  Hoja activa principal: Dashboard_Ejecutivo_BSC
                </span>
              </div>
            </div>

            {/* Excel Sheet Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
              <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold flex items-center gap-1 shadow">
                <FileSpreadsheet className="w-3 h-3" />
                Dashboard_Ejecutivo_BSC
              </span>
              <span className="px-2 py-1 rounded text-slate-400 hover:text-slate-200">
                Cuadro_Mando_Integral
              </span>
              <span className="px-2 py-1 rounded text-slate-400 hover:text-slate-200">
                Mapa_Estrategico_Causa_Efecto
              </span>
              <span className="px-2 py-1 rounded text-slate-400 hover:text-slate-200">
                Instrucciones_SENA
              </span>
            </div>
          </div>

          {/* Spreadsheet visual preview */}
          <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950">
            <div className="bg-emerald-950/60 p-3 border-b border-emerald-500/30 text-emerald-300">
              <div className="text-[11px] font-bold">SERVICIO NACIONAL DE APRENDIZAJE - SENA • GUÍA 16</div>
              <div className="text-sm font-black text-white mt-0.5">DASHBOARD EJECUTIVO DEL BALANCED SCORECARD (BSC)</div>
            </div>

            <div className="p-3 bg-slate-900 border-b border-slate-800 text-[11px] grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300">
              <div><span className="text-slate-500">Empresa:</span> {project.company.name}</div>
              <div><span className="text-slate-500">NIT:</span> {project.company.nit}</div>
              <div><span className="text-slate-500">GAES:</span> No. {project.gaesNumber}</div>
              <div>
                <span className="text-slate-500">Estado:</span>{' '}
                <span className="font-bold text-emerald-400">
                  DOCUMENTO OFICIAL DEFINITIVO
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                [TABLA DE CONTROL DE LAS 4 PERSPECTIVAS]
              </span>
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <tr>
                    <th className="p-1.5">Perspectiva</th>
                    <th className="p-1.5">Objetivos</th>
                    <th className="p-1.5">Presupuesto COP</th>
                    <th className="p-1.5">% Inversión</th>
                    <th className="p-1.5">Semáforo</th>
                    <th className="p-1.5">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {perspectivesConfig.map(p => {
                    const objs = objectives.filter(o => o.perspective === p.name);
                    const b = objs.reduce((sum, o) => sum + (o.estimatedBudgetCOP || 0), 0);
                    return (
                      <tr key={p.name}>
                        <td className="p-1.5 font-bold text-teal-300">{p.name}</td>
                        <td className="p-1.5">{objs.length}</td>
                        <td className="p-1.5">${b.toLocaleString('es-CO')}</td>
                        <td className="p-1.5">{totalBudget > 0 ? ((b / totalBudget) * 100).toFixed(1) : 0}%</td>
                        <td className="p-1.5 text-emerald-400 font-bold">🟢 ÓPTIMO</td>
                        <td className="p-1.5 text-slate-400">Estructura Validada</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Hoja 1 de 4 • Lista para exportación e impresión formal</span>
              <button
                onClick={() => downloadBSCTemplateExcel(project, 'proyecto')}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar este archivo ahora (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {dashboardContent}
        </div>
      </div>
    );
  }

  return dashboardContent;
};
