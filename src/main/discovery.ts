import {decodeHtml} from './deka'
import {isValidIsin} from '../shared/analysis'
import type {Product} from '../shared/model'
type ReadText=(url:string)=>Promise<string>
const clean=(s:string)=>decodeHtml(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()
export function parseUnionDirectory(xml:string):Map<string,string>{
 const result=new Map<string,string>()
 for(const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)){
  try{const u=new URL(decodeHtml(m[1].trim()));const isin=u.pathname.match(/-([A-Z]{2}[A-Z0-9]{9}\d)-fonds-/)?.[1]
   if(u.origin==='https://www.union-investment.de'&&u.pathname.startsWith('/fonds/')&&isin&&isValidIsin(isin))result.set(isin,u.href)
  }catch{/* Ignore non-product sitemap entries. */}
 }
 if(!result.size)throw new Error('Union-Verzeichnis hat ein unbekanntes Format.')
 return result
}
let directory:{expires:number;data:Map<string,string>}|undefined
let pending:Promise<Map<string,string>>|undefined
export async function unionDirectory(read:ReadText):Promise<Map<string,string>>{
 if(directory&&directory.expires>Date.now())return directory.data
 if(!pending)pending=read('https://www.union-investment.de/sitemap.xml').then(parseUnionDirectory).then(data=>{directory={data,expires:Date.now()+6*3600_000};return data}).finally(()=>{pending=undefined})
 return pending
}
export function parseUnionProduct(html:string,isin:string,url:string):Product|null{
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'')
 const descriptions=[...html.matchAll(/<meta\b[^>]*>/gi)].filter(m=>/\b(?:name|property)=["'](?:description|og:description)["']/i.test(m[0])).map(m=>decodeHtml(m[0].match(/\bcontent="([^"]*)"/i)?.[1]||''))
 if(!title.endsWith('| Union Investment')||!descriptions.some(s=>new RegExp(`\\bISIN:\\s*${isin}\\b`).test(s)))return null
 const name=title.replace(/\s*\| Union Investment$/,'').trim();if(!name)return null
 return {id:isin,isin,name,kind:'fund',provider:'union-fund',currency:'',basis:'holdings',breakdowns:{},verified:true,checkedAt:new Date().toISOString(),identitySource:'Union Investment · offizielles Produktprofil',productUrl:url,notes:'Produktidentität auf der Anbieterseite bestätigt. Zusammensetzung und Kurs sind davon unabhängig; fehlende Angaben bleiben unbekannt.'}
}
export async function lookupUnion(isin:string,read:ReadText){
 const url=(await unionDirectory(read)).get(isin);if(!url)return null
 const product=parseUnionProduct(await read(url),isin,url)
 if(!product)throw new Error('Union-Produktseite konnte nicht eindeutig bestätigt werden.')
 return product
}
export function parseOnvista(html:string,isin:string):Product|null{
 const script=html.match(/<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1]
 if(!script)throw new Error('Zusätzliche Wertpapiersuche hat ein unbekanntes Format.')
 const snapshot=JSON.parse(script)?.props?.pageProps?.data?.snapshot
 const i=snapshot?.instrument
 if(!i||i.isin!==isin||typeof i.name!=='string'||!i.name.trim())return null
 const kinds:Record<string,Product['kind']>={STOCK:'stock',FUND:'fund',ETF:'etf',CERTIFICATE:'structured',WARRANT:'structured',BOND:'other'}
 const kind=kinds[i.entityType]||'other'
 const url=i.urls?.WEBSITE
 if(typeof url!=='string'||!url.startsWith('https://www.onvista.de/'))return null
 return {id:isin,isin,name:i.name.trim(),kind,provider:'onvista',currency:'',basis:kind==='structured'?'exposure':'holdings',breakdowns:{},verified:true,checkedAt:new Date().toISOString(),identitySource:'Onvista · ISIN-genaues Wertpapierprofil',productUrl:url,notes:'Produktidentität bestätigt. Keine vollständige Bestandsliste aus dieser Quelle übernommen. Depotwert bitte in EUR erfassen; ein Treffer bestätigt keine Handelbarkeit bei einem bestimmten Broker.'}
}
export async function lookupOnvista(isin:string,read:ReadText){return parseOnvista(await read('https://www.onvista.de/suche?searchValue='+isin),isin)}
