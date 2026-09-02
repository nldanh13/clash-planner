import re
with open('src/components/base-planner/defenseScorer.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '{ instanceId: "5", buildingId: "gold-storage", x: 10, y: 14 }',
    '{ instanceId: "5", buildingId: "gold-storage", x: 10, y: 15 }'
)
with open('src/components/base-planner/defenseScorer.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
