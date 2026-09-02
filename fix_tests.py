import re

# 1. Fix villageImport.test.ts
with open('src/utils/villageImport.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const raw = `Đã copy dữ liệu này: { "data": 1234 `;',
    'const raw = `Đã copy dữ liệu này: { "data": 1234 } oops`;'
)
with open('src/utils/villageImport.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Fix defenseScorer.test.ts
with open('src/components/base-planner/defenseScorer.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '{ instanceId: "5", buildingId: "gold-storage", x: 10, y: 12 }, // khiên thịt',
    '{ instanceId: "5", buildingId: "gold-storage", x: 10, y: 14 }, // khiên thịt (cách 2 ô)'
)

with open('src/components/base-planner/defenseScorer.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)

