import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'

const TIMER_REMAINING_TAG = 'simple-thermostat-timer-remaining'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`
  }

  return `${minutes}:${pad(remainingSeconds)}`
}

class SimpleThermostatTimerRemaining extends LitElement {
  @property({ attribute: false }) stateObj?: any
  @property({ attribute: false }) hass?: any

  private tick?: number

  createRenderRoot() {
    return this
  }

  connectedCallback() {
    super.connectedCallback()
    this.syncTicker()
  }

  disconnectedCallback() {
    this.clearTicker()
    super.disconnectedCallback()
  }

  updated() {
    this.syncTicker()
  }

  private clearTicker() {
    if (this.tick) {
      window.clearInterval(this.tick)
      this.tick = undefined
    }
  }

  private syncTicker() {
    const active = this.stateObj?.state === 'active'
    const finishesAt = this.stateObj?.attributes?.finishes_at

    const endTime = finishesAt ? Date.parse(finishesAt) : NaN
    const hasFutureEndTime = !Number.isNaN(endTime) && endTime > Date.now()

    if (active && hasFutureEndTime && !this.tick) {
      this.tick = window.setInterval(() => {
        if (endTime <= Date.now()) {
          this.clearTicker()
        }
        this.requestUpdate()
      }, 1000)
      return
    }

    if ((!active || !hasFutureEndTime) && this.tick) {
      this.clearTicker()
    }
  }

  private getValue() {
    const state = this.stateObj
    if (!state) return ''

    if (state.state === 'active' && state.attributes?.finishes_at) {
      const finishesAt = Date.parse(state.attributes.finishes_at)
      if (!Number.isNaN(finishesAt)) {
        return formatSeconds((finishesAt - Date.now()) / 1000)
      }
    }

    if (state.state === 'paused' && state.attributes?.remaining) {
      return state.attributes.remaining
    }

    if (typeof this.hass?.formatEntityState === 'function') {
      return this.hass.formatEntityState(state)
    }

    return state.state
  }

  render() {
    return html`${this.getValue()}`
  }
}

if (!customElements.get(TIMER_REMAINING_TAG)) {
  customElements.define(TIMER_REMAINING_TAG, SimpleThermostatTimerRemaining)
}
