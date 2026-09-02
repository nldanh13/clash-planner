import re

with open('src/components/base-planner/defenseScorer.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'import { calculateFirepowerHeatmap } from "./heatmapUtils";',
    'import { calculateFirepowerHeatmap } from "./heatmapUtils";\nimport { getAllBuildingLimits } from "./buildingLimits";'
)

# Apply penalty for missing core buildings
penalty_code = """
  // --- 0. PENALTY THIẾU CÔNG TRÌNH ---
  const limits = getAllBuildingLimits(townHallLevel);
  const expectedCoreIds = ["eagle-artillery", "inferno-tower", "scattershot", "monolith"];
  let missingCoreCount = 0;
  for (const cid of expectedCoreIds) {
      const allowed = limits[cid] || 0;
      const placed = buildings.filter(b => b.buildingId === cid).length;
      if (allowed > 0 && placed < allowed) {
          missingCoreCount += (allowed - placed);
      }
  }
  if (missingCoreCount > 0) {
      warnings.push({
          id: "missing-core",
          type: "warning",
          title: "Thiếu công trình phòng thủ lõi",
          message: `Bạn chưa đặt đủ ${missingCoreCount} công trình phòng thủ chủ lực cho TH${townHallLevel}. Điểm số có thể không phản ánh đúng sức mạnh.`,
          category: "core"
      });
  }

  // --- 1. HỆ SỐ CỐT LÕI (Max 30 Điểm) ---
"""

content = content.replace('  // --- 1. HỆ SỐ CỐT LÕI (Max 30 Điểm) ---', penalty_code)

# Now, reduce the total score if missing core
score_logic = """
  let totalScore = coreScore + chainScore + splashScore + trapScore + thScore;
  
  if (missingCoreCount > 0) {
      totalScore = Math.max(0, totalScore - missingCoreCount * 5);
  }
"""

content = content.replace('  const totalScore = coreScore + chainScore + splashScore + trapScore + thScore;', score_logic)

with open('src/components/base-planner/defenseScorer.ts', 'w', encoding='utf-8') as f:
    f.write(content)
