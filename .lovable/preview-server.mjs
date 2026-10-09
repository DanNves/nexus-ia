import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('frontend/dist/nexus-ia/browser');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};
http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
 if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(root,'index.html');
 r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r);
}).listen(8080,'0.0.0.0');
