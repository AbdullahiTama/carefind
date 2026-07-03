// Active posting identity — stored per device in the browser.
// null / no value  => posting as yourself (personal)
// { id, name }     => posting as that business

const KEY = 'carefind_active_business'

export function getActiveBusiness() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveBusiness(business) {
  try {
    if (business) {
      localStorage.setItem(KEY, JSON.stringify({ id: business.id, name: business.name }))
    } else {
      localStorage.removeItem(KEY)
    }
    // Let other components/pages react to the change
    window.dispatchEvent(new Event('identity-changed'))
  } catch {
    // ignore storage errors
  }
}

export function clearActiveBusiness() {
  setActiveBusiness(null)
}
