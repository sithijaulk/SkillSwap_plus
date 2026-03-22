const http = require('http');
const server = http.createServer((req, res) => {
    res.end('Test Server OK');
});
server.listen(5001, () => {
    console.log('✅ Local test server listening on 5001');
    process.exit(0);
});
server.on('error', (err) => {
    console.error('❌ Local test server failed:', err.message);
    process.exit(1);
});
