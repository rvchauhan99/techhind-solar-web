const LOCATION_ERROR_MESSAGE =
  "Unable to detect your location. Please allow location access or enter the coordinates manually."

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidLatitude(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= -90 && n <= 90
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidLongitude(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= -180 && n <= 180
}

/**
 * Request current device position via Geolocation API.
 * Requires a secure context (HTTPS or localhost).
 *
 * @param {{ timeout?: number, enableHighAccuracy?: boolean, maximumAge?: number }} [options]
 * @returns {Promise<{ latitude: number, longitude: number, accuracy?: number }>}
 */
export function getCurrentPosition(options = {}) {
  const {
    timeout = 15000,
    enableHighAccuracy = true,
    maximumAge = 0,
  } = options

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error(LOCATION_ERROR_MESSAGE))
      return
    }

    if (!window.isSecureContext || !navigator?.geolocation) {
      reject(new Error(LOCATION_ERROR_MESSAGE))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position?.coords?.latitude
        const longitude = position?.coords?.longitude
        if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
          reject(new Error(LOCATION_ERROR_MESSAGE))
          return
        }
        resolve({
          latitude,
          longitude,
          accuracy: position?.coords?.accuracy,
        })
      },
      () => {
        reject(new Error(LOCATION_ERROR_MESSAGE))
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    )
  })
}

export const GEOLOCATION_ERROR_MESSAGE = LOCATION_ERROR_MESSAGE
