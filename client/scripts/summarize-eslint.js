const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname,'..','client-eslint-raw.txt'),'utf8');
const lines = raw.split(/\r?\n/);
let currentFile = null;
const ruleCounts = Object.create(null);
const fileCounts = Object.create(null);
let totalErrors = 0, totalWarnings = 0;
const ruleRegex = /\b(error|warning)\b[\s\S]*?([a-z@0-9\-\/]+)\s*$/i;
for (const l of lines){
  const t = l.trim();
  if(!t) continue;
  // If line looks like absolute path to file (contains /src/ and ends with .ts/.tsx)
  if(/[/\\]src[/\\].+\.(ts|tsx|d\.ts)$/i.test(t) && !/error|warning/i.test(t)){
    currentFile = t;
    continue;
  }
  const m = l.match(ruleRegex);
  if(m && currentFile){
    const kind = m[1].toLowerCase();
    const rule = m[2];
    if(kind === 'error') totalErrors++;
    else if(kind === 'warning') totalWarnings++;
    ruleCounts[rule] = (ruleCounts[rule]||0) + 1;
    fileCounts[currentFile] = (fileCounts[currentFile]||0) + 1;
  }
}
function topCounts(obj, n=20){
  return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>({name:k,count:v}));
}
const out = {
  summary: { totalErrors, totalWarnings, totalProblems: totalErrors+totalWarnings },
  topRules: topCounts(ruleCounts,20),
  topFiles: topCounts(fileCounts,20)
};
fs.writeFileSync(path.join(__dirname,'..','eslint-triage.json'), JSON.stringify(out,null,2), 'utf8');
console.log('wrote eslint-triage.json');
