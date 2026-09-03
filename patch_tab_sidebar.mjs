import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');

content = content.replace(
  /\{(\/\* Left: Inventory Sidebar \*\/)\}[\s\S]*?<InventorySidebar[\s\S]*?\/>/,
  `{settings.plannerMode === "design" ? (
          <>
            $1
            <InventorySidebar
              townHallLevel={townHallLevel}
              buildingLimits={buildingLimits}
              placedBuildings={buildings}
              selectedBuildingDefId={selectedDefId}
              onSelectBuildingDef={setSelectedDefId}
              onStartDragNew={handleStartDragNew}
              wallBrushActive={settings.wallBrushActive}
              onToggleWallBrush={() =>
                setSettings((s) => ({
                  ...s,
                  wallBrushActive: !s.wallBrushActive,
                  eraserActive: false,
                }))
              }
            />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {settings.showDefenseScore ? (
              <DefenseScorePanel
                defenseScore={defenseScoreResult}
                onClose={() => setSettings((s) => ({ ...s, showDefenseScore: false }))}
              />
            ) : (
              <div className="bg-[#0a151f] border border-slate-800 rounded-xl p-6 text-center shadow-lg">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/></svg>
                </div>
                <h3 className="text-sm font-bold text-slate-200 mb-2">Chế độ Phân tích</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sử dụng thanh công cụ bên trên để bật các lớp phân tích: Heatmap, Tầm bắn, Sét lan hoặc Điểm phòng thủ.
                </p>
              </div>
            )}
          </div>
        )}`
);

content = content.replace(
  /\{\/\* Real-Time Defense Score & Analytics Panel \*\/\}[\s\S]*?<\/div>\s*\)\}/,
  ""
);

fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', content);
