import { Cart } from "./carts"

export class Ppu {
    cart: Cart
    cpuRegisters: Uint8Array = new Uint8Array(8)

    // TODO: can be remappad by cart
    // 4 name tables of 1024 bytes each
    nameTables: Uint8Array = new Uint8Array(2 * 2048)
    palletes: Uint8Array = new Uint8Array(32)
    oam: Uint8Array = new Uint8Array(256)

    cycle: number = 0 // x
    scanline: number = 0 // y

    constructor(cart: Cart) {
        this.cart = cart
    }

    // this will pretty much draw 1 pixel per cycle at (cycle, scanline) to screen
    clock() {
        this.cycle++
        if (this.cycle >= 341) {
            this.cycle = 0
            this.scanline++
            if (this.scanline >= 261) {
                this.scanline = 0
            }
        }
    }

    readCpuRegister(reg: number) {
        switch (reg) {
            case 0:
                return 0
            default:
                // throw new Error(`PPU register ${reg} not implemented`)
                return 0
        }
    }
    writeCpuRegister(reg: number, value: number) {
        switch (reg) {
            case 0:
                break
            default:
                // throw new Error(`PPU register ${reg} not implemented`)
                return 0
        }
    }

    read(busAddress: number): number {
        if (0x0 <= busAddress && busAddress <= 0x1FFF) {
            return this.cart.ppuRead(busAddress)
        }
        // $2000-$23BF	$0400	Nametable 0	Cartridge
        // $2400-$27FF	$0400	Nametable 1	Cartridge
        // $2800-$2BFF	$0400	Nametable 2	Cartridge
        // $2C00-$2FFF	$0400	Nametable 3	Cartridge
        else if (0x2000 <= busAddress && busAddress <= 0x2FFF) {
            return this.nameTables[busAddress - 0x2000]
        }
        // $3F00-$3F1F	$0020	Palette RAM indexes	Internal to PPU
        // $3F20-$3FFF	$00E0	Mirrors of $3F00-$3F1F	Internal to PPU
        else if (0x3F00 <= busAddress && busAddress <= 0x3F1F) {
            return this.palletes[(busAddress - 0x3F00) % this.palletes.length]
        }
        throw new Error("Method not implemented.")
    }
    write(busAddress: number, value: number) {
        if (0x0 <= busAddress && busAddress <= 0x1FFF) {
            throw new Error("Trying to write to ROM from ppu")
        }
        else if (0x2000 <= busAddress && busAddress <= 0x2FFF) {
            this.nameTables[busAddress - 0x2000] = value
        }
        else if (0x3F00 <= busAddress && busAddress <= 0x3F1F) {
            this.palletes[(busAddress - 0x3F00) % this.palletes.length] = value
        }
        throw new Error("Method not implemented.")
    }

}