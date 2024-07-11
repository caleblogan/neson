import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Cart0 } from "../../nes/src/carts.ts"
import { Ppu } from "../../nes/src/ppu.ts"
import { Apu } from "../../nes/src/apu.ts"
import { Cpu } from "../../nes/src/cpu.ts"
import { NesContext } from './context.ts'


const cart = new Cart0(new Uint8Array())
const ppu = new Ppu(cart)
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)
cpu.powerUp()

const nes = {
  cpu,
  ppu,
  apu
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NesContext.Provider value={nes}>
      <App />
    </NesContext.Provider>
  </React.StrictMode>,
)
