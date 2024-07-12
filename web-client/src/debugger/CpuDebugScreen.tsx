import { Cpu } from "nes/src/cpu";
import { hex } from "nes/src/utils";

export function CpuDebugScreen({ cpu }: { cpu: Cpu | null; }) {
    if (!cpu) return <div>no cpu</div>;

    const instructions = [];
    for (let i = 0; i < 20; i++) {
        instructions.push(<p key={i} className={i === 10 ? "font-bold" : ""}>{hex(cpu.PC + i - 10, 4)} {hex(cpu.read(cpu.PC + i - 10), 2)}</p>);
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
    </div>;
}
