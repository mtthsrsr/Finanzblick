import {build} from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['src/main/discovery.ts','src/main/productLink.ts','src/main/providers.ts','src/shared/searchInput.ts'],outdir:'tests/.discovery',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},external:['xlsx']});
const {parseUnionDirectory,parseUnionProduct,parseOnvista}=await import('./.discovery/main/discovery.mjs');
const {supportedProductLink,parseProductLink,readProductLink}=await import('./.discovery/main/productLink.mjs');
const {searchInput}=await import('./.discovery/shared/searchInput.mjs');
const {lookupInput,lookupISIN}=await import('./.discovery/main/providers.mjs');
const isin='DE0008491002',url=`https://www.union-investment.de/fonds/Test-${isin}-fonds-849100`;
const html=`<title>Test &amp; Fonds | Union Investment</title><meta name="description" content="ISIN: ${isin} | WKN: 849100">`;
const map=parseUnionDirectory(`<urlset><url><loc>${url}</loc></url><url><loc>https://evil.example/fonds/Test-${isin}-fonds-849100</loc></url></urlset>`);
assert.equal(map.size,1);assert.equal(map.get(isin),url);assert.throws(()=>parseUnionDirectory('<html>Unavailable</html>'));
assert.equal(parseUnionProduct(html,isin,url).name,'Test & Fonds');assert.equal(parseUnionProduct(html,'DE0008491051',url),null);
assert.equal(parseUnionProduct(`<title>Wrong | Union Investment</title><p>${isin}</p>`,isin,url),null);
const onvista=(id=isin)=>`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:{data:{snapshot:{instrument:{isin:id,name:'Synthetic fund',entityType:'FUND',urls:{WEBSITE:'https://www.onvista.de/fonds/test-'+id}},quote:{last:999,isoCurrency:'USD'}}}}}})}</script>`;
assert.equal(parseOnvista(onvista(),isin).kind,'fund');assert.equal(parseOnvista(onvista(),isin).price,undefined);assert.equal(parseOnvista(onvista(),isin).currency,'');assert.equal(parseOnvista(onvista('DE0008491051'),isin),null);
assert.equal(searchInput(url).isin,isin);assert.equal(searchInput(' de0008491002 ').isin,isin);
assert.ok(searchInput('https://example.org/'+isin+'/DE0008491051').error);
assert.ok(searchInput('http://example.org/'+isin).error);assert.ok(searchInput('https://user:pass@example.org/'+isin).error);
assert.equal(supportedProductLink('https://www.union-investment.de.evil.example/foo'),false);assert.equal(supportedProductLink('https://127.0.0.1/foo'),false);
assert.equal(parseProductLink(html,url).isin,isin);
const original=globalThis.fetch;
try{
 let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('',{status:302,headers:{location:'https://127.0.0.1/private'}})};
 await assert.rejects(readProductLink(url));assert.equal(calls,1);
 // Direct import succeeds even while all directory/search endpoints are offline.
 calls=0;globalThis.fetch=async input=>{calls++;if(String(input)===url)return new Response(html);throw new Error('Offline search')};
 const direct=await lookupInput(url);assert.equal(direct.product.isin,isin);assert.equal(direct.product.personalUrl,url);assert.equal(calls,1);
 globalThis.fetch=async()=>{throw new Error('Offline')};
 assert.equal((await lookupISIN('DE0008491051')).status,'unavailable');
 assert.equal((await lookupInput('https://example.org/unknown')).status,'not-found');
}finally{globalThis.fetch=original}
console.log('Discovery: directory, exact identity, direct links with search offline, redirects, ambiguous links, foreign quotes and outages passed.');
