const http = require('http');

const server = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: '127.0.0.1',
    port: 5173,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: '127.0.0.1:5173' }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    clientRes.writeHead(502);
    clientRes.end('Proxy error: ' + err.message);
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 5173,
    path: req.url,
    method: req.method,
    headers: req.headers
  });
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
      Object.keys(proxyRes.headers).map(h => `${h}: ${proxyRes.headers[h]}`).join('\r\n') + '\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.end();
});

server.listen(80, '0.0.0.0', () => {
  console.log('Reverse proxy active on http://192.168.1.55 (Port 80) -> 5173');
});
