import { Ppu } from "nes/src/ppu";

export function AttributeViewer({ ppu }: { ppu: Ppu; }) {
    const attributes = [];
    for (let row = 0; row < 2; row++) {
        const rowAttributeItems = []
        for (let col = 0; col < 32; col++) {
            const attrByte = ppu.read(row * 32 + col + 0x23c0);
            rowAttributeItems.push(<div key={row * 2 + col} className="m-1 flex flex-col border-red-500 border">
                <div className="flex flex-row">
                    <div className="p-1" style={{}}>{attrByte & 0x3}</div>
                    <div className="p-1" style={{}}>{(attrByte >> 2) & 0x3}</div>
                </div>
                <div className="flex flex-row">
                    <div className="p-1" style={{}}>{(attrByte >> 4) & 0x3}</div>
                    <div className="p-1" style={{}}>{(attrByte >> 6) & 0x3}</div>
                </div>
            </div>);
        }
        attributes.push(<div key={"r" + row} className="flex flex-row">{rowAttributeItems}</div>);
    }
    return <div className="pl-2">
        <h2 className="text-lg font-bold">Attributes</h2>
        <div className="border-1 border-blue-600 flex flex-wrap">
            {attributes}
        </div>
    </div>;
}
