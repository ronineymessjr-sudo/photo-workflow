import re

with open('script_3.js', 'r', encoding='utf-8') as f:
    content = f.read()

result = []
i = 0
while i < len(content):
    if content[i] == '"':
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
max_depth_paren = 0
max_depth_paren_line = 0

for i, line in enumerate(lines):
    for ch in line:
        if ch == '(': depth_paren += 1
        elif ch == ')': depth_paren -= 1
        elif ch == '{': depth_curly += 1
        elif ch == '}': depth_curly -= 1
    if depth_paren > max_depth_paren:
        max_depth_paren = depth_paren
        max_depth_paren_line = i + 1

print(f'Final: paren={depth_paren}, curly={depth_curly}')
print(f'Max paren depth: {max_depth_paren} at line {max_depth_paren_line}')

# Show lines where depth increases (function openings)
print('\nLines where paren depth increases to new highs:')
depth_paren = 0
for i, line in enumerate(lines):
    old = depth_paren
    for ch in line:
        if ch == '(': depth_paren += 1
        elif ch == ')': depth_paren -= 1
    if depth_paren > old and depth_paren >= max_depth_paren - 2:
        print(f'  Line {i+1} depth={depth_paren}: {line[:100]}')
