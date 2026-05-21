const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('script_3.js', 'utf8');

try {
    new vm.Script(code);
    console.log('OK - no syntax errors');
} catch(e) {
    console.log('Error:', e.message);
    // Extract line number from stack
    const stack = e.stack;
    const lines = stack.split('\n');
    for (const line of lines) {
        if (line.includes('script_3.js')) {
            console.log('Stack:', line.trim());
        }
    }
}
