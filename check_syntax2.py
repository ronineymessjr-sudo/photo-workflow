import re

with open('script_3.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Better string removal - handle template literals
result = []
i = 0
while i < len(content):
    if content[i] == '"':
        # Double-quoted string
        j = i + 1
        while j < len(content) and content[j] != '"':
            if content[j] == '\\': j += 1
            j += 1
        result.append('S')
        i = j + 1
    elif content[i] == "'":
        j = i + 1
        while j < len(content) and content[j] != "'":
            if content[j] == '\\': j += 1
            j += 1
        result.append('S')
        i = j + 1
    elif content[i] == '`':
        j = i + 1
        while j < len(content) and content[j] != '`':
            if content[j] == '\\': j += 1
            j += 1
        result.append('S')
        i = j + 1
    elif content[i:i+2] == '//':
        j = content.find('\n', i)
        if j == -1: j = len(content)
        result.append('\n')
        i = j + 1
    elif content[i:i+2] == '/*':
        j = content.find('*/', i)
        if j == -1: j = len(content)
        else: j += 2
        result.append(' ')
        i = j
    else:
        result.append(content[i])
        i += 1

clean = ''.join(result)
lines = clean.split('\n')

depth_paren = 0
depth_curly = 0
for i, line in enumerate(lines):
    for ch in line:
        if ch == '(': depth_paren += 1
        elif ch == ')': depth_paren -= 1
        elif ch == '{': depth_curly += 1
        elif ch == '}': depth_curly -= 1
    if depth_paren < 0:
        print(f'Line {i+1}: paren depth={depth_paren}')
        print(f'  {line[:120]}')
    if depth_curly < 0:
        print(f'Line {i+1}: curly depth={depth_curly}')
        print(f'  {line[:120]}')

print(f'Final: paren={depth_paren}, curly={depth_curly}')
