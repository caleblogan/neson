export class Apu {
    constructor() { }

    cpuRead(address: number): number {
        // throw new Error("Not implemented")
        return 0
    }
    cpuWrite(address: number, value: number) {
        // throw new Error("Not implemented")
    }

    // These are normally disabled; probably can ignore
    cpuReadIO(address: number): number {
        throw new Error("Not implemented")
    }
    cpuWriteIO(address: number, value: number) {
        throw new Error("Not implemented")
    }
}