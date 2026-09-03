import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');

// Update TacticalSettings initial state
content = content.replace(/const \[settings, setSettings\] = useState<TacticalSettings>\(\{[\s\S]*?chainMaxDistance: 2,\n  \}\);/, 
`const [settings, setSettings] = useState<TacticalSettings>({
    plannerMode: "design",
    showBuildingNames: true,
    showBuildingLevels: false,
    showRanges: "selected",
    showChainLightning: "none",
    showHeatmap: false,
    showDefenseScore: false,
    showGrid: true,
    showCoordinates: false,
    wallBrushActive: false,
    eraserActive: false,
    chainMaxDistance: 2,
  });`);

const fitMapLogic = `
  const handleFitMap = () => {
    setZoomLevel(1);
    const container = document.querySelector('.planner-canvas-scroll');
    if (container) {
      container.scrollTo({
        left: container.scrollWidth / 2 - container.clientWidth / 2,
        top: container.scrollHeight / 2 - container.clientHeight / 2,
        behavior: 'smooth'
      });
    }
  };
`;

content = content.replace(/const handleTownHallChange/g, fitMapLogic + '\n  const handleTownHallChange');

content = content.replace(/<TacticalToolbar[\s\S]*?autoSaveTime=\{autoSaveTime\}\s*\/>/, 
`<TacticalToolbar
        townHallLevel={townHallLevel}
        onTownHallChange={handleTownHallChange}
        settings={settings}
        onUpdateSettings={setSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={() => setEntireState([])}
        onLoadPreset={() => {
          const preset = getPresetLayout(townHallLevel);
          setEntireState(preset);
          updateLayoutInStorage(townHallLevel, preset);
        }}
        onExportPNG={() => exportBaseToPNG(townHallLevel, buildings, activeLayout.name)}
        onExportJSON={() => exportLayoutAsJSON(buildings, townHallLevel, activeLayout.name)}
        onImportJSON={handleImportLayout}
        chainIssuesCount={chainIssuesCount}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        placedCount={buildings.length}
        defenseScore={defenseScoreResult}
        activeLayoutName={activeLayout.name}
        onOpenLayoutManager={() => setIsLayoutModalOpen(true)}
        autoSaveTime={autoSaveTime}
        onFitMap={handleFitMap}
      />`);

fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', content);
