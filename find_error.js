const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('script_3_v2.js', 'utf8');

// Try to find the error by splitting the code
// Binary search for the problematic section
const lines = code.split('\n');
let lo = 0, hi = lines.length;

while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const partial = lines.slice(0, mid).join('\n');
    try {
        new Function(partial);
        lo = mid + 1;
    } catch (e) {
        hi = mid;
    }
}

// lo is approximately where the error starts
// But the actual error might be a missing close bracket earlier
// Let's check around lo
console.log(`Error detected around line ${lo + 1}`);
for (let i = Math.max(0, lo - 5); i < Math.min(lines.length, lo + 5); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
