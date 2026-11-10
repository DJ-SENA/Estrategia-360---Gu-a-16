import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Check, 
  X, 
  AlertTriangle, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Info,
  CheckCircle2,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  GAESProject, 
  MEFIItem, 
  MEFEItem, 
  PESTAItem, 
  PEYEAFactor,
  PEYEAMatrix,
  DOFAStrategy 
} from '../types';
import { calculatePEYEACoordinates } from '../utils/strategicCalculations';

interface ExcelMatrixImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: GAESProject;
  onApplyImport: (importedData: {
    mefi: MEFIItem[];
    mefe: MEFEItem[];
    pesta: PESTAItem[];
    peyea: PEYEAMatrix;
  }) => void;
}

export type FactorClassification = 
  | 'Fortaleza'
  | 'Debilidad'
  | 'Oportunidad'
  | 'Amenaza'
  | 'PEYEA_FF'
  | 'PEYEA_VC'
  | 'PEYEA_EA'
  | 'PEYEA_FI'
  | 'PESTA';

export interface ParsedRow {
  id: string;
  originalText: string;
  classification: FactorClassification;
  weight: number;
  rating: number;
  areaOrCategory: string;
  sourceNote?: string;
}

export const ExcelMatrixImportModal: React.FC<ExcelMatrixImportModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyImport,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'archivo' | 'pegar' | 'drive' | 'plantilla'>('archivo');
  const [driveUrl, setDriveUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Download official Excel template for Google Drive
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Instrucciones
    const wsInstruccionesData = [
      ['PLANTILLA OFICIAL SENA - GUÍA 16: MATRICES ESTRATÉGICAS'],
      ['Instrucciones para aprendices del Tecnólogo en Gestión Empresarial:'],
      ['1. Diligencie las filas en la hoja "Factores_Estrategicos".'],
      ['2. En la columna "Tipo_Matriz", elija o escriba: Fortaleza, Debilidad, Oportunidad, Amenaza, PEYEA_FF, PEYEA_VC, PEYEA_EA o PEYEA_FI.'],
      ['3. En "Peso", asigne un valor entre 0.01 y 1.00 (los pesos de Fortalezas + Debilidades deben sumar 1.00, y los de Oportunidades + Amenazas también).'],
      ['4. En "Calificacion", asigne entre 1 y 4 (o escala PEYEA).'],
      ['5. Una vez terminado en su Google Drive, descargue el archivo (.xlsx) y súbalo a la plataforma para validar y construir el Balanced Scorecard.'],
    ];
    const wsInstrucciones = XLSX.utils.aoa_to_sheet(wsInstruccionesData);
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

    // Sheet 2: Factores_Estrategicos
    const wsFactoresData = [
      ['Tipo_Matriz', 'Factor_Estrategico_Descripcion', 'Peso', 'Calificacion', 'Area_o_Dimension', 'Fuente_Evidencia'],
      ['Fortaleza', 'Certificación INVIMA en BPM y altos estándares de calidad.', 0.15, 4, 'Operaciones', 'Diagnóstico Guía 2'],
      ['Fortaleza', 'Alianzas exclusivas con productores locales de materia prima.', 0.15, 4, 'Operaciones', 'Cadena de valor Guía 2'],
      ['Debilidad', 'Capacidad limitada de almacenamiento en frío.', 0.15, 1, 'Operaciones', 'Cuellos de botella Guía 11'],
      ['Debilidad', 'Dependencia comercial en pocos distribuidores mayoristas.', 0.15, 1, 'Mercadeo', 'Estudio de mercado Guía 8'],
      ['Oportunidad', 'Crecimiento de la demanda de alimentos saludables y funcionales.', 0.20, 4, 'Social', 'Tendencias macroentorno Guía 7'],
      ['Oportunidad', 'Líneas de crédito blando institucionales para fomento agroindustrial.', 0.15, 3, 'Económico', 'Finanzas Guía 13'],
      ['Amenaza', 'Entrada de competidores masivos con campañas de bajo costo.', 0.20, 2, 'Económico', 'Benchmarking Guía 9'],
      ['Amenaza', 'Volatilidad en costos de insumos y materiales de empaque.', 0.15, 2, 'Ambiental / Legal', 'Proveedores Guía 11'],
      ['PEYEA_FF', 'Rendimiento sobre la Inversión (ROI) y margen neto.', 0, 4, 'Financiera', 'Estados Financieros Guía 15'],
      ['PEYEA_VC', 'Diferenciación y calidad superior artesanal.', 0, -2, 'Competitiva', 'Marketing Guía 9'],
      ['PEYEA_EA', 'Estabilidad de precios de materias primas.', 0, -3, 'Ambiental', 'Macroentorno Guía 2'],
      ['PEYEA_FI', 'Potencial de crecimiento del sector alimentos funcionales.', 0, 5, 'Industria', 'Investigación Guía 7'],
    ];
    const wsFactores = XLSX.utils.aoa_to_sheet(wsFactoresData);
    XLSX.utils.book_append_sheet(wb, wsFactores, 'Factores_Estrategicos');

    XLSX.writeFile(wb, 'Plantilla_Guia16_Matrices_Estrategicas_SENA.xlsx');
  };

  // Parse Excel file from input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Prefer sheet named 'Factores_Estrategicos' or first sheet
        const sheetName =
          workbook.SheetNames.find((s) => s.toLowerCase().includes('factor') || s.toLowerCase().includes('matriz')) ||
          workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setErrorMessage('El archivo no contiene filas con datos legibles.');
          return;
        }

        processRawImportedData(rawJson);
      } catch (err: any) {
        console.error('Error reading excel:', err);
        setErrorMessage('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'));
      }
    };

    reader.readAsBinaryString(file);
  };

  // Parse pasted clipboard text
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

    // Split by tabs or commas
    const rows: any[] = [];
    lines.forEach((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 1 && parts[0].trim()) {
        rows.push({
          tipo: parts[0]?.trim(),
          factor: parts[1]?.trim() || parts[0]?.trim(),
          peso: parseFloat(parts[2]?.trim()) || 0.1,
          calificacion: parseFloat(parts[3]?.trim()) || 3,
          area: parts[4]?.trim() || 'Operaciones',
        });
      }
    });

    processRawImportedData(rows);
  };

  // Auto-detect fields from raw objects
  const processRawImportedData = (rows: any[]) => {
    const newParsed: ParsedRow[] = [];

    rows.forEach((r, idx) => {
      // Look for columns by various common naming conventions
      const text =
        r.Factor_Estrategico_Descripcion ||
        r.factor ||
        r.Factor ||
        r.Descripcion ||
        r.descripcion ||
        r.Texto ||
        r.texto ||
        r['Factor Crítico'] ||
        r['Nombre'] ||
        Object.values(r)[1] ||
        Object.values(r)[0] ||
        '';

      if (!String(text).trim() || String(text).toLowerCase().includes('factor_estrategico')) return;

      const rawType = String(
        r.Tipo_Matriz ||
        r.tipo ||
        r.Tipo ||
        r.Clasificacion ||
        r.clasificacion ||
        Object.values(r)[0] ||
        ''
      ).toLowerCase();

      let classification: FactorClassification = 'Fortaleza';
      let rating = 3;

      if (rawType.includes('fort') || rawType === 'f') {
        classification = 'Fortaleza';
        rating = 4;
      } else if (rawType.includes('deb') || rawType === 'd') {
        classification = 'Debilidad';
        rating = 2;
      } else if (rawType.includes('opor') || rawType === 'o') {
        classification = 'Oportunidad';
        rating = 4;
      } else if (rawType.includes('amen') || rawType === 'a') {
        classification = 'Amenaza';
        rating = 2;
      } else if (rawType.includes('peyea_ff') || rawType.includes('ff')) {
        classification = 'PEYEA_FF';
        rating = 4;
      } else if (rawType.includes('peyea_vc') || rawType.includes('vc')) {
        classification = 'PEYEA_VC';
        rating = -2;
      } else if (rawType.includes('peyea_ea') || rawType.includes('ea')) {
        classification = 'PEYEA_EA';
        rating = -3;
      } else if (rawType.includes('peyea_fi') || rawType.includes('fi')) {
        classification = 'PEYEA_FI';
        rating = 4;
      } else if (rawType.includes('pesta')) {
        classification = 'PESTA';
      }

      const rawWeight = parseFloat(r.Peso || r.peso || r.Weight || r['Ponderación'] || '0.1') || 0.1;
      const rawRating = parseFloat(r.Calificacion || r.calificacion || r.Rating || r['Calificación']) || rating;
      const area = String(r.Area_o_Dimension || r.area || r.Area || r.Dimension || 'Operaciones');

      newParsed.push({
        id: `parsed-${idx}-${Date.now()}`,
        originalText: String(text).trim(),
        classification,
        weight: rawWeight,
        rating: rawRating,
        areaOrCategory: area,
        sourceNote: 'Importado de Excel / Drive',
      });
    });

    if (newParsed.length === 0) {
      setErrorMessage('No se pudieron extraer factores válidos de las filas seleccionadas.');
      return;
    }

    setParsedRows(newParsed);
    setSuccessNotice(`Se extrajeron ${newParsed.length} factores de su archivo. Revise y escoja la clasificación deseada.`);
  };

  // Modify classification for a specific row
  const handleUpdateRowClassification = (id: string, newClass: FactorClassification) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          let defRating = row.rating;
          if (newClass === 'Fortaleza') defRating = 4;
          if (newClass === 'Debilidad') defRating = 1;
          if (newClass === 'Oportunidad') defRating = 4;
          if (newClass === 'Amenaza') defRating = 2;
          if (newClass === 'PEYEA_FF') defRating = 4;
          if (newClass === 'PEYEA_VC') defRating = -2;
          if (newClass === 'PEYEA_EA') defRating = -3;
          if (newClass === 'PEYEA_FI') defRating = 4;

          return { ...row, classification: newClass, rating: defRating };
        }
        return row;
      })
    );
  };

  // Modify weight for a specific row
  const handleUpdateRowWeight = (id: string, weight: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, weight: Math.max(0, weight) } : r))
    );
  };

  // Modify rating
  const handleUpdateRowRating = (id: string, rating: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating } : r))
    );
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Auto-balance weights for MEFI (Fortalezas + Debilidades) and MEFE (Oportunidades + Amenazas)
  const handleAutoNormalizeWeights = () => {
    const internalRows = parsedRows.filter((r) => r.classification === 'Fortaleza' || r.classification === 'Debilidad');
    const externalRows = parsedRows.filter((r) => r.classification === 'Oportunidad' || r.classification === 'Amenaza');

    const internalWeightEach = internalRows.length > 0 ? Number((1.0 / internalRows.length).toFixed(2)) : 0;
    const externalWeightEach = externalRows.length > 0 ? Number((1.0 / externalRows.length).toFixed(2)) : 0;

    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.classification === 'Fortaleza' || r.classification === 'Debilidad') {
          return { ...r, weight: internalWeightEach };
        }
        if (r.classification === 'Oportunidad' || r.classification === 'Amenaza') {
          return { ...r, weight: externalWeightEach };
        }
        return r;
      })
    );
  };

  // Apply to project matrices
  const handleConfirmApplication = () => {
    const mefiItems: MEFIItem[] = parsedRows
      .filter((r) => r.classification === 'Fortaleza' || r.classification === 'Debilidad')
      .map((r, i) => ({
        id: `mefi-imp-${i}-${Date.now()}`,
        type: r.classification as 'Fortaleza' | 'Debilidad',
        factor: r.originalText,
        weight: r.weight,
        rating: (r.rating as any) || (r.classification === 'Fortaleza' ? 3 : 2),
        weightedScore: Number((r.weight * r.rating).toFixed(2)),
        area: (r.areaOrCategory as any) || 'Operaciones',
        validationStatus: 'Validado',
      }));

    const mefeItems: MEFEItem[] = parsedRows
      .filter((r) => r.classification === 'Oportunidad' || r.classification === 'Amenaza')
      .map((r, i) => ({
        id: `mefe-imp-${i}-${Date.now()}`,
        type: r.classification as 'Oportunidad' | 'Amenaza',
        factor: r.originalText,
        weight: r.weight,
        rating: (r.rating as any) || (r.classification === 'Oportunidad' ? 3 : 2),
        weightedScore: Number((r.weight * r.rating).toFixed(2)),
        pestaCategory: (r.areaOrCategory as any) || 'Económico',
        validationStatus: 'Validado',
      }));

    const pestaItems: PESTAItem[] = parsedRows
      .filter((r) => r.classification === 'PESTA')
      .map((r, i) => ({
        id: `pes-imp-${i}-${Date.now()}`,
        category: (r.areaOrCategory as any) || 'Económico',
        factor: r.originalText,
        impactType: r.rating >= 3 ? 'Oportunidad' : 'Amenaza',
        intensity: 'Alta',
        rationale: 'Importado de Excel / Drive',
        evidenceSource: 'Documento en Drive',
      }));

    // Update PEYEA factors if any were imported
    const newFF = parsedRows.filter((r) => r.classification === 'PEYEA_FF').map((r, i) => ({
      id: `ff-imp-${i}`,
      name: r.originalText,
      score: r.rating,
    }));
    const newVC = parsedRows.filter((r) => r.classification === 'PEYEA_VC').map((r, i) => ({
      id: `vc-imp-${i}`,
      name: r.originalText,
      score: r.rating,
    }));
    const newEA = parsedRows.filter((r) => r.classification === 'PEYEA_EA').map((r, i) => ({
      id: `ea-imp-${i}`,
      name: r.originalText,
      score: r.rating,
    }));
    const newFI = parsedRows.filter((r) => r.classification === 'PEYEA_FI').map((r, i) => ({
      id: `fi-imp-${i}`,
      name: r.originalText,
      score: r.rating,
    }));

    const updatedPeyea = calculatePEYEACoordinates({
      financialStrength: newFF.length > 0 ? newFF : project.peyea.financialStrength,
      competitiveAdvantage: newVC.length > 0 ? newVC : project.peyea.competitiveAdvantage,
      environmentalStability: newEA.length > 0 ? newEA : project.peyea.environmentalStability,
      industryStrength: newFI.length > 0 ? newFI : project.peyea.industryStrength,
      avgFF: project.peyea.avgFF,
      avgVC: project.peyea.avgVC,
      avgEA: project.peyea.avgEA,
      avgFI: project.peyea.avgFI,
      coordinateX: project.peyea.coordinateX,
      coordinateY: project.peyea.coordinateY,
      quadrant: project.peyea.quadrant,
      interpretation: project.peyea.interpretation,
    });

    onApplyImport({
      mefi: mefiItems.length > 0 ? mefiItems : project.mefi,
      mefe: mefeItems.length > 0 ? mefeItems : project.mefe,
      pesta: pestaItems.length > 0 ? pestaItems : project.pesta,
      peyea: updatedPeyea,
    });

    onClose();
  };

  // Counts
  const countMefi = parsedRows.filter((r) => r.classification === 'Fortaleza' || r.classification === 'Debilidad').length;
  const countMefe = parsedRows.filter((r) => r.classification === 'Oportunidad' || r.classification === 'Amenaza').length;
  const countPeyea = parsedRows.filter((r) => r.classification.startsWith('PEYEA_')).length;

  const sumMefiWeight = Number(
    parsedRows
      .filter((r) => r.classification === 'Fortaleza' || r.classification === 'Debilidad')
      .reduce((a, b) => a + b.weight, 0)
      .toFixed(2)
  );

  const sumMefeWeight = Number(
    parsedRows
      .filter((r) => r.classification === 'Oportunidad' || r.classification === 'Amenaza')
      .reduce((a, b) => a + b.weight, 0)
      .toFixed(2)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-xs text-slate-200 relative my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Importación & Clasificación Excel / Drive
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Guía 16 SENA</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Cargar Datos del Excel de Drive & Clasificar Factores Estratégicos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                Sube tu archivo elaborado en Google Drive, clasifica cada factor (Fortaleza, Debilidad, Oportunidad, Amenaza o PEYEA) y valida las sumatorias para desbloquear el paso al Balanced Scorecard.
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

        {/* Action Tabs: Upload File / Paste / Drive / Template */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('archivo')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all border ${
              activeTab === 'archivo'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
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
            onClick={handleDownloadTemplate}
            className="ml-auto flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1.5 rounded-xl font-semibold transition-colors"
            title="Descargar plantilla Excel modelo para subir a su Google Drive"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Plantilla Excel SENA</span>
          </button>
        </div>

        {/* Tab 1: Subir Archivo */}
        {activeTab === 'archivo' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">
                Selecciona tu archivo de matrices descargado de Google Drive
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Formatos compatibles: <strong>.xlsx, .xls o .csv</strong>. El sistema leerá automáticamente las columnas y te permitirá clasificar cada factor.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-950 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Explorar Archivo Excel en mi Equipo</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Tab 2: Pegar Celdas */}
        {activeTab === 'pegar' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-white block">
              Copia las filas en tu Excel de Google Drive (Ctrl + C) y pégalas aquí:
            </span>
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Ejemplo:
Fortaleza	Certificación INVIMA BPM en planta	0.15	4	Operaciones
Debilidad	Capacidad limitada de frío en cavas	0.15	1	Operaciones
Oportunidad	Auge de demanda en productos fitness	0.20	4	Social"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessPastedText}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Procesar Celdas Pegadas</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Enlace Drive */}
        {activeTab === 'drive' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs text-white block">
              Pegar enlace del archivo en Google Drive:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => {
                  if (!driveUrl) return;
                  setSuccessNotice('Enlace de Google Drive registrado. Para mayor compatibilidad offline, asegúrate de que el archivo tenga permiso de lectura o descárgalo como .xlsx.');
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Vincular Drive
              </button>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <strong>💡 Consejo pedagógico:</strong> En Google Sheets o Excel en Drive, ve a <em>Archivo ➔ Descargar ➔ Microsoft Excel (.xlsx)</em> y usa la opción 1 para cargarlo en 1 segundo con validación completa.
            </div>
          </div>
        )}

        {/* Notifications / Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Parsed Rows Classifier Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800 p-3 rounded-2xl border border-slate-700">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-white">
                  Clasificador de Factores ({parsedRows.length} ítems cargados)
                </span>
                <p className="text-[11px] text-slate-400">
                  Usa el selector desplegable para asignar si cada ítem es Fortaleza, Debilidad, Oportunidad, Amenaza o PEYEA.
                </p>
              </div>

              {/* Status and auto-normalize */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleAutoNormalizeWeights}
                  className="bg-slate-700 hover:bg-slate-600 text-emerald-300 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                  title="Ajustar pesos para que MEFI sume 1.00 y MEFE sume 1.00"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Auto-calibrar Pesos a 1.00</span>
                </button>
              </div>
            </div>

            {/* Sums Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Factores Internos (MEFI)</span>
                <span className="text-emerald-400 font-bold">{countMefi} ítems</span>
                <span className={`block text-[10px] ${Math.abs(sumMefiWeight - 1.0) < 0.02 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Pesos: {sumMefiWeight} / 1.00
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Factores Externos (MEFE)</span>
                <span className="text-blue-400 font-bold">{countMefe} ítems</span>
                <span className={`block text-[10px] ${Math.abs(sumMefeWeight - 1.0) < 0.02 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Pesos: {sumMefeWeight} / 1.00
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Factores PEYEA</span>
                <span className="text-purple-400 font-bold">{countPeyea} ítems</span>
                <span className="text-slate-400 text-[10px] block font-sans">FF, VC, EA, FI</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Estado de Validación</span>
                <span className={`font-bold block ${Math.abs(sumMefiWeight - 1.0) < 0.02 && Math.abs(sumMefeWeight - 1.0) < 0.02 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {Math.abs(sumMefiWeight - 1.0) < 0.02 && Math.abs(sumMefeWeight - 1.0) < 0.02 ? '✓ Listo para BSC' : 'Ajustar Pesos'}
                </span>
              </div>
            </div>

            {/* Editable List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parsedRows.map((row) => (
                <div
                  key={row.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  {/* Factor description */}
                  <div className="flex-1 truncate space-y-1">
                    <span className="font-semibold text-white block truncate">{row.originalText}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Área: {row.areaOrCategory}</span>
                  </div>

                  {/* Classification Dropdown */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Clasificación:</label>
                      <select
                        value={row.classification}
                        onChange={(e) => handleUpdateRowClassification(row.id, e.target.value as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                          row.classification === 'Fortaleza'
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                            : row.classification === 'Debilidad'
                            ? 'bg-rose-950/80 text-rose-400 border-rose-500/50'
                            : row.classification === 'Oportunidad'
                            ? 'bg-blue-950/80 text-blue-400 border-blue-500/50'
                            : row.classification === 'Amenaza'
                            ? 'bg-amber-950/80 text-amber-400 border-amber-500/50'
                            : 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                        }`}
                      >
                        <option value="Fortaleza">Fortaleza (MEFI / DOFA FO/FA)</option>
                        <option value="Debilidad">Debilidad (MEFI / DOFA DO/DA)</option>
                        <option value="Oportunidad">Oportunidad (MEFE / DOFA FO/DO)</option>
                        <option value="Amenaza">Amenaza (MEFE / DOFA FA/DA)</option>
                        <option value="PEYEA_FF">PEYEA: Fuerza Financiera (+1 a +6)</option>
                        <option value="PEYEA_VC">PEYEA: Ventaja Competitiva (-6 a -1)</option>
                        <option value="PEYEA_EA">PEYEA: Estabilidad Ambiental (-6 a -1)</option>
                        <option value="PEYEA_FI">PEYEA: Fuerza de la Industria (+1 a +6)</option>
                        <option value="PESTA">Factor PESTA Macroentorno</option>
                      </select>
                    </div>

                    {/* Weight Input (for MEFI / MEFE) */}
                    {(row.classification === 'Fortaleza' ||
                      row.classification === 'Debilidad' ||
                      row.classification === 'Oportunidad' ||
                      row.classification === 'Amenaza') && (
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Peso (0-1):</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1"
                          value={row.weight}
                          onChange={(e) => handleUpdateRowWeight(row.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center font-mono font-bold text-emerald-400 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Rating Input */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Calificación:</label>
                      <input
                        type="number"
                        step="1"
                        value={row.rating}
                        onChange={(e) => handleUpdateRowRating(row.id, parseFloat(e.target.value) || 0)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-center font-mono font-bold text-white focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveRow(row.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 mt-3"
                      title="Quitar fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleConfirmApplication}
              disabled={parsedRows.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Aplicar Factores a Matrices Guía 16 & Validar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
