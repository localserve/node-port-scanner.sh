#!/usr/bin/env node
declare const cluster: any;
declare const numCPUs: any;
declare const totalPorts = 65535;
declare const range: number;
declare const net: any;
declare type MainReceiveMessage = {
    cmd: string;
    connected: boolean;
    port: number;
};
declare function mainThreadWork(): void;
declare function workerThreadWork(): void;
declare function scanner(): void;
//# sourceMappingURL=package.d.ts.map