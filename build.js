const esbuild = require('esbuild');
const sveltePlugin = require('esbuild-svelte');
const http = require('http');
const { spawn } = require('child_process');
const request = require('http').request;

const clients = [];

const options = {
    entryPoints: ['src/index.js'],
    bundle: true,
    outfile: 'public/bundle.js',
    plugins: [sveltePlugin()],
    banner: { js: ' (() => new EventSource("/esbuild").onmessage = () => location.reload())();' },
    watch: {
        onRebuild(error, result) {
            clients.forEach((res) => res.write('data: update\n\n'))
            clients.length = 0
            console.log(error ? error : '...')
        }
    }
};

esbuild.build(options).catch(() => process.exit(1));

esbuild.serve({ servedir: './public' }, {}).then(() => {
    http.createServer((req, res) => {
        const { url, method, headers } = req;
        if (req.url === '/esbuild') {
            return clients.push(
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                })
            );
        }
        const path = url.split('/').pop().indexOf('.') ? url : `/index.html`; //for PWA with router
        req.pipe(
            request({ hostname: '0.0.0.0', port: 8000, path, method, headers }, (prxRes) => {
                res.writeHead(prxRes.statusCode, prxRes.headers)
                prxRes.pipe(res, { end: true })
            }),
            { end: true }
        );
    }).listen(5000);

});

