import { mkdir, writeFile } from "node:fs/promises";
import worker from "../worker/index.js";

const source = "http://127.0.0.1:4181";
const months = ["202609", "202610", "202611"];
const snapshot = {};

for (const type of ["sale", "rent"]) {
  for (const ym of months) {
    const response = await fetch(`${source}/api/trades?ym=${ym}&type=${type}`);
    if (!response.ok) throw new Error(`Snapshot request failed: ${type} ${ym}`);
    snapshot[`${type}-${ym}`] = await response.json();
  }
}

const pageResponse = await worker.fetch(new Request("http://pages.local/"), {}, {});
let html = await pageResponse.text();
html = html.replace("</head>", '<script src="./static-data.js"></script></head>');

const shim = `const __TRADE_SNAPSHOT__=${JSON.stringify(snapshot)};
const __nativeFetch__=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=new URL(String(input),location.href);
  if(url.pathname.endsWith('/api/status'))return new Response(JSON.stringify({publicData:true,reb:false,snapshot:true,region:'27290'}),{headers:{'content-type':'application/json'}});
  if(url.pathname.endsWith('/api/trades')){
    const key=(url.searchParams.get('type')||'sale')+'-'+url.searchParams.get('ym');
    const data=__TRADE_SNAPSHOT__[key]||{configured:true,source:'국토교통부 실거래가 공개시스템 정적 스냅샷',items:[]};
    return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
  }
  return __nativeFetch__(input,init);
};`;

await mkdir("docs", { recursive: true });
await writeFile("docs/index.html", html, "utf8");
await writeFile("docs/static-data.js", shim, "utf8");
await writeFile("docs/.nojekyll", "", "utf8");
console.log(`Exported GitHub Pages snapshot with ${Object.keys(snapshot).length} datasets`);
