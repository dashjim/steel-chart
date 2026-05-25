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
 * Convert mass% composition to atomic% (atoms)
 * @param {Object} composition - e.g. { C: [0.42, 0.50], Mn: [0.60, 0.90] }
 * @returns {Object} - same structure but values in atomic%
 */
export function toAtoms(composition) {
  if (!composition) return {}
  const result = {}
  // Use midpoint for conversion calculation
  const entries = Object.entries(composition)

  // Calculate moles for each element using midpoint
  const moles = {}
  let totalMoles = 0
  for (const [el, vals] of entries) {
    const mid = vals.length === 1 ? vals[0] : (vals[0] + vals[1]) / 2
    const mass = ATOMIC_MASS[el]
    if (!mass) continue
    moles[el] = mid / mass
    totalMoles += mid / mass
  }
  // Add Fe balance
  let totalMass = 0
  for (const [, vals] of entries) {
    totalMass += vals.length === 1 ? vals[0] : (vals[0] + vals[1]) / 2
  }
  const feMass = Math.max(0, 100 - totalMass)
  const feMoles = feMass / ATOMIC_MASS.Fe
  totalMoles += feMoles

  if (totalMoles === 0) return {}

  // Convert each element preserving min/max ratio
  for (const [el, vals] of entries) {
    const mass = ATOMIC_MASS[el]
    if (!mass) continue
    if (vals.length === 1) {
      const atomPct = (vals[0] / mass / totalMoles) * 100
      result[el] = [atomPct]
    } else {
      const minAtom = (vals[0] / mass / totalMoles) * 100
      const maxAtom = (vals[1] / mass / totalMoles) * 100
      result[el] = [minAtom, maxAtom]
    }
  }
  return result
}

/**
 * Convert mass% composition to molar%
 * Same as toAtoms (molar% and atomic% are equivalent for elements)
 * @param {Object} composition
 * @returns {Object}
 */
export function toMolar(composition) {
  return toAtoms(composition)
}
