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
            case 0x0A:
                this.modeAcccumulator()
                this.ASL(true)
                this.cycles = 2
                break
            case 0x06:
                this.modeZeroPage()
                this.ASL()
                this.cycles = 5
                break
            case 0x16:
                this.modeZeroPageX()
                this.ASL()
                this.cycles = 6
                break
            case 0x0E:
                this.modeAbsolute()
                this.ASL()
                this.cycles = 6
                break
            case 0x1E:
                this.modeAbsoluteX()
                this.ASL()
                this.cycles = 7
                break
            case 0x90:
                this.modeRelative()
                this.BCC()
                this.cycles += 2
                break
            case 0xB0:
                this.modeRelative()
                this.BCS()
                this.cycles += 2
                break
            case 0xF0:
                this.modeRelative()
                this.BEQ()
                this.cycles += 2
                break
            case 0x24:
                this.modeZeroPage()
                this.BIT()
                this.cycles = 3
                break
            case 0x2C:
                this.modeAbsolute()
                this.BIT()
                this.cycles = 4
                break
            case 0x30:
                this.modeRelative()
                this.BMI()
                this.cycles += 2
                break
            case 0xD0:
                this.modeRelative()
                this.BNE()
                this.cycles += 2
                break
            case 0x10:
                this.modeRelative()
                this.BPL()
                this.cycles += 2
                break
            case 0x00:
                this.modeImplicit()
                this.BRK()
                this.cycles = 7
                break
            case 0x50:
                this.modeRelative()
                this.BVC()
                this.cycles += 2
                break
            case 0x70:
                this.modeRelative()
                this.BVS()
                this.cycles += 2
                break
            case 0x18:
                this.modeImplicit()
                this.CLC()
                this.cycles = 2
                break
            case 0xD8:
                this.modeImplicit()
                this.CLD()
                this.cycles = 2
                break
            case 0x58:
                this.modeImplicit()
                this.CLI()
                this.cycles = 2
                break
            case 0xB8:
                this.modeImplicit()
                this.CLV()
                this.cycles = 2
                break
            case 0xC9:
                this.modeImmediate()
                this.CMP()
                this.cycles = 2
                break
            case 0xC5:
                this.modeZeroPage()
                this.CMP()
                this.cycles = 3
                break
            case 0xD5:
                this.modeZeroPageX()
                this.CMP()
                this.cycles = 4
                break
            case 0xCD:
                this.modeAbsolute()
                this.CMP()
                this.cycles = 4
                break
            case 0xDD: {
                const pageCrossed = this.modeAbsoluteX()
                this.CMP()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xD9: {
                const pageCrossed = this.modeAbsoluteY()
                this.CMP()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xC1:
                this.modeIndirectX()
                this.CMP()
                this.cycles = 6
                break
            case 0xD1: {
                const pageCrossed = this.modeIndirectY()
                this.CMP()
                this.cycles = 5 + pageCrossed
                break
            }
            case 0xE0:
                this.modeImmediate()
                this.CPX()
                this.cycles = 2
                break
            case 0xE4:
                this.modeZeroPage()
                this.CPX()
                this.cycles = 3
                break
            case 0xEC:
                this.modeAbsolute()
                this.CPX()
                this.cycles = 4
                break
            case 0xC0:
                this.modeImmediate()
                this.CPY()
                this.cycles = 2
                break
            case 0xC4:
                this.modeZeroPage()
                this.CPY()
                this.cycles = 3
                break
            case 0xCC:
                this.modeAbsolute()
                this.CPY()
                this.cycles = 4
                break
            case 0xC6:
                this.modeZeroPage()
                this.DEC()
                this.cycles = 5
                break
            case 0xD6:
                this.modeZeroPageX()
                this.DEC()
                this.cycles = 6
                break
            case 0xCE:
                this.modeAbsolute()
                this.DEC()
                this.cycles = 6
                break
            case 0xDE:
                this.modeAbsoluteX()
                this.DEC()
                this.cycles = 7
                break
            case 0xCA:
                this.modeImplicit()
                this.DEX()
                this.cycles = 2
                break
            case 0x88:
                this.modeImplicit()
                this.DEY()
                this.cycles = 2
                break
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
        if (this.operatingValue & 0x80) {
            this.operatingValue |= 0xFFFF_FF00 // sign extend; TODO: I think this should work
        }
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
    // TODO: not sure if this is correct
    ASL(targetAccumulator: boolean = false) {
        this.carryFlag = this.operatingValue & 0x80 ? 1 : 0
        let result = (this.operatingValue << 1) & 0xFF
        this.zeroFlag = result === 0 ? 1 : 0 // TDOO: docs say only if A is 0, but i think that is wrong
        this.negativeFlag = (result & 0x80) ? 1 : 0

        if (targetAccumulator) {
            this.Accumulator = result
        } else {
            this.write(this.operatingAddress, result)
        }
    }
    BCC() {
        let offset = this.operatingValue

        if (this.carryFlag === 0) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BCS() {
        let offset = this.operatingValue

        if (this.carryFlag === 1) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BEQ() {
        let offset = this.operatingValue

        if (this.zeroFlag === 1) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BIT() {
        const result = this.Accumulator & this.operatingValue
        this.zeroFlag = result === 0 ? 1 : 0
        this.overflowFlag = (this.operatingValue >> 6) & 1
        this.negativeFlag = (this.operatingValue >> 7) & 1
    }
    BMI() {
        let offset = this.operatingValue

        if (this.negativeFlag === 1) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BNE() {
        let offset = this.operatingValue

        if (this.zeroFlag === 0) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BPL() {
        let offset = this.operatingValue

        if (this.negativeFlag === 0) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BRK() {
        throw new Error("Not implemented; system dependent")
    }
    BVC() {
        let offset = this.operatingValue

        if (this.overflowFlag === 0) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    BVS() {
        let offset = this.operatingValue

        if (this.overflowFlag === 1) {
            this.cycles++
            const newAddress = (this.PC + offset) & 0xFFFF
            if ((newAddress & 0xFF00) !== (this.PC & 0xFF00)) {
                this.cycles++
            }
            this.PC = newAddress
        }
    }
    CLC() {
        this.carryFlag = 0
    }
    CLD() {
        this.decimalFlag = 0
    }
    CLI() {
        this.interruptFlag = 0
    }
    CLV() {
        this.overflowFlag = 0
    }
    CMP() {
        const result = this.Accumulator - this.operatingValue
        this.carryFlag = this.Accumulator >= this.operatingValue ? 1 : 0
        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0 // TODO: could be problem with signedness
    }
    CPX() {
        const result = this.X - this.operatingValue
        this.carryFlag = this.X >= this.operatingValue ? 1 : 0
        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0 // TODO: could be problem with signedness
    }
    CPY() {
        const result = this.Y - this.operatingValue
        this.carryFlag = this.Y >= this.operatingValue ? 1 : 0
        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0 // TODO: could be problem with signedness
    }
    DEC() {
        const result = (this.operatingValue - 1) & 0xFF
        this.write(this.operatingAddress, result)

        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0
    }
    DEX() {
        this.X = (this.X - 1) & 0xFF
        this.zeroFlag = this.X === 0 ? 1 : 0
        this.negativeFlag = this.X & 0x80 ? 1 : 0
    }
    DEY() {
        this.Y = (this.Y - 1) & 0xFF
        this.zeroFlag = this.Y === 0 ? 1 : 0
        this.negativeFlag = this.Y & 0x80 ? 1 : 0
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