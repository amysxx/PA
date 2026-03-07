import fs from 'fs';

const code = fs.readFileSync('./src/data/questionPool.js', 'utf8');
const testCode = code.replace(/export const builtinQuestions/, 'const builtinQuestions');

try {
    eval(testCode);
    console.log('Successfully evaluated questionPool.js');
} catch (e) {
    console.error('Error evaluating questionPool.js:');
    console.error(e);
}
