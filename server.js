const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.slice(1));

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error: Internal Server Error');
            return;
        }

        const contentType = getContentType(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data); // Wysyłamy zawartość pliku HTML lub CSS
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    ws.on('message', message => {
        console.log(`Received message: ${message}`);
    });

    // Wysyłamy wiadomość odświeżenia przy połączeniu z klientem WebSocket
    ws.send('refresh');
});

// Mechanizm automatycznego odświeżania pliku HTML i CSS co sekundę
setInterval(() => {
    checkFileChanges();
}, 1000);

function checkFileChanges() {
    const filesToWatch = ['index.html', 'style.css'];

    filesToWatch.forEach(file => {
        const filePath = path.join(__dirname, file);
        fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
            console.log(`${file} changed, refreshing...`);
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send('refresh');
                }
            });
        });
    });
}

function getContentType(filePath) {
    const extname = path.extname(filePath);
    switch (extname) {
        case '.html':
            return 'text/html';
        case '.css':
            return 'text/css';
        default:
            return 'text/plain';
    }
}
