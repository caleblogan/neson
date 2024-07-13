import { NES_COLORS_NC02 } from "nes/src/pallette";
import { Ppu } from "nes/src/ppu";

export function PalletteViewer({ ppu }: { ppu: Ppu; }) {
    // Tailwind smack
    <div className="w-0 h-0 bg-[#7C7C7C] bg-[#0000FC] bg-[#0000BC] bg-[#4428BC] bg-[#940084] bg-[#A80020] bg-[#A81000] bg-[#881400]
    bg-[#503000] bg-[#007800] bg-[#006800] bg-[#005800] bg-[#004058]   
    bg-[#BCBCBC] bg-[#0078F8] bg-[#0058F8] bg-[#6844FC] bg-[#D800CC] bg-[#E40058] bg-[#F83800] bg-[#E45C10]
    bg-[#AC7C00] bg-[#00B800] bg-[#00A800] bg-[#00A844] bg-[#008888]   
    bg-[#F8F8F8] bg-[#3CBCFC] bg-[#6888FC] bg-[#9878F8] bg-[#F878F8] bg-[#F85898] bg-[#F87858] bg-[#FCA044]
    bg-[#F8B800] bg-[#B8F818] bg-[#58D854] bg-[#58F898] bg-[#00E8D8] bg-[#787878]  
    bg-[#FCFCFC] bg-[#A4E4FC] bg-[#B8B8F8] bg-[#D8B8F8] bg-[#F8B8F8] bg-[#F8A4C0] bg-[#F0D0B0] bg-[#FCE0A8]
    bg-[#F8D878] bg-[#D8F878] bg-[#B8F8B8] bg-[#B8F8D8] bg-[#00FCFC] bg-[#F8D8F8]  "></div>;
    const pallettes = [];
    for (let pIndex = 0; pIndex < ppu.palletes.length / 4; pIndex++) {
        const pallette = [];
        for (let i = 0; i < 4; i++) {
            pallette.push(<div key={i} className={`w-4 h-4 border-1 border-amber-400 bg-[${NES_COLORS_NC02[ppu.read(0x3f00 + pIndex * 4 + i)]}]`}></div>);
        }
        pallettes.push(<div key={pIndex} className="p-1 flex">{pallette}</div>);
    }
    return <div className="pl-2">
        <h2 className="text-lg font-bold">Pallettes</h2>
        <div className="border-1 border-blue-600 flex">
            {pallettes}
        </div>
    </div>;
}
