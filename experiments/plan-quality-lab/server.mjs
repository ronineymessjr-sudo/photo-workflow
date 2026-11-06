import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { evaluate } from './lab.mjs';

const html = new URL('./index.html', import.meta.url);
const port = Number(process.env.PORT || 8128);
createServer(async (request, response) => {
  if (request.headers.host !== `127.0.0.1:${port}`) { response.writeHead(403).end(); return; }
  if (request.url === '/api/results' && request.method === 'GET') {
    const body = JSON.stringify(await evaluate());
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
    return;
  }
  if ((request.url === '/' || request.url === '/index.html') && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(await readFile(html));
    return;
  }
  response.writeHead(404).end();
}).listen(port, '127.0.0.1', () => process.stdout.write(`http://127.0.0.1:${port}/\n`));
