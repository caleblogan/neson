import { Cpu } from './cpu'
import * as carts from "./carts"
import { Ppu } from './ppu'
import { Apu } from './apu'
import { hex } from './utils'

console.log(`hi from NES`)
const cart = carts.loadCart("../roms/nestest.nes")
const ppu = new Ppu()
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)

console.log(cpu)

console.log(`cart rom ${(cart.cpuRead(0x8000))}`)
console.log(`cart rom ${(cart.cpuRead(0x800c))}`)
console.log(`cart rom ${(cart.cpuRead(0x800d))}`)

cpu.powerUp()


let stepMode = true

async function keypress(): Promise<string> {
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.once('data', (data) => {
        // process.stdin.setRawMode(false)
        resolve(data.toString())
    }))
}

async function run() {
    for (let i = 0; i < 1000000000000; i++) {
        cpu.clock()
        console.log(`clock(${hex(i, 8)}) PC=${hex(cpu.PC)} A=${hex(cpu.Accumulator)} X=${hex(cpu.X)} Y=${hex(cpu.Y)} P=${hex(cpu.getFlagsAsByte())} SP=${hex(cpu.SP)}`)
        if (stepMode && cpu.cycles === 0) {
            const key = await keypress()

            if (key[0].trim().toLowerCase() === 'q') {
                process.exit(0)
            }
        }
    }
}

run()



function testProgram(cpu: Cpu) {
    cpu.powerUp()
    // setup interrupt vectors
    cpu.write(0xFFFd, 0x00)
    cpu.write(0xFFFc, 0x00)

    // write program
    // jump to 0x000f and increment X
    // infinite loop due to brk
    cpu.write(0x00, 0x4C)
    cpu.write(0x01, 0x0F)
    cpu.write(0x02, 0x00)
    cpu.write(0x0f, 0xe8)
}
