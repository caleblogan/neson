import { Cpu } from './cpu'
import * as carts from "./carts"
import { Ppu } from './ppu'
import { Apu } from './apu'

console.log(`hi from NES`)
const cart = carts.loadCart("../roms/nestest.nes")
const ppu = new Ppu()
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)

console.log(cpu)



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
