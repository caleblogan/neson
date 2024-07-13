import { Apu } from "nes/src/apu";
import { Cpu } from "nes/src/cpu";
import { Ppu } from "nes/src/ppu";

export type Nes = { cpu: Cpu, ppu: Ppu, apu: Apu }

export function PpuDebugScreen({ nes }: { nes: Nes; }) {
    return <div className="p-2">
        <h2 className="text-xl font-bold">Ppu:</h2>
        <p>Cycles: {nes.ppu.cycle}</p>
        <p>Scanline: {nes.ppu.scanline}</p>
        <p>Vertical Blank: {nes.ppu.verticalBlank}</p>
        <hr />
    </div>;
}
