/**
 * ESSA demo / retest toggles.
 *
 * Delete controls (detail "Remove demo" + list trash icon) are hidden by default.
 *
 * To show them without editing code, run in the browser console then reload:
 *   localStorage.setItem('essa_show_demo_delete', '1')
 *
 * To hide again:
 *   localStorage.removeItem('essa_show_demo_delete')
 */

const DEMO_DELETE_STORAGE_KEY = 'essa_show_demo_delete'

/** Default when localStorage is not set. Set to true to always show delete controls. */
export const ESSA_DEMO_DELETE_CONTROLS_DEFAULT = false

export function isEssaDemoDeleteEnabled() {
  try {
    const stored = localStorage.getItem(DEMO_DELETE_STORAGE_KEY)
    if (stored === '1' || stored === 'true') return true
    if (stored === '0' || stored === 'false') return false
  } catch {
    // ignore
  }
  return ESSA_DEMO_DELETE_CONTROLS_DEFAULT
}
