import React, { useState, useRef } from "react";
import { FileUp, X, CheckCircle2, AlertTriangle, Layers, ArrowRight } from "lucide-react";
import { importLibraryJSON } from "./layoutStorage";
import { useTranslation } from "../../i18n";

interface LibraryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function LibraryImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: LibraryImportModalProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [collisionStrategy, setCollisionStrategy] = useState<"rename" | "overwrite" | "skip">("rename");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<{
    importedCount: number;
    overwrittenCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setSelectedFile(file);

    try {
      const text = await file.text();
      setFileContent(text);
    } catch {
      setError(t("basePlanner.libraryImport.readFileError"));
    }
  };

  const handleExecuteImport = () => {
    if (!fileContent) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = importLibraryJSON(fileContent, collisionStrategy);
      setResult(res);
      onImportComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("basePlanner.libraryImport.genericImportError");
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileContent(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-import-title"
    >
      <div className="bg-[#0b1723] border border-[#1f374e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#182a3a] flex items-center justify-between bg-[#0e1d2c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 id="library-import-title" className="text-sm font-bold text-white">
                {t("basePlanner.libraryImport.title")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t("basePlanner.libraryImport.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={t("basePlanner.libraryImport.closeAria")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {!result ? (
            <>
              {/* File Drop / Select Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-[#1f374e] hover:border-cyan-400/60 rounded-2xl bg-[#07131e] text-center cursor-pointer transition-colors"
              >
                <FileUp className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="font-bold text-slate-200">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t("basePlanner.libraryImport.dropSelectedInfo", { size: (selectedFile.size / 1024).toFixed(1) })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-200">{t("basePlanner.libraryImport.dropPromptTitle")}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t("basePlanner.libraryImport.dropPromptHint")}
                    </p>
                  </div>
                )}
              </div>

              {/* Collision Strategy Options */}
              {fileContent && (
                <div className="space-y-2">
                  <label className="font-bold text-slate-200 block">
                    {t("basePlanner.libraryImport.collisionLabel")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCollisionStrategy("rename")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        collisionStrategy === "rename"
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                          : "bg-[#07131e] border-[#1b2f42] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="font-bold block text-xs">{t("basePlanner.libraryImport.collision.renameTitle")}</span>
                      <span className="text-[10px] text-slate-400">{t("basePlanner.libraryImport.collision.renameHint")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollisionStrategy("overwrite")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        collisionStrategy === "overwrite"
                          ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                          : "bg-[#07131e] border-[#1b2f42] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="font-bold block text-xs">{t("basePlanner.libraryImport.collision.overwriteTitle")}</span>
                      <span className="text-[10px] text-slate-400">{t("basePlanner.libraryImport.collision.overwriteHint")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollisionStrategy("skip")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        collisionStrategy === "skip"
                          ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                          : "bg-[#07131e] border-[#1b2f42] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="font-bold block text-xs">{t("basePlanner.libraryImport.collision.skipTitle")}</span>
                      <span className="text-[10px] text-slate-400">{t("basePlanner.libraryImport.collision.skipHint")}</span>
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            /* Result Summary */
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-xs">{t("basePlanner.libraryImport.resultTitle")}</h4>
                  <ul className="text-[11px] text-emerald-400/90 mt-1 space-y-0.5">
                    <li>• {t("basePlanner.libraryImport.resultImported", { count: result.importedCount })}</li>
                    <li>• {t("basePlanner.libraryImport.resultOverwritten", { count: result.overwrittenCount })}</li>
                    <li>• {t("basePlanner.libraryImport.resultSkipped", { count: result.skippedCount })}</li>
                  </ul>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <p className="font-bold text-[11px] mb-1">{t("basePlanner.libraryImport.warningsTitle")}</p>
                  <ul className="text-[10px] text-amber-400/80 space-y-0.5">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#182a3a] bg-[#07131e] flex justify-end gap-2">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!fileContent || isProcessing}
                onClick={handleExecuteImport}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{isProcessing ? t("basePlanner.libraryImport.processing") : t("basePlanner.libraryImport.executeImport")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors cursor-pointer"
            >
              {t("basePlanner.libraryImport.done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
