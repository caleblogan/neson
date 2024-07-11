import { Cpu } from './cpu'
import * as carts from "./carts"
import { Ppu } from './ppu'
import { Apu } from './apu'
import { hex } from './utils'
import * as fs from "fs"

console.log(`hi from NES`)
const cart = carts.loadCart("../roms/nestest.nes")
const ppu = new Ppu(cart)
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)
cpu.powerUp()
cpu.PC = 0xC000

console.log(cpu)


let stepMode = false

async function keypress(): Promise<string> {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', (data) => {
        // process.stdin.setRawMode(false)
        resolve(data.toString())
    }))
}

fs.writeFileSync("./tests/nestest.log", "")
async function run() {
    for (let i = 0; i < 10000; i++) {
        if (i % 3 === 0) {
            cpu.clock()
            // const lo = cpu.read(0x2)
            // const hi = cpu.read(0x3)
            // if (lo || hi) {
            //     console.log(`ERROR ${lo}${hi}`)
            // }
            // fs.writeFileSync("./tests/nestest.log",
            //     `${hex(cpu.PC)} ${hex(cpu.opcode)} A:${hex(cpu.Accumulator)} X:${hex(cpu.X)} Y:${hex(cpu.Y)} P:${hex(cpu.getFlagsAsByte())} SP:${hex(cpu.SP)} PPU:0, CYC:${i}\n`
            //     , { flag: "a" }
            // )
        }

        ppu.clock()
        // console.log(`clock(${hex(i, 8)}) PC=${hex(cpu.PC)} A=${hex(cpu.Accumulator)} X=${hex(cpu.X)} Y=${hex(cpu.Y)} P=${hex(cpu.getFlagsAsByte())} SP=${hex(cpu.SP)} opcode=${hex(cpu.opcode)}`)
        if (stepMode && cpu.cycles === 0) {
            const key = await keypress()

            if (key[0].trim().toLowerCase() === 'q') {
                process.exit(0)
            }
        }
    }
}

run()
