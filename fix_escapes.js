const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/pages/tests/attention.js',
    'src/pages/tests/memory.js',
    'src/pages/tests/comprehension.js',
    'src/pages/tests/execution.js',
    'src/pages/questionAdmin.js'
];

filesToFix.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Replace \\` with `
        // Replace \${ with ${
        // Note: some string literals like \\\` were generated. Let's handle them.
        content = content.replace(/\\\\\\`/g, '`');
        content = content.replace(/\\`/g, '`');
        content = content.replace(/\\\${/g, '${');

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', relPath);
    }
});
