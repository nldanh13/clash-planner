import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('src={thImage(\nthImage(', 'src={thImage(')
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
