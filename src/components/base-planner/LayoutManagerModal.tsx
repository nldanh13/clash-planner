import React, { useState } from "react";
import type { LayoutProject } from "./types";
import { BlueprintManagerModal } from "./BlueprintManagerModal";
import { NewBlueprintWizardModal } from "./NewBlueprintWizardModal";

interface LayoutManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayout: LayoutProject | null;
  onSelectLayout: (layout: LayoutProject) => void;
  onRefreshLayouts?: () => void;
  autoSaveTime?: string | null;
}

export function LayoutManagerModal({
  isOpen,
  onClose,
  activeLayout,
  onSelectLayout,
}: LayoutManagerModalProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <BlueprintManagerModal
        isOpen={isOpen && !isWizardOpen}
        onClose={onClose}
        activeLayout={activeLayout}
        onSelectLayout={onSelectLayout}
        onOpenNewWizard={() => setIsWizardOpen(true)}
      />

      <NewBlueprintWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={(newLayout) => {
          setIsWizardOpen(false);
          onSelectLayout(newLayout);
          onClose();
        }}
        initialTownHall={activeLayout?.townHallLevel || 11}
      />
    </>
  );
}

export default LayoutManagerModal;
