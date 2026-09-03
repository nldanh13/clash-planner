import fs from 'fs';
let content = fs.readFileSync('src/components/app/Roadmap.tsx', 'utf8');

const properImports = `import { useState } from "react";
import { Check, Info, Lock, Hammer, ShieldCheck, Target, Users, FlaskConical, Crown, Truck, PawPrint, Sparkles, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { thImage } from "../SmartArt";
import type { Player } from "../../types";
import { townHallInfo, type TownHallInfo, type TownHallUnlocks } from "../../townHallData";`;

content = content.replace(/import { useState }[\s\S]*?import { LoaderCircle } from "lucide-react";/, properImports);

const properUnlockGroups = `const unlockGroups: { key: keyof TownHallUnlocks; label: string; icon: LucideIcon }[] = [
  {key:"buildings",label:"Công trình mới",icon:Hammer},
  {key:"defenses",label:"Phòng thủ mới",icon:ShieldCheck},
  {key:"traps",label:"Bẫy mới",icon:Target},
  {key:"troops",label:"Quân mới",icon:Users},
  {key:"spells",label:"Phép mới",icon:FlaskConical},
  {key:"heroes",label:"Hero mới",icon:Crown},
  {key:"siege",label:"Máy công thành mới",icon:Truck},
  {key:"pets",label:"Pet mới",icon:PawPrint},
  {key:"guardians",label:"Guardian mới",icon:Sparkles}
];`;

content = content.replace(/const unlockGroups[\s\S]*?\];/, properUnlockGroups);
fs.writeFileSync('src/components/app/Roadmap.tsx', content);
