export class UnknownOpcode extends Error {
    constructor(opcode: number) {
        super(`Unknown opcode: 0x${opcode.toString(16)}`);
        this.name = "UnknownOpcode";
    }
}