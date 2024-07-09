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

    // Current Instruction being executed
    // These instructions are useful for debugging and will most likely be faster than passing around objects
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
        // TODO: thise requires many more things such as setting cycles, flags, etc.
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
                this.cycles = 4 + extraCycle
                break
            }
            case 0x79: {
                const extraCycle = this.modeAbsoluteY()
                this.ADC()
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
                this.cycles = 5 + extraCycle
                break
            }
            case 0x29:
                this.modeImmediate()
                this.AND()
                this.cycles = 2
                break
            case 0x25:
                this.modeZeroPage()
                this.AND()
                this.cycles = 3
                break
            case 0x35:
                this.modeZeroPageX()
                this.AND()
                this.cycles = 4
                break
            case 0x2D:
                this.modeAbsolute()
                this.AND()
                this.cycles = 4
                break
            case 0x3D: {
                const pageCrossed = this.modeAbsoluteX()
                this.AND()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x39: {
                const pageCrossed = this.modeAbsoluteY()
                this.AND()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x21:
                this.modeIndirectX()
                this.AND()
                this.cycles = 6
                break
            case 0x31: {
                const pageCrossed = this.modeIndirectY()
                this.AND()
                this.cycles = 5 + pageCrossed
                break
            }
            default:
                throw new Error(`Unknown opcode: ${this.opcode}`)
        }
        this.cycles--
    }

    // Addressing Modes
    // If boundary is crossed, return 1
    modeImplicit(): number {
        // Noop -- values are implied
        return 0
    }
    modeAcccumulator(): number {
        this.operatingValue = this.Accumulator
        return 0
    }
    modeImmediate(): number {
        this.operatingValue = this.read(this.PC)
        this.PC++
        return 0
    }
    modeZeroPage(): number {
        const offset = this.read(this.PC)
        this.PC++
        this.operatingAddress = offset
        this.operatingValue = this.read(this.operatingAddress)
        return 0
    }
    modeZeroPageX(): number {
        const offset = this.read(this.PC)
        this.PC++
        this.operatingAddress = (offset + this.X) & 0xFF
        this.operatingValue = this.read(this.operatingAddress)
        return 0
    }
    modeZeroPageY(): number {
        const offset = this.read(this.PC)
        this.PC++
        this.operatingAddress = (offset + this.Y) & 0xFF
        this.operatingValue = this.read(this.operatingAddress)
        return 0
    }
    modeRelative(): number {
        // TODO: make sure signed offset -128 to 127 works correctly when using in instructions; 7 bit is 1
        this.operatingValue = this.read(this.PC)
        this.PC++
        return 0
    }
    modeAbsolute(): number {
        const lo = this.read(this.PC)
        this.PC++
        const hi = this.read(this.PC)
        this.PC++
        this.operatingAddress = (hi << 8) | lo
        this.operatingValue = this.read(this.operatingAddress)
        return 0
    }
    // page boundary
    modeAbsoluteX(): number {
        const lo = this.read(this.PC)
        this.PC++
        const hi = this.read(this.PC)
        this.PC++
        const operand = (hi << 8) | lo
        this.operatingAddress = operand + this.X
        return (operand & 0xFF00) !== (this.operatingAddress & 0xFF00) ? 1 : 0
    }
    // page boundary
    modeAbsoluteY(): number {
        const lo = this.read(this.PC)
        this.PC++
        const hi = this.read(this.PC)
        this.PC++
        const operand = (hi << 8) | lo
        this.operatingAddress = operand + this.Y
        return (operand & 0xFF00) !== (this.operatingAddress & 0xFF00) ? 1 : 0
    }
    modeIndirect(): number {
        const loPtr = this.read(this.PC)
        this.PC++
        const hiPtr = this.read(this.PC)
        this.PC++
        const ptr = (hiPtr << 8) | loPtr
        // bug in hardware. if 
        if (loPtr === 0xFF) {
            this.operatingAddress = (this.read(ptr & 0xFF00) << 8) | this.read(ptr)
        } else {
            this.operatingAddress = (this.read(ptr + 1) << 8) | this.read(ptr)
        }
        return 0
    }
    // TODO: double check this; i believe you are supposed to load the address from the zero page and then follow that
    // to the real address. Not sure if wrap around is correct when reading address from zero page.
    modeIndirectX(): number {
        const instructionValue = this.read(this.PC)
        this.PC++
        const lo = this.read((instructionValue + this.X) & 0xFF)
        const hi = this.read((instructionValue + this.X + 1) & 0xFF)
        this.operatingAddress = (hi << 8) | lo
        this.operatingValue = this.read(this.operatingAddress)
        return 0
    }
    modeIndirectY(): number {
        const instructionValue = this.read(this.PC)
        this.PC++
        // val = PEEK(PEEK(arg) + PEEK((arg + 1) % 256) * 256 + Y)
        const lo = this.read(instructionValue)
        const hi = this.read((instructionValue + 1) & 0xFF)
        this.operatingAddress = ((hi << 8) | lo) + this.Y
        this.operatingValue = this.read(this.operatingAddress)
        // page overflow -- if y causes lo byte to carry
        if ((this.operatingAddress & 0xFF00) !== (hi << 8)) {
            return 1
        }
        return 0
    }

    // Instruction Opcodes
    ADC() {
        let result = this.Accumulator + this.operatingValue + this.carryFlag

        this.carryFlag = result > 0xFF ? 1 : 0
        this.zeroFlag = (result & 0xFF) === 0 ? 1 : 0
        // TODO: double check this 
        // My understanding is if A & M have same sign and result has different sign, then overflow
        this.overflowFlag = !(this.Accumulator & 0x80 ^ this.operatingValue & 0x80) && (this.Accumulator & 0x80 ^ result & 0x80) ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0

        this.Accumulator = result
    }
    AND() {
        this.Accumulator &= this.operatingValue
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    ASL() {
        throw new Error("Not implemented")
    }
    BCC() {
        throw new Error("Not implemented")
    }
    BCS() {
        throw new Error("Not implemented")
    }
    BEQ() {
        throw new Error("Not implemented")
    }
    BIT() {
        throw new Error("Not implemented")
    }
    BMI() {
        throw new Error("Not implemented")
    }
    BNE() {
        throw new Error("Not implemented")
    }
    BPL() {
        throw new Error("Not implemented")
    }
    BRK() {
        throw new Error("Not implemented")
    }
    BVC() {
        throw new Error("Not implemented")
    }
    BVS() {
        throw new Error("Not implemented")
    }
    CLC() {
        throw new Error("Not implemented")
    }
    CLD() {
        throw new Error("Not implemented")
    }
    CLI() {
        throw new Error("Not implemented")
    }
    CLV() {
        throw new Error("Not implemented")
    }
    CMP() {
        throw new Error("Not implemented")
    }
    CPX() {
        throw new Error("Not implemented")
    }
    CPY() {
        throw new Error("Not implemented")
    }
    DEC() {
        throw new Error("Not implemented")
    }
    DEX() {
        throw new Error("Not implemented")
    }
    DEY() {
        throw new Error("Not implemented")
    }
    EOR() {
        throw new Error("Not implemented")
    }
    INC() {
        throw new Error("Not implemented")
    }
    INX() {
        throw new Error("Not implemented")
    }
    INY() {
        throw new Error("Not implemented")
    }
    JMP() {
        throw new Error("Not implemented")
    }
    JSR() {
        throw new Error("Not implemented")
    }
    LDA() {
        throw new Error("Not implemented")
    }
    LDX() {
        throw new Error("Not implemented")
    }
    LDY() {
        throw new Error("Not implemented")
    }
    LSR() {
        throw new Error("Not implemented")
    }
    NOP() {
        throw new Error("Not implemented")
    }
    ORA() {
        throw new Error("Not implemented")
    }
    PHA() {
        throw new Error("Not implemented")
    }
    PHP() {
        throw new Error("Not implemented")
    }
    PLA() {
        throw new Error("Not implemented")
    }
    PLP() {
        throw new Error("Not implemented")
    }
    ROL() {
        throw new Error("Not implemented")
    }
    ROR() {
        throw new Error("Not implemented")
    }
    RTI() {
        throw new Error("Not implemented")
    }
    RTS() {
        throw new Error("Not implemented")
    }
    SBC() {
        throw new Error("Not implemented")
    }
    SEC() {
        throw new Error("Not implemented")
    }
    SED() {
        throw new Error("Not implemented")
    }
    SEI() {
        throw new Error("Not implemented")
    }
    STA() {
        throw new Error("Not implemented")
    }
    STX() {
        throw new Error("Not implemented")
    }
    STY() {
        throw new Error("Not implemented")
    }
    TAX() {
        throw new Error("Not implemented")
    }
    TAY() {
        throw new Error("Not implemented")
    }
    TSX() {
        throw new Error("Not implemented")
    }
    TXA() {
        throw new Error("Not implemented")
    }
    TXS() {
        throw new Error("Not implemented")
    }
    TYA() {
        throw new Error("Not implemented")
    }

}