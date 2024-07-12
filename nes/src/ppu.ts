import { Cart } from "./carts"
import { NES_COLORS_NC02 } from "./pallette"
import { hex } from "./utils"

let canvas = document.getElementById("screen") as HTMLCanvasElement

export class Ppu {
    cart: Cart

    nameTables: Uint8Array = new Uint8Array(2 * 1024)
    palletes: Uint8Array = new Uint8Array(32)
    oam: Uint8Array = new Uint8Array(256)

    cycle: number = 0 // x
    scanline: number = 0 // y
    nmi: boolean = false

    frameComplete: boolean = false

    // v: During rendering, used for the scroll position. Outside of rendering, used as the current VRAM address.
    v: number = 0
    // t: During rendering, specifies the starting coarse-x scroll for the next scanline and the starting y scroll for the screen.
    // Outside of rendering, holds the scroll or VRAM address before transferring it to v.
    t: number = 0
    // x: The fine-x position of the current scroll, used during rendering alongside v.
    x: number = 0
    // w: Toggles on each write to either PPUSCROLL or PPUADDR, indicating whether this is the first or second write.
    // Clears on reads of PPUSTATUS. Sometimes called the 'write latch' or 'write toggle'.
    w: number = 0

    // REGISTERS

    regControl: number = 0
    get baseNametableAddress() { return this.regControl & 0x3 }
    get vramAddresssIncrement() { return (this.regControl & 0x4) === 0 ? 1 : 32 }
    get spritePatternTableAddress() { return (this.regControl & 0x8) === 0 ? 0 : 0x1000 }
    get bgPatternTableAddress() { return (this.regControl & 0x10) === 0 ? 0 : 0x1000 }
    get spriteSize() { return (this.regControl & 0x20) === 0 ? 0 : 1 }
    get ppuMasterSlave() { return (this.regControl & 0x40) === 0 ? 0 : 1 }
    get generateNmi() { return (this.regControl & 0x80) === 0 ? 0 : 1 }

    regMask: number = 0
    get greyscale() { return this.regMask & 0x1 }
    get showBgLeftmost() { return (this.regMask & 0x2) === 0 ? 0 : 1 }
    get showSpritesLeftmost() { return (this.regMask & 0x4) === 0 ? 0 : 1 }
    get showBg() { return (this.regMask & 0x8) === 0 ? 0 : 1 }
    get showSprites() { return (this.regMask & 0x10) === 0 ? 0 : 1 }
    get emphasizeRed() { return (this.regMask & 0x20) === 0 ? 0 : 1 }
    get emphasizeGreen() { return (this.regMask & 0x40) === 0 ? 0 : 1 }
    get emphasizeBlue() { return (this.regMask & 0x80) === 0 ? 0 : 1 }

    regStatus: number = 0
    get spriteOverflow() { return (this.regStatus & 0x20) >> 5 }
    get spriteZeroHit() { return (this.regStatus & 0x40) >> 6 }
    get verticalBlank() { return (this.regStatus & 0x80) >> 7 }
    set verticalBlank(value: number) { this.regStatus = !value ? (this.regStatus & ~0x80) & 0xff : this.regStatus | 0x80 }

    regOamAddress: number = 0
    regOamData: number = 0
    regScroll: number = 0
    _regVramAddress: number = 0
    get regVramAddress() { return this._regVramAddress & 0xffff }
    set regVramAddress(value) { this._regVramAddress = value & 0xffff }
    _regVramAddressLatch: number = 0
    get regVramAddressLatch() { return this._regVramAddressLatch & 0x1 }
    set regVramAddressLatch(value) { this._regVramAddressLatch = value & 0x1 }
    _regVramData: number = 0
    get regVramData() { return this._regVramData & 0xffff }
    set regVramData(value) { this._regVramData = value & 0xffff }

    constructor(cart: Cart) {
        this.cart = cart
    }

    // this will pretty much draw 1 pixel per cycle at (cycle, scanline) to screen
    clock() {
        if (this.scanline === -1 && this.cycle === 1) {
            this.verticalBlank = 0
        }
        if (this.scanline === 241 && this.cycle === 1) {
            this.verticalBlank = 1
            if (this.generateNmi) {
                this.nmi = true
            }
        }
        // in view so draw
        if (this.scanline >= 0 && this.scanline < 240 && this.cycle >= 0 && this.cycle < 256) {
            // TODO: hardcode pallette
            // TODO: hardcode nametable 1
            const tileId = this.read(0x2000 + Math.floor(this.scanline / 8) * 32 + Math.floor(this.cycle / 8))

            // get lo and hi byte from  chr ram
            const loChr = this.read((0x0 + 16 * tileId) + this.scanline % 8)
            const hiChr = this.read((0x0 + 16 * tileId) + this.scanline % 8 + 8)

            // console.log(`tileId: ${hex(tileId, 2)} loChr: ${hex(loChr, 2)} hiChr: ${hex(hiChr, 2)}`)

            // get pixel id
            const bitShiftOffset = 7 - (this.cycle % 8)
            const palletteIndex = ((loChr >> bitShiftOffset) & 1) | (((hiChr >> bitShiftOffset) & 1) << 1)

            // get color from pallette using pixel id
            const color = NES_COLORS_NC02[this.palletes[palletteIndex]]

            // draw pixel to canvas
            this.draw(this.cycle, this.scanline, color)
        }

        this.cycle++


        if (this.cycle >= 341) {
            this.cycle = 1
            this.scanline++
            if (this.scanline >= 261) {
                this.scanline = -1
                this.frameComplete = true
            }
        }

    }

    // TODO: move this bag out of ppu
    draw(x: number, y: number, color: string) {
        if (!canvas) {
            canvas = document.getElementById("screen") as HTMLCanvasElement
            return
        }
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            return
        }
        const size = 2
        ctx.fillStyle = color
        ctx.fillRect(x * size, y * size, size, size)
    }

    readCpuRegister(reg: number) {
        switch (reg) {
            case 0:
                // return this.regControl
                return 0
            case 1:
                // return this.regMask
                return 0
            case 2: {
                this.verticalBlank = 1
                const data = this.regStatus & 0xE0
                this.verticalBlank = 0
                this.regVramAddressLatch = 0
                return data
            }
            case 3:
                // return this.regOamAddress
                return 0
            case 4:
                // return this.regOamData
                return 0
            case 5:
                // return this.regScroll
                return 0
            case 6:
                return 0
            case 7: {
                let data = this.regVramData
                this.regVramData = this.read(this.regVramAddress)
                if (this.regVramAddress >= 0x3F00) {
                    data = this.regVramData
                }
                // this.regVramAddress += this.vramAddresssIncrement
                // this.regVramAddress++
                return data
            }
            default:
                throw new Error(`PPU register ${reg} not implemented`)
        }
    }
    writeCpuRegister(reg: number, value: number) {
        switch (reg) {
            case 0:
                this.regControl = value
                return
            case 1:
                this.regMask = value
                return
            case 2:
                // this.regStatus = value
                return
            case 3:
                // this.regOamAddress = value
                return
            case 4:
                // this.regOamData = value
                return
            case 5:
                // this.regScroll = value
                return
            case 6:
                if (this.regVramAddressLatch === 0) {
                    this.regVramAddress = (this.regVramAddress & 0x00FF) | (value << 8)
                    this.regVramAddressLatch = 1
                } else {
                    this.regVramAddress = (this.regVramAddress & 0xFF00) | value
                    this.regVramAddressLatch = 0
                }
                return
            case 7:
                this.write(this.regVramAddress, value)
                this.regVramAddress++
                return
            default:
                throw new Error(`PPU register ${reg} not implemented`)
        }
    }

    readOam(address: number) { return 0 }
    writeOam(address: number, value: number) { }

    read(busAddress: number): number {
        if (0x0 <= busAddress && busAddress <= 0x1FFF) {
            return this.cart.ppuRead(busAddress)
        }
        else if (0x2000 <= busAddress && busAddress <= 0x2FFF) {
            return this.nameTables[(busAddress - 0x2000) % 1024] // TODO: hack to get nametable 0
        } else if (0x3000 <= busAddress && busAddress <= 0x3EFF) {
            return this.read(busAddress - 0x1000)
        } else if (0x3F00 <= busAddress && busAddress <= 0x3FFF) {
            let addr = busAddress & 0x1f
            if (addr === 0x10) addr = 0x00
            if (addr === 0x14) addr = 0x04
            if (addr === 0x18) addr = 0x08
            if (addr === 0x1C) addr = 0x0C
            return this.palletes[addr]
        }
        throw new Error(`Attempting to read ppu at invalid address of ${hex(busAddress, 4)}`)
    }
    write(busAddress: number, value: number) {
        if (0x0 <= busAddress && busAddress <= 0x1FFF) {
            throw new Error("Trying to write to ROM from ppu")
        }
        else if (0x2000 <= busAddress && busAddress <= 0x2FFF) {
            this.nameTables[(busAddress - 0x2000) % 1024] = value // TODO: hack to get nametable 0
        } else if (0x3000 <= busAddress && busAddress <= 0x3EFF) {
            this.write(busAddress - 0x1000, value)
        }
        else if (0x3F00 <= busAddress && busAddress <= 0x3FFF) {
            let addr = busAddress & 0x1f
            if (addr === 0x10) addr = 0x00
            if (addr === 0x14) addr = 0x04
            if (addr === 0x18) addr = 0x08
            if (addr === 0x1C) addr = 0x0C
            this.palletes[addr] = value
        } else {
            console.warn(`Invalid ppu write address ${hex(busAddress, 4)}`)
        }
    }

}