import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the main script block (lines 3153-7671)
lines = content.split('\n')
script_lines = lines[3152:7671]  # 0-indexed
script = '\n'.join(script_lines)

# Remove string literals properly
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
            # Template literal - handle ${} inside
            j = i + 1
            depth = 0
            while j < len(s):
                if s[j] == '\\':
                    j += 2
                    continue
                if s[j] == '$' and j + 1 < len(s) and s[j+1] == '{':
                    depth += 1
                    j += 2
                    continue
                if s[j] == '{' and depth > 0:
                    depth += 1
                    j += 1
                    continue
                if s[j] == '}' and depth > 0:
                    depth -= 1
                    j += 1
                    continue
                if s[j] == '`' and depth == 0:
                    break
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

# Count brackets
paren_open = clean.count('(')
paren_close = clean.count(')')
curly_open = clean.count('{')
curly_close = clean.count('}')
bracket_open = clean.count('[')
bracket_close = clean.count(']')

print(f'Parentheses: ( {paren_open} vs ) {paren_close} diff={paren_open-paren_close}')
print(f'Braces: {{ {curly_open} vs }} {curly_close} diff={curly_open-curly_close}')
print(f'Brackets: [ {bracket_open} vs ] {bracket_close} diff={bracket_open-bracket_close}')

# Track depth line by line
clean_lines = clean.split('\n')
paren_depth = 0
curly_depth = 0
for i, line in enumerate(clean_lines):
    for ch in line:
        if ch == '(': paren_depth += 1
        elif ch == ')': paren_depth -= 1
        elif ch == '{': curly_depth += 1
        elif ch == '}': curly_depth -= 1

print(f'\nFinal depth: paren={paren_depth}, curly={curly_depth}')

# Find lines where depth goes negative
paren_depth = 0
curly_depth = 0
for i, line in enumerate(clean_lines):
    for ch in line:
        if ch == '(': paren_depth += 1
        elif ch == ')':
            paren_depth -= 1
            if paren_depth < 0:
                print(f'NEGATIVE PAREN at line {3153+i+1}: {line.strip()[:100]}')
        elif ch == '{': curly_depth += 1
        elif ch == '}':
            curly_depth -= 1
            if curly_depth < 0:
                print(f'NEGATIVE CURLY at line {3153+i+1}: {line.strip()[:100]}')
