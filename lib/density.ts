export type Density = 'comoda' | 'densa';

const DENSITY_KEY = 'jobtrackr_density';

export function getDensity(): Density {
  if (typeof window === 'undefined') return 'comoda';
  return localStorage.getItem(DENSITY_KEY) === 'densa' ? 'densa' : 'comoda';
}

export function saveDensity(density: Density) {
  localStorage.setItem(DENSITY_KEY, density);
}
