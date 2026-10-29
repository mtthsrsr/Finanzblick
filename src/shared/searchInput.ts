import {isValidIsin} from './analysis'
import {validProductUrl} from './links'
export function searchInput(raw:string):{isin?:string;url?:string;error?:string}{
 const input=raw.trim()
 if(/^https?:\/\//i.test(input)){
  if(!validProductUrl(input))return {error:'Bitte eine HTTPS-Produktadresse ohne Zugangsdaten eingeben.'}
  const url=new URL(input)
  // Only inspect the address. Never fetch arbitrary user URLs or local network hosts.
  let text:string;try{text=decodeURIComponent(url.pathname+' '+url.search).toUpperCase()}catch{return {error:'Die Produktadresse ist ungültig.'}}
  const ids=[...new Set((text.match(/(?<![A-Z0-9])[A-Z]{2}[A-Z0-9]{9}\d(?![A-Z0-9])/g)||[]).filter(isValidIsin))]
  if(ids.length===1)return {isin:ids[0],url:input}
  if(ids.length>1)return {error:'Dieser Link enthält mehrere ISINs. Bitte die ISIN des gewünschten Produkts eingeben.'}
  return {url:input}
 }
 const isin=input.replace(/\s/g,'').toUpperCase()
 return isValidIsin(isin)?{isin}:{error:'Bitte eine gültige ISIN mit 12 Zeichen oder einen HTTPS-Produktlink eingeben.'}
}
