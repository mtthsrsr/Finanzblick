import {parseUnionProduct,parseOnvista} from './discovery'
import {parseCertificate} from './certificates'
import {parseDekaFund,decodeHtml} from './deka'
import {isValidIsin} from '../shared/analysis'
import {searchInput} from '../shared/searchInput'
import type {Product} from '../shared/model'
const hosts=new Set(['www.union-investment.de','www.deka.de','www.deka-etf.de','www.onvista.de','www.justetf.com'])
export function supportedProductLink(raw:string):boolean{
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.has(u.hostname)}catch{return false}
}
export async function readProductLink(raw:string):Promise<{html:string;url:string}>{
 let url=raw
 for(let n=0;n<4;n++){
  if(!supportedProductLink(url))throw new Error('Diese Produktseite wird nicht automatisch ausgelesen.')
  const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)})
  if(r.status>=300&&r.status<400){const location=r.headers.get('location');if(!location)throw new Error('Ungültige Weiterleitung.');url=new URL(location,url).href;continue}
  if(!r.ok)throw new Error('Produktseite nicht erreichbar.')
  const reader=r.body?.getReader();if(!reader)throw new Error('Leere Produktseite.')
  let length=0;const chunks:Uint8Array[]=[]
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>10_000_000){await reader.cancel();throw new Error('Produktseite zu groß.')}chunks.push(value)}
  return {html:Buffer.concat(chunks).toString('utf8'),url}
 }
 throw new Error('Zu viele Weiterleitungen.')
}
export function parseProductLink(html:string,url:string,expected?:string):Product|null{
 const host=new URL(url).hostname
 let isin=expected||searchInput(url).isin
 if(host==='www.onvista.de'){
  const script=html.match(/<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if(!isin&&script)isin=JSON.parse(script)?.props?.pageProps?.data?.snapshot?.instrument?.isin
  return isin&&isValidIsin(isin)?parseOnvista(html,isin):null
 }
 if(!isin){
  const title=decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'')
  const ids=[...new Set((title.match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g)||[]).filter(isValidIsin))]
  if(ids.length===1)isin=ids[0]
 }
 if(!isin||!isValidIsin(isin))return null
 if(host==='www.union-investment.de')return parseUnionProduct(html,isin,url)
 if(host==='www.deka.de'){
  const certificate=parseCertificate(html,isin);if(certificate)return {...certificate,productUrl:url}
  const fund=parseDekaFund(html,isin)
  if(fund)return {...fund,verified:true,checkedAt:new Date().toISOString(),identitySource:'Deka · direkt verlinktes Fondsprofil',productUrl:url}
 }
 return null
}
