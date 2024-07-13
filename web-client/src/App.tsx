import { useEffect, useState } from "react"
import { Cart0 } from "nes/src/carts.ts"
import { Ppu } from "nes/src/ppu.ts"
import { Apu } from "nes/src/apu.ts"
import { Cpu } from "nes/src/cpu.ts"
// import { rom } from "./assets/nestest.ts"
// import { rom } from "./assets/roms/donkey-kong.nes.ts"
// import { rom } from "./assets/roms/mario-bros.nes.ts"
import { rom } from "./assets/roms/balloon-fight.nes.ts"
// import { rom } from "./assets/roms/ice-climbers.nes.ts"
import { PatternDebugScreen } from "./debugger/PatternDebugScreen.tsx"
import { CpuDebugScreen } from "./debugger/CpuDebugScreen.tsx"
import { MemoryDebugScreen } from "./debugger/MemoryDebugScreen.tsx"
import { PalletteViewer } from "./debugger/PalletteViewer.tsx"
import { PpuDebugScreen } from "./debugger/PpuDebugScreen.tsx"
import { AttributeViewer } from "./debugger/AttributeViewer.tsx"
import { SpriteDebugScreen } from "./debugger/SpriteDebugScreen.tsx"

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

console.log(ppu)

function Screen() {
  return <div>
    <canvas id="screen" width={256 * 2} height={240 * 2}
      className=""
    />
  </div>
}

function App() {
  const [nes, setNes] = useState(nesDefault)
  const [palletteIndex, setPalletteIndex] = useState(0)

  useEffect(() => {
    setNes({ ...nes })
    function handler(e: KeyboardEvent) {
      if (e.key === "n") {
        nes.cpu.clock()
        nes.ppu.clock()
        setNes({ ...nes })
      } else if (e.key === "p") {
        setPalletteIndex(prev => (prev + 1) % 8)
        setNes({ ...nes })
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
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    let systemClock = 0
    const BATCH_CYCLES = 2 ** 16
    const id = setInterval(function ticker() {
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
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(function tk() {
      setNes({ ...nes })
    }, 800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="p-4 pt-1 font-mono">
      <div>Debug Controls: n=step_instruction p=cycle_pallettes</div>
      <div className="flex flex-wrap space-x-1">
        <div>
          <Screen />
          <div className="flex">
            <PatternDebugScreen id={0} nes={nes} palletteIndex={palletteIndex} />
            <PatternDebugScreen id={1} nes={nes} palletteIndex={palletteIndex} />
          </div>
        </div>
        <CpuDebugScreen cpu={nes?.cpu ?? null} />
        <PpuDebugScreen nes={nes} />
        <AttributeViewer ppu={ppu} />
        <div className="flex flex-col">
          <PalletteViewer ppu={ppu} />
          <SpriteDebugScreen nes={nes} />
        </div>
        <div className="flex flex-col">
          <MemoryDebugScreen name="ppu" ppu={nes.ppu} start={0x3F00} rows={2} />
          <MemoryDebugScreen name="cpu" cpu={nes.cpu} />
        </div>
      </div>
    </div>
  )
}

export default App
