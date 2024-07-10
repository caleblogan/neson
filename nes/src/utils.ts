export function hex(number: number, width = 2): string {
    return `$${number.toString(16).padStart(width, "0")}`
}
export function fbin(number: number, width = 8): string {
    return `0b${number.toString(2).padStart(width, "0")}`
}