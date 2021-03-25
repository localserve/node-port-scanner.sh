#!/usr/bin/env node
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var totalPorts = 65535;
var range = Math.ceil(totalPorts / numCPUs);
var net = require('net');
function mainThreadWork() {
    // console.log(`Master ${process.pid} is running`);
    var openedPorts = [];
    var accessedPorts = 0;
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        (function (_port, _range) {
            // last value of range via (i+1)*range will be equal to next-i's i*range
            _range = _range - 1;
            // setup workers
            cluster
                .fork()
                .on('message', function (msg) {
                if (msg.cmd === 'nmap') {
                    if (msg.connected) {
                        openedPorts.push(msg.port);
                    }
                    killChildren();
                }
                else {
                    console.log(Object.keys(msg));
                }
            })
                .send(JSON.stringify({ nmap: true, port: _port, range: _range }));
        })((i * range), ((i + 1) * range));
    }
    function killChildren() {
        accessedPorts++;
        if (accessedPorts >= totalPorts) {
            for (var id in cluster.workers) {
                cluster.workers[id].send(JSON.stringify({ killself: true }));
            }
        }
    }
    cluster.on('exit', function ( /*worker, code, signal*/) {
        // console.log(`worker ${worker.process.pid} died`);
        var died = 0;
        for (var _ in cluster.workers) {
            died++;
        }
        if (died === 0) {
            console.log(openedPorts.sort(function (a, b) { return a - b; }));
        }
    });
}
function workerThreadWork() {
    // console.log(`Worker ${process.pid} started`);
    process.on('message', function (msg) {
        msg = JSON.parse(msg);
        if (msg.nmap) {
            connect(msg.port, msg.range);
        }
        else if (msg.killself) {
            process.kill(process.pid);
        }
    });
    function connect(port, range) {
        for (var i = port; i <= range; i++) {
            if (i < 1 || i > totalPorts)
                continue;
            (function (_port) {
                var s = new net.Socket();
                s.connect(_port).on('connect', function () {
                    // console.log(_port);
                    // @ts-ignore // TS2722: Cannot invoke an object which is possibly 'undefined'. (process)
                    process.send({ cmd: 'nmap', port: _port, connected: true });
                    s.end();
                    s.destroy();
                });
                s.on('error', function () {
                    // @ts-ignore // TS2722: Cannot invoke an object which is possibly 'undefined'. (process)
                    process.send({ cmd: 'nmap', port: _port, connected: false });
                    s.end();
                    s.destroy();
                });
            })(i);
        }
    }
}
function scanner() {
    if (cluster.isMaster) {
        mainThreadWork();
    }
    else if (cluster.isWorker) {
        workerThreadWork();
    }
}
scanner();
//# sourceMappingURL=package.js.map