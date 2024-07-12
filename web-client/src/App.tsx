import { useEffect, useState } from "react"
import { hex } from "nes/src/utils"
import { Cart0 } from "nes/src/carts.ts"
import { Ppu } from "nes/src/ppu.ts"
import { Apu } from "nes/src/apu.ts"
import { Cpu } from "nes/src/cpu.ts"
import { rom } from "./assets/nestest.ts"

// TODO: hardcoded for testing
const romBytes = rom.slice(16)
const prgRom = romBytes.slice(0, 0x4000)
const chrRom = romBytes.slice(0x4000)

const cart = new Cart0(prgRom, chrRom)
const ppu = new Ppu(cart)
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)
cpu.powerUp()

const nesDefault = {
  cpu,
  ppu,
  apu
}

/**
 * [*] gets rom bytes into a Uint8Array 
 * [*] load cpu & cart with rom bytes
 * [*] display registers and flags
 * [*] display current instructions $0000 - $FF (maybe the mnemonic)
 * [*] display memory
 * [*] display pattern tables
 * [*] add step forward control (keydown)
 * [ ] display pallette
 * [ ] draw pattern table using pallette
 * [ ] draw random pixels to screen each clock tick (cycle)
 * [ ] display nametable (vram)
 */




function Screen() {
  return <div>
    <canvas id="screen" width={283 * 2} height={242 * 2}
      className="border-2 border-black"
    />
  </div>
}

// TODO: hardcoded for testing
const pallete = ["blue", "yellow", "red", "green"] as const
const pixels = new Uint8Array(0x8000) //32kb
function PatternDebugScreen({ ppu, id }: { ppu: Ppu, id: number }) {
  useEffect(() => {
    function draw() {
      const canvas = document.getElementById(`pattern-${id}`) as HTMLCanvasElement | null
      if (!canvas) {
        // throw new Error("canvas not supported")
        return
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // throw new Error("Canvas context not supported")
        return
      }


      let x = 0
      let y = 0
      let tileX = 0
      let tileY = 0
      ctx.clearRect(0, 0, 256, 256)
      ctx.moveTo(0, 0)
      const size = 2
      for (let i = 0; i < pixels.length / 2; i++) {
        ctx.fillStyle = pallete[pixels[i]];
        ctx.moveTo(x, y)
        ctx.beginPath()
        ctx.fillRect(x * size, y * size, size, size);

        x++
        if (i % 8 === 0 && i !== 0) {
          y++
          x = tileX
        }
        if (i % 64 === 0 && i !== 0) {
          y = tileY
          tileX += 8
          x = tileX
        }
        if (i % (64 * 16) === 0 && i !== 0) {
          tileY += 8
          y = tileY
          tileX = 0
          x = 0
        }

        ctx.closePath()
      }
    }
    let tile = []
    let pixelIndex = 0
    for (let i = 0; i < 0x1000; i++) {
      const byte = ppu.read(i)
      tile.push(byte)
      if (tile.length === 16) {
        const loBytes = tile.slice(0, 8)
        const hiBytes = tile.slice(8)
        for (let j = 0; j < 8; j++) {
          const lo = loBytes[j]
          const hi = hiBytes[j]
          for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
            const value = ((lo >> bitIndex) & 1) + (((hi >> bitIndex) & 1) << 1)
            pixels[pixelIndex++] = value
          }
        }
        tile = []
      }
    }

    draw()
  }, [ppu])

  return <div>
    <p>Table: {id}</p>
    <canvas id={`pattern-${id}`} width={256} height={256}
      className="border-2 border-black"
    />
  </div>
}
function CpuDebugScreen({ cpu }: { cpu: Cpu | null }) {
  if (!cpu) return <div>no cpu</div>

  const instructions = []
  for (let i = 0; i < 20; i++) {
    instructions.push(<p key={i} className={i === 10 ? "font-bold" : ""}>{hex(cpu.PC + i - 10, 4)} {hex(cpu.read(cpu.PC + i - 10), 2)}</p>)
  }

  return <div className=" border-2 border-black p-2">
    <h2 className="text-xl font-bold">Cpu:</h2>
    <p>PC: {hex(cpu.PC, 4)}</p>
    <p>SP: {hex(cpu.SP, 2)}</p>
    <p>Accumulator: {hex(cpu.Accumulator, 2)}</p>
    <p>X: {hex(cpu.X, 2)}</p>
    <p>Y: {hex(cpu.Y, 2)}</p>
    <hr />
    <p>Operating Address: {hex(cpu.operatingAddress, 4)}</p>
    <p>Operating Value: {hex(cpu.operatingValue, 4)}</p>
    <p>Cycles: {cpu.cycles}</p>
    <h3 className="font-bold mt-2">Flags:</h3>
    <div className="flex space-x-2 text-sm">
      <p>Carry: {cpu.carryFlag}</p>
      <p>Zero: {cpu.zeroFlag}</p>
      <p>Interrupt: {cpu.interruptFlag}</p>
      <p>Break: {cpu.breakFlag}</p>
      <p>Overflow: {cpu.overflowFlag}</p>
      <p>Negative: {cpu.negativeFlag}</p>
    </div>
    <h3 className="font-bold mt-2">Instructions:</h3>
    {instructions}
  </div>
}

function MemoryDebugScreen({ cpu }: { cpu: Cpu }) {
  const memoryView = []
  for (let row = 0; row < 16; row++) {
    const rowValues = []
    for (let col = 0; col < 16; col++) {
      rowValues.push(cpu.read(row * 16 + col))
    }
    memoryView.push(<p key={row} className="flex space-x-2">{hex(row * 16, 4)}<span className="pl-4"></span> {rowValues.map(v => hex(v, 2) + "  ")}</p>)
  }

  return <div>
    <h2 className="text-lg font-bold">Memory</h2>
    <div className="grid grid-cols-16 gap-2">
      {memoryView}
    </div>
  </div>
}


console.log(nesDefault)

function App() {
  const [nes, setNes] = useState(nesDefault)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "n") {
        nes.cpu.clock()
        setNes({ ...nes })
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="p-4">
      <div className="flex flex-wrap">
        <div>
          <Screen />
          <div className="flex">
            <PatternDebugScreen id={0} ppu={nes.ppu} />
            <PatternDebugScreen id={1} ppu={nes.ppu} />
          </div>
        </div>
        <div>
          <CpuDebugScreen cpu={nes?.cpu ?? null} />
        </div>
      </div>
      <MemoryDebugScreen cpu={nes.cpu} />
    </div>
  )
}

export default App
