import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Compass, 
  FileCheck, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  XCircle,
  ShieldAlert,
  Search,
  Filter,
  Check,
  Package,
  Users2,
  PieChart,
  Table,
  CheckSquare,
  Square,
  Upload,
  Trash2,
  Paperclip,
  Download,
  Info
} from 'lucide-react';
import { GAESProject, PriorGuidesData } from '../types';
import { 
  DeliverablePoint, 
  INITIAL_GUIDES_DELIVERABLES, 
  INFORME_GESTION_CONTABLE_METADATA 
} from '../data/learningGuidesDeliverables';
import { validateAllDeliverables, ValidationReport } from '../utils/deliverablesValidation';

interface Step2Props {
  project: GAESProject;
  onUpdatePriorGuides: (updated: Partial<PriorGuidesData>) => void;
  onUpdateDeliverables: (updatedDeliverables: DeliverablePoint[]) => void;
  onSynthesizeMatrices: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

type GroupTab = 'Planeación Estratégica' | 'Talento Humano' | 'Mercadeo' | 'Inventarios' | 'Contabilidad';

export const Step2_PriorGuides: React.FC<Step2Props> = ({
  project,
  onUpdatePriorGuides,
  onUpdateDeliverables,
  onSynthesizeMatrices,
  onNextStep,
  onPrevStep,
}) => {
  const deliverables: DeliverablePoint[] =
    project.learningGuidesDeliverables && project.learningGuidesDeliverables.length > 0
      ? project.learningGuidesDeliverables
      : INITIAL_GUIDES_DELIVERABLES;

  const [activeGroup, setActiveGroup] = useState<GroupTab>('Planeación Estratégica');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendientes' | 'cumplidos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [targetGroupForUpload, setTargetGroupForUpload] = useState<GroupTab>('Planeación Estratégica');
  const [docUploadFeedback, setDocUploadFeedback] = useState<string | null>(null);

  interface UploadedDocItem {
    id: string;
    name: string;
    sizeFormatted: string;
    type: 'word' | 'pdf';
    uploadedAt: string;
    group: GroupTab;
    status: 'Validado Técnicamente' | 'En Revisión';
  }

  const initialDocs: UploadedDocItem[] = (
    project.priorGuides.uploadedDocumentsSummary && project.priorGuides.uploadedDocumentsSummary.length > 0
      ? project.priorGuides.uploadedDocumentsSummary
      : [
          'Guia_02_Diagnostico_Empresarial_AgroLacteos.pdf',
          'Guia_05_Estudio_Clima_Cultura_Luc_Brunet.docx',
          'Guia_08_Estudio_Mercado_Proyeccion_Demanda.docx',
          'Guia_11_Flujo_Inventarios_Capacidad_Planta.pdf',
          'Guia_14_Manual_Funciones_Organigrama_SGSST.docx',
        ]
  ).map((docName, idx) => ({
    id: `doc-${idx}-${docName}`,
    name: docName,
    sizeFormatted: docName.toLowerCase().endsWith('.pdf') ? '2.4 MB' : '1.8 MB',
    type: docName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'word',
    uploadedAt: 'Verificado',
    group: docName.includes('02')
      ? 'Planeación Estratégica'
      : docName.includes('05') || docName.includes('14')
      ? 'Talento Humano'
      : docName.includes('08')
      ? 'Mercadeo'
      : docName.includes('11')
      ? 'Inventarios'
      : 'Planeación Estratégica',
    status: 'Validado Técnicamente',
  }));

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocItem[]>(initialDocs);

  // Perform live validation of all deliverables
  const validationReport: ValidationReport = validateAllDeliverables(deliverables);

  const handleToggleItemStatus = (id: string) => {
    const updated = deliverables.map((d) => {
      if (d.id === id) {
        return { ...d, cumple: !d.cumple };
      }
      return d;
    });
    onUpdateDeliverables(updated);
  };

  const handleUpdateItemEvidence = (id: string, text: string) => {
    const updated = deliverables.map((d) => {
      if (d.id === id) {
        return { ...d, evidenciaTexto: text };
      }
      return d;
    });
    onUpdateDeliverables(updated);
  };

  const handleAttachDocumentToItem = (itemId: string, file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isWord = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
    
    if (!isPdf && !isWord) {
      setDocUploadFeedback('Formato no admitido: Solo se permiten soportes en formato Word (.doc, .docx) o PDF (.pdf).');
      setTimeout(() => setDocUploadFeedback(null), 5000);
      return;
    }

    const sizeFormatted = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    const updated = deliverables.map((d) => {
      if (d.id === itemId) {
        return {
          ...d,
          cumple: true,
          archivoSoporte: file.name,
          evidenciaTexto: d.evidenciaTexto && !d.evidenciaTexto.includes(file.name)
            ? `${d.evidenciaTexto} (Sustentado mediante: ${file.name})`
            : `Documento soporte cargado: "${file.name}" (${sizeFormatted}). Parámetro validado técnicamente.`,
        };
      }
      return d;
    });

    onUpdateDeliverables(updated);

    const newDocMeta: UploadedDocItem = {
      id: `doc-${Date.now()}`,
      name: file.name,
      sizeFormatted,
      type: isPdf ? 'pdf' : 'word',
      uploadedAt: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      group: activeGroup,
      status: 'Validado Técnicamente',
    };
    
    const nextDocs = [newDocMeta, ...uploadedDocs.filter((d) => d.name !== file.name)];
    setUploadedDocs(nextDocs);
    onUpdatePriorGuides({
      uploadedDocumentsSummary: nextDocs.map((d) => d.name),
    });

    setDocUploadFeedback(`Documento "${file.name}" cargado y validado correctamente para el numeral.`);
    setTimeout(() => setDocUploadFeedback(null), 5000);
  };

  const handleRemoveDocumentFromItem = (itemId: string) => {
    const updated = deliverables.map((d) => {
      if (d.id === itemId) {
        return { ...d, archivoSoporte: undefined };
      }
      return d;
    });
    onUpdateDeliverables(updated);
  };

  const handleUploadBatchFiles = (fileList: FileList | null, chosenGroup: GroupTab) => {
    if (!fileList || fileList.length === 0) return;
    const added: UploadedDocItem[] = [];

    Array.from(fileList).forEach((file) => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const isWord = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
      if (!isPdf && !isWord) return;

      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      added.push({
        id: `batch-${Date.now()}-${file.name}`,
        name: file.name,
        sizeFormatted,
        type: isPdf ? 'pdf' : 'word',
        uploadedAt: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        group: chosenGroup,
        status: 'Validado Técnicamente',
      });
    });

    if (added.length === 0) {
      setDocUploadFeedback('Por favor selecciona documentos válidos en formato Word (.doc, .docx) o PDF (.pdf).');
      return;
    }

    const nextDocs = [...added, ...uploadedDocs];
    setUploadedDocs(nextDocs);
    onUpdatePriorGuides({
      uploadedDocumentsSummary: nextDocs.map((d) => d.name),
    });

    const primaryDocName = added[0].name;
    const updatedDeliverables = deliverables.map((d) => {
      if (d.grupo === chosenGroup) {
        return {
          ...d,
          cumple: true,
          archivoSoporte: d.archivoSoporte || primaryDocName,
          evidenciaTexto: d.evidenciaTexto || `Validado con documento de soporte: ${primaryDocName}`,
        };
      }
      return d;
    });
    onUpdateDeliverables(updatedDeliverables);

    setDocUploadFeedback(`Se cargaron ${added.length} documento(s) para ${chosenGroup}. Los entregables han sido validados con éxito.`);
    setTimeout(() => setDocUploadFeedback(null), 6000);
  };

  const handleDeleteUploadedDoc = (docId: string) => {
    const nextDocs = uploadedDocs.filter((d) => d.id !== docId);
    setUploadedDocs(nextDocs);
    onUpdatePriorGuides({
      uploadedDocumentsSummary: nextDocs.map((d) => d.name),
    });
  };

  const handleValidateGroupWithDoc = (groupToValidate: GroupTab, docName: string) => {
    const updatedDeliverables = deliverables.map((d) => {
      if (d.grupo === groupToValidate) {
        return {
          ...d,
          cumple: true,
          archivoSoporte: docName,
        };
      }
      return d;
    });
    onUpdateDeliverables(updatedDeliverables);
    setDocUploadFeedback(`Entregables del grupo "${groupToValidate}" validados con el soporte "${docName}".`);
    setTimeout(() => setDocUploadFeedback(null), 5000);
  };

  const handleLoadFullModelDeliverables = () => {
    onUpdateDeliverables(INITIAL_GUIDES_DELIVERABLES);
  };

  const handleUnmarkTestItem = () => {
    // Unmark numeral 4 of Guía 2 and numeral 8 of Guía 6 to demonstrate failure
    const updated = deliverables.map((d) => {
      if (d.id === 'g2-p4' || d.id === 'g6-p8') {
        return { ...d, cumple: false, evidenciaTexto: 'PENDIENTE DE SUSTENTACIÓN Y APROBACIÓN POR EL GAES' };
      }
      return d;
    });
    onUpdateDeliverables(updated);
  };

  const handleAttemptContinue = () => {
    if (!validationReport.isAllCompliant) {
      setShowBlockingModal(true);
    } else {
      setShowSuccessModal(true);
    }
  };

  const groupInfoMap: Record<
    GroupTab,
    { label: string; guias: string; icon: any; color: string; border: string; bg: string; matricesQueAlimenta: string }
  > = {
    'Planeación Estratégica': {
      label: 'Planeación Estratégica',
      guias: 'Guías 1 y 2 (Fundamentos & Plataforma Estratégica)',
      icon: Compass,
      color: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/30',
      matricesQueAlimenta: 'Alimenta: Direccionamiento Estratégico, Factores PESTA, Fortalezas y Debilidades MEFI y Cadena de Valor.',
    },
    'Talento Humano': {
      label: 'Talento Humano',
      guias: 'Guías 4, 5 y 6 (Macroprocesos, Clima Luc Brunet & SG-SST)',
      icon: Users2,
      color: 'text-blue-400',
      border: 'border-blue-500/40',
      bg: 'bg-blue-950/30',
      matricesQueAlimenta: 'Alimenta: Área Talento Humano en MEFI, Indicadores SST en BSC y Perspectiva de Aprendizaje y Crecimiento.',
    },
    'Mercadeo': {
      label: 'Mercadeo',
      guias: 'Guías 7, 8, 9 y 10 (Mercados, Investigación 4Ps & Servicio al Cliente)',
      icon: TrendingUp,
      color: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/30',
      matricesQueAlimenta: 'Alimenta: Factores de Demanda y Competencia en MEFE, Matriz de Perfil Competitivo (MPC), BCG y BSC Clientes.',
    },
    'Inventarios': {
      label: 'Inventarios',
      guias: 'Guía 11 (Inventarios, Compras y Cadena de Suministro)',
      icon: Package,
      color: 'text-purple-400',
      border: 'border-purple-500/40',
      bg: 'bg-purple-950/30',
      matricesQueAlimenta: 'Alimenta: Control de mermas en MEFI, Estrategias DO en DOFA y Perspectiva de Procesos Internos en BSC.',
    },
    'Contabilidad': {
      label: 'Contabilidad',
      guias: 'Guías 12 a 15 (Componente Contable, Tributario & Financiero)',
      icon: DollarSign,
      color: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-950/30',
      matricesQueAlimenta: 'Alimenta: Fuerza Financiera (FF) en PEYEA, Ratios de Rentabilidad y Liquidez, y Perspectiva Financiera del BSC.',
    },
  };

  // Filter items in current active group
  const itemsInActiveGroup = deliverables.filter((d) => d.grupo === activeGroup);

  const filteredItems = itemsInActiveGroup.filter((d) => {
    const matchesSearch =
      d.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.guiaNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(d.numeral).toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.evidenciaTexto.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'cumplidos') return matchesSearch && d.cumple;
    if (filterStatus === 'pendientes') return matchesSearch && !d.cumple;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-emerald-950/60 border border-blue-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">
                  Paso 2 de 6 • Insumos Previos & Validación de Entregables
                </span>
                <span className="text-xs text-slate-400 font-mono">Guías 1 a 15 Articuladas</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Revisión Obligatoria de Entregables de Guías de Aprendizaje
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Los aprendices deben verificar el cumplimiento de los parámetros de las guías de formación previas. 
                <strong> El sistema exige que todos los parámetros cumplan para habilitar el avance a la Guía 16</strong>. 
                Estos productos son los insumos que alimentan directamente las matrices estratégicas.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <button
              onClick={handleAttemptContinue}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                validationReport.isAllCompliant
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950 hover:scale-[1.02]'
                  : 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-500/50 shadow-rose-950'
              }`}
            >
              {validationReport.isAllCompliant ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Validar & Continuar a Matrices (Paso 3)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-300" />
                  <span>Validar Entregables ({validationReport.failingGuides.length} Guías Pendientes)</span>
                </>
              )}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Compliance Bar & Quick Test Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center font-mono">
              <span
                className={`text-base font-extrabold ${
                  validationReport.isAllCompliant ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {validationReport.percentage}%
              </span>
              <span className="text-[9px] text-slate-400 uppercase font-sans">Avance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Estado Global de Parámetros: {validationReport.compliantItems} de {validationReport.totalItems} cumplidos
                </span>
                {validationReport.isAllCompliant ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    ✓ Apto para Guía 16
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                    ✕ Bloqueado por Parámetros Incompletos
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {validationReport.isAllCompliant
                  ? 'Todos los parámetros obligatorios han sido completados y verificados con evidencias documentales.'
                  : `Se detectaron parámetros pendientes en ${validationReport.failingGuides.length} guía(s). Revisa el detalle para solventar los requisitos.`}
              </p>
            </div>
          </div>

          {/* Quick Helper Tools */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <button
              onClick={handleLoadFullModelDeliverables}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              title="Cargar todas las evidencias del GAES modelo (100% de cumplimiento)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Cargar 100% Entregables Modelo</span>
            </button>
            <button
              onClick={handleUnmarkTestItem}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
              title="Desmarcar puntos para probar el bloqueo de validación"
            >
              Probar Alerta de Incumplimiento
            </button>
          </div>
        </div>

        {/* 5 Groups Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-800 text-xs">
          {validationReport.groups.map((grp) => {
            const isGrpActive = activeGroup === grp.grupo;
            const info = groupInfoMap[grp.grupo];

            return (
              <button
                key={grp.grupo}
                onClick={() => setActiveGroup(grp.grupo)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isGrpActive
                    ? `${info.bg} ${info.border} ring-1 ring-white/20 shadow-md`
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] truncate text-slate-200">
                    {grp.grupo}
                  </span>
                  {grp.cumpleTotal ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-baseline justify-between font-mono text-[11px]">
                  <span className="text-slate-400 text-[10px]">
                    {grp.puntosCumplidos}/{grp.totalPuntos}
                  </span>
                  <span
                    className={`font-bold ${
                      grp.cumpleTotal ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {Math.round((grp.puntosCumplidos / grp.totalPuntos) * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group Focus Banner */}
      <div className={`p-4 rounded-2xl border ${groupInfoMap[activeGroup].bg} ${groupInfoMap[activeGroup].border} flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${groupInfoMap[activeGroup].color}`}>
              {groupInfoMap[activeGroup].label}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              • {groupInfoMap[activeGroup].guias}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            <strong>Impacto en Guía 16:</strong> {groupInfoMap[activeGroup].matricesQueAlimenta}
          </p>
        </div>

        {/* Filter & Search controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar numeral o tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="todos">Todos ({itemsInActiveGroup.length})</option>
            <option value="pendientes">
              Pendientes ({itemsInActiveGroup.filter((i) => !i.cumple).length})
            </option>
            <option value="cumplidos">
              Cumplidos ({itemsInActiveGroup.filter((i) => i.cumple).length})
            </option>
          </select>
        </div>
      </div>

      {/* Feedback Alert for Document Uploads */}
      {docUploadFeedback && (
        <div className="p-3 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{docUploadFeedback}</span>
          </div>
          <button
            onClick={() => setDocUploadFeedback(null)}
            className="text-blue-400 hover:text-white text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zona de Cargue y Validación Documental (Word / PDF) */}
      <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.2 rounded border border-blue-500/20">
                  Cargue de Documentos de Soporte • Word & PDF
                </span>
                <span className="text-xs text-slate-400 font-mono">Formatos .doc, .docx, .pdf</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Validación Documental de Insumos Previos (Guías 1 a 15)
              </h3>
              <p className="text-xs text-slate-300">
                Cargue los documentos de evidencia técnica de su empresa proyecto para que la plataforma valide los parámetros antes de habilitar las matrices de la Guía 16.
              </p>
            </div>
          </div>

          {/* Quick upload controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={targetGroupForUpload}
              onChange={(e) => setTargetGroupForUpload(e.target.value as GroupTab)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-2 rounded-xl focus:outline-none"
              title="Selecciona a qué área o grupo aplicar la evidencia"
            >
              <option value="Planeación Estratégica">Planeación Estratégica (G1-G2)</option>
              <option value="Talento Humano">Talento Humano (G4-G6)</option>
              <option value="Mercadeo">Mercadeo (G7-G10)</option>
              <option value="Inventarios">Inventarios (G11)</option>
              <option value="Contabilidad">Contabilidad (G12-G15)</option>
            </select>

            <label className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-950 cursor-pointer transition-all hover:scale-[1.02] shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Word / PDF</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  handleUploadBatchFiles(e.target.files, targetGroupForUpload);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Documentos Soporte Registrados ({uploadedDocs.length})</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Haga clic en un documento para revalidar el grupo correspondiente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  {doc.type === 'pdf' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                      PDF
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40">
                      WORD
                    </span>
                  )}
                  <div className="truncate">
                    <p className="font-mono text-slate-200 text-[11px] truncate font-medium" title={doc.name}>
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{doc.sizeFormatted}</span>
                      <span>•</span>
                      <span className="text-blue-400">{doc.group}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleValidateGroupWithDoc(doc.group, doc.name)}
                    className="text-[10px] font-bold bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/30 px-2 py-0.5 rounded transition-colors"
                    title="Asociar y validar entregables de este grupo con este documento"
                  >
                    Validar
                  </button>
                  <button
                    onClick={() => handleDeleteUploadedDoc(doc.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Eliminar documento soporte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Special Presentation Banner for Contabilidad (Guías 12 a 15) */}
      {activeGroup === 'Contabilidad' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-teal-950/50 border border-emerald-500/40 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide">
                {INFORME_GESTION_CONTABLE_METADATA.guias}
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{INFORME_GESTION_CONTABLE_METADATA.titulo}</span>
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono font-semibold">
              12 Secciones Oficiales • Archivo: Sistema de Información Contable en Excel.xlsx
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            "{INFORME_GESTION_CONTABLE_METADATA.introduccion.replace('XXXXX', project.company.name || 'Empresa Proyecto')}"
          </p>
        </div>
      )}

      {/* Deliverable Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.cumple
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                {/* Left: Checkbox & description */}
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleToggleItemStatus(item.id)}
                    className="mt-0.5 text-slate-400 hover:text-white transition-colors shrink-0"
                    title={item.cumple ? 'Marcar como pendiente' : 'Marcar como cumplido'}
                  >
                    {item.cumple ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                        Guía {item.guiaNumero} • Numeral {item.numeral}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold truncate">
                        {item.guiaNombre}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.cumple
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.cumple ? '✓ Cumple parámetro' : '✕ Pendiente de cumplimiento'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {item.descripcion}
                    </p>

                    {/* Extra details from JSON if present */}
                    {item.detallesExtra?.tabla && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <span className="font-bold text-slate-400 block">
                          Estructura requerida del proceso administrativo:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {item.detallesExtra.tabla.map((fase) => (
                            <div key={fase.fase} className="bg-slate-900 p-2 rounded border border-slate-800">
                              <strong className="text-emerald-400 block">{fase.fase}</strong>
                              <span className="text-slate-400 text-[10px]">
                                {fase.elementos_o_acciones.join(', ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.detallesExtra?.componentesPlataforma && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <span className="font-bold text-slate-400 block">
                          Componentes obligatorios de la plataforma estratégica:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                          {item.detallesExtra.componentesPlataforma.map((comp, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400">•</span>
                              <span>{comp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.detallesExtra?.estructuraPlanMejoramiento && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <span className="font-bold text-slate-400 block">
                          Estructura obligatoria del plan de mejoramiento (Luc Brunet):
                        </span>
                        <span className="text-slate-300">
                          {item.detallesExtra.estructuraPlanMejoramiento.join(' • ')}
                        </span>
                      </div>
                    )}

                    {item.detallesExtra?.subtemas && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <span className="font-bold text-slate-400 block">
                          Subtemas exigidos en gestión contable y tributaria:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                          {item.detallesExtra.subtemas.map((sub, idx) => (
                            <li key={idx}>{sub}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Guía 1 Elementos requeridos */}
                    {item.detallesExtra?.elementos && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <span className="font-bold text-slate-400 block">
                          Documentos requeridos de la Guía 1:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                          {item.detallesExtra.elementos.map((elem, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 p-1 rounded bg-slate-900 border border-slate-800/80">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span className="font-medium">{elem}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subsecciones */}
                    {item.detallesExtra?.subsecciones && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-2">
                        <span className="font-bold text-slate-400 block">
                          Subsecciones a desarrollar:
                        </span>
                        <div className="space-y-1.5">
                          {item.detallesExtra.subsecciones.map((sub) => (
                            <div key={sub.subnumero} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                              <strong className="text-emerald-400 block text-xs">
                                3.{sub.subnumero} {sub.titulo}
                              </strong>
                              <span className="text-slate-300 text-[11px] leading-relaxed block mt-0.5">
                                {sub.descripcion}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Puntos y requerimientos */}
                    {item.detallesExtra?.puntos && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <span className="font-bold text-slate-400 block">
                          Puntos y soluciones a formular:
                        </span>
                        <ul className="space-y-1 text-slate-300">
                          {item.detallesExtra.puntos.map((punto, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-snug">
                              <span className="text-teal-400 font-bold shrink-0">•</span>
                              <span>{punto}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Herramientas de matemáticas financieras */}
                    {item.detallesExtra?.herramientas && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <span className="font-bold text-slate-400 block">
                          Herramientas de Matemáticas Financieras requeridas en Excel:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                          {item.detallesExtra.herramientas.map((h, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-medium flex items-center gap-1.5">
                              <span className="text-emerald-400">📊</span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estados Financieros */}
                    {item.detallesExtra?.estados_financieros && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <span className="font-bold text-slate-400 block">
                          Estados Financieros a construir y sustentar:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.detallesExtra.estados_financieros.map((ef, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1">
                              <span>📑</span>
                              <span>{ef}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requerimientos adicionales */}
                    {item.detallesExtra?.requerimientos_adicionales && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          <strong>Requerimientos adicionales:</strong> {item.detallesExtra.requerimientos_adicionales.join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Editable evidence box */}
                <div className="w-full md:w-80 shrink-0 space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className="font-bold text-slate-400 truncate">Evidencia / Soporte:</span>
                    <label className="cursor-pointer text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/40 px-2 py-0.5 rounded transition-colors shrink-0">
                      <Paperclip className="w-3 h-3" />
                      <span>{item.archivoSoporte ? 'Cambiar doc' : 'Adjuntar Word / PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAttachDocumentToItem(item.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {item.archivoSoporte && (
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        {item.archivoSoporte.toLowerCase().endsWith('.pdf') ? (
                          <span className="text-rose-400 font-bold bg-rose-950/80 border border-rose-500/30 px-1 rounded text-[9px]">
                            PDF
                          </span>
                        ) : (
                          <span className="text-blue-400 font-bold bg-blue-950/80 border border-blue-500/30 px-1 rounded text-[9px]">
                            WORD
                          </span>
                        )}
                        <span className="font-mono text-slate-200 truncate font-medium" title={item.archivoSoporte}>
                          {item.archivoSoporte}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-emerald-400 font-bold text-[9px]">✓ Validado</span>
                        <button
                          onClick={() => handleRemoveDocumentFromItem(item.id)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-0.5"
                          title="Quitar archivo de soporte"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={item.evidenciaTexto}
                    onChange={(e) => handleUpdateItemEvidence(item.id, e.target.value)}
                    placeholder="Describe el producto o evidencia aportada por el GAES..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 leading-snug"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleItemStatus(item.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        item.cumple
                          ? 'bg-slate-800 text-slate-300 hover:text-white'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {item.cumple ? 'Cambiar a Pendiente' : 'Aprobar Cumplimiento'}
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {item.cumple ? 'Verificado' : 'Requiere revisión'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={onPrevStep}
          className="text-xs text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          ← Volver a Registro GAES (Paso 1)
        </button>

        <button
          onClick={handleAttemptContinue}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
            validationReport.isAllCompliant
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950 hover:scale-[1.02]'
              : 'bg-rose-900/90 hover:bg-rose-800 text-rose-100 border border-rose-500/50 shadow-rose-950'
          }`}
        >
          {validationReport.isAllCompliant ? (
            <>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Validar & Pasar a Matrices Guía 16 (Paso 3)</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-rose-300" />
              <span>Validar Insumos ({validationReport.compliantItems}/{validationReport.totalItems})</span>
            </>
          )}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL / ANUNCIO OBLIGATORIO DE INCUMPLIMIENTO Y BLOQUEO */}
      {/* ========================================================= */}
      {showBlockingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200 relative max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Control Estricto de Parámetros • Guía 16 SENA
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  No Cumple con los Parámetros Requeridos para Continuar
                </h3>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                  Para avanzar a la generación de las matrices estratégicas y el Balanced Scorecard, el GAES debe haber cumplido y sustentado la totalidad de los entregables de las guías de formación previas.
                </p>
              </div>
            </div>

            {/* Breakdown of Failing Guides */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-white">
                  Guías con Parámetros Incumplidos ({validationReport.failingGuides.length}):
                </span>
                <span className="text-[11px] font-mono text-rose-400 font-bold">
                  {validationReport.totalItems - validationReport.compliantItems} puntos pendientes
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {validationReport.failingGuides.map((fg) => (
                  <div
                    key={`${fg.guiaNumero}-${fg.guiaNombre}`}
                    className="p-3 rounded-xl bg-slate-900 border border-rose-500/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">
                        Guía {fg.guiaNumero}: {fg.guiaNombre}
                      </span>
                      <span className="text-[10px] bg-rose-500/10 text-rose-300 font-bold px-2 py-0.5 rounded">
                        {fg.puntosFaltantes} parámetro(s) sin cumplir
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Grupo: <strong>{fg.grupo}</strong>
                    </span>

                    <ul className="space-y-1 pt-1 text-[11px] text-slate-300">
                      {fg.detallesFaltantes.map((df, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold">• Numeral {df.numeral}:</span>
                          <span className="text-slate-300 truncate max-w-md">{df.descripcion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleLoadFullModelDeliverables}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Autocompletar con Evidencias del GAES Modelo
              </button>

              <button
                onClick={() => {
                  setShowBlockingModal(false);
                  if (validationReport.failingGuides[0]) {
                    setActiveGroup(validationReport.failingGuides[0].grupo);
                  }
                }}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950 transition-colors"
              >
                <span>Revisar Guías Pendientes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMACIÓN Y TRANSFERENCIA EXITOSA A MATRICES */}
      {/* ========================================================= */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200 relative">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Validación Superada al 100%
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  ¡Todos los Parámetros Previos Han Sido Cumplidos!
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Se verificó la totalidad de los <strong>{validationReport.totalItems} entregables</strong> de las guías de formación en Planeación Estratégica, Talento Humano, Mercadeo, Inventarios y Contabilidad.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-white text-xs block">
                Articulación con las Matrices Guía 16:
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Planeación Estratégica:</strong> Alimentará la PESTA, MEFI y Plataforma Estratégica.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Talento Humano:</strong> Alimentará indicadores SST y Perspectiva de Aprendizaje del BSC.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Mercadeo:</strong> Alimentará la MPC, MEFE, BCG y Perspectiva de Clientes.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Inventarios:</strong> Alimentará control de mermas y Perspectiva de Procesos Internos.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span><strong>Contabilidad:</strong> Alimentará PEYEA (Fuerza Financiera) y Perspectiva Financiera.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Permanecer en Insumos
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  onSynthesizeMatrices();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Generar Matrices Estratégicas (Paso 3)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
