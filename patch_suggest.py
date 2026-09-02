import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    """<small>{itemKindLabel[row.item.kind]} · {row.item.lane}</small>""",
    """<small>{itemKindLabel[row.item.kind]} · {row.item.lane} · <span title={dataStatusDetail[row.item.dataStatus]}>{dataStatusLabel[row.item.dataStatus]}</span></small>"""
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
