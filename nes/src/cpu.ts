export class Cpu {
    // TODO: memory should be a separate class and in the bus
    memory: Uint8Array = new Uint8Array(64 * 1024) // 64KB

    PC: number = 0 // 16-bit

    // Pushing bytes to the stack causes the stack pointer to be decremented. Conversely pulling bytes causes it to be incremented.
    // The CPU does not detect if the stack is overflowed by excessive pushing or pulling operations and will most likely result in the program crashing.
    // 8-bit points to the next free location on the stack.
    SP: number = 0x01FF // stack offset $0100 and $01FF TODO: might be able to have ti point directly to $01FF

    _accumulator: number = 0 // 8-bit
    get Accumulator() { return this._accumulator }
    set Accumulator(byte: number) { this._accumulator = byte & 0xFF }

    _X: number = 0 // 8-bit
    get X() { return this._X }
    set X(byte: number) { this._X = byte & 0xFF }

    _Y: number = 0 // 8-bit
    get Y() { return this._Y }
    set Y(byte: number) { this._Y = byte & 0xFF }

    // Flags
    // TODO: maybe this should be a bitfield
    carryFlag: number = 0
    zeroFlag: number = 0
    interruptFlag: number = 0
    decimalFlag: number = 0 // Not used in NES
    breakFlag: number = 0
    overflowFlag: number = 0
    negativeFlag: number = 0

    // Current Instruction
    opcode: number = 0
    operatingAddress: number = 0
    operatingValue: number = 0
    // number of cycles left for the current instruction;
    // extra cycles are added for page boundary, branch taken & branch take page boundary
    cycles: number = 0

    constructor() {
        this.reset()
    }

    reset() {
        this.PC = 0x0000 // TODO: lookup start address
    }

    read(address: number) {
        return this.memory[address]
    }

    write(address: number, value: number) {
        this.memory[address] = value
    }

    // Runs the next instruction which may take multiple cycles to complete.
    clock(): void {
        if (this.cycles > 0) {
            this.cycles--
            return
        }
        this.opcode = this.read(this.PC)
        this.PC++
        switch (this.opcode) {
            case 0x69:
                this.modeImmediate()
                this.ADC()
                this.cycles = 2
                break
            case 0x65:
                this.modeZeroPage()
                this.ADC()
                this.cycles = 3
                break
            case 0x75:
                this.modeZeroPageX()
                this.ADC()
                this.cycles = 4
                break
            case 0x6D:
                this.modeAbsolute()
                this.ADC()
                this.cycles = 4
                break
            case 0x7D: {
                const extraCycle = this.modeAbsoluteX()
                this.ADC()
                // +1 cycle if page boundary is crossed
                this.cycles = 4 + extraCycle
                break
            }
            case 0x79: {
                const extraCycle = this.modeAbsoluteY()
                this.ADC()
                // +1 cycle if page boundary is crossed
                this.cycles = 4 + extraCycle
                break
            }
            case 0x61:
                this.modeIndirectX()
                this.ADC()
                this.cycles = 6
                break
            case 0x71: {
                const extraCycle = this.modeIndirectY()
                this.ADC()
                // +1 cycle if page boundary is crossed
                this.cycles = 5 + extraCycle
                break
            }
            default:
                throw new Error(`Unknown opcode: ${this.opcode}`)
        }
        this.cycles -= 1
    }

    // Addressing Modes
    // If boundary is crossed, return 1
    modeImplicit() { return 0 }
    modeAcccumulator() { return 0 }
    modeImmediate() { return 0 }
    modeZeroPage() { return 0 }
    modeZeroPageX() { return 0 }
    modeZeroPageY() { return 0 }
    modeRelative() { return 0 }
    modeAbsolute() { return 0 }
    modeAbsoluteX() { return 0 }
    modeAbsoluteY() { return 0 }
    modeIndirect() { return 0 }
    modeIndirectX() { return 0 }
    modeIndirectY() { return 0 }

    // Instructions
    ADC() {
        this.Accumulator = this.Accumulator + this.operatingValue + this.carryFlag
    }
    AND() { }
    ASL() { }
    BCC() { }
    BCS() { }
    BEQ() { }
    BIT() { }
    BMI() { }
    BNE() { }
    BPL() { }
    BRK() { }
    BVC() { }
    BVS() { }
    CLC() { }
    CLD() { }
    CLI() { }
    CLV() { }
    CMP() { }
    CPX() { }
    CPY() { }
    DEC() { }
    DEX() { }
    DEY() { }
    EOR() { }
    INC() { }
    INX() { }
    INY() { }
    JMP() { }
    JSR() { }
    LDA() { }
    LDX() { }
    LDY() { }
    LSR() { }
    NOP() { }
    ORA() { }
    PHA() { }
    PHP() { }
    PLA() { }
    PLP() { }
    ROL() { }
    ROR() { }
    RTI() { }
    RTS() { }
    SBC() { }
    SEC() { }
    SED() { }
    SEI() { }
    STA() { }
    STX() { }
    STY() { }
    TAX() { }
    TAY() { }
    TSX() { }
    TXA() { }
    TXS() { }
    TYA() { }

}