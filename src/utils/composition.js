export const ATOMIC_MASS = {
  C: 12.011, Cr: 51.996, Mo: 95.94, V: 50.942,
  W: 183.84, Co: 58.933, Ni: 58.693, Mn: 54.938,
  Si: 28.086, S: 32.065, P: 30.974, Cu: 63.546,
  Nb: 92.906, N: 14.007, Fe: 55.845
}

/**
 * Get min/max from composition value array
 * @param {Array|null} comp - e.g. [0.42, 0.50] or [0.03]
 * @returns {{ min: number, max: number } | null}
 */
export function getMinMax(comp) {
  if (!comp) return null
  if (comp.length === 1) return { min: comp[0], max: comp[0] }
  return { min: comp[0], max: comp[1] }
}

/**
 * Convert mass% to atoms (mass% / atomicMass * 1000)
 * Represents relative number of atoms per 1000g alloy
 */
export function toAtoms(composition) {
  if (!composition) return {}
  const result = {}
  for (const [el, vals] of Object.entries(composition)) {
    const mass = ATOMIC_MASS[el]
    if (!mass) continue
    if (vals.length === 1) {
      result[el] = [vals[0] / mass * 1000]
    } else {
      result[el] = [vals[0] / mass * 1000, vals[1] / mass * 1000]
    }
  }
  return result
}

/**
 * Convert mass% to molar% (normalized atomic%)
 * Each element's moles / total moles * 100
 */
export function toMolar(composition) {
  if (!composition) return {}
  const entries = Object.entries(composition)
  let totalMoles = 0
  for (const [el, vals] of entries) {
    const mass = ATOMIC_MASS[el]
    if (!mass) continue
    const mid = vals.length === 1 ? vals[0] : (vals[0] + vals[1]) / 2
    totalMoles += mid / mass
  }
  let totalMass = 0
  for (const [, vals] of entries) {
    totalMass += vals.length === 1 ? vals[0] : (vals[0] + vals[1]) / 2
  }
  totalMoles += Math.max(0, 100 - totalMass) / ATOMIC_MASS.Fe

  if (totalMoles === 0) return {}
  const result = {}
  for (const [el, vals] of entries) {
    const mass = ATOMIC_MASS[el]
    if (!mass) continue
    if (vals.length === 1) {
      result[el] = [(vals[0] / mass / totalMoles) * 100]
    } else {
      result[el] = [(vals[0] / mass / totalMoles) * 100, (vals[1] / mass / totalMoles) * 100]
    }
  }
  return result
}
