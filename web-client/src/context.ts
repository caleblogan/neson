import { Apu } from 'nes/src/apu';
import { Cpu } from 'nes/src/cpu';
import { Ppu } from 'nes/src/ppu';
import { createContext } from 'react';

type Nes = {
    cpu: Cpu,
    ppu: Ppu,
    apu: Apu
}

export const NesContext = createContext<Nes | null>(null);