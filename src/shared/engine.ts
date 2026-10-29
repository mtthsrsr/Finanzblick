import {securityName} from './chartAnalysis'
import type { SavedProduct } from './model'
import { marketValue } from './model'
export type View = 'countries'|'holdings'
export interface UnknownProduct {productId:string;name:string;value:number;weight:number;productWeight:number;unknownShare:number;reasons:string[]}
export interface Row { key:string;name:string;value:number;weight:number;sources:string[];unknown:boolean;identity?:'isin'|'name';quantity?:number }
const countries:Record<string,string>={ 'united states':'USA','vereinigte staaten':'USA','vereinigte staaten von amerika':'USA','usa':'USA','united kingdom':'Großbritannien','vereinigtes königreich':'Großbritannien','grossbritannien':'Großbritannien','großbritannien':'Großbritannien','germany':'Deutschland','deutschland':'Deutschland','switzerland':'Schweiz','schweiz':'Schweiz','japan':'Japan','china':'China','taiwan':'Taiwan','south korea':'Südkorea','korea':'Südkorea','korea (south)':'Südkorea','india':'Indien','france':'Frankreich','italy':'Italien','spain':'Spanien','sweden':'Schweden','denmark':'Dänemark','finland':'Finnland','norway':'Norwegen','netherlands':'Niederlande','belgium':'Belgien','australia':'Australien','new zealand':'Neuseeland','austria':'Österreich','israel':'Israel','ireland':'Irland','singapore':'Singapur','hong kong':'Hongkong','brazil':'Brasilien','south africa':'Südafrika','saudi arabia':'Saudi-Arabien','united arab emirates':'Vereinigte Arabische Emirate','mexico':'Mexiko','indonesia':'Indonesien','malaysia':'Malaysia','philippines':'Philippinen','turkey':'Türkei','poland':'Polen','greece':'Griechenland','czech republic':'Tschechien','hungary':'Ungarn','qatar':'Katar','kuwait':'Kuwait','egypt':'Ägypten','canada':'Kanada','kanada':'Kanada' }
const countryCodes:Record<string,string>={US:'USA',GB:'Großbritannien',DE:'Deutschland',CH:'Schweiz',FR:'Frankreich',NL:'Niederlande',JP:'Japan',CN:'China',TW:'Taiwan',KR:'Südkorea',CA:'Kanada',AU:'Australien',IN:'Indien',IE:'Irland',LU:'Luxemburg',IT:'Italien',ES:'Spanien',SE:'Schweden',DK:'Dänemark',FI:'Finnland',NO:'Norwegen',BE:'Belgien',AT:'Österreich',BR:'Brasilien',HK:'Hongkong',SG:'Singapur',ZA:'Südafrika',MX:'Mexiko'}
export function aggregate(entries:SavedProduct[],view:View,single=false,library=entries) {
  const map=new Map<string,Row>()
  const nameIds=new Map<string,Set<string>>()
  for(const e of library){
    const securities=[...(e.product.breakdowns.holdings?.rows||[]),...(e.product.kind==='stock'?[{name:e.product.name,isin:e.product.isin}]:[])]
    for(const r of securities)if(r.isin){const name=securityName(r.name);const ids=nameIds.get(name)||new Set<string>();ids.add(r.isin);nameIds.set(name,ids)}
  }
  let total=0
  let root:SavedProduct|undefined,rootValue=0
  const unresolved=new Map<string,UnknownProduct>()
  const add=(name:string,value:number,source:string,isin?:string,unknown=false,group=source)=>{
    if(value<=1e-8)return
    if(view==='countries')name=countryCodes[name.toUpperCase()]||countries[name.toLowerCase()]||name
    const candidates=view==='holdings'?nameIds.get(securityName(name)):undefined
    const inferred=!isin&&candidates?.size===1?[...candidates][0]:undefined
    const key=unknown?'unknown':isin||inferred||(view==='holdings'?'name::'+securityName(name):name.toLocaleLowerCase())
    const previous=map.get(key)
    map.set(key,{key,name,value:(previous?.value||0)+value,weight:0,sources:[...new Set([...(previous?.sources||[]),source])],unknown,identity:view==='holdings'&&!unknown?(!isin||previous?.identity==='name'?'name':'isin'):undefined})
  }
  const unknown=(value:number,source:string,reason:string)=>{
    add('Nicht aufgeschlüsselt',value,source,undefined,true)
    if(value<=1e-8||!root)return
    const before=unresolved.get(root.product.id)
    const amount=(before?.value||0)+value
    unresolved.set(root.product.id,{productId:root.product.id,name:root.product.name,value:amount,weight:0,productWeight:rootValue?amount/rootValue*100:0,unknownShare:0,reasons:[...new Set([...(before?.reasons||[]),reason])]})
  }
  function visit(entry:SavedProduct,value:number,source:string,visited:Set<string>) {
    const p=entry.product
    if(visited.has(p.id)||visited.size>10){unknown(value,source,p.name+': Verschachtelung kann wegen einer Schleife oder zu vieler Ebenen nicht weiter aufgelöst werden.');return}
    if(p.kind==='structured'){unknown(value,source,p.name+': Zertifikat; der Basiswert entspricht keinem direkten Aktienbestand.');return}
    const path=new Set([...visited,p.id])
    if(view==='countries'&&p.kind==='commodity'&&p.basis==='exposure'){add('Nicht anwendbar · Rohstoffe',value,source);return}
    const data=p.breakdowns[view]
    if(!data?.rows.length){if(view==='holdings'&&p.kind==='stock')add(p.name,value,source,p.isin);else unknown(value,source,p.name+(p.realEstateDetails?': Nur Angaben zum Immobilienportfolio verfügbar; keine passende Aufteilung des gesamten Fondsvermögens.':view==='countries'?': Keine nutzbare Länderaufteilung vorhanden.':': Keine nutzbare Liste der Einzelanlagen vorhanden.'));return}
    const sum=data.rows.reduce((s,r)=>s+r.weight,0)
    if(!Number.isFinite(sum)||sum>100.5||data.rows.some(r=>r.weight<0)){unknown(value,source,p.name+': Aufteilung wegen widersprüchlicher Gewichte nicht verwendbar.');return}
    for(const r of data.rows){
      const amount=value*r.weight/Math.max(100,sum)
      const child=r.isin&&library.find(e=>e.product.isin===r.isin)
      if(view==='holdings'&&child&&child.product.kind!=='stock')visit(child,amount,source,path)
      else if(/^(sonstige|other|others|rest|cash und derivate)$/i.test(r.name))unknown(amount,source,p.name+': Sammelkategorie „'+r.name+'“ ohne weitere Aufschlüsselung.')
      else add(r.name,amount,source,view==='holdings'?r.isin:undefined,false,p.id)
    }
    unknown(value*Math.max(0,1-sum/100),source,p.name+': Veröffentlichte oder erfasste Aufteilung deckt nur einen Teil ab (Stand '+data.asOf+').')
  }
  for(const e of entries){const value=single?100:marketValue(e.investment);if(!Number.isFinite(value)||value<=0)continue;total+=value;root=e;rootValue=value;visit(e,value,e.product.name,new Set())}
  const rows=[...map.values()].map(r=>({...r,weight:total?r.value/total*100:0})).sort((a,b)=>b.value-a.value)
  const unknownTotal=rows.filter(r=>r.unknown).reduce((s,r)=>s+r.value,0)
  const unknownProducts=[...unresolved.values()].map(r=>({...r,weight:total?r.value/total*100:0,unknownShare:unknownTotal?r.value/unknownTotal*100:0})).sort((a,b)=>b.value-a.value)
  return {rows,total,unknownProducts,coverage:total?100-rows.filter(r=>r.unknown).reduce((s,r)=>s+r.weight,0):0}
}
