import fs from 'fs';
let content = fs.readFileSync('src/components/base-planner/chainLightningUtils.ts', 'utf8');

content = content.replace(/maxGap = 1/, 'maxGap = 2');
content = content.replace(/electro dragon chain lightning travels up to 2 tiles/i, 'Electro Dragon chain lightning travels up to 1 tile (gap <= 1). 2 tiles is considered a warning for Zap/Earthquake or slight misplacements.');

fs.writeFileSync('src/components/base-planner/chainLightningUtils.ts', content);

let scorer = fs.readFileSync('src/components/base-planner/defenseScorer.ts', 'utf8');
scorer = scorer.replace(/scanChainLightningHazards\(buildings, 1\)/g, 'scanChainLightningHazards(buildings, 2)');

fs.writeFileSync('src/components/base-planner/defenseScorer.ts', scorer);
