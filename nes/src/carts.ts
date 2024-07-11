import * as fs from "fs"
import { off } from "process"

class INesHeader {
    // Header (16 bytes)
    // Trainer, if present (0 or 512 bytes)
    // PRG ROM data (16384 * x bytes)
    // CHR ROM data, if present (8192 * y bytes)
    // PlayChoice INST-ROM, if present (0 or 8192 bytes)
    // PlayChoice PROM, if present (16 bytes Data, 16 bytes CounterOut) (this is often missing; see PC10 ROM-Images for details)
    // Some ROM-Images additionally contain a 128-byte (or sometimes 127-byte) title at the end of the file.

    // The format of the header is as follows:
    // Bytes	Description
    // 0-3	Constant $4E $45 $53 $1A (ASCII "NES" followed by MS-DOS end-of-file)
    asciNes: string = ""
    // 4	Size of PRG ROM in 16 KB units. if 1, 16 KB, if 2, 32 KB, etc...
    prgRomSize: number = 0
    // 5	Size of CHR ROM in 8 KB units (value 0 means the board uses CHR RAM)
    chrRomSize: number = 0
    // 6	Flags 6 – Mapper, mirroring, battery, trainer
    flags6Mapper: number = 0
    // 7	Flags 7 – Mapper, VS/Playchoice, NES 2.0
    flags7Mapper: number = 0
    // 8	Flags 8 – PRG-RAM size (rarely used extension)
    flags8PrgRamSize: number = 0
    // 9	Flags 9 – TV system (rarely used extension)
    flags9TvSystem: number = 0
    // 10	Flags 10 – TV system, PRG-RAM presence (unofficial, rarely used extension)
    flags10TvSystemPrgRam: number = 0
    // 11-15	Unused padding (should be filled with zero, but some rippers put their name across bytes 7-15)

    get mapper(): number {
        return (this.flags6Mapper >> 4) | (this.flags7Mapper & 0xF0)
    }

    static deserialize(data: Buffer): INesHeader {
        const header = new INesHeader()
        header.asciNes = data.toString("ascii", 0, 4)
        header.prgRomSize = data.readUInt8(4)
        header.chrRomSize = data.readUInt8(5)
        header.flags6Mapper = data.readUInt8(6)
        header.flags7Mapper = data.readUInt8(7)
        header.flags8PrgRamSize = data.readUInt8(8)
        header.flags9TvSystem = data.readUInt8(9)
        header.flags10TvSystemPrgRam = data.readUInt8(10)
        return header
    }

    toString(): string {
        return `asciNes=${this.asciNes} prgRomSize=${this.prgRomSize} chrRomSize=${this.chrRomSize} flags6Mapper=${this.flags6Mapper} flags7Mapper=${this.flags7Mapper} flags8PrgRamSize=${this.flags8PrgRamSize} flags9TvSystem=${this.flags9TvSystem} flags10TvSystemPrgRam=${this.flags10TvSystemPrgRam}`
    }
}

export interface Cart {
    cpuRead(busAddress: number): number
    cpuWrite(busAddress: number, value: number): void
}

class Cart0 implements Cart {
    prgRam: Uint8Array = new Uint8Array(8192)
    prgRom: Uint8Array
    chrRom: Uint8Array

    get bankCount(): number {
        return this.prgRom.length / (16 * 1024)
    }

    constructor(prgRom: Buffer, chrRom: Buffer) {
        this.prgRom = new Uint8Array(prgRom)
        this.chrRom = new Uint8Array(chrRom)
    }
    cpuRead(busAddress: number): number {
        // CPU $6000-$7FFF: Family Basic only: PRG RAM, mirrored as necessary to fill entire 8 KiB window, write protectable with an external switch
        if (busAddress >= 0x6000 && busAddress <= 0x7FFF) {
            // return this.prgRam[busAddress - 0x6000]
            throw new Error(`PRG RAM not implemented`)
        }
        // CPU $8000-$FFFF: 16k or 32k of ROM mirrored.
        else if (busAddress >= 0x8000 && busAddress <= 0xFFFF) {
            let addr = (busAddress - 0x8000) % this.prgRom.length
            return this.prgRom[addr]
        }
        throw new Error(`Invalid bus address read ${busAddress}`)
    }
    cpuWrite(busAddress: number, value: number): void {
        if (busAddress >= 0x6000 && busAddress <= 0x7FFF) {
            // this.prgRam[busAddress - 0x6000] = value
            throw new Error(`PRG RAM not implemented`)
        }
        else if (busAddress >= 0x8000 && busAddress <= 0xFFFF) {
            // let addr = (busAddress - 0x8000) % this.prgRom.length
            // this.prgRom[addr] = value
            throw new Error(`Cannot write to ROM`)
        }
        throw new Error(`Invalid bus address write ${busAddress}`)
    }
}

export function loadCart(cartFile: string): Cart {
    const cartFileData = fs.readFileSync(cartFile)
    console.log(`cartData.length=${cartFileData.length}`)

    let offset = 0
    const header = INesHeader.deserialize(cartFileData.subarray(offset, 16))
    offset += 16
    console.log(header)

    const prgRom = cartFileData.subarray(offset, offset + 16384 * header.prgRomSize)
    offset += 16384 * header.prgRomSize
    const chrRom = cartFileData.subarray(offset, offset + 8192 * header.chrRomSize)
    console.log(`prgRom.length=${prgRom.length} chrRom.length=${chrRom.length}`)

    console.log(`MAPPER ${header.mapper}`)
    switch (header.mapper) {
        case 0:
            const cart = new Cart0(prgRom, chrRom)
            console.log(cart)
            return cart
        default:
            throw new Error(`Unknown cart format with mapper ${header.mapper}`)
    }

}

