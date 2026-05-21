import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
script_lines = lines[3152:7671]
script = '\n'.join(script_lines)

def remove_strings(s):
    result = []
    i = 0
    while i < len(s):
        if s[i] == '"':
            j = i + 1
            while j < len(s) and s[j] != '"':
                if s[j] == '\\': j += 1
                j += 1
            result.append('""')
            i = j + 1
        elif s[i] == "'":
            j = i + 1
            while j < len(s) and s[j] != "'":
                if s[j] == '\\': j += 1
                j += 1
            result.append("''")
            i = j + 1
        elif s[i] == '`':
            j = i + 1
            depth = 0
            while j < len(s):
                if s[j] == '\\': j += 2; continue
                if s[j] == '$' and j + 1 < len(s) and s[j+1] == '{': depth += 1; j += 2; continue
                if s[j] == '{' and depth > 0: depth += 1; j += 1; continue
                if s[j] == '}' and depth > 0: depth -= 1; j += 1; continue
                if s[j] == '`' and depth == 0: break
                j += 1
            result.append('``')
            i = j + 1
        elif s[i:i+2] == '//':
            j = s.find('\n', i)
            if j == -1: j = len(s)
            result.append('\n')
            i = j + 1
        elif s[i:i+2] == '/*':
            j = s.find('*/', i)
            if j == -1: j = len(s)
            else: j += 2
            result.append(' ')
            i = j
        else:
            result.append(s[i])
            i += 1
    return ''.join(result)

clean = remove_strings(script)
clean_lines = clean.split('\n')

# Track curly depth, find unclosed blocks
curly_depth = 0
open_stack = []  # (line_no, line_text)

for i, line in enumerate(clean_lines):
    for ch in line:
        if ch == '{':
            curly_depth += 1
            open_stack.append((3153 + i + 1, line.strip()[:80]))
        elif ch == '}':
            if open_stack:
                open_stack.pop()
            curly_depth -= 1

print(f'Final curly depth: {curly_depth}')
print(f'Unclosed blocks ({len(open_stack)}):')
for line_no, text in open_stack:
    print(f'  Line {line_no}: {text}')
