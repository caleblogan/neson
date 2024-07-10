import * as fs from "fs"
import { Cpu } from "../src/cpu";
import { UnknownOpcode } from "../src/errors";
import { fbin, hex } from "../src/utils";

// Test runner for the CPU tests 6502/ and nes6502/ folders
const platform = process.argv[2]
const argOpcode = process.argv[3]
const testIndex = process.argv[4]

if (!platform) {
    console.error('Platform not specified: nes6502 | 6502')
    process.exit(1);
}

const startIndex = 1
for (let i = startIndex; i < 0xff; i++) {
    const opcode = argOpcode ?? i.toString(16).padStart(2, "0")
    const path = `./tests/${platform}/v1/${opcode}.json`;
    console.log(`\n\nRUNNING op 0x${opcode} tests`)


    const tests = JSON.parse(fs.readFileSync(path).toString())
    for (const test of tests) {
        try {
            execTst(opcode, test)
        } catch (e) {
            if (e instanceof UnknownOpcode) {
                console.log(`SKIPPING ${test["name"]} due to UnknownOpcode`)
                break
            }
            process.exit(1)
        }

    }

    if (argOpcode !== undefined) {
        break
    }
}

function execTst(opcode: string, test: { "name": string, "initial": any, "final": any }) {
    console.log(`\nRUNNING ${test["name"]}`)

    const cpu = new Cpu();

    // SET
    const initial = test["initial"]
    cpu.PC = initial["pc"]
    cpu.SP = initial["s"]
    cpu.Accumulator = initial["a"]
    cpu.X = initial["x"]
    cpu.Y = initial["y"]
    cpu.setFlagsFromByte(initial["p"])
    for (const [address, value] of initial["ram"]) {
        cpu.write(address, value)
    }

    // run
    cpu.clock()

    // CMP
    const e = test["final"]
    let invalidRam = false
    for (const [address, value] of e["ram"]) {
        if (cpu.read(address) !== value) {
            invalidRam = true
            console.log(`INVALID RAM address=${address} expected=${value} actual=${cpu.read(address)}`)
        }
    }
    if (invalidRam || cpu.PC !== e["pc"] || cpu.X !== e["x"] || cpu.Y !== e["y"] || cpu.Accumulator !== e["a"]
        || cpu.SP !== e["s"] || cpu.getFlagsAsByte() !== e["p"]
    ) {
        console.log(`FAILED Opcode=${opcode} Name=${test["name"]}`)

        console.log(
            `EXPECT PC=${hex(e["pc"], 4)} X=${hex(e["x"])} Y=${hex(e["y"])} A=${hex(e["a"])} SP=${hex(e["s"])} FLAGS=${fbin(e["p"])}`)
        console.log(`ACTUAL PC=${hex(cpu.PC, 4)} X=${hex(cpu.X)} Y=${hex(cpu.Y)} A=${hex(cpu.Accumulator)} SP=${hex(cpu.SP)} FLAGS=${fbin(cpu.getFlagsAsByte())}`)
        console.log(`TST RAM`, (e["ram"] as any[]).map(([_, value]) => value))
        console.log(`CPU RAM`, cpu.readBytes((e["ram"] as any[]).map(([address, _]) => address)))
        throw new Error(`stopped... due to failure`)
    }
}

console.log(`ALL TESTS PASSED`)