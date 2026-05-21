import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all script tags
pattern = r'<script[^>]*>(.*?)</script>'
matches = list(re.finditer(pattern, content, re.DOTALL))
print(f'Found {len(matches)} script blocks')

for i, m in enumerate(matches):
    script = m.group(1)
    # Find start line
    start_line = content[:m.start()].count('\n') + 1
    end_line = content[:m.end()].count('\n') + 1
    print(f'\nScript {i}: lines {start_line}-{end_line}, {len(script)} chars')
    # Show first 80 chars
    first_line = script.strip().split('\n')[0][:80]
    print(f'  Start: {first_line}')
    # Show last 80 chars
    last_line = script.strip().split('\n')[-1][:80]
    print(f'  End: {last_line}')
