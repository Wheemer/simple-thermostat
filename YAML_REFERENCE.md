# Simple Thermostat YAML Reference

Most v4 cards should be configured with the Home Assistant visual editor first.
Use this reference for advanced YAML customization, migration, or manual
dashboard editing. See the [README](README.md) for the recommended UI-first
setup flow.

## Basic Usage

Climate entity:

```yaml
type: custom:simple-thermostat
entity: climate.living_room
```

Fan entity:

```yaml
type: custom:simple-thermostat
entity: fan.range_hood
```

Humidifier or dehumidifier entity:

```yaml
type: custom:simple-thermostat
entity: humidifier.basement_dehumidifier
```

## Examples

### Compact Climate Card

```yaml
type: custom:simple-thermostat
entity: climate.living_room
step_size: 0.5
header:
  name: Living Room
  icon: mdi:radiator
  toggle:
    entity: switch.heater
    name: Heater
    icon: mdi:radiator
control:
  - hvac
  - preset
entities:
  - entity: sensor.living_room_temperature
    icon: mdi:thermometer
  - entity: sensor.living_room_humidity
    icon: mdi:water-percent
```

### Fan With Speeds

```yaml
type: custom:simple-thermostat
entity: fan.range_hood
control:
  - fan
  - state
```

### Dehumidifier

```yaml
type: custom:simple-thermostat
entity: humidifier.basement_dehumidifier
control:
  - mode
  - state
```

### Hide The Setpoint

```yaml
type: custom:simple-thermostat
entity: climate.living_room
hide_setpoint: true
```

This hides the target value and setpoint controls while keeping supported mode controls visible.

## Configuration

### Main Options

| Option                             | Type                   | Description                                                                                                                                                                   |
| ---------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`                           | string                 | Climate, fan, humidifier, or dehumidifier entity id. Required.                                                                                                                |
| `current_value_entity`             | string                 | Entity used for the displayed current value instead of the main entity.                                                                                                       |
| `unit`                             | string, boolean        | Override the target unit, or set `false` to hide it.                                                                                                                          |
| `decimals`                         | number                 | Decimal places for target display.                                                                                                                                            |
| `step_size`                        | number                 | Amount changed by the target controls.                                                                                                                                        |
| `hide_setpoint`                    | boolean                | Hide target value and setpoint controls.                                                                                                                                      |
| `disable_setpoint_change_when_off` | boolean                | Disable climate target step buttons while the climate entity is `off`, useful for TRV-style entities that reject off-mode target changes. Defaults to `false`.                 |
| `fallback`                         | string                 | Text shown when no valid setpoint exists. Default `N/A`.                                                                                                                      |
| `enhanced_visuals`                 | boolean                | Enable v4 visual polish. Set to `false` for v3-style visual defaults while keeping v4 fixes and compatibility. Defaults to `true` and only needs to be written when disabled. |
| `header`                           | object, `false`        | Header configuration.                                                                                                                                                         |
| `hide`                             | object                 | Hide built-in state or current value rows.                                                                                                                                    |
| `label`                            | object                 | Override built-in row labels.                                                                                                                                                 |
| `layout`                           | object                 | Layout settings.                                                                                                                                                              |
| `control`                          | array, object, `false` | Mode controls.                                                                                                                                                                |
| `entities`                         | array, `false`         | Extra entity rows.                                                                                                                                                            |
| `setpoints`                        | object, `false`        | Manual setpoint configuration. Usually not needed.                                                                                                                            |
| `service`                          | object                 | Override the action used to set the target value.                                                                                                                             |
| `styles`                           | string                 | Inline CSS scoped to this card.                                                                                                                                               |
| `tap_action`                       | object                 | Action fired from the target value.                                                                                                                                           |
| `hold_action`                      | object                 | Hold action fired from the target value.                                                                                                                                      |
| `double_tap_action`                | object                 | Double tap action fired from the target value.                                                                                                                                |

### Domain Defaults

The card chooses the right behavior from the entity domain:

| Domain       | Target      | Current value                                            | Default controls                          |
| ------------ | ----------- | -------------------------------------------------------- | ----------------------------------------- |
| `climate`    | Temperature | `current_temperature` or configured current value entity | HVAC, preset, fan, swing, vane            |
| `fan`        | Percentage  | Percentage when available                                | Fan speeds, direction, oscillating, state |
| `humidifier` | Humidity    | `current_humidity`                                       | Mode, state                               |

Dehumidifiers use the Home Assistant `humidifier` domain.

## Header

Hide the header:

```yaml
header: false
```

Configure the header:

```yaml
header:
  name: My Room
  icon: mdi:sofa
  toggle:
    entity: switch.room_fan
    name: Fan
    icon: mdi:fan
```

Use multiple header toggles:

```yaml
header:
  name: My Room
  toggles:
    - entity: switch.boost
      name: Boost
      icon: mdi:rocket-launch
    - entity: switch.eco_mode
      name: Eco
      icon: mdi:leaf
```

Header options:

| Option    | Type                    | Description                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------- |
| `name`    | string, `false`         | Header title. Defaults to the entity friendly name.                          |
| `icon`    | string, object, `false` | Header icon override. Defaults to the entity icon, then a domain/state icon. |
| `toggle`  | object                  | Single header toggle.                                                        |
| `toggles` | array                   | Multiple header toggles.                                                     |
| `faults`  | array, `false`          | Binary sensor fault icons.                                                   |

Toggle options:

| Option   | Type            | Description                                            |
| -------- | --------------- | ------------------------------------------------------ |
| `entity` | string          | Entity to toggle.                                      |
| `name`   | string, boolean | Toggle label. Use `true` for the entity friendly name. |
| `icon`   | string          | Icon shown beside or instead of the toggle label.      |

Fault options:

| Option          | Type    | Description                           |
| --------------- | ------- | ------------------------------------- |
| `entity`        | string  | Binary sensor entity.                 |
| `icon`          | string  | Optional icon override.               |
| `hide_inactive` | boolean | Hide the icon when the sensor is off. |

## Layout

```yaml
layout:
  step: row
  mode:
    names: true
    icons: true
    headings: false
  entities:
    type: table
    labels: true
```

Layout options:

| Option                   | Type            | Description                                                                                                                                                                                                                             |
| ------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.step`            | `row`, `column` | Setpoint control layout. Enhanced v4 visuals default to the horizontal minus/value/plus layout. With `enhanced_visuals: false`, unset cards use the v3-style column chevron layout. Explicit `layout.step` values are always respected. |
| `layout.mode.names`      | boolean         | Show text on mode buttons.                                                                                                                                                                                                              |
| `layout.mode.icons`      | boolean         | Show icons on mode buttons.                                                                                                                                                                                                             |
| `layout.mode.headings`   | boolean         | Show mode row headings. Defaults to hidden.                                                                                                                                                                                             |
| `layout.entities.type`   | `table`, `list` | Extra entity row layout.                                                                                                                                                                                                                |
| `layout.entities.labels` | boolean         | Show labels for extra entity rows.                                                                                                                                                                                                      |
| `layout.entities.separator` | boolean      | Show the `:` separator after text labels in entity rows. Set to `false` if you prefer labels without punctuation.                                                                                                                       |

## Tweaks

V4 enhanced visuals are enabled by default:

```yaml
enhanced_visuals: true
```

Set `enhanced_visuals: false` when you want a quieter, v3-style presentation while still using v4 behavior:

- Active button underline.
- Mode button hover lift and hover tint.
- Mode icon hover lift.
- Button press shrink.
- Setpoint update pulse.
- Active heating, cooling, humidifying, dehumidifying, and fan header animations.
- Custom off-icon slash overlay.
- Loading shimmer.
- Compact icon treatment for mode buttons.

When this is disabled, the card uses v3-style visual defaults such as column setpoint chevrons and tighter mode rows unless you explicitly configure an option such as `layout.step: row`. The visual editor should only write the `enhanced_visuals` toggle when that is the only changed setting; displayed defaults are not saved back into YAML.

## Controls

By default, the card shows supported controls for the selected entity.

Simple format:

```yaml
control:
  - hvac
  - preset
  - fan
```

Object format:

```yaml
control:
  hvac: true
  preset:
    away: true
    none:
      name: Not set
```

When controls are configured as an array or object, the card keeps the order from your YAML.

Disable controls:

```yaml
control: false
```

Supported control types:

| Control            | Used by         | Description                                        |
| ------------------ | --------------- | -------------------------------------------------- |
| `hvac`             | Climate         | HVAC modes such as off, heat, cool, dry, fan only. |
| `preset`           | Climate         | Preset modes such as away, eco, comfort, sleep.    |
| `fan`              | Climate, fan    | Fan modes or fan speeds.                           |
| `state`            | Fan, humidifier | On and off buttons.                                |
| `swing`            | Climate         | Swing modes.                                       |
| `swing_horizontal` | Climate         | Horizontal swing modes.                            |
| `swing_vertical`   | Climate         | Vertical swing modes.                              |
| `vane_horizontal`  | Climate         | Horizontal vane modes.                             |
| `vane_vertical`    | Climate         | Vertical vane modes.                               |
| `direction`        | Fan             | Forward and reverse direction.                     |
| `oscillating`      | Fan             | Oscillation on and off.                            |
| `mode`             | Humidifier      | Humidifier or dehumidifier modes.                  |

Per-row options:

| Option           | Description                                |
| ---------------- | ------------------------------------------ |
| `_name`          | Override the row heading.                  |
| `_heading`       | Set to `true` to show the row heading.     |
| `_hide_when_off` | Hide the row when the main entity is off.  |
| `_icons`         | Set to `false` to hide icons for this row. |

Per-mode options:

| Option    | Description                    |
| --------- | ------------------------------ |
| `name`    | Override a mode label.         |
| `icon`    | Override a mode icon.          |
| `include` | Set to `false` to hide a mode. |

Explicit per-mode `icon:` overrides are honored wherever they are set. For swing and vane rows, default icons still require `_icons: true`, but icons you set directly on a mode render without that extra flag.

Quote `on` and `off` when using them as YAML keys:

```yaml
control:
  hvac:
    'off':
      name: Off
    'heat':
      name: Heat
```

Mode headings are hidden by default in v4. Use `_heading: true` only where a visible row label helps.

## Extra Entities

Use `entities` to show extra rows in the card.

```yaml
entities:
  - entity: sensor.living_room_humidity
  - entity: sensor.living_room_energy
    name: Energy today
  - entity: timer.turn_fan_off
    name: Fan timer
  - attribute: min_temp
    name: Min temp
  - entity: input_boolean.heating_boost
    name: Boost
```

Timer entities show a live remaining countdown while active and the `remaining` attribute while paused.

Toggle-capable entities render as switches automatically.

Supported toggle domains:

- `automation`
- `fan`
- `humidifier`
- `input_boolean`
- `light`
- `switch`

Entity options:

| Option      | Type   | Description                                  |
| ----------- | ------ | -------------------------------------------- |
| `entity`    | string | Entity id.                                   |
| `name`      | string | Label override.                              |
| `icon`      | string | Icon shown instead of a text label.          |
| `attribute` | string | Read an attribute instead of state.          |
| `unit`      | string | Unit suffix.                                 |
| `decimals`  | number | Decimal places for numeric values.           |
| `type`      | string | Use `relativetime` for relative time output. |

Hide extra entities:

```yaml
entities: false
```

Hide built-in rows:

```yaml
hide:
  state: true
  temperature: true
```

The `temperature` key is kept for compatibility and means the built-in current value row.

## Setpoints

Setpoints are detected automatically:

- Climate entities use temperature setpoints.
- Fan entities use percentage.
- Humidifier and dehumidifier entities use humidity.

Override setpoints only when needed.

Single setpoint:

```yaml
setpoints:
  temperature:
```

Dual setpoint:

```yaml
setpoints:
  target_temp_low:
  target_temp_high:
```

Hide one setpoint:

```yaml
setpoints:
  target_temp_low:
    hide: true
  target_temp_high:
```

Hide setpoints by current HVAC mode:

```yaml
setpoints:
  target_temp_low:
    hide_when: cool
  target_temp_high:
    hide_when: heat
```

`hide_when` can also accept a list of HVAC modes for unusual setups.

## Service Override

Override the service used when setting the target value:

```yaml
service:
  domain: climate
  service: set_temperature
  data:
    entity_id: climate.living_room
```

The card calls Home Assistant actions using the current `hass.performAction` API.

## Actions

The target value supports Home Assistant-style actions:

```yaml
tap_action:
  action: more-info
hold_action:
  action: navigate
  navigation_path: /lovelace/climate
double_tap_action:
  action: none
```

Supported action handling follows the same shape used by Home Assistant dashboard cards.

## CSS Variables

| Variable                             | Default                                                                                       | Description                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `--st-spacing`                       | `4px`                                                                                         | Base spacing unit.                                                              |
| `--st-font-size-xl`                  | `28px`                                                                                        | Target value on wide screens.                                                   |
| `--st-font-size-l`                   | `22px`                                                                                        | Target value on narrow screens.                                                 |
| `--st-font-size-m`                   | `var(--ha-font-size-xl, 20px)`                                                                | Target unit size.                                                               |
| `--st-font-size-title`               | `var(--ha-card-header-font-size, 24px)`                                                       | Header title size.                                                              |
| `--st-font-size-entities`            | `var(--ha-font-size-l, 16px)`                                                                 | Extra entity and mode label text.                                               |
| `--st-font-size-toggle-label`        | `var(--ha-font-size-l, 16px)`                                                                 | Header toggle label.                                                            |
| `--st-control-icon-size`             | `var(--st-font-size-xl, 32px)`                                                                | Header, state, and HVAC control icon size.                                      |
| `--st-font-size-preset-icon`         | `var(--ha-font-size-xl, 20px)`                                                                | Preset mode icon size.                                                          |
| `--st-font-size-compact-mode`        | `var(--ha-font-size-m, 14px)`                                                                 | Text size for compact horizontal preset and fan speed buttons.                  |
| `--st-font-size-compact-mode-icon`   | `20px`                                                                                        | Icon size for compact horizontal preset and fan speed buttons.                  |
| `--st-mode-background`               | `var(--secondary-background-color)`                                                           | Inactive mode background.                                                       |
| `--st-mode-active-background`        | `var(--primary-color)`                                                                        | Active mode background.                                                         |
| `--st-mode-active-color`             | `var(--text-primary-color)`                                                                   | Active mode text.                                                               |
| `--st-mode-hover-background`         | mixed from inactive mode background and text color                                            | Inactive mode hover background.                                                 |
| `--st-mode-hover-color`              | `var(--primary-text-color)`                                                                   | Inactive mode hover text.                                                       |
| `--st-mode-active-accent-color`      | mixed from active mode text color                                                             | Active button underline and accent.                                             |
| `--st-mode-border-radius`            | `var(--ha-card-border-radius, 4px)`                                                           | Mode button corner radius.                                                      |
| `--st-mode-transition`               | `200ms ease`                                                                                  | Mode button color transition.                                                   |
| `--st-active-icon-glow-duration`     | `5s`                                                                                          | Active heating, cooling, humidifying, and dehumidifying header icon glow cycle. |
| `--st-active-icon-glow-min-size`     | `4px`                                                                                         | Faintest active header icon glow radius.                                        |
| `--st-active-icon-glow-mid-size`     | `9px`                                                                                         | Midpoint active header icon glow radius.                                        |
| `--st-active-icon-glow-max-size`     | `14px`                                                                                        | Strongest active header icon glow radius.                                       |
| `--st-active-icon-glow-min-strength` | `36%`                                                                                         | Faintest active header icon glow opacity mix.                                   |
| `--st-active-icon-glow-mid-strength` | `52%`                                                                                         | Midpoint active header icon glow opacity mix.                                   |
| `--st-active-icon-glow-max-strength` | `70%`                                                                                         | Strongest active header icon glow opacity mix.                                  |
| `--auto-color`                       | `var(--state-climate-auto-color, var(--primary-color))`                                       | Active auto mode.                                                               |
| `--heat_cool-color`                  | `var(--state-climate-heat-cool-color, var(--primary-color))`                                  | Active heat/cool mode.                                                          |
| `--cool-color`                       | `var(--state-climate-cool-color, var(--primary-color))`                                       | Active cool mode.                                                               |
| `--heat-color`                       | `var(--state-climate-heat-color, var(--primary-color))`                                       | Active heat mode.                                                               |
| `--off-color`                        | `var(--state-icon-color, var(--secondary-text-color))`                                        | Active off mode.                                                                |
| `--fan_only-color`                   | `var(--state-climate-fan-only-color, var(--state-fan-active-color, var(--state-icon-color)))` | Active fan-only mode.                                                           |
| `--dry-color`                        | `var(--state-climate-dry-color, var(--primary-color))`                                        | Active dry mode.                                                                |
| `--st-toggle-label-color`            | `var(--primary-text-color)`                                                                   | Header toggle label color.                                                      |
| `--st-fault-inactive-color`          | `var(--secondary-background-color)`                                                           | Inactive fault icon.                                                            |
| `--st-fault-active-color`            | `var(--accent-color)`                                                                         | Active fault icon.                                                              |

Per-card override with [card-mod](https://github.com/thomasloven/lovelace-card-mod):

```yaml
type: custom:simple-thermostat
entity: climate.my_room
card_mod:
  style: |
    ha-card {
      --st-font-size-xl: 18px;
      --st-font-size-l: 16px;
      --st-spacing: 2px;
      --cool-color: var(--state-climate-cool-color);
    }
```

Theme override:

```yaml
my-theme:
  st-font-size-xl: 18px
  st-spacing: 2px
```
