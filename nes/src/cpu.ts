import { UnknownOpcode } from "./errors"
import { fbin, hex } from "./utils"

const STACK_BOTTOM = 0x0100
const INTERRUPT_VECTOR_NMI = 0xFFFA
const INTERRUPT_VECTOR_RESET = 0xFFFC
const INTERRUPT_VECTOR_IRQ = 0xFFFE

export class Cpu {
    // TODO: memory should be a separate class and in the bus
    memory: Uint8Array = new Uint8Array(64 * 1024) // 64KB

    _PC: number = 0 // 16-bit
    get PC() { return this._PC & 0xFFFF }
    set PC(address: number) { this._PC = address & 0xFFFF }

    // Pushing bytes to the stack causes the stack pointer to be decremented. Conversely pulling bytes causes it to be incremented.
    // The CPU does not detect if the stack is overflowed by excessive pushing or pulling operations and will most likely result in the program crashing.
    // 8-bit points to the next free location on the stack.
    _SP: number = 0xFF // aka S register
    get SP() { return this._SP & 0xFF }
    set SP(byte: number) { this._SP = byte & 0xFF }

    _accumulator: number = 0 // 8-bit
    get Accumulator() { return this._accumulator & 0xFF }
    set Accumulator(byte: number) { this._accumulator = byte & 0xFF }

    _X: number = 0 // 8-bit
    get X() { return this._X & 0xFF }
    set X(byte: number) { this._X = byte & 0xFF }

    _Y: number = 0 // 8-bit
    get Y() { return this._Y & 0xFF }
    set Y(byte: number) { this._Y = byte & 0xFF }

    // Flags aka P register
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
    _operatingAddress: number = 0
    get operatingAddress() { return this._operatingAddress }
    set operatingAddress(val: number) { this._operatingAddress = val & 0xFFFF }
    _operatingValue: number = 0
    get operatingValue() { return this._operatingValue & 0xFFFF } // TODO: maybe it should be 8-bit
    set operatingValue(val: number) { this._operatingValue = val & 0xFFFF }
    // number of cycles left for the current instruction;
    // extra cycles are added for page boundary, branch taken & branch take page boundary
    cycles: number = 0

    constructor() { }

    powerUp() {
        this.PC = this.read(INTERRUPT_VECTOR_RESET + 1) << 8 | this.read(INTERRUPT_VECTOR_RESET)
        this.SP = 0xFD
        this.interruptFlag = 1
    }

    // TODO: figure out how to handle interrupts
    reset() {
        this.PC = this.read(INTERRUPT_VECTOR_RESET + 1) << 8 | this.read(INTERRUPT_VECTOR_RESET)
        this.SP -= 3
        this.interruptFlag = 1
    }

    read(address: number) {
        return this.memory[address & 0xFFFF]
    }

    readBytes(addresses: number[]) {
        return addresses.map((address) => this.read(address))
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
            case 0x49:
                this.modeImmediate()
                this.EOR()
                this.cycles = 2
                break
            case 0x45:
                this.modeZeroPage()
                this.EOR()
                this.cycles = 3
                break
            case 0x55:
                this.modeZeroPageX()
                this.EOR()
                this.cycles = 4
                break
            case 0x4D:
                this.modeAbsolute()
                this.EOR()
                this.cycles = 4
                break
            case 0x5D: {
                const pageCrossed = this.modeAbsoluteX()
                this.EOR()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x59: {
                const pageCrossed = this.modeAbsoluteY()
                this.EOR()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x41:
                this.modeIndirectX()
                this.EOR()
                this.cycles = 6
                break
            case 0x51: {
                const pageCrossed = this.modeIndirectY()
                this.EOR()
                this.cycles = 5 + pageCrossed
                break
            }
            case 0xE6:
                this.modeZeroPage()
                this.INC()
                this.cycles = 5
                break
            case 0xF6:
                this.modeZeroPageX()
                this.INC()
                this.cycles = 6
                break
            case 0xEE:
                this.modeAbsolute()
                this.INC()
                this.cycles = 6
                break
            case 0xFE:
                this.modeAbsoluteX()
                this.INC()
                this.cycles = 7
                break
            case 0xE8:
                this.modeImplicit()
                this.INX()
                this.cycles = 2
                break
            case 0xC8:
                this.modeImplicit()
                this.INY()
                this.cycles = 2
                break
            case 0x4C:
                this.modeAbsolute()
                this.JMP()
                this.cycles = 3
                break
            case 0x6C:
                this.modeIndirect()
                this.JMP()
                this.cycles = 5
                break
            case 0x20:
                this.modeAbsolute()
                this.JSR()
                this.cycles = 6
                break
            case 0xA9:
                this.modeImmediate()
                this.LDA()
                this.cycles = 2
                break
            case 0xA5:
                this.modeZeroPage()
                this.LDA()
                this.cycles = 3
                break
            case 0xB5:
                this.modeZeroPageX()
                this.LDA()
                this.cycles = 4
                break
            case 0xAD:
                this.modeAbsolute()
                this.LDA()
                this.cycles = 4
                break
            case 0xBD: {
                const pageCrossed = this.modeAbsoluteX()
                this.LDA()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xB9: {
                const pageCrossed = this.modeAbsoluteY()
                this.LDA()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xA1:
                this.modeIndirectX()
                this.LDA()
                this.cycles = 6
                break
            case 0xB1: {
                const pageCrossed = this.modeIndirectY()
                this.LDA()
                this.cycles = 5 + pageCrossed
                break
            }
            case 0xA2:
                this.modeImmediate()
                this.LDX()
                this.cycles = 2
                break
            case 0xA6:
                this.modeZeroPage()
                this.LDX()
                this.cycles = 3
                break
            case 0xB6:
                this.modeZeroPageY()
                this.LDX()
                this.cycles = 4
                break
            case 0xAE:
                this.modeAbsolute()
                this.LDX()
                this.cycles = 4
                break
            case 0xBE: {
                const pageCrossed = this.modeAbsoluteY()
                this.LDX()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xA0:
                this.modeImmediate()
                this.LDY()
                this.cycles = 2
                break
            case 0xA4:
                this.modeZeroPage()
                this.LDY()
                this.cycles = 3
                break
            case 0xB4:
                this.modeZeroPageX()
                this.LDY()
                this.cycles = 4
                break
            case 0xAC:
                this.modeAbsolute()
                this.LDY()
                this.cycles = 4
                break
            case 0xBC: {
                const pageCrossed = this.modeAbsoluteX()
                this.LDY()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x4A:
                this.modeAcccumulator()
                this.LSR(true)
                this.cycles = 2
                break
            case 0x46:
                this.modeZeroPage()
                this.LSR()
                this.cycles = 5
                break
            case 0x56:
                this.modeZeroPageX()
                this.LSR()
                this.cycles = 6
                break
            case 0x4E:
                this.modeAbsolute()
                this.LSR()
                this.cycles = 6
                break
            case 0x5E:
                this.modeAbsoluteX()
                this.LSR()
                this.cycles = 7
                break
            case 0xEA:
                this.modeImplicit()
                this.NOP()
                this.cycles = 2
                break
            case 0x09:
                this.modeImmediate()
                this.ORA()
                this.cycles = 2
                break
            case 0x05:
                this.modeZeroPage()
                this.ORA()
                this.cycles = 3
                break
            case 0x15:
                this.modeZeroPageX()
                this.ORA()
                this.cycles = 4
                break
            case 0x0D:
                this.modeAbsolute()
                this.ORA()
                this.cycles = 4
                break
            case 0x1D: {
                const pageCrossed = this.modeAbsoluteX()
                this.ORA()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x19: {
                const pageCrossed = this.modeAbsoluteY()
                this.ORA()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0x01:
                this.modeIndirectX()
                this.ORA()
                this.cycles = 6
                break
            case 0x11: {
                const pageCrossed = this.modeIndirectY()
                this.ORA()
                this.cycles = 5 + pageCrossed
                break
            }
            case 0x48:
                this.modeImplicit()
                this.PHA()
                this.cycles = 3
                break
            case 0x08:
                this.modeImplicit()
                this.PHP()
                this.cycles = 3
                break
            case 0x68:
                this.modeImplicit()
                this.PLA()
                this.cycles = 4
                break
            case 0x28:
                this.modeImplicit()
                this.PLP()
                this.cycles = 4
                break
            case 0x2A:
                this.modeAcccumulator()
                this.ROL(true)
                this.cycles = 2
                break
            case 0x26:
                this.modeZeroPage()
                this.ROL()
                this.cycles = 5
                break
            case 0x36:
                this.modeZeroPageX()
                this.ROL()
                this.cycles = 6
                break
            case 0x2E:
                this.modeAbsolute()
                this.ROL()
                this.cycles = 6
                break
            case 0x3E:
                this.modeAbsoluteX()
                this.ROL()
                this.cycles = 7
                break
            case 0x6A:
                this.modeAcccumulator()
                this.ROR(true)
                this.cycles = 2
                break
            case 0x66:
                this.modeZeroPage()
                this.ROR()
                this.cycles = 5
                break
            case 0x76:
                this.modeZeroPageX()
                this.ROR()
                this.cycles = 6
                break
            case 0x6E:
                this.modeAbsolute()
                this.ROR()
                this.cycles = 6
                break
            case 0x7E:
                this.modeAbsoluteX()
                this.ROR()
                this.cycles = 7
                break
            case 0x40:
                this.modeImplicit()
                this.RTI()
                this.cycles = 6
                break
            case 0x60:
                this.modeImplicit()
                this.RTS()
                this.cycles = 6
                break
            case 0xE9:
                this.modeImmediate()
                this.SBC()
                this.cycles = 2
                break
            case 0xE5:
                this.modeZeroPage()
                this.SBC()
                this.cycles = 3
                break
            case 0xF5:
                this.modeZeroPageX()
                this.SBC()
                this.cycles = 4
                break
            case 0xED:
                this.modeAbsolute()
                this.SBC()
                this.cycles = 4
                break
            case 0xFD: {
                const pageCrossed = this.modeAbsoluteX()
                this.SBC()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xF9: {
                const pageCrossed = this.modeAbsoluteY()
                this.SBC()
                this.cycles = 4 + pageCrossed
                break
            }
            case 0xE1:
                this.modeIndirectX()
                this.SBC()
                this.cycles = 6
                break
            case 0xF1: {
                const pageCrossed = this.modeIndirectY()
                this.SBC()
                this.cycles = 5 + pageCrossed
                break
            }
            case 0x38:
                this.modeImplicit()
                this.SEC()
                this.cycles = 2
                break
            case 0xF8:
                this.modeImplicit()
                this.SED()
                this.cycles = 2
                break
            case 0x78:
                this.modeImplicit()
                this.SEI()
                this.cycles
                break
            case 0x85:
                this.modeZeroPage()
                this.STA()
                this.cycles = 3
                break
            case 0x95:
                this.modeZeroPageX()
                this.STA()
                this.cycles = 4
                break
            case 0x8D:
                this.modeAbsolute()
                this.STA()
                this.cycles = 4
                break
            case 0x9D:
                this.modeAbsoluteX()
                this.STA()
                this.cycles = 5
                break
            case 0x99:
                this.modeAbsoluteY()
                this.STA()
                this.cycles = 5
                break
            case 0x81:
                this.modeIndirectX()
                this.STA()
                this.cycles = 6
                break
            case 0x91:
                this.modeIndirectY()
                this.STA()
                this.cycles = 6
                break
            case 0x86:
                this.modeZeroPage()
                this.STX()
                this.cycles = 3
                break
            case 0x96:
                this.modeZeroPageY()
                this.STX()
                this.cycles = 4
                break
            case 0x8E:
                this.modeAbsolute()
                this.STX()
                this.cycles = 4
                break
            case 0x84:
                this.modeZeroPage()
                this.STY()
                this.cycles = 3
                break
            case 0x94:
                this.modeZeroPageX()
                this.STY()
                this.cycles = 4
                break
            case 0x8C:
                this.modeAbsolute()
                this.STY()
                this.cycles = 4
                break
            case 0xAA:
                this.modeImplicit()
                this.TAX()
                this.cycles = 2
                break
            case 0xA8:
                this.modeImplicit()
                this.TAY()
                this.cycles = 2
                break
            case 0xBA:
                this.modeImplicit()
                this.TSX()
                this.cycles = 2
                break
            case 0x8A:
                this.modeImplicit()
                this.TXA()
                this.cycles = 2
                break
            case 0x9A:
                this.modeImplicit()
                this.TXS()
                this.cycles = 2
                break
            case 0x98:
                this.modeImplicit()
                this.TYA()
                this.cycles = 2
                break
            default:
                throw new UnknownOpcode(this.opcode)
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
        console.log(`operatingAddress=${hex(this.operatingAddress)} hi=${hex(hi)} lo=${hex(lo)} hid=${(hi)} lod=${(lo)}`)
        // [379, 32], [380, 85], [381, 19], [341, 173]

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
        this.operatingValue = this.read(this.operatingAddress)

        console.log(`operand=${hex(operand)} operatingAddress=${hex(this.operatingAddress)} X=${hex(this.X)} hi=${hex(hi)} lo=${hex(lo)}`)
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
        this.operatingValue = this.read(this.operatingAddress)
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
    // TODO: check if this is correct for nes; depends on platform/os
    BRK() {
        this.pushStack(this.PC >> 8)
        this.pushStack(this.PC & 0xFF)
        this.pushStack(this.getFlagsAsByte())
        this.PC = this.read(INTERRUPT_VECTOR_IRQ + 1) << 8 | this.read(INTERRUPT_VECTOR_IRQ)
        this.breakFlag = 1
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
        this.Accumulator ^= this.operatingValue
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    INC() {
        const result = (this.operatingValue + 1) & 0xFF
        this.write(this.operatingAddress, result)
        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0
    }
    INX() {
        this.X = (this.X + 1) & 0xFF
        this.zeroFlag = this.X === 0 ? 1 : 0
        this.negativeFlag = this.X & 0x80 ? 1 : 0
    }
    INY() {
        this.Y = (this.Y + 1) & 0xFF
        this.zeroFlag = this.Y === 0 ? 1 : 0
        this.negativeFlag = this.Y & 0x80 ? 1 : 0
    }
    JMP() {
        this.PC = this.operatingAddress
    }
    JSR() {
        const oldAddress = (this.PC - 1) & 0xFFFF
        this.pushStack(oldAddress >> 8)
        this.pushStack(oldAddress & 0xFF)
        this.PC = this.operatingAddress
    }
    LDA() {
        this.Accumulator = this.operatingValue
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    LDX() {
        this.X = this.operatingValue
        this.zeroFlag = this.X === 0 ? 1 : 0
        this.negativeFlag = this.X & 0x80 ? 1 : 0
    }
    LDY() {
        this.Y = this.operatingValue
        this.zeroFlag = this.Y === 0 ? 1 : 0
        this.negativeFlag = this.Y & 0x80 ? 1 : 0
    }
    LSR(targetAccumulator: boolean = false) {
        this.carryFlag = this.operatingValue & 0x1
        let result = (this.operatingValue >> 1) & 0xFF
        this.zeroFlag = result === 0 ? 1 : 0
        this.negativeFlag = 0

        if (targetAccumulator) {
            this.Accumulator = result
        } else {
            this.write(this.operatingAddress, result)
        }
    }
    NOP() {
        // NOOP
    }
    ORA() {
        this.Accumulator |= this.operatingValue
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    PHA() {
        this.pushStack(this.Accumulator)
    }
    PHP() {
        // break flag is set when pushed to stack
        const flags = this.getFlagsAsByte() | 1 << 4
        this.pushStack(flags)
    }
    PLA() {
        this.Accumulator = this.popStack()
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    PLP() {
        let flags = this.popStack()
        flags = flags & ~(1 << 4) // TODO: not sure why? clear break flag
        this.setFlagsFromByte(flags)
    }
    ROL(targetAccumulator: boolean = false) {
        let result = (this.operatingValue << 1) & 0xFF
        result |= this.carryFlag

        this.carryFlag = this.operatingValue & 0x80 ? 1 : 0
        this.zeroFlag = result === 0 ? 1 : 0 // TDOO: docs say only if A is 0, but i think that is wrong
        this.negativeFlag = (result & 0x80) ? 1 : 0

        if (targetAccumulator) {
            this.Accumulator = result
        } else {
            this.write(this.operatingAddress, result)
        }
    }
    ROR(targetAccumulator: boolean = false) {
        let result = (this.operatingValue >> 1) & 0xFF
        result |= this.carryFlag << 7

        this.carryFlag = this.operatingValue & 0x1
        this.zeroFlag = result === 0 ? 1 : 0 // TDOO: docs say only if A is 0, but i think that is wrong
        this.negativeFlag = (result & 0x80) ? 1 : 0

        if (targetAccumulator) {
            this.Accumulator = result
        } else {
            this.write(this.operatingAddress, result)
        }
    }
    RTI() {
        let flags = this.popStack()
        flags = (flags & ~(1 << 4)) & 0xff // TODO: not sure why? clear break flag
        this.setFlagsFromByte(flags)

        const loPc = this.popStack()
        const hiPc = this.popStack()
        this.PC = (hiPc << 8) | loPc
    }
    RTS() {
        const lo = this.popStack()
        const hi = this.popStack() << 8
        this.PC = (hi | lo) + 1
    }
    SBC() {
        this.operatingValue = this.operatingValue ^ 0xFF
        let result = this.Accumulator + this.operatingValue + this.carryFlag

        this.carryFlag = result > 0xFF ? 1 : 0
        this.zeroFlag = (result & 0xFF) === 0 ? 1 : 0
        this.overflowFlag = !(this.Accumulator & 0x80 ^ this.operatingValue & 0x80) && (this.Accumulator & 0x80 ^ result & 0x80) ? 1 : 0
        this.negativeFlag = result & 0x80 ? 1 : 0

        this.Accumulator = result
    }
    SEC() {
        this.carryFlag = 1
    }
    SED() {
        this.decimalFlag = 1
    }
    SEI() {
        this.interruptFlag = 1
    }
    STA() {
        this.write(this.operatingAddress, this.Accumulator)
    }
    STX() {
        this.write(this.operatingAddress, this.X)
    }
    STY() {
        this.write(this.operatingAddress, this.Y)
    }
    TAX() {
        this.X = this.Accumulator
        this.zeroFlag = this.X === 0 ? 1 : 0
        this.negativeFlag = this.X & 0x80 ? 1 : 0
    }
    TAY() {
        this.Y = this.Accumulator
        this.zeroFlag = this.Y === 0 ? 1 : 0
        this.negativeFlag = this.Y & 0x80 ? 1 : 0
    }
    TSX() {
        this.X = this.SP
        this.zeroFlag = this.X === 0 ? 1 : 0
        this.negativeFlag = this.X & 0x80 ? 1 : 0
    }
    TXA() {
        this.Accumulator = this.X
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }
    TXS() {
        this.SP = this.X
    }
    TYA() {
        this.Accumulator = this.Y
        this.zeroFlag = this.Accumulator === 0 ? 1 : 0
        this.negativeFlag = this.Accumulator & 0x80 ? 1 : 0
    }

    // Helpers

    setFlagsFromByte(flags: number): void {
        this.carryFlag = (flags >> 0) & 0x1
        this.zeroFlag = (flags >> 1) & 0x1
        this.interruptFlag = (flags >> 2) & 0x1
        this.decimalFlag = (flags >> 3) & 0x1
        this.breakFlag = (flags >> 4) & 0x1
        this.overflowFlag = (flags >> 6) & 0x1
        this.negativeFlag = (flags >> 7) & 0x1
    }

    getFlagsAsByte(): number {
        return this.carryFlag << 0 | this.zeroFlag << 1 | this.interruptFlag << 2
            | this.decimalFlag << 3 | this.breakFlag << 4 | 1 << 5
            | this.overflowFlag << 6 | this.negativeFlag << 7
    }

    pushStack(byte: number) {
        console.log(`pushing ${hex(byte)} to stack at ${(STACK_BOTTOM + this.SP)}`)
        this.write(STACK_BOTTOM + this.SP, byte)
        this.SP--
    }
    popStack(): number {
        this.SP++
        return this.read(STACK_BOTTOM + this.SP)
    }

}


