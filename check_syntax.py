import re, sys

with open('script_3.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines):
    # Remove strings (simple approach)
    clean = re.sub(r'"[^"]*"', 'S', line)
    clean = re.sub(r"'[^']*'", 'S', clean)
    clean = re.sub(r'`[^`]*`', 'S', clean)
    clean = re.sub(r'//.*', '', clean)
    for ch in clean:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
    if depth < 0:
        print(f'Line {i+1}: depth={depth} (extra close)')
        print(line.rstrip())
        sys.exit(0)

print(f'Final depth={depth} (unclosed parens)')
if depth > 0:
    # Find last few lines with parens
    for i in range(len(lines)-1, max(0, len(lines)-50), -1):
        clean = re.sub(r'"[^"]*"', 'S', lines[i])
        clean = re.sub(r"'[^']*'", 'S', clean)
        clean = re.sub(r'`[^`]*`', 'S', clean)
        clean = re.sub(r'//.*', '', clean)
        if '(' in clean or ')' in clean:
            print(f'  Line {i+1}: {lines[i].rstrip()[:100]}')
