import {decodeHtml} from './deka'
import {validateBreakdown,type Breakdown,type BreakdownRow} from '../shared/analysis'
import type {Product} from '../shared/model'
const clean=(s:unknown)=>typeof s==='string'?decodeHtml(s).replace(/###footnote_number###:[^ ]*/g,'').replace(/<[^>]*>/g,' ').trim():''
function date(value:unknown):string{
 const m=clean(value).match(/(?:Stand:\s*)?(\d{2})\.(\d{2})\.(\d{4})/)
 return m?`${m[3]}-${m[2]}-${m[1]}`:''
}
function scales(row:any):number[]{
 const m=clean(row.value).match(/^(-?\d+(?:,\d+)?)\s*%$/)
 if(!m||!Number.isFinite(row.valueNumeric))throw new Error('Union-Gewicht ohne eindeutige Prozenteinheit.')
 const displayed=Number(m[1].replace(',','.'))
 return [1,100].filter(scale=>Math.abs(row.valueNumeric*scale-displayed)<=0.00501)
}
export function unionWeight(row:any,scale?:number):number{
 const candidates=scales(row)
 if(scale!==undefined){if(candidates.includes(scale))return row.valueNumeric*scale}
 else if(candidates.length===1||row.valueNumeric===0)return row.valueNumeric*candidates[0]
 throw new Error('Union-Gewichte widersprechen der Prozentanzeige oder sind mehrdeutig.')
}
function listRows(list:any[]):BreakdownRow[]{
 // Infer one consistent unit for the whole list, including rounded tiny positions.
 const candidates=[1,100].filter(scale=>list.every(row=>scales(row).includes(scale)))
 if(candidates.length!==1)throw new Error('Union-Liste ohne eindeutige Gewichtseinheit.')
 return list.map(row=>({name:clean(row.label),weight:unionWeight(row,candidates[0])}))
}
export function parseUnionComposition(data:any,product:Product):Product{
 const identity=data?.header?.masterData?.find((r:any)=>clean(r.label).replace(':','')==='ISIN')?.text
 if(identity!==product.isin)throw new Error('Abweichende ISIN in Union-Zusammensetzung.')
 const page=data?.body?.pages?.find((p:any)=>p.title==='Zusammensetzung')
 if(!Array.isArray(page?.sections))throw new Error('Keine veröffentlichte Union-Zusammensetzung verfügbar.')
 const breakdowns={...product.breakdowns}
 const realEstateDetails={...product.realEstateDetails}
 const items=page.sections.flatMap((section:any)=>(section.items||[]).map((item:any)=>({...item,sectionTitle:clean(section.headline)})))
 const save=(dimension:'countries'|'holdings'|'sectors',rows:BreakdownRow[],asOf:string)=>{
  const breakdown:Breakdown={rows,asOf,source:'Union Investment · veröffentlichte Zusammensetzung (Auszug)',sourceUrl:product.productUrl,manual:false}
  if(!validateBreakdown(breakdown))breakdowns[dimension]=breakdown
 }
 for(const item of items){
  const title=clean(item.headline)||item.sectionTitle
  const propertyDimension=title==='Immobilienvermögen nach Regionen'?'regions':title==='Verteilung der Nutzungsarten'?'uses':null
  if(propertyDimension&&Array.isArray(item.listData))for(const list of item.listData){
   try{
    const data:Breakdown={rows:listRows(list.list),asOf:date(list.date),source:'Union Investment · '+title,sourceUrl:product.productUrl,manual:false}
    if(!validateBreakdown(data))realEstateDetails[propertyDimension]=data
   }catch{/* Property percentages are not weights of the full fund's net assets. */}
  }
  if(/nach Ländern/i.test(title)&&item.chart?.type==='world-map-chart'&&Array.isArray(item.chart.data)){
   const rows=item.chart.data.map((r:any)=>({name:clean(r.name),weight:r.value}))
   save('countries',rows,date(item.chart.chartDate))
  }
  const dimension=/nach Ländern/i.test(title)?'countries':/nach Branchen/i.test(title)?'sectors':/größten (Aktienwerte|Rentenwerte|Positionen|Einzelwerte)/i.test(title)?'holdings':null
  if(!dimension||!Array.isArray(item.listData)||breakdowns[dimension]!==product.breakdowns[dimension])continue
  for(const list of item.listData){
   try{if(Array.isArray(list.list))save(dimension,listRows(list.list),date(list.date))}catch{/* Reject inconsistent data; never guess units. */}
  }
 }
 if(!Object.keys(realEstateDetails).length&&!Object.keys(breakdowns).some(k=>breakdowns[k as keyof typeof breakdowns]!==product.breakdowns[k as keyof typeof breakdowns]))throw new Error('Union-Aufteilung konnte nicht validiert werden.')
 return {...product,breakdowns,realEstateDetails:Object.keys(realEstateDetails).length?realEstateDetails:undefined,notes:Object.keys(realEstateDetails).length?'Immobilienfonds: Regionen und Nutzungsarten sind unten separat dargestellt. Diese Angaben beschreiben das Immobilienportfolio nach Anbieterdefinition, nicht den gesamten Fonds einschließlich Liquidität und Finanzierung. Sie werden deshalb nicht als Länder- oder Einzelaktiengewichte in die Gesamtrechnung übernommen. Eine Liste einzelner Immobilien ist in dieser Datenquelle nicht enthalten.':'Länder, Branchen und veröffentlichte größte Positionen direkt von Union Investment. Keine vollständige Bestandsliste; Restanteile bleiben unbekannt. Einzelanlagen ohne ISIN können anhand vereinheitlichter Namen zugeordnet werden; diese Zuordnung ist in der Übersicht gekennzeichnet. Datenstand je Aufteilung beachten.'}
}
type ReadText=(url:string)=>Promise<string>
let configCache:{url:string;key:string;expires:number}|undefined
let pending:Promise<{url:string;key:string;expires:number}>|undefined
async function config(html:string,read:ReadText){
 const script=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>decodeHtml(m[1])).find(u=>/^https:\/\/fundportrait\.fe\.union-investment\.de\/v2\/[a-zA-Z0-9.-]+\/pk-fundportrait\/assets\/pk-fundportrait\.js$/.test(u))
 if(!script)throw new Error('Union-Seitenkonfiguration nicht gefunden.')
 if(configCache?.url===script&&configCache.expires>Date.now())return configCache
 if(!pending)pending=read(script).then(js=>{
  // Public configuration used by the provider's own webpage; no account credential.
  const block=js.match(/blobStorageApiData:\{url:\w+\("https:\/\/internal\.api\.union-investment\.de\/beta\/web\/funddata","beta-2\.0\.0",[^}]{0,300}apiKey:"([a-f0-9]{32})"/)
  if(!block)throw new Error('Union-Seitenkonfiguration hat sich geändert.')
  return configCache={url:script,key:block[1],expires:Date.now()+6*3600_000}
 }).finally(()=>{pending=undefined})
 return pending
}
export async function enrichUnion(product:Product,html:string,read:ReadText):Promise<Product>{
 try{
  // Commodity collateral must not be presented as the fund's economic exposure.
  if(product.isin==='LU0249045476')return product
  const c=await config(html,read)
  const params=new URLSearchParams({'api-version':'beta-2.0.0',segment:'web_de',type:'fondsportrait',isin:product.isin!})
  const response=await fetch('https://internal.api.union-investment.de/beta/web/funddata/fundportrait?'+params,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json','x-api-key':c.key}})
  if(!response.ok)throw new Error('Union-Zusammensetzung momentan nicht erreichbar.')
  const text=await response.text();if(text.length>10_000_000)throw new Error('Union-Antwort zu groß.')
  return parseUnionComposition(JSON.parse(text),product)
 }catch{return {...product,notes:(product.notes||'')+' Die Union-Zusammensetzung konnte bei diesem Abruf nicht bestätigt werden; vorhandene Aufteilungen bleiben beim Aktualisieren erhalten.'}}
}
