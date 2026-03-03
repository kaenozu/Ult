const fs = require('fs');

const path = 'trading-platform/app/demo/page.tsx';
let content = fs.readFileSync(path, 'utf8');
console.log(content.substring(0, 500));
