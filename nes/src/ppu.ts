import { Cart } from "./carts"
import { NES_COLORS_NC02 } from "./pallette"
import { hex } from "./utils"

let canvas = document.getElementById("screen") as HTMLCanvasElement

export class Ppu {
    cart: Cart

    nameTables: Uint8Array = new Uint8Array(2 * 1024)
    palletes: Uint8Array = new Uint8Array(32)
    // layout: byte 0:y byte 1:tileId byte 2:attribute byte 3:x
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
    get baseNametableAddress() { return (this.regControl & 0x3) ? 1 : 0 }
    get vramAddresssIncrement() { return (this.regControl & 0x4) ? 32 : 1 }
    get spritePatternTableAddress() { return (this.regControl & 0x8) === 0 ? 0 : 1 }
    get bgPatternTableAddress() { return (this.regControl & 0x10) === 0 ? 0 : 1 }
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
    get spriteOverflow() { return (this.regStatus & 0x20) ? 1 : 0 }
    get spriteZeroHit() { return (this.regStatus & 0x40) ? 1 : 0 }
    get verticalBlank() { return (this.regStatus & 0x80) ? 1 : 0 }
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
        if (this.scanline === 257) {
            this.regOamAddress = 0
        }

        // in view so draw
        if (this.scanline >= 0 && this.scanline < 240 && this.cycle >= 0 && this.cycle < 256) {
            const tileId = this.read(0x2000 + Math.floor(this.scanline / 8) * 32 + Math.floor(this.cycle / 8))
            const attribute = this.read(0x23C0 + Math.floor(this.scanline / 32) * 8 + Math.floor(this.cycle / 32))

            // get 2 bit attribute for this tile
            const ox = Math.floor((this.cycle % 32) / 16)
            const oy = Math.floor((this.scanline % 32) / 16)
            let attributeId = 0
            if (ox === 0 && oy === 0) {
                attributeId = attribute & 0x3
            } else if (ox === 1 && oy === 0) {
                attributeId = (attribute >> 2) & 0x3
            } else if (ox === 0 && oy === 1) {
                attributeId = (attribute >> 4) & 0x3
            } else if (ox === 1 && oy === 1) {
                attributeId = (attribute >> 6) & 0x3
            }

            // get lo and hi byte from  chr ram
            const patternTable = this.bgPatternTableAddress ? 0x1000 : 0
            const loChr = this.read(patternTable + (0x0 + 16 * tileId) + this.scanline % 8)
            const hiChr = this.read(patternTable + (0x0 + 16 * tileId) + this.scanline % 8 + 8)

            // get pixel id
            const bitShiftOffset = 7 - (this.cycle % 8)
            const palletteIndex = ((loChr >> bitShiftOffset) & 1) | (((hiChr >> bitShiftOffset) & 1) << 1)

            // get color from pallette using pixel id
            const bgColor = NES_COLORS_NC02[this.palletes[attributeId * 4 + palletteIndex]]

            // sprites
            const possibleSpriteIds = []
            for (let i = 0; i < 64; i++) {
                const spriteX = this.oam[i * 4 + 3]
                const spriteY = this.oam[i * 4 + 0]
                if (spriteX <= this.cycle && spriteX >= this.cycle - 8 && spriteY <= this.scanline && spriteY + 8 > this.scanline) {
                    possibleSpriteIds.push(i)
                }
            }
            let fgColor: string | undefined
            for (let j = 0; j < possibleSpriteIds.length; j++) {
                const index = possibleSpriteIds[j] * 4
                const y = this.oam[index]
                const tileId = this.oam[index + 1] // pattern table id
                const attribute = this.oam[index + 2]
                const x = this.oam[index + 3]

                const page = this.spritePatternTableAddress ? 0x1000 : 0
                const loChr = this.read(page + (16 * tileId) + this.scanline - y)
                const hiChr = this.read(page + (16 * tileId) + this.scanline - y + 8)
                // const bitShiftOffset = 0 - (this.cycle - x)
                const bitShiftOffset = 7 - (this.cycle - x)
                const palletteIndex = ((loChr >> bitShiftOffset) & 1) | (((hiChr >> bitShiftOffset) & 1) << 1)
                if (palletteIndex === 0) {
                    continue
                }

                const pallette = 16 + 4 * (attribute & 0x3)
                const priority = (attribute & 0x20) === 0
                fgColor = NES_COLORS_NC02[this.palletes[pallette + palletteIndex]]
                if (priority) {
                    break
                }
                break
            }

            this.draw(this.cycle, this.scanline, fgColor ?? bgColor)
        }

        this.cycle++

        if (this.cycle === 340) {
            // draw sprites on line
        }

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
    // TODO: this buffering may cause artifacts
    // buffer = new Array(24).fill(0)
    // bufferIndex = 0
    ctx = canvas?.getContext("2d")
    draw(x: number, y: number, color: string) {
        // this.buffer[this.bufferIndex++] = x
        // this.buffer[this.bufferIndex++] = y
        // this.buffer[this.bufferIndex++] = color
        // if (this.bufferIndex < 24) {
        //     return
        // }
        if (!canvas) {
            canvas = document.getElementById("screen") as HTMLCanvasElement
            return
        }
        if (!this.ctx) {
            this.ctx = canvas.getContext("2d")
            if (!this.ctx) {
                return
            }
        }

        const size = 2
        this.ctx.fillStyle = color
        this.ctx.fillRect(x * size - 1, y * size, size, size)

        // for (let i = 0; i < 8; i++) {
        //     const size = 2
        //     this.ctx.fillStyle = this.buffer[i * 3 + 2]
        //     this.ctx.fillRect(this.buffer[i * 3] * size, this.buffer[i * 3 + 1] * size, size, size)
        // }
        // this.bufferIndex = 0
    }

    readCpuRegister(reg: number) {
        switch (reg) {
            case 0:
                return this.regControl
            case 1:
                return this.regMask
            case 2: {
                const data = this.regStatus & 0xE0
                this.verticalBlank = 0
                this.regVramAddressLatch = 0
                return data
            }
            case 3:
                // only write - this.regOamAddress
                return 0
            case 4:
                return this.oam[this.regOamAddress]
            case 5:
                // TODO: return this.regScroll
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
                this.regOamAddress = value
                return
            case 4:
                this.oam[this.regOamAddress] = value
                this.regOamAddress++
                return
            case 5:
                // TODO: this.regScroll = value
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
                this.regVramAddress += this.vramAddresssIncrement
                return
            default:
                throw new Error(`PPU register ${reg} not implemented`)
        }
    }

    readOam(address: number) { return this.oam[address] }
    writeOam(address: number, value: number) {
        this.oam[address] = value
    }

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