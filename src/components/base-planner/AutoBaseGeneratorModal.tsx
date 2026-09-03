import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Swords,
  Trophy,
  Wheat,
  Scale,
  Hammer,
  Palette,
  Dice5,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  X,
  Shield,
  Layers,
  Zap,
  Check,
  ChevronRight,
} from "lucide-react";
import type { PlacedBuilding } from "./types";
import {
  generateBase,
  type BasePurpose,
  type AestheticPattern,
  type GeneratedBaseResult,
  STRATEGY_PROFILES,
  AESTHETIC_PATTERNS,
} from "./generator";
import { getTownHallRequirements } from "./catalog";
import { GRID_SIZE } from "./constants";

interface AutoBaseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTownHall: number;
  currentBuildingsCount: number;
  onApplyLayout: (newBuildings: PlacedBuilding[], newTownHall: number) => void;
}

export const AutoBaseGeneratorModal: React.FC<AutoBaseGeneratorModalProps> = ({
  isOpen,
  onClose,
  currentTownHall,
  currentBuildingsCount,
  onApplyLayout,
}) => {
  const [townHallLevel, setTownHallLevel] = useState<number>(currentTownHall || 11);
  const [purpose, setPurpose] = useState<BasePurpose>("war");
  const [pattern, setPattern] = useState<AestheticPattern>("diamond");
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [generatedResult, setGeneratedResult] = useState<GeneratedBaseResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync with current TH when modal opens
  useEffect(() => {
    if (isOpen) {
      setTownHallLevel(currentTownHall || 11);
      setConfirmOverwrite(false);
      triggerGenerate(currentTownHall || 11, purpose, pattern, seed);
    }
  }, [isOpen, currentTownHall]);

  const triggerGenerate = (
    th: number,
    p: BasePurpose,
    pat: AestheticPattern,
    s: number
  ) => {
    setIsGenerating(true);
    // Slight tick to let UI breathe
    setTimeout(() => {
      const res = generateBase({
        townHallLevel: th,
        purpose: p,
        pattern: p === "showcase" ? pat : undefined,
        seed: s,
      });
      setGeneratedResult(res);
      setIsGenerating(false);
    }, 40);
  };

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed(newSeed);
    triggerGenerate(townHallLevel, purpose, pattern, newSeed);
  };

  const handlePurposeChange = (newP: BasePurpose) => {
    setPurpose(newP);
    triggerGenerate(townHallLevel, newP, pattern, seed);
  };

  const handlePatternChange = (newPat: AestheticPattern) => {
    setPattern(newPat);
    triggerGenerate(townHallLevel, purpose, newPat, seed);
  };

  const handleTownHallChange = (newTH: number) => {
    setTownHallLevel(newTH);
    triggerGenerate(newTH, purpose, pattern, seed);
  };

  // Render preview canvas
  useEffect(() => {
    if (!canvasRef.current || !generatedResult || !generatedResult.buildings) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width; // e.g. 264px
    const scale = size / GRID_SIZE;

    ctx.clearRect(0, 0, size, size);

    // Background grid
    ctx.fillStyle = "#0c1524";
    ctx.fillRect(0, 0, size, size);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
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

    // Draw Walls first
    ctx.fillStyle = "#e2e8f0";
    for (const b of generatedResult.buildings) {
      if (b.buildingId === "wall") {
        ctx.fillRect(b.x * scale + 0.5, b.y * scale + 0.5, scale - 1, scale - 1);
      }
    }

    // Draw Traps
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

    // Draw Core & Heavy Defenses
    for (const b of generatedResult.buildings) {
      if (b.buildingId === "wall" || b.buildingId.includes("trap") || b.buildingId.includes("bomb") || b.buildingId.includes("mine")) continue;

      let fill = "#38bdf8"; // Defenses
      let w = 3;

      if (b.buildingId === "town-hall") {
        fill = "#f97316"; // Bright Orange
        w = 4;
      } else if (b.buildingId === "eagle-artillery") {
        fill = "#ef4444"; // Crimson Red
        w = 4;
      } else if (b.buildingId === "hero-hall") {
        fill = "#a855f7"; // Purple
        w = 4;
      } else if (b.buildingId === "clan-castle") {
        fill = "#06b6d4"; // Cyan
        w = 3;
      } else if (b.buildingId.includes("inferno") || b.buildingId === "monolith") {
        fill = "#f43f5e"; // Rose
        w = 3;
      } else if (b.buildingId.includes("xbow") || b.buildingId.includes("scattershot")) {
        fill = "#ec4899"; // Pink
        w = 3;
      } else if (b.buildingId.includes("storage")) {
        fill = "#eab308"; // Gold/Elixir
        w = 3;
      } else if (b.buildingId === "army-camp") {
        fill = "#10b981"; // Emerald
        w = 4;
      } else if (b.buildingId === "builder-hut" || b.buildingId === "helper-hut" || b.buildingId === "hero-banner") {
        fill = "#64748b";
        w = 2;
      }

      ctx.fillStyle = fill;
      ctx.fillRect(b.x * scale + 0.5, b.y * scale + 0.5, w * scale - 1, w * scale - 1);
    }
  }, [generatedResult]);

  const handleApply = () => {
    if (!generatedResult || !generatedResult.success) return;
    if (currentBuildingsCount > 0 && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    onApplyLayout(generatedResult.buildings, townHallLevel);
    onClose();
  };

  if (!isOpen) return null;

  const reqs = getTownHallRequirements(townHallLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/40 text-amber-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  TẠO BASE TỰ ĐỘNG
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Full 100% Vật Thể
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tự động đặt đủ toàn bộ công trình, Hero Hall, Helper Hut, bẫy và tường theo chuẩn giải đấu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Settings */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* TH Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Cấp Độ Town Hall
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
                {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleTownHallChange(lvl)}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      townHallLevel === lvl
                        ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105"
                        : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60"
                    }`}
                  >
                    TH{lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Base Purpose */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Mục Đích Căn Cứ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: "war", label: "War Base", icon: Swords, color: "from-red-500/20 to-rose-600/20 border-rose-500/40 text-rose-300" },
                    { id: "trophy", label: "Trophy Push", icon: Trophy, color: "from-amber-500/20 to-yellow-600/20 border-amber-500/40 text-amber-300" },
                    { id: "farming", label: "Farming", icon: Wheat, color: "from-emerald-500/20 to-green-600/20 border-emerald-500/40 text-emerald-300" },
                    { id: "hybrid", label: "Hybrid", icon: Scale, color: "from-blue-500/20 to-cyan-600/20 border-blue-500/40 text-blue-300" },
                    { id: "progress", label: "Progress Base", icon: Hammer, color: "from-purple-500/20 to-indigo-600/20 border-purple-500/40 text-purple-300" },
                    { id: "showcase", label: "Showcase / Art", icon: Palette, color: "from-pink-500/20 to-fuchsia-600/20 border-pink-500/40 text-pink-300" },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isSelected = purpose === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePurposeChange(item.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? `bg-gradient-to-br ${item.color} font-bold shadow-md scale-[1.02]`
                          : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="w-4 h-4" />
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-black">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400 italic">
                {STRATEGY_PROFILES[purpose]?.description}
              </p>
            </div>

            {/* Aesthetic Pattern if Showcase */}
            {purpose === "showcase" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">
                  Mẫu Nghệ Thuật & Đối Xứng
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(Object.keys(AESTHETIC_PATTERNS) as AestheticPattern[]).map((patKey) => {
                    const pat = AESTHETIC_PATTERNS[patKey];
                    const isSelected = pattern === patKey;
                    return (
                      <button
                        key={patKey}
                        onClick={() => handlePatternChange(patKey)}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-pink-500/20 border-pink-500/50 text-pink-200 shadow-sm"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {pat.name.split(" (")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seed & PRNG */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Seed Thuật Toán (Tái Hiện 100%)
                </label>
                <span className="text-[11px] text-slate-400">
                  Cùng seed = Cùng bố cục
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSeed(val);
                    triggerGenerate(townHallLevel, purpose, pattern, val);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleRandomSeed}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Đổi seed ngẫu nhiên"
                >
                  <Dice5 className="w-4 h-4 text-amber-400" />
                  <span>Đổi Seed</span>
                </button>
              </div>
            </div>

            {/* Requirement Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Yêu cầu bắt buộc TH{townHallLevel}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">Công trình:</span>
                  <span className="font-bold text-white">{reqs.buildings}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">Bẫy:</span>
                  <span className="font-bold text-amber-400">{reqs.traps}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">Tường:</span>
                  <span className="font-bold text-cyan-400">{reqs.walls}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-400">Tổng vật thể:</span>
                  <span className="font-black text-emerald-400">{reqs.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview & Score */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Live Canvas Preview */}
            <div className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <canvas
                ref={canvasRef}
                width={264}
                height={264}
                className="rounded-lg shadow-inner border border-slate-800/80 bg-slate-950"
              />
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-2xl backdrop-blur-xs">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              )}
              <div className="w-full flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Lưới 44×44
                </span>
                <span>{generatedResult?.executionTimeMs || 0}ms</span>
              </div>
            </div>

            {/* Verification Status */}
            {generatedResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  generatedResult.success && generatedResult.stats.isComplete
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {generatedResult.success && generatedResult.stats.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-black">
                      {generatedResult.success && generatedResult.stats.isComplete
                        ? `Đặt đủ 100% (${generatedResult.stats.totalPlaced}/${generatedResult.stats.requiredTotal})`
                        : "Chưa hoàn tất yêu cầu"}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {generatedResult.success
                        ? "Không chồng lấn • Đúng biên 44×44 • Đủ tường"
                        : generatedResult.error || "Có lỗi kiểm tra"}
                    </div>
                  </div>
                </div>

                {generatedResult.score && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Hạng</span>
                    <span className="text-base font-black text-amber-400">
                      Cấp {generatedResult.score.tier}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tactical Score Badges */}
            {generatedResult?.score && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Độ Đối Xứng</span>
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{generatedResult.score.symmetry}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${generatedResult.score.symmetry}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Khoảng Cách Defense</span>
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{generatedResult.score.defensiveSpacing}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-400"
                        style={{ width: `${generatedResult.score.defensiveSpacing}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Lưới Không Quân</span>
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{generatedResult.score.airCoverage}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400"
                        style={{ width: `${generatedResult.score.airCoverage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">Bảo Vệ Tài Nguyên</span>
                  <div className="flex items-center justify-between font-bold text-white">
                    <span>{generatedResult.score.resourceProtection}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${generatedResult.score.resourceProtection}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={handleRandomSeed}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            <span>Tạo Biến Thể Khác</span>
          </button>

          <div className="flex items-center gap-3">
            {confirmOverwrite && (
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Thay thế bản đồ hiện tại? (Có thể Undo)
              </span>
            )}
            <button
              onClick={handleApply}
              disabled={!generatedResult || !generatedResult.success || isGenerating}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                generatedResult?.success
                  ? confirmOverwrite
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 scale-105"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>{confirmOverwrite ? "Xác Nhận Thay Thế" : "Áp Dụng Vào Bản Đồ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
