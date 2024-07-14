import { Cart0 } from "nes/src/carts.ts"
import { Ppu } from "nes/src/ppu.ts"
import { Apu } from "nes/src/apu.ts"
import { Cpu } from "nes/src/cpu.ts"
// import { rom } from "./assets/nestest.ts"
import { rom } from "./assets/roms/donkey-kong.nes.ts"
// import { rom } from "./assets/roms/mario-bros.nes.ts"
// import { rom } from "./assets/roms/balloon-fight.nes.ts"
// import { rom } from "./assets/roms/ice-climbers.nes.ts"

const romBytes = rom.slice(16)
const prgRom = romBytes.slice(0, 0x4000)
const chrRom = romBytes.slice(0x4000)

const cart = new Cart0(prgRom, chrRom)
const ppu = new Ppu(cart)
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)
cpu.powerUp()

const nes = {
  cpu,
  ppu,
  apu
}


function handler(e: KeyboardEvent) {
  if (e.key === "n") {
    nes.cpu.clock()
    nes.ppu.clock()
  } else if (e.key === "p") {
  } else if (e.key === "w" || e.key === "ArrowUp") {
    cpu.joy1BufferReg |= 0x8
  } else if (e.key === "s" || e.key === "ArrowDown") {
    cpu.joy1BufferReg |= 0x4
  } else if (e.key === "a" || e.key === "ArrowLeft") {
    cpu.joy1BufferReg |= 0x2
  } else if (e.key === "d" || e.key === "ArrowRight") {
    cpu.joy1BufferReg |= 0x1
  } else if (e.key === "Enter") { // Enter is Start
    cpu.joy1BufferReg |= 0x10
  } else if (e.key === "t") { // t is Select
    cpu.joy1BufferReg |= 0x20
  } else if (e.key === "e") { // e is B
    cpu.joy1BufferReg |= 0x40
  } else if (e.key === "r") { // r is A
    cpu.joy1BufferReg |= 0x80
  }
}

window.addEventListener("keydown", handler)


function App() {
  let systemClock = 0
  const BATCH_CYCLES = 2 ** 15
  setInterval(function ticker() {
    for (let i = 0; i < BATCH_CYCLES; i++) {
      if (nes.ppu.nmi) {
        nes.ppu.nmi = false
        nes.cpu.nmi()
      }
      if (systemClock % 3 === 0) {
        nes.cpu.clock()
      }
      nes.ppu.clock()
      systemClock++
    }
  }, 0)
}

App()