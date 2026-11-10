import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Check, 
  X, 
  AlertTriangle, 
  Copy, 
  CheckCircle2, 
  Trash2,
  ExternalLink,
  Target,
  DollarSign,
  Users,
  Cog,
  GraduationCap
} from 'lucide-react';
import { GAESProject, BSCObjective, BSCPerspective } from '../types';

interface ExcelBSCImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: GAESProject;
  onApplyBSCImport: (importedObjectives: BSCObjective[]) => void;
}

export interface ParsedBSCRow {
  id: string;
  code: string;
  perspective: BSCPerspective;
  title: string;
  matrixOrigin: string;
  targetAnnual: string;
  strategicInitiative: string;
  estimatedBudgetCOP: number;
  responsibleRole: string;
}

export const ExcelBSCImportModal: React.FC<ExcelBSCImportModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyBSCImport,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'archivo' | 'pegar' | 'drive'>('archivo');
  const [pastedText, setPastedText] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedBSCRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Download official Excel template for Balanced Scorecard
  const handleDownloadBSCTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Instrucciones
    const wsInstruccionesData = [
      ['PLANTILLA OFICIAL SENA - GUÍA 16: BALANCED SCORECARD (CUADRO DE MANDO INTEGRAL)'],
      ['Instrucciones para aprendices del Tecnólogo en Gestión Empresarial:'],
      ['1. Diligencie las filas en la hoja "Balanced_Scorecard".'],
      ['2. En la columna "Perspectiva", elija: Financiera, Clientes, Procesos Internos, o Aprendizaje y Crecimiento.'],
      ['3. En "Matriz_Origen", indique la trazabilidad (ej. DOFA FO-1, MEFI Fortaleza F1, PEYEA Agresivo, MEFE Oportunidad O2).'],
      ['4. Especifique el Objetivo Estratégico, la Meta Anual, la Iniciativa / Proyecto, el Presupuesto en COP y el Responsable.'],
      ['5. Una vez terminado en su Google Drive, descargue el archivo (.xlsx) y cárguelo en la plataforma.'],
    ];
    const wsInstrucciones = XLSX.utils.aoa_to_sheet(wsInstruccionesData);
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

    // Sheet 2: Balanced_Scorecard
    const wsBSCData = [
      [
        'Codigo',
        'Perspectiva',
        'Objetivo_Estrategico',
        'Matriz_Origen',
        'Meta_Anual',
        'Iniciativa_Estrategica',
        'Presupuesto_COP',
        'Responsable'
      ],
      [
        'OBJ-FIN-01',
        'Financiera',
        'Incrementar la rentabilidad neta sobre ventas al 14.5% anual.',
        'DOFA: Estrategia FO-1 (Aprovechar INVIMA y fomento financiero)',
        'Margen neto >= 14.5%',
        'Plan de optimización de costos y negociación directa con ganaderos',
        12000000,
        'Director Financiero / Aprendiz GAES'
      ],
      [
        'OBJ-FIN-02',
        'Financiera',
        'Reducir costos operativos y desperdicios de merma en planta en un 12%.',
        'MEFI: Debilidad D1 (Capacidad de frío) superada',
        'Reducción merma <= 1.8%',
        'Inversión en cámara de refrigeración eficiente',
        18000000,
        'Jefe de Operaciones / GAES'
      ],
      [
        'OBJ-CLI-01',
        'Clientes',
        'Aumentar la penetración en canal retail saludable y tiendas gourmet un 30%.',
        'MEFE: Oportunidad O1 (Demanda alimentos funcionales)',
        '30% nuevos puntos de venta',
        'Estrategia de trade marketing y degustación guiada',
        8500000,
        'Líder Comercial / GAES'
      ],
      [
        'OBJ-CLI-02',
        'Clientes',
        'Alcanzar un índice de satisfacción y recompra del cliente superior al 92%.',
        'PEYEA: Estrategia Agresiva de penetración y servicio',
        'NPS >= 92%',
        'Programa de fidelización y servicio posventa digital',
        4000000,
        'Coordinador de Clientes'
      ],
      [
        'OBJ-PRO-01',
        'Procesos Internos',
        'Implementar el sistema HACCP y trazabilidad digital del lote lácteo.',
        'MEFI: Fortaleza F1 (BPM INVIMA)',
        '100% lotes trazados digitalmente',
        'Software de trazabilidad y automatización de batch',
        9000000,
        'Jefe de Calidad'
      ],
      [
        'OBJ-PRO-02',
        'Procesos Internos',
        'Disminuir los tiempos de ciclo de distribución a 48 horas.',
        'PEYEA: Ventaja Competitiva y logística ágil',
        'Ciclo de entrega <= 48 hrs',
        'Ruteo inteligente y alianzas de transporte refrigerado',
        6500000,
        'Supervisor de Logística'
      ],
      [
        'OBJ-APR-01',
        'Aprendizaje y Crecimiento',
        'Capacitar al 100% de los operarios en normas BPM y bioseguridad láctea.',
        'Guía 16: Fortalecimiento de competencias técnicas laborales',
        '100% personal certificado',
        'Plan institucional de formación técnica con el SENA',
        3000000,
        'Líder Talento Humano'
      ],
      [
        'OBJ-APR-02',
        'Aprendizaje y Crecimiento',
        'Desarrollar cultura de innovación y desarrollo de derivados funcionales.',
        'DOFA: Estrategia FO-2 e I+D',
        '2 nuevos prototipos por año',
        'Laboratorio piloto de formulación e innovación',
        5000000,
        'Equipo I+D / GAES'
      ]
    ];
    const wsBSC = XLSX.utils.aoa_to_sheet(wsBSCData);
    XLSX.utils.book_append_sheet(wb, wsBSC, 'Balanced_Scorecard');

    XLSX.writeFile(wb, 'Plantilla_Guia16_Balanced_Scorecard_SENA.xlsx');
  };

  // Upload file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetName =
          workbook.SheetNames.find((s) => s.toLowerCase().includes('scorecard') || s.toLowerCase().includes('bsc') || s.toLowerCase().includes('cmi')) ||
          workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMessage('El archivo no contiene filas legibles en la hoja.');
          return;
        }

        processRawBSCData(rawJson);
      } catch (err: any) {
        console.error('Error reading excel BSC:', err);
        setErrorMessage('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'));
      }
    };

    reader.readAsBinaryString(file);
  };

  // Process pasted text
  const handleProcessPastedText = () => {
    setErrorMessage(null);
    if (!pastedText.trim()) {
      setErrorMessage('Por favor pega los datos de Excel o Google Sheets.');
      return;
    }

    const lines = pastedText.trim().split('\n');
    if (lines.length < 1) {
      setErrorMessage('No hay suficientes filas para procesar.');
      return;
    }

    const rows: any[] = [];
    lines.forEach((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 1 && parts[0].trim()) {
        rows.push({
          codigo: parts[0]?.trim(),
          perspectiva: parts[1]?.trim(),
          objetivo: parts[2]?.trim() || parts[0]?.trim(),
          matriz: parts[3]?.trim() || '',
          meta: parts[4]?.trim() || '',
          iniciativa: parts[5]?.trim() || '',
          presupuesto: parseFloat(parts[6]?.trim()?.replace(/[^0-9.]/g, '')) || 5000000,
          responsable: parts[7]?.trim() || 'Líder GAES',
        });
      }
    });

    processRawBSCData(rows);
  };

  // Normalizer
  const processRawBSCData = (rows: any[]) => {
    const newParsed: ParsedBSCRow[] = [];

    rows.forEach((r, idx) => {
      const title =
        r.Objetivo_Estrategico ||
        r.objetivo ||
        r.Objetivo ||
        r.Descripcion ||
        r.title ||
        Object.values(r)[2] ||
        Object.values(r)[1] ||
        '';

      if (!String(title).trim() || String(title).toLowerCase().includes('objetivo_estrategico')) return;

      const rawPersp = String(
        r.Perspectiva ||
        r.perspectiva ||
        r.Perspective ||
        Object.values(r)[1] ||
        ''
      ).toLowerCase();

      let perspective: BSCPerspective = 'Financiera';
      if (rawPersp.includes('clien') || rawPersp.includes('cli') || rawPersp.includes('mercad')) {
        perspective = 'Clientes';
      } else if (rawPersp.includes('proc') || rawPersp.includes('operac') || rawPersp.includes('intern')) {
        perspective = 'Procesos Internos';
      } else if (rawPersp.includes('apren') || rawPersp.includes('crecim') || rawPersp.includes('humano') || rawPersp.includes('talento')) {
        perspective = 'Aprendizaje y Crecimiento';
      } else if (rawPersp.includes('finan') || rawPersp.includes('dinero') || rawPersp.includes('econ')) {
        perspective = 'Financiera';
      }

      const code =
        r.Codigo ||
        r.codigo ||
        r.code ||
        `OBJ-${perspective.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`;

      const matrixOrigin =
        r.Matriz_Origen ||
        r.matriz ||
        r.origen ||
        r.sustento ||
        'Derivado de análisis Guía 16';

      const targetAnnual =
        r.Meta_Anual ||
        r.meta ||
        r.Meta ||
        r.target ||
        'Meta anual cuantificada';

      const strategicInitiative =
        r.Iniciativa_Estrategica ||
        r.iniciativa ||
        r.proyecto ||
        'Iniciativa del proyecto formativo';

      const estimatedBudgetCOP =
        Number(r.Presupuesto_COP || r.presupuesto || r.budget) || 5000000;

      const responsibleRole =
        r.Responsable ||
        r.responsable ||
        'Líder GAES / Cargo responsable';

      newParsed.push({
        id: `bsc-imp-${idx}-${Date.now()}`,
        code: String(code),
        perspective,
        title: String(title),
        matrixOrigin: String(matrixOrigin),
        targetAnnual: String(targetAnnual),
        strategicInitiative: String(strategicInitiative),
        estimatedBudgetCOP,
        responsibleRole: String(responsibleRole),
      });
    });

    if (newParsed.length === 0) {
      setErrorMessage('No se pudieron reconocer objetivos del archivo. Verifica que tenga columnas de Perspectiva y Objetivo.');
      return;
    }

    setParsedRows(newParsed);
    setSuccessNotice(`Se cargaron e interpretaron exitosamente ${newParsed.length} objetivos para el Balanced Scorecard.`);
  };

  const handleUpdatePerspective = (id: string, perspective: BSCPerspective) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, perspective } : r))
    );
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleConfirmApplication = () => {
    const finalObjectives: BSCObjective[] = parsedRows.map((r) => ({
      id: r.id,
      code: r.code,
      perspective: r.perspective,
      title: r.title,
      description: 'Objetivo estructurado desde el Excel de Google Drive',
      matrixOrigin: r.matrixOrigin,
      targetAnnual: r.targetAnnual,
      strategicInitiative: r.strategicInitiative,
      estimatedBudgetCOP: r.estimatedBudgetCOP,
      responsibleRole: r.responsibleRole,
    }));

    onApplyBSCImport(finalObjectives);
    onClose();
  };

  // Group counts
  const countFin = parsedRows.filter((r) => r.perspective === 'Financiera').length;
  const countCli = parsedRows.filter((r) => r.perspective === 'Clientes').length;
  const countProc = parsedRows.filter((r) => r.perspective === 'Procesos Internos').length;
  const countApr = parsedRows.filter((r) => r.perspective === 'Aprendizaje y Crecimiento').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200 relative my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Carga & Clasificación BSC • Excel / Drive
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Kaplan & Norton • Guía 16</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Cargar Balanced Scorecard desde Excel & Elegir Perspectivas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                Los aprendices pueden incorporar directamente sus objetivos, metas, iniciativas y presupuestos estructurados en Google Drive, asignando o ajustando la perspectiva de cada uno.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('archivo')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all border ${
              activeTab === 'archivo'
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Subir Archivo Excel (.xlsx / .csv)</span>
          </button>

          <button
            onClick={() => setActiveTab('pegar')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all border ${
              activeTab === 'pegar'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>2. Copiar y Pegar Celdas</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all border ${
              activeTab === 'drive'
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>3. Conectar Enlace Google Drive</span>
          </button>

          <button
            onClick={handleDownloadBSCTemplate}
            className="ml-auto flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 px-3 py-1.5 rounded-xl font-semibold transition-colors"
            title="Descargar plantilla Excel modelo para BSC"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Plantilla Excel BSC SENA</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeTab === 'archivo' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">
                Selecciona tu archivo de Balanced Scorecard descargado de Google Drive
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Formatos compatibles: <strong>.xlsx, .xls o .csv</strong>. El sistema leerá las 4 perspectivas, metas e iniciativas.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-purple-950 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Explorar Archivo Excel en mi Equipo</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Tab 2: Paste Cells */}
        {activeTab === 'pegar' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-white block">
              Copia las filas del Balanced Scorecard en tu Google Drive (Ctrl + C) y pégalas aquí:
            </span>
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Ejemplo:
OBJ-FIN-01	Financiera	Incrementar rentabilidad neta al 15%	DOFA FO-1	Margen >= 15%	Plan reducción costos	12000000	Director Financiero
OBJ-CLI-01	Clientes	Aumentar cobertura en retail un 25%	MEFE Oportunidad O1	25% nuevos puntos	Trade marketing	8000000	Líder Comercial"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessPastedText}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Procesar Celdas Pegadas</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Drive Link */}
        {activeTab === 'drive' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-white block">
              Pegar enlace del archivo BSC en Google Drive:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => {
                  if (!driveUrl) return;
                  setSuccessNotice('Enlace de Google Drive registrado. Para mayor compatibilidad offline, descárgalo como .xlsx y usa la pestaña 1.');
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Vincular Drive
              </button>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <strong>💡 Consejo para el GAES:</strong> En Google Sheets, ve a <em>Archivo ➔ Descargar ➔ Microsoft Excel (.xlsx)</em> y usa la opción 1 para cargarlo directamente.
            </div>
          </div>
        )}

        {/* Errors & Notices */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/50 text-purple-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Parsed Rows Classifier */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800 p-3 rounded-2xl border border-slate-700">
              <div>
                <span className="font-bold text-xs text-white">
                  Objetivos del Balanced Scorecard ({parsedRows.length} objetivos cargados)
                </span>
                <p className="text-[11px] text-slate-400">
                  Verifica o cambia la perspectiva de cada objetivo para ordenar el mapa de causa-efecto.
                </p>
              </div>

              {/* Counts in 4 perspectives */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  Fin: {countFin}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30">
                  Cli: {countCli}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-500/30">
                  Proc: {countProc}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">
                  Apr: {countApr}
                </span>
              </div>
            </div>

            {/* List of Rows */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parsedRows.map((row) => (
                <div
                  key={row.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400 text-[11px]">{row.code}</span>
                      <span className="text-white font-semibold">{row.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>🎯 Origen: <strong className="text-emerald-400">{row.matrixOrigin}</strong></span>
                      <span>Meta: <strong className="text-slate-200">{row.targetAnnual}</strong></span>
                      <span>Presupuesto: <strong className="text-slate-200">${row.estimatedBudgetCOP.toLocaleString('es-CO')}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Perspectiva:</label>
                      <select
                        value={row.perspective}
                        onChange={(e) => handleUpdatePerspective(row.id, e.target.value as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                          row.perspective === 'Financiera'
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                            : row.perspective === 'Clientes'
                            ? 'bg-blue-950/80 text-blue-400 border-blue-500/50'
                            : row.perspective === 'Procesos Internos'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                            : 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                        }`}
                      >
                        <option value="Financiera">Financiera</option>
                        <option value="Clientes">Clientes</option>
                        <option value="Procesos Internos">Procesos Internos</option>
                        <option value="Aprendizaje y Crecimiento">Aprendizaje y Crecimiento</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleRemoveRow(row.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-slate-900 border border-slate-800 mt-4"
                      title="Eliminar de la lista importada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply Button */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Se actualizarán los objetivos del Balanced Scorecard preservando los vínculos causa-efecto correspondientes.
              </span>
              <button
                onClick={handleConfirmApplication}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-950 transition-all hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar al Balanced Scorecard del Proyecto</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
