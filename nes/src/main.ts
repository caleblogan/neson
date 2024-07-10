import { Cpu } from './cpu'
console.log(`hi from NES`)
const cpu = new Cpu()

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

cpu.powerUp()

for (let i = 0; i < 100; i++) {
    cpu.clock()
    console.log(`cpu i=${i} PC=${cpu.PC} X=${cpu.X} Y=${cpu.Y} A=${cpu.Accumulator} SP=${cpu.SP}`)
}

