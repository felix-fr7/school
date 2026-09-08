import fs from 'fs';
const c = fs.readFileSync('src/screens/admin/DashboardScreen.jsx', 'utf8');
const used = new Set([...c.matchAll(/\b([A-Za-z][A-Za-z0-9]*Outline)\b/g)].map(m => m[1]));
const importBlock = c.slice(c.indexOf("import {"), c.indexOf("} from 'ionicons/icons';"));
const imported = new Set([...importBlock.matchAll(/\b([A-Za-z][A-Za-z0-9]*Outline)\b/g)].map(m => m[1]));
const missing = [...used].filter(x => !imported.has(x));
console.log('Icons used:', [...used].sort().join(', '));
console.log('Icons imported:', [...imported].sort().join(', '));
console.log('USED BUT NOT IMPORTED:', missing.length ? missing.join(', ') : 'NONE');