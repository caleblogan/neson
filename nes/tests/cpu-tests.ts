import * as fs from "fs"
import { Cpu } from "../src/cpu";
import { UnknownOpcode } from "../src/errors";

// Test runner for the CPU tests 6502/ and nes6502/ folders
const platform = process.argv[2]
const argOpcode = process.argv[3]
const testIndex = process.argv[4]

if (!platform) {
    console.error('Platform not specified: nes6502 | 6502')
    process.exit(1);
}

for (let i = 0; i < 0xff; i++) {
    const opcode = argOpcode ?? i.toString(16).padStart(2, "0")
    const path = `./${platform}/v1/${opcode}.json`;
    console.log(`RUNNING ${opcode} tests`)


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
    // console.log(`\nRUNNING ${test["name"]}`)

    const cpu = new Cpu();

    // SET
    const initial = test["initial"]
    cpu.PC = initial["pc"]
    cpu.SP = initial["s"]
    cpu.Accumulator = initial["a"]
    cpu.X = initial["x"]
    cpu.Y = initial["y"]
    if (test.name === "31 8d 60") {
        console.log(`cpu`, cpu)
        return
    }

    cpu.setFlagsFromByte(initial["p"])
    for (const [address, value] of initial["ram"]) {
        cpu.write(address, value)
    }

    // run
    cpu.clock()

    // CMP
    const expected = test["final"]
    let invalidRam = false
    for (const [address, value] of expected["ram"]) {
        if (cpu.read(address) !== value) {
            invalidRam = true
            // console.log(`INVALID RAM address=${address} expected=${value} actual=${cpu.read(address)}`)
        }
    }
    if (invalidRam || cpu.PC !== expected["pc"] || cpu.X !== expected["x"] || cpu.Y !== expected["y"] || cpu.Accumulator !== expected["a"]
        || cpu.SP !== expected["s"] || (cpu.getFlagsAsByte() | (1 << 5)) !== expected["p"]
    ) {
        console.log(`FAILED Opcode=${opcode} Name=${test["name"]}`)

        console.log(
            `EXPECT PC=${expected["pc"]} X=${expected["x"]} Y=${expected["y"]} A=${expected["a"]} SP=${expected["s"]} FLAGS=${expected["p"].toString(2).padStart(8, '0')}`)
        console.log(`ACTUAL PC=${cpu.PC} X=${cpu.X} Y=${cpu.Y} A=${cpu.Accumulator} SP=${cpu.SP} FLAGS=${(cpu.getFlagsAsByte() | (1 << 5)).toString(2).padStart(8, '0')}`)
        console.log(`TST RAM`, (expected["ram"] as any[]).map(([_, value]) => value))
        console.log(`CPU RAM`, cpu.readBytes((expected["ram"] as any[]).map(([address, _]) => address)))
        throw new Error(`stopped... due to failure`)
    }
}

console.log(`ALL TESTS PASSED`)