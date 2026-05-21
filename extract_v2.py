import re, subprocess

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<script[^>]*>(.*?)</script>'
matches = list(re.finditer(pattern, content, re.DOTALL))

# Script 3 is the big one
script = matches[3].group(1)
with open('script_3_v2.js', 'w', encoding='utf-8') as f:
    f.write(script)

print(f'Written {len(script)} chars to script_3_v2.js')
