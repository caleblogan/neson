import { Apu } from "nes/src/apu";
import { Cpu } from "nes/src/cpu";
import { Ppu } from "nes/src/ppu";
import { hex } from "nes/src/utils";

export function SpriteDebugScreen({ nes }: { nes: { cpu: Cpu, ppu: Ppu, apu: Apu } }) {
    const sprites = []
    for (let i = 0; i < 64; i++) {
        const y = nes.ppu.oam[i * 4]
        const tileIndex = nes.ppu.oam[i * 4 + 1]
        const attributes = nes.ppu.oam[i * 4 + 2]
        const x = nes.ppu.oam[i * 4 + 3]
        sprites.push({ y, tileIndex, attributes, x })
    }
    return <div>
        <h2 className="font-bold p-2">Sprites (OAM):</h2>
        {sprites.map((sprite, i) => (
            <div key={`${sprite.x},${sprite.y}, ${i}`} className="flex space-x-4">
                <div>{i}: {" "}</div>
                <div>({sprite.x}, {sprite.y})</div>
                <div>ID:{hex(sprite.tileIndex)}</div>
                <div>Attributes:{sprite.attributes}</div>
            </div>
        ))}
    </div>
}
