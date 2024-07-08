export class Cpu {
    PC: number = 0 // 16-bit

    // Pushing bytes to the stack causes the stack pointer to be decremented. Conversely pulling bytes causes it to be incremented.
    // The CPU does not detect if the stack is overflowed by excessive pushing or pulling operations and will most likely result in the program crashing.
    // 8-bit points to the next free location on the stack.
    SP: number = 0x01FF // stack offset $0100 and $01FF TODO: might be able to have ti point directly to $01FF

    // Runs the next instruction which may take multiple cycles to complete.
    step() {
        const opcode = 0x69 // hardcoded for now
        switch (opcode) {
            case 0x69: // ADC
                this.modeImmediate()
                this.ADC()
                break
            case 0x65:
                this.modeZeroPage()
                this.ADC()
                break
            default:
                throw new Error(`Unknown opcode: ${opcode}`)
        }
    }

    // Addressing Modes
    modeImplicit() { }
    modeAcccumulator() { }
    modeImmediate() { }
    modeZeroPage() { }
    modeZeroPageX() { }
    modeZeroPageY() { }
    modeRelative() { }
    modeAbsolute() { }
    modeAbsoluteX() { }
    modeAbsoluteY() { }
    modeIndirect() { }
    modeIndexedIndirect() { }
    modeIndirectIndirectIndexed() { }

    // Instructions
    ADC() { }
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