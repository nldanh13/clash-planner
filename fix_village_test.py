import re
with open('src/utils/villageImport.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const raw = `Đã copy dữ liệu này: { "data": 1234 } oops`;',
    'const raw = `Đã copy dữ liệu này: { "data": 1234, broken json }`;'
)
with open('src/utils/villageImport.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
