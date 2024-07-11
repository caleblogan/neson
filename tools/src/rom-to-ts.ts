// Outputs a ts file that contains the rom as a Uint8Arrays
import * as fs from 'fs'

const romFileName = process.argv[2]

if (!romFileName) {
    console.error('Usage: npx tsx rom-to-js <rom-file>')
    process.exit(1)
}

const bytes = fs.readFileSync(romFileName)

const rom = Array.from(bytes).join(', ')

fs.writeFileSync(`${romFileName}.ts`, `export const rom = new Uint8Array([${rom}])`)
