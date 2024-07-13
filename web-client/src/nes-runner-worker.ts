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

const canvas = new OffscreenCanvas(256 * 2, 240 * 2);
const cart = new Cart0(prgRom, chrRom)
const ppu = new Ppu(cart, canvas)
const apu = new Apu()
const cpu = new Cpu(cart, ppu, apu)
cpu.powerUp()

const nes = {
    cpu,
    ppu,
    apu
}

let ctx = canvas.getContext("2d");
function sendScreenToMainThread(port: MessagePort) {
    if (!ctx) {
        ctx = canvas.getContext("2d");
        if (!ctx) return
    }
    const bitmap = canvas.transferToImageBitmap();
    port.postMessage({ type: "screen", data: bitmap });
}

function runLoop(port: MessagePort) {
    let systemClock = 0
    const BATCH_CYCLES = 124_000 // 28_000
    setTimeout(function loop() {
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
        sendScreenToMainThread(port)
        setTimeout(loop, 0)
    }, 0)

}

onconnect = (e) => {
    const port = e.ports[0];

    runLoop(port);

    port.onmessage = (e) => {
        if (e.data.type === "keydown") {
            const { key } = e.data
            port.postMessage({ type: "ping", data: e.data });
            if (key === "p") {
                port.postMessage({ type: "ping", data: "ping me" });
            } else if (key === "w" || key === "ArrowUp") {
                nes.cpu.joy1BufferReg |= 0x8
            } else if (key === "s" || key === "ArrowDown") {
                nes.cpu.joy1BufferReg |= 0x4
            } else if (key === "a" || key === "ArrowLeft") {
                nes.cpu.joy1BufferReg |= 0x2
            } else if (key === "d" || key === "ArrowRight") {
                nes.cpu.joy1BufferReg |= 0x1
            } else if (key === "Enter") { // Enter is Start
                nes.cpu.joy1BufferReg |= 0x10
            } else if (key === "t") { // t is Select
                nes.cpu.joy1BufferReg |= 0x20
            } else if (key === "e") { // e is B
                nes.cpu.joy1BufferReg |= 0x40
            } else if (key === "r") { // r is A
                nes.cpu.joy1BufferReg |= 0x80
            }
        }
    };

    onerror = (error) => {
        port.postMessage(error);
    }

    onunhandledrejection = (error) => {
        port.postMessage(error);
    }

};
