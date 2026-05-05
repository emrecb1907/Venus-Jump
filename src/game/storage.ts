import { STORAGE_KEY } from "./constants";

export function readHighScore(): number {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
}

export function writeHighScore(score: number): void {
  localStorage.setItem(STORAGE_KEY, String(score));
}
