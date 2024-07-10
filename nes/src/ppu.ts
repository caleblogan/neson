export class Ppu {
    cpuRegisters: Uint8Array = new Uint8Array(8)
    constructor() { }

    readCpuRegister(reg: number) {
        reg = reg % 8
        return this.cpuRegisters[reg]
    }
    writeCpuRegister(reg: number, value: number) {
        reg = reg % 8
        this.cpuRegisters[reg] = value
    }
}