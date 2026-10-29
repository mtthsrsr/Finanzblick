import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await build({entryPoints:['src/shared/engine.ts','src/shared/validation.ts','src/main/providers.ts'],outdir:'tests/.compiled',bundle:true,platform:'node',format:'esm',external:['xlsx'],outExtension:{'.js':'.mjs'}});
const {aggregate}=await import('./.compiled/shared/engine.mjs');
const {validateState}=await import('./.compiled/shared/validation.mjs');
const {parseJustETF,parseIshares,lookupISIN}=await import('./.compiled/main/providers.mjs');
const make=(id,value,rows)=>({product:{id,isin:id,name:id,kind:'etf',breakdowns:{holdings:{rows,source:'Test',asOf:'2026-08-31'}}},investment:{mode:'value',valueEUR:value,quantity:0,priceEUR:0,asOf:'2026-09-27'}});
const a=make('IE00B4L5Y983',1000,[{name:'Apple',isin:'US0378331005',weight:60}]);
const b=make('IE00BKM4GZ66',3000,[{name:'Apple Inc',isin:'US0378331005',weight:20}]);
let result=aggregate([a,b],'holdings');
assert.equal(result.total,4000);assert.equal(result.rows.find(r=>r.key==='US0378331005').value,1200);assert.equal(result.coverage,30);assert.equal(result.rows.reduce((s,r)=>s+r.weight,0),100);
assert.equal(aggregate([a],'holdings',true).coverage,60);
assert.equal(aggregate([a],'countries').coverage,0);
const parent=make('DE000ETFL581',2000,[{name:'Child',isin:a.product.isin,weight:50}]);
assert.equal(aggregate([parent],'holdings',false,[parent,a]).coverage,30);
a.product.breakdowns.holdings.rows=[{name:'Cycle',isin:parent.product.isin,weight:100}];assert.equal(aggregate([parent],'holdings',false,[parent,a]).coverage,0);
assert.throws(()=>validateState({version:1,entries:[b,b]}));
assert.equal((await lookupISIN('invalid')).status,'not-found');
console.log('Portfolio weighting, residuals, nesting, cycles and validation passed.');
// Accounting regressions: known + unknown values must always equal all invested EUR.
const fund=make('DE0008491002',1000,[{name:'Apple',isin:'US0378331005',weight:50}]);
const direct={...make('US0378331005',2000,[]),product:{id:'US0378331005',isin:'US0378331005',name:'Apple',kind:'stock',breakdowns:{}}};
const manual={...make('DE0008491051',1000,[]),product:{id:'DE0008491051',isin:'DE0008491051',name:'Manual',kind:'fund',breakdowns:{}}};
const uninvested={product:{...fund.product,id:'IE00BKM4GZ66',isin:'IE00BKM4GZ66'}};
const combined=aggregate([fund,direct,manual,uninvested],'holdings');
assert.equal(combined.total,4000);assert.equal(combined.rows.find(r=>r.key==='US0378331005').value,2500);assert.equal(combined.rows.find(r=>r.unknown).value,1500);assert.equal(combined.coverage,62.5);
assert.equal(combined.rows.reduce((s,r)=>s+r.value,0),4000);
const units={...fund,investment:{mode:'units',quantity:2.5,priceEUR:120,valueEUR:999,asOf:'2026-09-01'}};assert.equal(aggregate([units],'holdings').total,300);
const countryA={...fund,product:{...fund.product,breakdowns:{countries:{rows:[{name:'US',weight:100}]}}}};
const countryB={...manual,product:{...manual.product,breakdowns:{countries:{rows:[{name:'United States',weight:100}]}}}};
assert.equal(aggregate([countryA,countryB],'countries').rows.length,1);
const anonymousA=make('DE0008491002',1000,[{name:'Same name',weight:100}]);const anonymousB=make('DE0008491051',1000,[{name:'Same name',weight:100}]);
assert.equal(aggregate([anonymousA,anonymousB],'holdings').rows.length,2);
const certificate={...manual,product:{...manual.product,kind:'structured',breakdowns:{holdings:{rows:[{name:'Underlying',weight:100}]}}}};
assert.equal(aggregate([certificate],'holdings').coverage,0);
for(let n=1;n<=100;n++){
 const one=make('DE0008491002',n*13.7,[{name:'Part',weight:n}]);const output=aggregate([one,manual],'holdings');
 assert.ok(Math.abs(output.rows.reduce((s,r)=>s+r.value,0)-output.total)<1e-8);
 assert.ok(Math.abs(output.rows.reduce((s,r)=>s+r.weight,0)-100)<1e-8);
}
console.log('Accounting regressions passed: manual/uninvested products, units, partial data, direct stock overlap, countries, certificates and conservation of totals.');
// The drill-down must reconcile with the very same unknown slice, including nested funds.
const partial=make('IE00B4L5Y983',1000,[{name:'Known',weight:60}]);
const emptyFund=make('IE00BKM4GZ66',3000,[]);
partial.product.name=emptyFund.product.name='Same display name';
const detail=aggregate([partial,emptyFund,uninvested],'holdings');
assert.equal(detail.unknownProducts.length,2);
assert.equal(detail.unknownProducts.reduce((s,r)=>s+r.value,0),3400);
assert.equal(detail.unknownProducts.reduce((s,r)=>s+r.weight,0),85);
assert.ok(Math.abs(detail.unknownProducts.reduce((s,r)=>s+r.unknownShare,0)-100)<1e-10);
assert.equal(detail.unknownProducts.find(r=>r.productId===partial.product.id).productWeight,40);
assert.equal(detail.unknownProducts.find(r=>r.productId===partial.product.id).weight,10);
const nestedDetail=aggregate([parent],'holdings',false,[parent,partial]);
assert.equal(nestedDetail.unknownProducts.length,1);
assert.equal(nestedDetail.unknownProducts[0].productId,parent.product.id);
assert.equal(nestedDetail.unknownProducts[0].value,1400);
assert.equal(nestedDetail.unknownProducts[0].reasons.length,2);
for(const [entries,dimension,single,library] of [[[partial,emptyFund],'countries',false],[[units],'holdings',false],[[certificate],'holdings',false],[[parent],'holdings',false,[parent,a]],[[partial],'holdings',true],[[uninvested],'holdings',false]]){
 const r=aggregate(entries,dimension,single,library);
 assert.ok(Math.abs(r.unknownProducts.reduce((s,p)=>s+p.value,0)-r.rows.filter(p=>p.unknown).reduce((s,p)=>s+p.value,0))<1e-8);
 assert.ok(Math.abs(r.unknownProducts.reduce((s,p)=>s+p.weight,0)-r.rows.filter(p=>p.unknown).reduce((s,p)=>s+p.weight,0))<1e-8);
}
assert.ok(aggregate([certificate],'holdings').unknownProducts[0].reasons[0].includes('Zertifikat'));
console.log('Unknown drill-down reconciles EUR/portfolio/product/unknown percentages, nesting, cycles, equal names and uninvested products.');
