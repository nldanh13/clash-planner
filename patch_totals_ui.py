import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Town Hall Totals Warning
content = content.replace(
    """<article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={townHallTotals.costs}/></strong><span>Tính theo số lượng từng loại</span></article>""",
    """<article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={townHallTotals.costs}/></strong><span>Tính theo số lượng từng loại</span>{townHallTotals.hasEstimated && <span className="text-yellow-400 text-xs mt-1 block">⚠️ Tổng có dùng số liệu ước tính</span>}</article>"""
)

# Suggest Totals Warning
content = content.replace(
    """<article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={suggestTotals.costs}/></strong><span>Cộng dồn toàn bộ, không riêng danh sách gợi ý</span></article>""",
    """<article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={suggestTotals.costs}/></strong><span>Cộng dồn toàn bộ, không riêng danh sách gợi ý</span>{suggestTotals.hasEstimated && <span className="text-yellow-400 text-xs mt-1 block">⚠️ Tổng có dùng số liệu ước tính</span>}</article>"""
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
