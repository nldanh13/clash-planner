import fs from 'fs';
let content = fs.readFileSync('src/components/app/Roster.tsx', 'utf8');

const imports = `import React from "react";
import { Lock } from "lucide-react";
import type { Player } from "../../types";
import type { UpgradeItem } from "../../upgradeData";
import { currentLevelFor, lockNoteFor } from "../../utils/upgradeLogic";

`;

content = imports + content.replace(/function Roster/g, "export function Roster");
fs.writeFileSync('src/components/app/Roster.tsx', content);
