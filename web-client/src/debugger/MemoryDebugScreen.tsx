import { Cpu } from "nes/src/cpu";
import { Ppu } from "nes/src/ppu";
import { hex } from "nes/src/utils";

export function MemoryDebugScreen({ name, cpu, ppu, start = 0, rows = 16 }: { name: string; cpu?: Cpu; ppu?: Ppu; start?: number; rows?: number; }) {
    const device = ppu ? ppu : cpu;
    if (!device) return;
    const memoryView = [];
    for (let row = 0; row < rows; row++) {
        const rowValues = [];
        for (let col = 0; col < 16; col++) {
            rowValues.push(device.read(start + row * 16 + col));
        }
        memoryView.push(<p key={row} className="flex space-x-2">{hex(start + row * 16, 4)}<span className="pl-4"></span> {rowValues.map(v => hex(v, 2) + "  ")}</p>);
    }

    return <div className="pl-2">
        <h2 className="text-lg font-bold">{name} Memory</h2>
        <div className="grid grid-cols-16 gap-2">
            {memoryView}
        </div>
    </div>;
}
