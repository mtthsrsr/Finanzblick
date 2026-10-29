import type {Row} from './engine'
export type AllocationFilter='all'|'known'|'unknown'
export type AllocationBasis='portfolio'|'selection'|'eur'
export function analyzeRows(rows:Row[],filter:AllocationFilter,query:string,sort:'desc'|'asc'|'name',totalEUR?:number){
 const q=query.trim().toLocaleLowerCase()
 const selected=rows.filter(r=>(filter==='all'||(filter==='unknown'?r.unknown:!r.unknown))&&(!q||r.name.toLocaleLowerCase().includes(q)))
 const selectedWeight=selected.reduce((s,r)=>s+r.weight,0)
 const result=selected.map(r=>({...r,relativeWeight:selectedWeight?r.weight/selectedWeight*100:0,amountEUR:totalEUR===undefined?undefined:totalEUR*r.weight/100}))
 result.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'de'):sort==='asc'?a.weight-b.weight:b.weight-a.weight)
 return {rows:result,selectedWeight,selectedEUR:totalEUR===undefined?undefined:totalEUR*selectedWeight/100,hiddenWeight:Math.max(0,100-selectedWeight)}
}
export function securityName(name:string):string{
 // Keep class, preferred-share and depositary-receipt markers; normalize typography/legal suffixes only.
 return name.toLocaleLowerCase().normalize('NFKC').replace(/\bcorporation\b/g,'corp').replace(/\bincorporated\b/g,'inc').replace(/\blimited\b/g,'ltd').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\b(inc|corp|co|ltd)\b/g,' ').replace(/\s+/g,' ').trim()
}
