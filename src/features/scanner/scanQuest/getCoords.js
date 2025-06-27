// @ts-check
import { point } from '@turf/helpers'
import destination from '@turf/destination'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })
const RADIUS = 750

/**
 * Get polygon coords for quest scan area
 * @param {[number, number]} center
 * @returns {[number, number][]}
 */
export const getScanQuestCoords = (center) => {
  const start = point([center[1], center[0]])
  const coords = []
  for (let bearing = 0; bearing < 360; bearing += 20) {
    const [lon, lat] = destination(start, RADIUS / 1000, bearing, OPTIONS).geometry.coordinates
    coords.push([lat, lon])
  }
  coords.push(coords[0])
  return coords
}
