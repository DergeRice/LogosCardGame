import type {Kind} from './rules.js';
export const BASIC_SUPPLY_KINDS=['pronoun','count','verb','indefinite','article'] as const satisfies readonly Kind[];
export const BASIC_SUPPLY_COOLDOWN_MS=30_000;
export type BasicSupplyKind=typeof BASIC_SUPPLY_KINDS[number];
