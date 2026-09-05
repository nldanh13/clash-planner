import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Castle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Dice5,
  Hammer,
  HelpCircle,
  LayoutTemplate,
  Palette,
  RefreshCw,
  Scale,
  Sparkles,
  Square,
  Swords,
  Trophy,
  Wheat,
  X,
} from "lucide-react";
import type { BasePurpose, CreationMethod, LayoutProject, PlacedBuilding } from "./types";
import {
  generateUniqueBlueprintName,
  hasPresetForTownHall,
  isLayoutNameDuplicate,
  normalizeLayoutName,
  PATTERN_LABELS,
  PURPOSE_LABELS,
  PURPOSE_LABELS_EN,
} from "./blueprintUtils";
import { createNewLayout, getSavedLayouts } from "./layoutStorage";
import { getPresetLayout } from "./ExportUtils";
import {
  generateBase,
  type AestheticPattern,
  type GeneratedBaseResult,
  STRATEGY_PROFILES,
} from "./generator";
import { getTownHallRequirements } from "./catalog";
import { GRID_SIZE } from "./constants";
import { validateLayout } from "./LayoutValidator";
import { useTranslation } from "../../i18n";

interface NewBlueprintWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (layout: LayoutProject) => void;
  initialTownHall?: number;
}

export function NewBlueprintWizardModal({
  isOpen,
  onClose,
  onCreated,
  initialTownHall = 11,
}: NewBlueprintWizardModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [townHallLevel, setTownHallLevel] = useState<number>(initialTownHall);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>("auto");
  const [purpose, setPurpose] = useState<BasePurpose>("war");
  const [pattern, setPattern] = useState<AestheticPattern>("diamond");
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [showAdvancedSeed, setShowAdvancedSeed] = useState<boolean>(false);

  // Name State
  const [customName, setCustomName] = useState<string>("");
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState<boolean>(false);

  // Generator result cache & error handling
  const [generatedResult, setGeneratedResult] = useState<GeneratedBaseResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Cancel Confirmation Dialog State
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTownHallLevel(Math.max(1, Math.min(18, initialTownHall || 11)));
      setCreationMethod("auto");
      setPurpose("war");
      setPattern("diamond");
      const initialSeed = Math.floor(Math.random() * 1000000);
      setSeed(initialSeed);
      setShowAdvancedSeed(false);
      setCustomName("");
      setHasManuallyEditedName(false);
      setGenerationError(null);
      setCreationError(null);
      setShowCancelConfirm(false);
    }
  }, [isOpen, initialTownHall]);

  // Saved layouts list for duplicate checking
  const savedLayouts = useMemo(() => {
    if (!isOpen) return [];
    return getSavedLayouts();
  }, [isOpen, step]);

  // Check if template is available for selected town hall
  const templateAvailable = useMemo(() => {
    return hasPresetForTownHall(townHallLevel);
  }, [townHallLevel]);

  // If town hall changed and template is no longer available, switch to auto
  useEffect(() => {
    if (creationMethod === "template" && !templateAvailable) {
      setCreationMethod("auto");
    }
  }, [townHallLevel, templateAvailable, creationMethod]);

  // Suggested Unique Name based on selections
  const suggestedName = useMemo(() => {
    return generateUniqueBlueprintName(
      {
        townHallLevel,
        purpose,
        method: creationMethod,
        pattern: purpose === "showcase" ? pattern : undefined,
      },
      savedLayouts
    );
  }, [townHallLevel, purpose, creationMethod, pattern, savedLayouts]);

  // Update input with suggested name when not manually edited
  useEffect(() => {
    if (!hasManuallyEditedName) {
      setCustomName(suggestedName);
    }
  }, [suggestedName, hasManuallyEditedName]);

  // Name Validation: separate empty vs duplicate
  const cleanName = normalizeLayoutName(customName);
  const isNameEmpty = cleanName.length === 0;
  const isNameDuplicate = !isNameEmpty && isLayoutNameDuplicate(cleanName, savedLayouts);

  // Check if dirty (user made changes)
  const isDirty = useMemo(() => {
    return (
      step > 1 ||
      townHallLevel !== initialTownHall ||
      creationMethod !== "auto" ||
      purpose !== "war" ||
      hasManuallyEditedName
    );
  }, [step, townHallLevel, initialTownHall, creationMethod, purpose, hasManuallyEditedName]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  // Base generation for auto method
  useEffect(() => {
    if (!isOpen || creationMethod !== "auto") return;
    setIsGenerating(true);
    setGenerationError(null);

    let isMounted = true;
    const timer = setTimeout(() => {
      try {
        const res = generateBase({
          townHallLevel,
          purpose,
          pattern: purpose === "showcase" ? pattern : undefined,
          seed,
        });

        if (isMounted) {
          if (!res || !res.buildings || res.buildings.length === 0) {
            setGenerationError(t("basePlanner.wizard.errors.generationEmpty"));
            setGeneratedResult(null);
          } else {
            setGeneratedResult(res);
            setGenerationError(null);
          }
          setIsGenerating(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setGenerationError(err?.message || t("basePlanner.wizard.errors.generationGeneric"));
          setGeneratedResult(null);
          setIsGenerating(false);
        }
      }
    }, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, townHallLevel, creationMethod, purpose, pattern, seed]);

  // Draw preview canvas
  useEffect(() => {
    if (!canvasRef.current || creationMethod !== "auto") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const scale = size / GRID_SIZE;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, size, size);

    if (!generatedResult || !generatedResult.buildings) return;

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i * scale, 0);
      ctx.lineTo(i * scale, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * scale);
      ctx.lineTo(size, i * scale);
      ctx.stroke();
    }

    // Walls
    ctx.fillStyle = "#cbd5e1";
    for (const b of generatedResult.buildings) {
      if (b.buildingId === "wall") {
        ctx.fillRect(b.x * scale + 0.5, b.y * scale + 0.5, scale - 1, scale - 1);
      }
    }

    // Traps
    ctx.fillStyle = "#eab308";
    for (const b of generatedResult.buildings) {
      if (
        b.buildingId.includes("trap") ||
        b.buildingId.includes("bomb") ||
        b.buildingId.includes("mine")
      ) {
        const w = b.buildingId === "giant-bomb" || b.buildingId === "giga-bomb" ? 2 : 1;
        ctx.fillRect(b.x * scale + 0.5, b.y * scale + 0.5, w * scale - 1, w * scale - 1);
      }
    }

    // Defenses & Core
    for (const b of generatedResult.buildings) {
      if (
        b.buildingId === "wall" ||
        b.buildingId.includes("trap") ||
        b.buildingId.includes("bomb") ||
        b.buildingId.includes("mine")
      )
        continue;

      let fill = "#38bdf8";
      let w = 3;

      if (b.buildingId === "town-hall") {
        fill = "#f97316";
        w = 4;
      } else if (b.buildingId === "eagle-artillery") {
        fill = "#ef4444";
        w = 4;
      } else if (b.buildingId === "hero-hall") {
        fill = "#a855f7";
        w = 4;
      } else if (b.buildingId === "clan-castle") {
        fill = "#06b6d4";
        w = 3;
      } else if (b.buildingId.includes("inferno") || b.buildingId === "monolith") {
        fill = "#f43f5e";
        w = 3;
      } else if (b.buildingId.includes("xbow") || b.buildingId.includes("scattershot")) {
        fill = "#ec4899";
        w = 3;
      } else if (b.buildingId.includes("storage")) {
        fill = "#eab308";
        w = 3;
      } else if (b.buildingId === "army-camp") {
        fill = "#10b981";
        w = 4;
      } else if (
        b.buildingId === "builder-hut" ||
        b.buildingId === "helper-hut" ||
        b.buildingId === "hero-banner"
      ) {
        fill = "#64748b";
        w = 2;
      }

      ctx.fillStyle = fill;
      ctx.fillRect(b.x * scale + 0.5, b.y * scale + 0.5, w * scale - 1, w * scale - 1);
    }
  }, [generatedResult, creationMethod, step]);

  if (!isOpen) return null;

  // Compute requirements directly from catalog source of truth (Mục 6)
  const reqs = getTownHallRequirements(townHallLevel);
  // Total objects is explicitly sum of buildings + traps + walls
  const totalObjectsCount = reqs.buildings + reqs.traps + reqs.walls;

  // Submit Handler: "Tạo và lưu"
  const handleCreateAndSave = () => {
    setCreationError(null);
    const finalName = normalizeLayoutName(customName);
    if (!finalName) {
      setCreationError(t("basePlanner.wizard.errors.nameRequired"));
      return;
    }

    if (isLayoutNameDuplicate(finalName, savedLayouts)) {
      setCreationError(t("basePlanner.wizard.errors.nameDuplicate"));
      return;
    }

    let buildingsToSave: PlacedBuilding[] = [];

    if (creationMethod === "auto") {
      if (generationError || !generatedResult || !generatedResult.success) {
        setCreationError(t("basePlanner.wizard.errors.generationIncomplete"));
        return;
      }
      buildingsToSave = generatedResult.buildings;
    } else if (creationMethod === "template") {
      buildingsToSave = getPresetLayout(townHallLevel);
    } else {
      // blank map
      buildingsToSave = [];
    }

    // Strict validation
    const validation = validateLayout(buildingsToSave, townHallLevel);
    if (validation.hasCriticals) {
      const msgs = validation.issues.filter((i) => i.type === "critical").map((i) => i.message);
      setCreationError(`${t("basePlanner.wizard.errors.validationFailedPrefix")}\n${msgs.join("\n")}`);
      return;
    }

    // Create & persist layout
    const created = createNewLayout({
      name: finalName,
      townHallLevel,
      purpose,
      creationMethod,
      status: creationMethod === "blank" ? "draft" : validation.hasWarnings ? "warning" : "valid",
      pattern: purpose === "showcase" ? pattern : undefined,
      seed: creationMethod === "auto" ? String(seed) : undefined,
      buildings: validation.sanitizedBuildings,
    });

    onCreated(created);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="w-full max-w-2xl bg-[#0b1622] border border-[#23384c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#1b2b3a] bg-[#071018]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="wizard-title"
                className="text-xs sm:text-sm font-black text-white tracking-wide uppercase"
              >
                {t("basePlanner.wizard.title")}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t("basePlanner.wizard.stepPrefix", { step })}{" "}
                {step === 1 && t("basePlanner.wizard.stepLabels.step1")}
                {step === 2 && t("basePlanner.wizard.stepLabels.step2")}
                {step === 3 && t("basePlanner.wizard.stepLabels.step3")}
                {step === 4 && t("basePlanner.wizard.stepLabels.step4")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={t("basePlanner.wizard.closeTitle")}
            aria-label={t("basePlanner.wizard.closeTitle")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 h-1 bg-[#142330]">
          <div className={`h-full ${step >= 1 ? "bg-amber-400" : "bg-transparent"}`} />
          <div className={`h-full ${step >= 2 ? "bg-amber-400" : "bg-transparent"}`} />
          <div className={`h-full ${step >= 3 ? "bg-amber-400" : "bg-transparent"}`} />
          <div className={`h-full ${step >= 4 ? "bg-amber-400" : "bg-transparent"}`} />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* STEP 1: CHỌN TOWN HALL (Mục 6) */}
          {step === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    {t("basePlanner.wizard.step1.title")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("basePlanner.wizard.step1.description")}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                  TH{townHallLevel}
                </div>
              </div>

              {/* TH Selector: 3 to 4 columns on mobile, 6 on desktop, min-h 44px (Mục 6) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => {
                  const isSelected = townHallLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTownHallLevel(lvl)}
                      className={`min-h-[44px] h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-105 border-2 border-amber-300"
                          : "bg-[#0d1c28] border border-[#23384c] text-slate-300 hover:bg-[#14293a] hover:text-white"
                      }`}
                      aria-label={t("basePlanner.wizard.step1.selectAria", { level: lvl })}
                    >
                      <Castle className="w-3.5 h-3.5" />
                      <span>TH{lvl}</span>
                    </button>
                  );
                })}
              </div>

              {/* Requirement Summary Box: Dinamically calculated from single catalog source (Mục 6) */}
              <div className="p-3.5 rounded-xl bg-[#08121a] border border-[#1d3042] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("basePlanner.wizard.step1.summaryTitle", { th: townHallLevel })}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {t("basePlanner.wizard.step1.totalObjects", { count: totalObjectsCount })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#0e1f2d]">
                    <div className="text-[10px] text-slate-400">{t("basePlanner.wizard.step1.buildings")}</div>
                    <div className="font-bold text-white">{reqs.buildings}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0e1f2d]">
                    <div className="text-[10px] text-slate-400">{t("basePlanner.wizard.step1.traps")}</div>
                    <div className="font-bold text-amber-400">{reqs.traps}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0e1f2d]">
                    <div className="text-[10px] text-slate-400">{t("basePlanner.wizard.step1.walls")}</div>
                    <div className="font-bold text-cyan-400">{reqs.walls}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0e1f2d]">
                    <div className="text-[10px] text-slate-400">{t("basePlanner.wizard.step1.totalObjectsLabel")}</div>
                    <div className="font-black text-emerald-400">{totalObjectsCount}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHỌN CÁCH KHỞI TẠO (Mục 7) */}
          {step === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {t("basePlanner.wizard.step2.title")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("basePlanner.wizard.step2.description", { th: townHallLevel })}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1. Auto Generate */}
                <button
                  type="button"
                  onClick={() => setCreationMethod("auto")}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    creationMethod === "auto"
                      ? "bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/40"
                      : "bg-[#0c1925] border-[#22374b] hover:border-[#35516b] text-slate-300"
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-white">{t("basePlanner.wizard.step2.auto.title")}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        {t("basePlanner.wizard.step2.auto.badge")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t("basePlanner.wizard.step2.auto.description", { walls: reqs.walls })}
                    </p>
                  </div>
                </button>

                {/* 2. Preset Template (Mục 7: disable if not available) */}
                <button
                  type="button"
                  disabled={!templateAvailable}
                  onClick={() => {
                    if (templateAvailable) setCreationMethod("template");
                  }}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all ${
                    !templateAvailable
                      ? "bg-[#091118]/60 border-[#1a2937] opacity-60 cursor-not-allowed text-slate-500"
                      : creationMethod === "template"
                      ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/40 cursor-pointer text-slate-200"
                      : "bg-[#0c1925] border-[#22374b] hover:border-[#35516b] text-slate-300 cursor-pointer"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      templateAvailable
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-white">{t("basePlanner.wizard.step2.template.title")}</strong>
                      {!templateAvailable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium">
                          {t("basePlanner.wizard.step2.template.unavailableBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {templateAvailable
                        ? t("basePlanner.wizard.step2.template.descriptionAvailable", { th: townHallLevel })
                        : t("basePlanner.wizard.step2.template.descriptionUnavailable", { th: townHallLevel })}
                    </p>
                  </div>
                </button>

                {/* 3. Blank Board (Mục 7: Draft status) */}
                <button
                  type="button"
                  onClick={() => setCreationMethod("blank")}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    creationMethod === "blank"
                      ? "bg-gradient-to-r from-purple-500/15 to-indigo-500/10 border-purple-500/60 shadow-md ring-1 ring-purple-500/40"
                      : "bg-[#0c1925] border-[#22374b] hover:border-[#35516b] text-slate-300"
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                    <Square className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-white">{t("basePlanner.wizard.step2.blank.title")}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        {t("basePlanner.wizard.step2.blank.badge")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t("basePlanner.wizard.step2.blank.description")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHỌN LOẠI BASE & MỤC ĐÍCH (Mục 8 & 10 & 11) */}
          {step === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {t("basePlanner.wizard.step3.title")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("basePlanner.wizard.step3.description")}
                </p>
              </div>

              {/* Purpose Grid with strict Vietnamese labels (Mục 8) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    { id: "war", icon: Swords, color: "from-red-500/20 to-rose-600/20 border-rose-500/40 text-rose-300" },
                    { id: "trophy", icon: Trophy, color: "from-amber-500/20 to-yellow-600/20 border-amber-500/40 text-amber-300" },
                    { id: "farming", icon: Wheat, color: "from-emerald-500/20 to-green-600/20 border-emerald-500/40 text-emerald-300" },
                    { id: "hybrid", icon: Scale, color: "from-blue-500/20 to-cyan-600/20 border-blue-500/40 text-blue-300" },
                    { id: "progress", icon: Hammer, color: "from-purple-500/20 to-indigo-600/20 border-purple-500/40 text-purple-300" },
                    { id: "showcase", icon: Palette, color: "from-pink-500/20 to-fuchsia-600/20 border-pink-500/40 text-pink-300" },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isSelected = purpose === item.id;
                  const purposeCopy = t(
                    `basePlanner.wizard.step3.purposes.${item.id}.label` as const
                  );
                  const purposeDesc = t(
                    `basePlanner.wizard.step3.purposes.${item.id}.desc` as const
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPurpose(item.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? `bg-gradient-to-br ${item.color} font-bold shadow-md ring-1 ring-amber-400/40 scale-[1.02]`
                          : "bg-[#0d1a26] border-[#223647] hover:bg-[#132536] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4" />
                          <span className="text-xs font-black">{purposeCopy}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {purposeDesc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Showcase Pattern Selection */}
              {purpose === "showcase" && (
                <div className="p-3 rounded-xl bg-[#09141e] border border-pink-500/30 flex flex-col gap-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-pink-400">
                    {t("basePlanner.wizard.step3.patternLabel")}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: "diamond", key: "diamond" },
                        { id: "shield", key: "shield" },
                        { id: "heart", key: "heart" },
                        { id: "spiral", key: "spiral" },
                        { id: "symmetric-axial", key: "symmetricAxial" },
                        { id: "crest", key: "crest" },
                        { id: "radial", key: "radial" },
                        { id: "letter", key: "letter" },
                      ] as const
                    ).map((p) => {
                      const isSelected = pattern === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPattern(p.id as AestheticPattern)}
                          className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? "bg-pink-500/20 border-pink-500 text-pink-200"
                              : "bg-[#0b1824] border-[#1d3042] text-slate-400 hover:text-white"
                          }`}
                        >
                          {t(`basePlanner.wizard.step3.patterns.${p.key}` as const)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mini Preview Box for Auto Generation */}
              {creationMethod === "auto" && (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-xl bg-[#08121a] border border-[#1c2e3e]">
                    <div className="sm:col-span-8 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{t("basePlanner.wizard.step3.previewTitle")}</span>
                        {isGenerating ? (
                          <span className="text-[10px] text-cyan-400 flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> {t("basePlanner.wizard.step3.calculating")}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">{t("basePlanner.wizard.step3.ready")}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {STRATEGY_PROFILES[purpose]?.description ||
                          t("basePlanner.wizard.step3.defaultDescription")}
                      </p>
                    </div>

                    <div className="sm:col-span-4 flex flex-col items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        width={110}
                        height={110}
                        className="rounded-lg border border-[#23384c] bg-slate-950 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* ERROR RECOVERY BANNER FOR GENERATOR (Mục 11) */}
                  {generationError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-bold">{t("basePlanner.wizard.step3.errorTitle")}</span>
                      </div>
                      <p className="text-[11px] text-rose-300 pl-6">
                        {generationError} {t("basePlanner.wizard.step3.errorHint")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pl-6 pt-1">
                        <button
                          type="button"
                          onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                          className="px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Dice5 className="w-3.5 h-3.5" />
                          <span>{t("basePlanner.wizard.step3.regenerate")}</span>
                        </button>
                        {templateAvailable && (
                          <button
                            type="button"
                            onClick={() => setCreationMethod("template")}
                            className="px-2.5 py-1 rounded-lg bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <LayoutTemplate className="w-3.5 h-3.5" />
                            <span>{t("basePlanner.wizard.step3.switchToTemplate")}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCreationMethod("blank")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>{t("basePlanner.wizard.step3.switchToBlank")}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COLLAPSIBLE ADVANCED SEED OPTION (Mục 10) */}
                  <div className="border border-[#182a3c] rounded-xl overflow-hidden bg-[#091522]">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSeed(!showAdvancedSeed)}
                      className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <span>{t("basePlanner.wizard.step3.advancedToggle")}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {t("basePlanner.wizard.step3.advancedHint")}
                        </span>
                      </span>
                      {showAdvancedSeed ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showAdvancedSeed && (
                      <div className="p-3 border-t border-[#182a3c] flex flex-col gap-2 bg-[#060e17]">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-400">
                            {t("basePlanner.wizard.step3.seedLabel")}
                          </label>
                          <button
                            type="button"
                            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Dice5 className="w-3.5 h-3.5" />
                            <span>{t("basePlanner.wizard.step3.seedRandomize")}</span>
                          </button>
                        </div>
                        <input
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                          className="px-3 py-1.5 bg-[#0b1622] border border-[#233b52] rounded-lg text-xs font-mono text-cyan-300 outline-none w-full"
                          placeholder={t("basePlanner.wizard.step3.seedPlaceholder")}
                        />
                        <p className="text-[10px] text-slate-500">
                          {t("basePlanner.wizard.step3.seedHint")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: ĐẶT TÊN & HOÀN TẤT (Mục 9) */}
          {step === 4 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {t("basePlanner.wizard.step4.title")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("basePlanner.wizard.step4.description")}
                </p>
              </div>

              {/* Name Input Container */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {t("basePlanner.wizard.step4.nameLabel")}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setHasManuallyEditedName(true);
                    setCreationError(null);
                  }}
                  placeholder={t("basePlanner.wizard.step4.namePlaceholder")}
                  className={`w-full px-4 py-2.5 bg-[#0a1723] border rounded-xl text-xs font-bold text-white outline-none transition-all ${
                    isNameDuplicate
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/30"
                      : isNameEmpty
                      ? "border-[#22394e] focus:border-cyan-400"
                      : "border-cyan-500/50 focus:border-cyan-400 shadow-sm"
                  }`}
                />

                {/* Validation messages (Mục 9) */}
                {isNameEmpty ? (
                  <div className="text-[11px] text-amber-400/90 flex items-center justify-between gap-2 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t("basePlanner.wizard.step4.nameEmpty")}</span>
                    </span>
                    {suggestedName && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName(suggestedName);
                          setHasManuallyEditedName(false);
                          setCreationError(null);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] cursor-pointer"
                      >
                        {t("basePlanner.wizard.step4.useSuggested")}
                      </button>
                    )}
                  </div>
                ) : isNameDuplicate ? (
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{t("basePlanner.wizard.step4.nameDuplicate")}</span>
                    </div>
                    {suggestedName && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName(suggestedName);
                          setHasManuallyEditedName(false);
                          setCreationError(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-[11px] font-bold text-rose-100 transition-colors shrink-0 cursor-pointer"
                      >
                        {t("basePlanner.wizard.step4.useSuggested")}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-[#091520] border border-[#1e3347] flex flex-col gap-2.5 text-xs">
                <strong className="text-slate-300 text-[11px] font-black uppercase tracking-wider">
                  {t("basePlanner.wizard.step4.summaryTitle")}
                </strong>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t("basePlanner.wizard.step4.townHallLabel")}</span>
                    <span className="font-bold text-amber-400">TH{townHallLevel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t("basePlanner.wizard.step4.purposeLabel")}</span>
                    <span className="font-bold text-white">
                      {PURPOSE_LABELS[purpose] || purpose}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t("basePlanner.wizard.step4.creationLabel")}</span>
                    <span className="font-bold text-cyan-400">
                      {creationMethod === "auto" && t("basePlanner.wizard.step4.creationAuto")}
                      {creationMethod === "template" && t("basePlanner.wizard.step4.creationTemplate")}
                      {creationMethod === "blank" && t("basePlanner.wizard.step4.creationBlank")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{t("basePlanner.wizard.step4.totalObjectsLabel")}</span>
                    <span className="font-bold text-emerald-400">
                      {creationMethod === "blank" ? t("basePlanner.wizard.step4.totalObjectsBlank") : t("basePlanner.wizard.step4.totalObjectsValue", { count: totalObjectsCount })}
                    </span>
                  </div>
                </div>
              </div>

              {/* General Creation Error if any */}
              {creationError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs">
                  {creationError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Quay lại / Tiếp tục / Tạo và lưu) */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-[#1b2b3a] bg-[#071018] flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                className="px-3.5 py-1.5 rounded-xl bg-[#142636] hover:bg-[#1d354b] text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t("basePlanner.wizard.footer.back")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {t("basePlanner.wizard.footer.cancel")}
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                disabled={step === 3 && creationMethod === "auto" && Boolean(generationError)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                  step === 3 && creationMethod === "auto" && Boolean(generationError)
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 shadow-amber-500/20"
                }`}
              >
                <span>{t("basePlanner.wizard.footer.next")}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateAndSave}
                disabled={isNameEmpty || isNameDuplicate}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                  isNameEmpty || isNameDuplicate
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 text-slate-950 shadow-emerald-500/20 scale-105"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{t("basePlanner.wizard.footer.createAndSave")}</span>
              </button>
            )}
          </div>
        </div>

        {/* CANCEL CONFIRMATION DIALOG (Mục 5) */}
        {showCancelConfirm && (
          <div
            className="absolute inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            role="alertdialog"
            aria-labelledby="cancel-confirm-title"
          >
            <div className="bg-[#0f2130] border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 id="cancel-confirm-title" className="text-sm font-bold text-white">
                  {t("basePlanner.wizard.cancelConfirm.title")}
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("basePlanner.wizard.cancelConfirm.description")}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  {t("basePlanner.wizard.cancelConfirm.continue")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  {t("basePlanner.wizard.cancelConfirm.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewBlueprintWizardModal;
