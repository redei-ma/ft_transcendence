// utils/logger.ts
// Sistema di logging condizionale.
// In produzione (e in valutazione) la console resta pulita.
// In dev, attivi/disattivi per categoria.

const DEBUG = import.meta.env.DEV;

// Sotto-categorie: messe a false quelle che spammano troppo
const CHANNELS = {
  game: true,
  net: true,
  render: true,
  input: true,
} as const;

type Channel = keyof typeof CHANNELS;

function shouldLog(channel: Channel): boolean {
  return DEBUG && CHANNELS[channel];
}

export const log = {
  game:   (...args: unknown[]) => shouldLog('game')   && console.log('🎮', ...args),
  net:    (...args: unknown[]) => shouldLog('net')     && console.log('🌐', ...args),
  render: (...args: unknown[]) => shouldLog('render')  && console.log('🎨', ...args),
  input:  (...args: unknown[]) => shouldLog('input')   && console.log('🕹️', ...args),
  warn:   (...args: unknown[]) => DEBUG && console.warn('⚠️', ...args),
  error:  (...args: unknown[]) => console.error('❌', ...args), // sempre attivo
};