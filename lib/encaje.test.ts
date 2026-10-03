import { describe, it, expect } from 'vitest';
import { calcularEncaje, normalizarTecnologia, Perfil } from './encaje';

const perfil: Perfil = {
  stack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Tailwind'],
  modality: ['remote', 'hybrid'],
  seniority: 'junior',
};

describe('normalizarTecnologia', () => {
  it('trata como iguales las formas comunes de escribir una tecnología', () => {
    expect(normalizarTecnologia('Node.js')).toBe('node');
    expect(normalizarTecnologia('nodejs')).toBe('node');
    expect(normalizarTecnologia('Node')).toBe('node');
    expect(normalizarTecnologia('React.js')).toBe('react');
    expect(normalizarTecnologia('Next.js')).toBe('next');
    expect(normalizarTecnologia('JS')).toBe('javascript');
    expect(normalizarTecnologia('Postgres')).toBe('postgresql');
    expect(normalizarTecnologia('TailwindCSS')).toBe('tailwind');
  });

  it('no confunde tecnologías distintas', () => {
    expect(normalizarTecnologia('Java')).not.toBe(normalizarTecnologia('JavaScript'));
    expect(normalizarTecnologia('C#')).not.toBe(normalizarTecnologia('C++'));
    // "js" corto no se recorta: si no, "js" quedaría vacío.
    expect(normalizarTecnologia('js')).toBe('javascript');
  });
});

describe('calcularEncaje', () => {
  it('100 cuando todo coincide', () => {
    const e = calcularEncaje({ stack: ['React', 'TypeScript'], modality: 'remote', seniority: 'junior' }, perfil);
    expect(e).toEqual({ score: 100, matched: ['React', 'TypeScript'], missing: [] });
  });

  it('stack 70 / modalidad 15 / seniority 15', () => {
    // Mitad del stack (35) + modalidad (15) + seniority distinto por 2 niveles (0) = 50.
    const e = calcularEncaje({ stack: ['React', 'Go'], modality: 'hybrid', seniority: 'senior' }, perfil);
    expect(e).toEqual({ score: 50, matched: ['React'], missing: ['Go'] });
  });

  it('seniority a un nivel de distancia da la mitad', () => {
    // 70 + 0 (presencial) + 7,5 = 77,5 → 78.
    const e = calcularEncaje({ stack: ['React'], modality: 'onsite', seniority: 'mid' }, perfil);
    expect(e?.score).toBe(78);
  });

  it('lo que la oferta no dice no cuenta en contra', () => {
    // Solo hay stack: 1 de 2 → 50, sin penalizar modalidad ni seniority desconocidos.
    const e = calcularEncaje({ stack: ['React', 'Rust'], modality: null, seniority: null }, perfil);
    expect(e?.score).toBe(50);
    // Sin stack: solo modalidad y seniority.
    expect(calcularEncaje({ stack: [], modality: 'remote', seniority: 'junior' }, perfil)?.score).toBe(100);
  });

  it('null si no hay nada que comparar', () => {
    expect(calcularEncaje({ stack: [], modality: null, seniority: null }, perfil)).toBeNull();
  });

  it('no cuenta dos veces la misma tecnología escrita distinto', () => {
    const e = calcularEncaje({ stack: ['Node.js', 'NodeJS', 'Kafka'], modality: null, seniority: null }, perfil);
    // 2 tecnologías distintas (no 3), 1 coincide → 50.
    expect(e).toEqual({ score: 50, matched: ['Node.js'], missing: ['Kafka'] });
  });
});
