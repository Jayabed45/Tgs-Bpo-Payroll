const XLSX=require("xlsx");
const p='c:/Users/crzyc/OneDrive/Desktop/Tgs-Bpo-Payroll/database/Timekeeping-Data_Oct-16-to-31-2025 (1).xlsx';
const wb=XLSX.readFile(p);
const summary = XLSX.utils.sheet_to_json(wb.Sheets['Total Hours - Summary'],{header:1,defval:''});
const empRows = summary.slice(1).filter(r=>String(r[1]||'').trim() && String(r[1]).trim().toLowerCase()!=='grand total');
console.log('Summary employee rows:', empRows.length);
const nameMap=new Map();
const codeMap=new Map();
for(const r of empRows){const n=String(r[1]||'').trim().toLowerCase(); const c=String(r[0]||'').trim(); if(n) nameMap.set(n,(nameMap.get(n)||0)+1); if(c) codeMap.set(c,(codeMap.get(c)||0)+1);} 
console.log('Duplicate names:', [...nameMap.values()].filter(v=>v>1).length);
console.log('Duplicate codes:', [...codeMap.values()].filter(v=>v>1).length);
console.log('First rows:', empRows.slice(0,3).map(r=>[r[0],r[1]]));
console.log('Last rows:', empRows.slice(-3).map(r=>[r[0],r[1]]));
