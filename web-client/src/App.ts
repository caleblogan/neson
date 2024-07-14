import { Cart0 } from "nes/src/carts.ts"
import { Ppu } from "nes/src/ppu.ts"
import { Apu } from "nes/src/apu.ts"
import { Cpu } from "nes/src/cpu.ts"
// import { rom } from "./assets/nestest.ts"
import { rom } from "./assets/roms/donkey-kong.nes.ts"
// import { rom } from "./assets/roms/mario-bros.nes.ts"
// import { rom } from "./assets/roms/balloon-fight.nes.ts"
// import { rom } from "./assets/roms/ice-climbers.nes.ts"
import "./index.css"

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

window.addEventListener("keyup", function handler(e: KeyboardEvent) {
  if (e.key === "w" || e.key === "ArrowUp") {
    cpu.joy1Buffer = []
  } else if (e.key === "s" || e.key === "ArrowDown") {
    cpu.joy1Buffer = []
  } else if (e.key === "a" || e.key === "ArrowLeft") {
    cpu.joy1Buffer = []
  } else if (e.key === "d" || e.key === "ArrowRight") {
    cpu.joy1Buffer = []
  } else if (e.key === "Enter") { // Enter is Start
    cpu.joy1Buffer = []
  } else if (e.key === "t") { // t is Select
    cpu.joy1Buffer = []
  } else if (e.key === "q") { // e is B
    cpu.joy1Buffer = []
  } else if (e.key === "e") { // r is A
    cpu.joy1Buffer = []
  }
})

function handler(e: KeyboardEvent) {
  // Sending two key presses for each key press to simulate the 60Hz polling rate of the NES controller
  if (e.key === "n") {
    nes.cpu.clock()
    nes.ppu.clock()
  } else if (e.key === "p") {
  } else if (e.key === "w" || e.key === "ArrowUp") {
    cpu.joy1Buffer.push(0x8)
    cpu.joy1Buffer.push(0x8)
    cpu.joy1Buffer.push(0x8)
    cpu.joy1Buffer.push(0x8)
  } else if (e.key === "s" || e.key === "ArrowDown") {
    cpu.joy1Buffer.push(0x4)
    cpu.joy1Buffer.push(0x4)
    cpu.joy1Buffer.push(0x4)
    cpu.joy1Buffer.push(0x4)
  } else if (e.key === "a" || e.key === "ArrowLeft") {
    cpu.joy1Buffer.push(0x2)
    cpu.joy1Buffer.push(0x2)
    cpu.joy1Buffer.push(0x2)
    cpu.joy1Buffer.push(0x2)
  } else if (e.key === "d" || e.key === "ArrowRight") {
    cpu.joy1Buffer.push(0x1)
    cpu.joy1Buffer.push(0x1)
    cpu.joy1Buffer.push(0x1)
    cpu.joy1Buffer.push(0x1)
  } else if (e.key === "Enter") { // Enter is Start
    cpu.joy1Buffer.push(0x10)
    cpu.joy1Buffer.push(0x10)
    cpu.joy1Buffer.push(0x10)
    cpu.joy1Buffer.push(0x10)
  } else if (e.key === "t") { // t is Select
    cpu.joy1Buffer.push(0x20)
    cpu.joy1Buffer.push(0x20)
    cpu.joy1Buffer.push(0x20)
    cpu.joy1Buffer.push(0x20)
  } else if (e.key === "q") { // e is B
    cpu.joy1Buffer.push(0x40)
    cpu.joy1Buffer.push(0x40)
    cpu.joy1Buffer.push(0x40)
    cpu.joy1Buffer.push(0x40)
  } else if (e.key === "e") { // r is A
    cpu.joy1Buffer.push(0x80)
    cpu.joy1Buffer.push(0x80)
    cpu.joy1Buffer.push(0x80)
    cpu.joy1Buffer.push(0x80)
  }
}

window.addEventListener("keydown", handler)

let canvas = document.getElementById("screen") as HTMLCanvasElement | null
let ctx = canvas?.getContext("2d")
setInterval(function draw() {
  if (!canvas) {
    canvas = document.getElementById("screen") as HTMLCanvasElement | null
    return
  }
  if (!ctx) {
    ctx = canvas.getContext("2d")
    return
  }
  const buffer = nes.ppu.screenBuffer
  const clampedArray = new Uint8ClampedArray(buffer.length * 4);

  for (let i = 0; i < buffer.length; i++) {
    const color = buffer[i];
    const index = i * 4;
    clampedArray[index] = (color >> 24) & 0xFF;      // R
    clampedArray[index + 1] = (color >> 16) & 0xFF;  // G
    clampedArray[index + 2] = (color >> 8) & 0xFF;   // B
    clampedArray[index + 3] = color & 0xFF;          // A
  }
  const imgData = new ImageData(clampedArray, 256, 240)
  ctx.putImageData(imgData, 0, 0)

}, 1000 / 60)


function App() {
  let systemClock = 0
  const BATCH_CYCLES = 90_000//2 ** 17
  setInterval(function gameloop() {
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
  }, 12)
}

App()