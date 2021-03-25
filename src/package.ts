#!/usr/bin/env node

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const totalPorts = 65535;
const range = Math.ceil(totalPorts / numCPUs);

const net = require('net');

type MainReceiveMessage = {
    cmd: string
    connected: boolean
    port: number
}

function mainThreadWork() {
    // console.log(`Master ${process.pid} is running`);
    const openedPorts: number[] = [];
    let accessedPorts = 0;
    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        ((_port, _range) => {
            // last value of range via (i+1)*range will be equal to next-i's i*range
            _range = _range - 1;
            // setup workers
            cluster
                .fork()
                .on('message', (msg: MainReceiveMessage) => {
                    if (msg.cmd === 'nmap') {
                        if (msg.connected) {
                            openedPorts.push(msg.port);
                        }
                        killChildren();
                    } else {
                        console.log(Object.keys(msg));
                    }
                })
                .send(JSON.stringify({nmap: true, port: _port, range: _range}));
        })((i * range), ((i + 1) * range));
    }

    function killChildren() {
        accessedPorts++;
        if (accessedPorts >= totalPorts) {
            for (const id in cluster.workers) {
                cluster.workers[id].send(JSON.stringify({killself: true}));
            }
        }
    }

    cluster.on('exit', (/*worker, code, signal*/) => {
        // console.log(`worker ${worker.process.pid} died`);
        let died = 0;
        for (const _ in cluster.workers) {
            died++;
        }
        if (died === 0) {
            console.log(openedPorts.sort((a: number, b: number) => a - b));
        }
    });
}

function workerThreadWork() {
    // console.log(`Worker ${process.pid} started`);

    process.on('message', msg => {
        msg = JSON.parse(msg);
        if (msg.nmap) {
            connect(msg.port, msg.range);
        } else if (msg.killself) {
            process.kill(process.pid);
        }
    });

    function connect(port: number, range: number) {
        for (let i = port; i <= range; i++) {
            if (i < 1 || i > totalPorts) continue;
            ((_port) => {
                const s = new net.Socket();
                s.connect(_port).on('connect', () => {
                    // console.log(_port);
                    // @ts-ignore // TS2722: Cannot invoke an object which is possibly 'undefined'. (process)
                    process.send({cmd: 'nmap', port: _port, connected: true});
                    s.end();
                    s.destroy();
                });
                s.on('error', () => {
                    // @ts-ignore // TS2722: Cannot invoke an object which is possibly 'undefined'. (process)
                    process.send({cmd: 'nmap', port: _port, connected: false});
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

    } else if (cluster.isWorker) {
        workerThreadWork();
    }
}

scanner();
