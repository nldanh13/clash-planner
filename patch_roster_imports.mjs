import fs from 'fs';
let content = fs.readFileSync('src/components/app/Roster.tsx', 'utf8');
content = content.replace(/import { currentLevelFor, lockNoteFor } from "..\/..\/utils\/upgradeLogic";/, 
`import { currentLevelFor, lockNoteFor } from "../../utils/upgradeLogic";\nimport { SmartArt } from "../SmartArt";`);
fs.writeFileSync('src/components/app/Roster.tsx', content);
