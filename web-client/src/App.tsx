import { useEffect, useState } from "react"
import { Cart0 } from "nes/src/carts.ts"
import { Ppu } from "nes/src/ppu.ts"
import { Apu } from "nes/src/apu.ts"
import { Cpu } from "nes/src/cpu.ts"
import { rom } from "./assets/nestest.ts"
// import { rom } from "./assets/roms/donkey-kong.nes.ts"
import { PatternDebugScreen } from "./debugger/PatternDebugScreen.tsx"
import { CpuDebugScreen } from "./debugger/CpuDebugScreen.tsx"
import { MemoryDebugScreen } from "./debugger/MemoryDebugScreen.tsx"
import { PalletteViewer } from "./debugger/PalletteViewer.tsx"
import { hex } from "nes/src/utils.ts"

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
 * [*] pallette colors
 * [*] display pallette
 * [*] draw pattern table using pallette
 * [] ppu viewer
 * [*] display nametable (vram)
 */

type Nes = { cpu: Cpu, ppu: Ppu, apu: Apu }

function Screen({ nes }: { nes: Nes }) {
  return <div>
    <canvas id="screen" width={283 * 2} height={242 * 2}
      className="border-2 border-black"
    />
  </div>
}

function PpuDebugScreen({ nes }: { nes: Nes }) {
  return <div className=" border-2 border-black p-2">
    <h2 className="text-xl font-bold">Ppu:</h2>
    <p>Cycles: {nes.ppu.cycle}</p>
    <p>Scanline: {nes.ppu.scanline}</p>
    <hr />
  </div>;
}



function App() {
  const [nes, setNes] = useState(nesDefault)
  const [palletteIndex, setPalletteIndex] = useState(0)

  useEffect(() => {
    // TODO: testing
    ppu.write(0x3f00, 0x21)
    ppu.write(0x3f01, 0x16)
    ppu.write(0x3f02, 0x06)
    ppu.write(0x3f03, 0x02)
    ppu.write(0x2000, 0x11)
    ppu.write(0x2001, 0x12)
    setNes({ ...nes })
    function handler(e: KeyboardEvent) {
      if (e.key === "n") {
        nes.cpu.clock()
        nes.ppu.clock()
        setNes({ ...nes })
      } else if (e.key === "p") {
        setPalletteIndex(prev => (prev + 1) % 8)
        setNes({ ...nes })
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    const BATCH_CYCLES = 100
    const id = setInterval(function ticker() {
      for (let i = 0; i < BATCH_CYCLES; i++) {
        if (i % 3 === 0) {
          nes.cpu.clock()
        }
        nes.ppu.clock()
      }
    }, 30)
    return () => clearInterval(id)
  })

  return (
    <div className="p-4 pt-1 font-mono">
      <div>Controls: n=step_instruction p=cycle_pallettes</div>
      <div className="flex flex-wrap space-x-1">
        <div>
          <Screen nes={nes} />
          <div className="flex">
            <PatternDebugScreen id={0} nes={nes} palletteIndex={palletteIndex} />
            <PatternDebugScreen id={1} nes={nes} palletteIndex={palletteIndex} />
          </div>
        </div>
        <CpuDebugScreen cpu={nes?.cpu ?? null} />
        <PpuDebugScreen nes={nes} />
        <PalletteViewer ppu={ppu} />
        <div className="flex flex-col">
          <MemoryDebugScreen name="ppu" ppu={nes.ppu} start={0x3F00} rows={2} />
          <MemoryDebugScreen name="cpu" cpu={nes.cpu} />
        </div>
      </div>
    </div>
  )
}

export default App
