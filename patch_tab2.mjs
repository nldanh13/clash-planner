import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');

content = content.replace(/<TacticalToolbar[\s\S]*?onFitMap=\{handleFitMap\}\s*\/>/, 
`<TacticalToolbar
        townHallLevel={townHallLevel}
        onTownHallChange={handleTownHallChange}
        settings={settings}
        onUpdateSettings={setSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClearMap}
        onLoadPreset={handleLoadPreset}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
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
