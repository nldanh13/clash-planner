import re

with open('src/components/base-planner/defenseScorer.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const th = buildings.find((b) => b.buildingId === "town-hall");',
    '''const th = buildings.find((b) => b.buildingId === "town-hall");
  if (!th) {
    warnings.push({
      id: "th-missing",
      type: "critical",
      title: "Thiếu Town Hall",
      message: "Bạn chưa đặt Town Hall. Hãy kéo thả Town Hall vào bản đồ.",
      category: "th",
    });
  }'''
)

with open('src/components/base-planner/defenseScorer.ts', 'w', encoding='utf-8') as f:
    f.write(content)

