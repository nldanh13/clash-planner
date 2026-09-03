import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

let hookStart = content.indexOf('const townHallRows=useMemo');
let hookEnd = content.indexOf('// (3) "single": mode tra cứu');
let hookEndFull = content.indexOf('const plannerItem=plannerItems.find(x=>x.id===plannerItemId)||plannerItems[0];');

// Wait, let's just find the exact lines
