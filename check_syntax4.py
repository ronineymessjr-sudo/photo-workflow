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

# Find unmatched { by tracking depth
depth = 0
lines = clean.split('\n')
for i, line in enumerate(lines):
    old = depth
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    # Show lines where depth goes up and never comes back down
    if depth > old:
        pass  # opening

# Find the last few opening braces that don't close
print('Lines with net +1 curly (open without close):')
depth = 0
net_opens = []
for i, line in enumerate(lines):
    old = depth
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth > old:
        net_opens.append((i+1, depth, line.strip()[:100]))

# Show the last 10 net opens
for line_no, d, text in net_opens[-10:]:
    print(f'  Line {line_no} depth={d}: {text}')
