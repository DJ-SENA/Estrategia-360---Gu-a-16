import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine, 
  Cell 
} from 'recharts';
import { 
  Users, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Building2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Compass, 
  Eye, 
  BarChart3, 
  HelpCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GAESProject } from '../types';
import { SENA_COMPETENCIAS_ORGANIZACIONALES } from '../data/learningCompetencies';

interface InstructorDashboardProps {
  projects: GAESProject[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenEvaluationDetail?: () => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onOpenEvaluationDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJudgment, setFilterJudgment] = useState<'ALL' | 'EXCELLENT' | 'APPROVED' | 'IMPROVEMENT'>('ALL');
  const [sortBy, setSortBy] = useState<'GAES' | 'TOTAL_DESC' | 'PRODUCT_DESC' | 'PERFORMANCE_DESC'>('GAES');
  const [activeChartTab, setActiveChartTab] = useState<'GAES_COMPARISON' | 'COMPETENCY_BREAKDOWN' | 'MATRICES_BSC'>('GAES_COMPARISON');

  // Compute metrics across all active projects
  const cohortMetrics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalProjects: 0,
        avgProductScore: 0,
        avgPerformanceScore: 0,
        avgTotalScore: 0,
        approvalRate: 0,
        topGAES: null,
        lowestGAES: null,
      };
    }

    let sumProduct = 0;
    let sumPerf = 0;
    let sumTotal = 0;
    let approvedCount = 0;

    const listWithTotal = projects.map((p) => {
      const pScore = p.instructorEvaluation?.productEvidenceScore || 0;
      const perfScore = p.instructorEvaluation?.performanceEvidenceScore || 0;
      const total = Math.round(pScore * 0.6 + perfScore * 0.4);
      return { project: p, total, pScore, perfScore };
    });

    listWithTotal.forEach(({ total, pScore, perfScore }) => {
      sumProduct += pScore;
      sumPerf += perfScore;
      sumTotal += total;
      if (total >= 70) approvedCount += 1;
    });

    const sortedByScore = [...listWithTotal].sort((a, b) => b.total - a.total);

    return {
      totalProjects: projects.length,
      avgProductScore: Math.round(sumProduct / projects.length),
      avgPerformanceScore: Math.round(sumPerf / projects.length),
      avgTotalScore: Math.round(sumTotal / projects.length),
      approvalRate: Math.round((approvedCount / projects.length) * 100),
      topGAES: sortedByScore[0]?.project || null,
      lowestGAES: sortedByScore[sortedByScore.length - 1]?.project || null,
    };
  }, [projects]);

  // Data for GAES comparison bar chart
  const gaesBarData = useMemo(() => {
    return projects.map((p) => {
      const productScore = p.instructorEvaluation?.productEvidenceScore || 0;
      const performanceScore = p.instructorEvaluation?.performanceEvidenceScore || 0;
      const totalScore = Math.round(productScore * 0.6 + performanceScore * 0.4);

      return {
        id: p.id,
        gaesNumber: p.gaesNumber,
        label: `GAES ${p.gaesNumber}`,
        empresa: p.company?.name || `Empresa GAES ${p.gaesNumber}`,
        sector: p.company?.sector || 'Sector',
        producto: productScore,
        desempeno: performanceScore,
        promedioTotal: totalScore,
        estado: p.instructorEvaluation?.finalJudgment || 'PENDIENTE',
        peyeaQuadrant: p.peyea?.quadrant || 'N/A',
        isSelected: p.id === currentProjectId,
      };
    });
  }, [projects, currentProjectId]);

  // Data for competency averages bar chart
  const competencyBarData = useMemo(() => {
    return SENA_COMPETENCIAS_ORGANIZACIONALES.map((comp) => {
      let totalScores = 0;
      let count = 0;

      projects.forEach((proj) => {
        const crit = proj.instructorEvaluation?.criteria?.find(
          (c) => c.rapCode === comp.codigo || c.title.toLowerCase().includes(comp.tituloCorto.toLowerCase().slice(0, 8))
        );
        if (crit && typeof crit.score === 'number') {
          totalScores += crit.score;
          count += 1;
        } else {
          totalScores += 80;
          count += 1;
        }
      });

      const avg = count > 0 ? Math.round(totalScores / count) : 80;

      return {
        codigo: comp.codigo,
        codigoCorto: `Cód. ${comp.codigo.slice(-5)}`,
        tituloCorto: comp.tituloCorto,
        descripcion: comp.descripcion,
        promedio: avg,
        metaSena: 85,
        nucleo: comp.nucleoAsociado,
      };
    });
  }, [projects]);

  // Data for Matrices & BSC comparison
  const matricesBscData = useMemo(() => {
    return projects.map((p) => {
      const mefiWeightSum = Number((p.mefi || []).reduce((a, b) => a + (b.weightedScore || 0), 0).toFixed(2));
      const mefeWeightSum = Number((p.mefe || []).reduce((a, b) => a + (b.weightedScore || 0), 0).toFixed(2));
      const bscCount = p.bscObjectives?.length || 0;
      const bscObjectivesScore = Math.min(100, bscCount * 12.5); // 8 objectives = 100 pts

      return {
        id: p.id,
        label: `GAES ${p.gaesNumber}`,
        empresa: p.company?.name || `GAES ${p.gaesNumber}`,
        mefiScore: Math.round(mefiWeightSum * 25), // scale 0-4 to 0-100
        mefeScore: Math.round(mefeWeightSum * 25),
        bscScore: bscObjectivesScore,
      };
    });
  }, [projects]);

  // Filtered and sorted projects list for the comparison table
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const matchesSearch =
          p.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.company?.sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `gaes ${p.gaesNumber}`.includes(searchTerm.toLowerCase()) ||
          p.apprentices?.some((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        const total = Math.round(
          (p.instructorEvaluation?.productEvidenceScore || 0) * 0.6 +
            (p.instructorEvaluation?.performanceEvidenceScore || 0) * 0.4
        );

        if (filterJudgment === 'EXCELLENT') return total >= 90;
        if (filterJudgment === 'APPROVED') return total >= 70 && total < 90;
        if (filterJudgment === 'IMPROVEMENT') return total < 70;
        return true;
      })
      .sort((a, b) => {
        const totalA = Math.round(
          (a.instructorEvaluation?.productEvidenceScore || 0) * 0.6 +
            (a.instructorEvaluation?.performanceEvidenceScore || 0) * 0.4
        );
        const totalB = Math.round(
          (b.instructorEvaluation?.productEvidenceScore || 0) * 0.6 +
            (b.instructorEvaluation?.performanceEvidenceScore || 0) * 0.4
        );

        if (sortBy === 'TOTAL_DESC') return totalB - totalA;
        if (sortBy === 'PRODUCT_DESC') {
          return (b.instructorEvaluation?.productEvidenceScore || 0) - (a.instructorEvaluation?.productEvidenceScore || 0);
        }
        if (sortBy === 'PERFORMANCE_DESC') {
          return (b.instructorEvaluation?.performanceEvidenceScore || 0) - (a.instructorEvaluation?.performanceEvidenceScore || 0);
        }
        return a.gaesNumber - b.gaesNumber;
      });
  }, [projects, searchTerm, filterJudgment, sortBy]);

  // Custom Tooltip for GAES Comparison
  const CustomGAESTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-white text-sm">{label}</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              {data.estado}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-semibold truncate">
            {data.empresa}
          </div>
          <div className="text-[10px] text-slate-400">
            Sector: <span className="text-slate-200">{data.sector}</span> • PEYEA: <span className="text-purple-300 font-semibold">{data.peyeaQuadrant}</span>
          </div>
          <div className="pt-1.5 border-t border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-emerald-400">
              <span>Evidencia Producto:</span>
              <strong className="font-bold">{data.producto}/100</strong>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>Evidencia Desempeño:</span>
              <strong className="font-bold">{data.desempeno}/100</strong>
            </div>
            <div className="flex justify-between text-purple-400 font-bold border-t border-slate-800/80 pt-1">
              <span>Promedio Ponderado:</span>
              <strong className="text-white text-xs">{data.promedioTotal}/100</strong>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 italic pt-0.5">
            Haz clic en la barra para seleccionar este GAES
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Competency Breakdown
  const CustomCompetencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-mono font-bold text-indigo-400 text-xs">Cód. {data.codigo}</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
              Promedio: {data.promedio} pts
            </span>
          </div>
          <div className="font-bold text-white text-xs leading-snug">
            {data.tituloCorto}
          </div>
          <p className="text-[10px] text-slate-300 leading-snug">
            {data.descripcion}
          </p>
          <div className="text-[10px] text-teal-400 pt-1 border-t border-slate-800">
            <strong>Núcleo:</strong> {data.nucleo}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-500/30">
                Paso 6 • Dashboard Oficial del Instructor SENA
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Ficha {projects[0]?.fichaNumber || '2687410'} • {projects.length} Equipos GAES Registrados
              </span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Analítica Comparativa y Promedios de Desempeño por GAES</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Monitoreo analítico integral de la cohorte para la Guía 16. Compare los puntajes de producto y desempeño,
              audite el dominio promedio en las 7 competencias organizacionales y detecte oportunidades de nivelación formativa.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {onOpenEvaluationDetail && (
              <button
                type="button"
                onClick={onOpenEvaluationDetail}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all hover:scale-105"
              >
                <span>Evaluar GAES Activo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {/* Card 1: Promedio General */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Promedio de Cohorte</span>
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-300">
                {cohortMetrics.avgTotalScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100 pts</span>
            </div>
            <span className="text-[10px] text-emerald-400 block font-medium">
              Meta Mínima: 70 pts (Aprobatorio)
            </span>
          </div>

          {/* Card 2: Evidencias de Producto */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Prom. Evidencias Producto</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {cohortMetrics.avgProductScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100 pts</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Ponderación en rúbrica: 60%
            </span>
          </div>

          {/* Card 3: Evidencias de Desempeño */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Prom. Desempeño & Sustentación</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-300">
                {cohortMetrics.avgPerformanceScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100 pts</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Ponderación en rúbrica: 40%
            </span>
          </div>

          {/* Card 4: Tasa de Aprobación */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Tasa de Aprobación</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-teal-300">
                {cohortMetrics.approvalRate}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({cohortMetrics.totalProjects} GAES)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              Líder: {cohortMetrics.topGAES?.company.name || 'GAES 3'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selector for Visualizations */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveChartTab('GAES_COMPARISON')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'GAES_COMPARISON'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>1. Comparativa por Grupo GAES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('COMPETENCY_BREAKDOWN')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'COMPETENCY_BREAKDOWN'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>2. Promedio por Competencia SENA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('MATRICES_BSC')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'MATRICES_BSC'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3. Diagnóstico MEFI/MEFE vs BSC</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Haga clic en cualquier barra o fila para seleccionar el GAES a evaluar</span>
        </div>
      </div>

      {/* MAIN CHART CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* TAB 1: GAES COMPARISON */}
        {activeChartTab === 'GAES_COMPARISON' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Puntajes de Evidencias de Producto, Desempeño y Promedio Total por GAES</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativa directa entre proyectos formativos activos de la Ficha {projects[0]?.fichaNumber}.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  Producto (60%)
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-3 h-3 rounded bg-blue-500"></span>
                  Desempeño (40%)
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-3 h-3 rounded bg-purple-500"></span>
                  Promedio Total
                </span>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gaesBarData}
                  margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const clickedId = e.activePayload[0].payload.id;
                      onSelectProject(clickedId);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 100]}
                    tickCount={6}
                    tickFormatter={(v) => `${v} pts`}
                  />
                  <Tooltip content={<CustomGAESTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }} />
                  <ReferenceLine
                    y={cohortMetrics.avgTotalScore}
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    label={{
                      value: `Media Cohorte: ${cohortMetrics.avgTotalScore}`,
                      fill: '#c084fc',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <ReferenceLine
                    y={70}
                    stroke="#ef4444"
                    strokeDasharray="2 2"
                    label={{
                      value: 'Mínimo Aprobatorio (70)',
                      fill: '#f87171',
                      fontSize: 9,
                      position: 'insideBottomRight',
                    }}
                  />
                  <Bar dataKey="producto" name="Evidencia Producto" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="desempeno" name="Evidencia Desempeño" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="promedioTotal" name="Promedio Ponderado" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {gaesBarData.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.isSelected ? '#a855f7' : '#8b5cf6'}
                        stroke={entry.isSelected ? '#f3e8ff' : 'none'}
                        strokeWidth={entry.isSelected ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 2: COMPETENCY BREAKDOWN */}
        {activeChartTab === 'COMPETENCY_BREAKDOWN' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Promedio de Calificación por Competencia Organizacional SENA</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Consolidado del nivel de dominio alcanzado por todos los GAES en los 7 resultados de aprendizaje.
                </p>
              </div>
              <span className="text-xs text-indigo-300 font-mono bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800">
                Línea Referencia: Meta Institucional (85 pts)
              </span>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={competencyBarData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="codigoCorto"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    width={75}
                  />
                  <Tooltip content={<CustomCompetencyTooltip />} />
                  <ReferenceLine
                    x={85}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: 'Meta (85%)', fill: '#34d399', fontSize: 10, position: 'top' }}
                  />
                  <Bar dataKey="promedio" name="Promedio de Cohorte" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {competencyBarData.map((entry, index) => {
                      const color =
                        entry.promedio >= 90
                          ? '#10b981'
                          : entry.promedio >= 80
                          ? '#6366f1'
                          : entry.promedio >= 70
                          ? '#f59e0b'
                          : '#ef4444';
                      return <Cell key={`comp-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Competency Legend Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              {competencyBarData.map((c) => (
                <div key={c.codigo} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-mono text-indigo-400 font-bold mr-1.5">{c.codigoCorto}:</span>
                    <span className="text-slate-300 font-medium truncate">{c.tituloCorto}</span>
                  </div>
                  <span className="font-mono font-bold text-white shrink-0 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {c.promedio} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MATRICES VS BSC */}
        {activeChartTab === 'MATRICES_BSC' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Equilibrio Diagnóstico (MEFI/MEFE) vs Despliegue en Balanced Scorecard</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Verifica que los grupos con matrices robustas hayan estructurado los 8 objetivos estratégicos correspondientes.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span> MEFI Interno
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-3 h-3 rounded bg-blue-500"></span> MEFE Externo
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-3 h-3 rounded bg-purple-500"></span> Despliegue BSC
                </span>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={matricesBscData} margin={{ top: 15, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="mefiScore" name="Calidad MEFI (0-100)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="mefeScore" name="Calidad MEFE (0-100)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="bscScore" name="Completitud BSC (0-100)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* COMPARATIVE PROJECTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Relación Detallada de Proyectos Formativos GAES</span>
            </h3>
            <p className="text-xs text-slate-400">
              Haga clic en cualquier fila o en el botón "Evaluar" para cargar la rúbrica y criterios oficiales del GAES.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar GAES o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44"
              />
            </div>

            <select
              value={filterJudgment}
              onChange={(e) => setFilterJudgment(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="EXCELLENT">Sobresalientes (≥90 pts)</option>
              <option value="APPROVED">Aprobados (70-89 pts)</option>
              <option value="IMPROVEMENT">Por Mejorar (&lt;70 pts)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="GAES">Ordenar: Número GAES</option>
              <option value="TOTAL_DESC">Ordenar: Mayor Promedio</option>
              <option value="PRODUCT_DESC">Ordenar: Mayor Producto</option>
              <option value="PERFORMANCE_DESC">Ordenar: Mayor Desempeño</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">GAES #</th>
                <th className="py-2.5 px-3">Empresa Proyecto Formativo</th>
                <th className="py-2.5 px-3">Sector & PEYEA</th>
                <th className="py-2.5 px-3 text-center">Score Producto (60%)</th>
                <th className="py-2.5 px-3 text-center">Score Desempeño (40%)</th>
                <th className="py-2.5 px-3 text-center">Promedio Total</th>
                <th className="py-2.5 px-3 text-center">Juicio Evaluativo</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filteredProjects.map((p) => {
                const isSelected = p.id === currentProjectId;
                const pScore = p.instructorEvaluation?.productEvidenceScore || 0;
                const perfScore = p.instructorEvaluation?.performanceEvidenceScore || 0;
                const total = Math.round(pScore * 0.6 + perfScore * 0.4);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                        : 'hover:bg-slate-850/50'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-black'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.gaesNumber}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/40">
                            Activo
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.company?.name || `Empresa GAES ${p.gaesNumber}`}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        NIT: {p.company?.nit} • {p.apprentices?.length || 0} Aprendices
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-300 truncate max-w-[180px]">
                        {p.company?.sector || 'No especificado'}
                      </div>
                      <span className="inline-block text-[9px] font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.2 rounded">
                        Vector: {p.peyea?.quadrant || 'Agresiva'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                      {pScore}/100
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-400">
                      {perfScore}/100
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                          total >= 90
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : total >= 70
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {total} pts
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          p.instructorEvaluation?.finalJudgment === 'APROBADO'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {p.instructorEvaluation?.finalJudgment || 'PENDIENTE'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(p.id);
                          if (onOpenEvaluationDetail) onOpenEvaluationDetail();
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ml-auto ${
                          isSelected
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelected ? 'Evaluando' : 'Seleccionar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-slate-400 space-y-1">
            <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs">No se encontraron proyectos con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};
