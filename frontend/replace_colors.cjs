const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { from: /#0F9D9D/gi, to: '#8B5CF6' },
  { from: /#0c8686/gi, to: '#7C3AED' },
  { from: /teal-400/g, to: 'cyan-400' },
  { from: /teal-500/g, to: 'cyan-500' },
  { from: /teal-600/g, to: 'cyan-600' },
  { from: /teal-50/g, to: 'purple-50' },
  { from: /teal-100/g, to: 'purple-100' },
  { from: /teal-200/g, to: 'purple-200' },
];

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile() && (filepath.endsWith('.tsx') || filepath.endsWith('.ts') || filepath.endsWith('.css'))) {
      callback(filepath);
    }
  });
}

let changedCount = 0;

walkSync(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content;
  
  for (const { from, to } of replacements) {
    newContent = newContent.replace(from, to);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    changedCount++;
    console.log(`Updated ${filepath}`);
  }
});

console.log(`Updated ${changedCount} files.`);
