import { Apu } from "nes/src/apu";
import { Cpu } from "nes/src/cpu";
import { NES_COLORS_NC02 } from "nes/src/pallette";
import { Ppu } from "nes/src/ppu";
import { useEffect } from "react";

// TODO: hardcoded for testing
// const pallete = ["#000000", "#b71e7b", "#48cdde", "#4240ff"] as const
// const palletteIndex = 0;
// const pallettes = [[0x20, 0x11, 0x24, 0x33]];
const pixels = new Uint8Array(0x8000); // 32kb

export function PatternDebugScreen({ nes, id, palletteIndex = 0 }: { nes: { cpu: Cpu, ppu: Ppu, apu: Apu }, id: number, palletteIndex?: number }) {
    useEffect(() => {
        function draw() {
            const canvas = document.getElementById(`pattern-${id}`) as HTMLCanvasElement | null;
            if (!canvas) {
                return;
            }
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }

            let x = 0;
            let y = 0;
            let tileX = 0;
            let tileY = 0;
            ctx.clearRect(0, 0, 300, 300);
            ctx.moveTo(0, 0);
            const size = 2;
            for (let i = 0; i < pixels.length / 2; i++) {
                if (i % 8 === 0 && i !== 0) {
                    y++;
                    x = tileX;
                }
                if (i % 64 === 0 && i !== 0) {
                    y = tileY;
                    tileX += 8;
                    x = tileX;
                }
                if (i % (64 * 16) === 0 && i !== 0) {
                    tileY += 8;
                    y = tileY;
                    tileX = 0;
                    x = 0;
                }
                const offset = id === 0 ? 0 : pixels.length / 2;
                ctx.fillStyle = NES_COLORS_NC02[nes.ppu.read(0x3f00 + palletteIndex * 4 + pixels[i + offset])];
                ctx.moveTo(x, y);
                ctx.beginPath();
                ctx.fillRect(x * size, y * size, size, size);
                ctx.closePath();

                x++;
            }
        }
        let tile = [];
        let pixelIndex = 0;
        for (let i = 0; i < 0x2000; i++) {
            const byte = nes.ppu.read(i);
            tile.push(byte);
            if (tile.length === 16) {
                const loBytes = tile.slice(0, 8);
                const hiBytes = tile.slice(8);
                for (let j = 0; j < 8; j++) {
                    const lo = loBytes[j];
                    const hi = hiBytes[j];
                    for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
                        const value = ((lo >> bitIndex) & 1) + (((hi >> bitIndex) & 1) << 1);
                        pixels[pixelIndex++] = value;
                    }
                }
                tile = [];
            }
        }

        draw();
    }, [nes]);

    return <div>
        <p>Table: {id}</p>
        <canvas id={`pattern-${id}`} width={256} height={256}
            className="border-2 border-black" />
    </div>;
}
