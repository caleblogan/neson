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
 * [] display memory
 * [] display pattern tables
 * [*] add step forward control (keydown)
 */



function Screen() {
  return <div>
    <canvas id="screen" width={283 * 2} height={242 * 2}
      className="border-2 border-black"
    />
  </div>
}

function PatternDebugScreen({ id }: { id: number }) {
  return <div>
    <p>Table: {id}</p>
    <canvas id="screen" width={128} height={128}
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
            <PatternDebugScreen id={0} />
            <PatternDebugScreen id={1} />
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
