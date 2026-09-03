import fs from 'fs';

let types = fs.readFileSync('src/components/base-planner/types.ts', 'utf8');
types = types.replace(/\s*chainMaxDistance: number;/g, '');
fs.writeFileSync('src/components/base-planner/types.ts', types);

let tab = fs.readFileSync('src/components/base-planner/BasePlannerTab.tsx', 'utf8');
tab = tab.replace(/\s*chainMaxDistance: 2,/g, '');
tab = tab.replace(/scanChainLightningHazards\(buildings, settings\.chainMaxDistance\)/g, 'scanChainLightningHazards(buildings, 2)');
tab = tab.replace(/settings\.chainMaxDistance/g, '2'); // for the dependency array
fs.writeFileSync('src/components/base-planner/BasePlannerTab.tsx', tab);

let utils = fs.readFileSync('src/components/base-planner/chainLightningUtils.ts', 'utf8');
utils = utils.replace(/\/\*\*[\s\S]*?getTileGap/, 
`/**
 * ĐỊNH NGHĨA KHOẢNG CÁCH DUY NHẤT (EDGE-TO-EDGE):
 * Đo khoảng cách rỗng (gap) giữa 2 viền công trình theo Chebyshev distance (tối đa của dx, dy).
 * - Nếu chạm nhau hoặc đè lên nhau: khoảng cách = 0 ô.
 * - Nếu cách nhau đúng 1 ô trống: khoảng cách = 1 ô (Sét lan truyền được).
 * - Nếu cách nhau 2 ô trống: khoảng cách = 2 ô (Sét lan KHÔNG truyền được, nhưng nằm trong diện cảnh báo Zap/Earthquake).
 */
export function getTileGap`);
// fix identical pairs bug: The requirement says "Không đếm trùng cùng một cặp công trình."
// The current loop is:
// for (let i = 0; i < n; i++) {
//   for (let j = i + 1; j < n; j++) {
// This mathematically guarantees no duplicate pairs (i,j).
// Let's ensure there are no duplicate pairs by instanceId just in case.
fs.writeFileSync('src/components/base-planner/chainLightningUtils.ts', utils);

