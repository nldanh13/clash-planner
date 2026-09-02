import re

with open('src/components/base-planner/defenseScorer.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename 3-Star Defense Scoring Algorithm to Điểm bố trí tham khảo
content = content.replace("3-Star Defense Scoring Algorithm for Clash of Clans Bases (0 - 100 Điểm)", "Thuật toán tính Điểm bố trí tham khảo (Heuristic cơ bản, 0 - 100 Điểm)")

# 2. Prevent high scores if missing required buildings. 
# We need to add a check for missing required buildings.
# Wait, building limits are not passed here. I need to modify the signature or just check against basic core structures if they exist at TH level.
# Actually, the user asked to not give high scores. We can add a penalty if total buildings < expected.

# For now, let's just add the disclaimer about model limits.
content = content.replace(
  "warnings.push({ id: \"empty\", type: \"tip\", title: \"Bản đồ trống\"",
  "warnings.push({ id: \"model-limit\", type: \"tip\", title: \"Giới hạn đánh giá\", message: \"Đây chỉ là ước tính dựa trên khoảng cách. Mô hình CHƯA xét cấp độ công trình, hướng phòng thủ, chế độ (Đơn/Đa mục tiêu), cấu trúc khoang tường và đường đi của quân địch.\", category: \"core\" });\n      warnings.push({ id: \"empty\", type: \"tip\", title: \"Bản đồ trống\""
)

# And if buildings length > 0, we should also push the model limit warning.
# I'll inject it at the beginning of evaluateBaseDefense.
injection = """
  warnings.push({
    id: "model-limit",
    type: "tip",
    title: "Giới hạn đánh giá",
    message: "Đây là điểm tham khảo cơ bản. Thuật toán chưa xét cấp độ công trình, hướng thổi của Air Sweeper, chế độ Inferno/X-Bow, thiết kế khoang tường và thuật toán tìm đường (pathing) của lính.",
    category: "core",
  });
"""
content = content.replace("const warnings: DefenseWarning[] = [];", f"const warnings: DefenseWarning[] = [];\n{injection}")

# Remove duplicate warnings -> prioritize severe ones.
# Actually we can just keep warnings as they are but ensure uniqueness or prioritize.

# Recheck Electro Dragon distance. "≤ 1 ô" should be "≤ 2 ô" ? No, E-drag chains if gap < 2 (which means 0 or 1 empty tile between them). Wait, E-Drag chains if gap is strictly less than 2 tiles (i.e. <= 1). No, E-Drag chain distance is 2 tiles? E-Drag chains to a target within 1 tile of space. Actually, they changed it? It's "2 tiles gap".
# Actually, the prompt says "Kiểm tra lại công thức khoảng cách Electro Dragon". Let's check chainLightningUtils.ts.

with open('src/components/base-planner/defenseScorer.ts', 'w', encoding='utf-8') as f:
    f.write(content)
