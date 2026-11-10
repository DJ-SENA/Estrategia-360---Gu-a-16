import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Download, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { MatrixTypeKey, MATRIX_TITLES, downloadSpecificMatrixTemplate, parseExcelForMatrix } from '../utils/matrixExcelHandlers';
import { GAESProject } from '../types';

interface MatrixExcelUploadBarProps {
  matrixKey: MatrixTypeKey;
  project: GAESProject;
  onUpdateProject: (updated: Partial<GAESProject>) => void;
  onOpenGlobalImportModal: () => void;
}

export const MatrixExcelUploadBar: React.FC<MatrixExcelUploadBarProps> = ({
  matrixKey,
  project,
  onUpdateProject,
  onOpenGlobalImportModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);

    const result = await parseExcelForMatrix(file, matrixKey, project);

    if (result.success) {
      onUpdateProject(result.updatedData);
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }

    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setFeedback(null), 7000);
  };

  const matrixName = MATRIX_TITLES[matrixKey];

  return (
    <div className="space-y-2.5">
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                Vínculo de Cargue Oficial Excel (.xlsx)
              </span>
              <span className="text-xs text-slate-400 font-mono">Compatible con Google Sheets & Excel</span>
            </div>
            <h4 className="text-xs font-bold text-white mt-0.5">
              Gestión Excel Directa: <span className="text-emerald-300">{matrixName}</span>
            </h4>
            <p className="text-[11px] text-slate-300">
              Cargue el archivo de trabajo de su GAES para actualizar automáticamente esta matriz o descargue el formato predeterminado.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          {/* Download specific template button */}
          <button
            type="button"
            onClick={() => downloadSpecificMatrixTemplate(matrixKey, project.company.name)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            title={`Descargar plantilla en Excel con columnas para ${matrixName}`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Descargar Plantilla</span>
          </button>

          {/* Direct Excel file upload link */}
          <label className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950 cursor-pointer transition-all hover:scale-[1.02]">
            <Upload className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Procesando...' : 'Cargar Archivo Excel'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isProcessing}
              onChange={handleFileChange}
            />
          </label>

          {/* Button to open full assistant */}
          <button
            type="button"
            onClick={onOpenGlobalImportModal}
            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            title="Abrir el asistente completo para previsualizar y mapear columnas"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente General</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
