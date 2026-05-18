# simple-thermostat

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)

An AI-assisted, community-maintained fork of [simple-thermostat](https://github.com/nervetattoo/simple-thermostat) by [@nervetattoo](https://github.com/nervetattoo), kept working with current Home Assistant releases.

A compact Lovelace thermostat card for Home Assistant. It shows climate controls, setpoints, extra entities, header toggles, and mode controls in a small configurable layout.

<img src="https://github.com/Wheemer/simple-thermostat/raw/master/examples.png" alt="Examples" width="620">

## Installation

### HACS

Easily add my repo using this convenient button:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Wheemer&repository=simple-thermostat&category=plugin)

or:

1. Open **HACS** in Home Assistant.
2. Open **Custom repositories**.
3. Add this repository:

   ```text
   https://github.com/Wheemer/simple-thermostat
   ```

4. Choose type **Dashboard**.
5. Install **simple-thermostat** from HACS.
6. Refresh Home Assistant. If the old card is still loading, clear your browser cache.

### Migrating from another fork

If you already installed `simple-thermostat` from another repository, uninstall the old HACS entry first. Then click the blue "open hacs repository on my home assistant" button or add this repository as a HACS custom repository type dashboard and install it again.

### Manual install

1. Download `simple-thermostat.js` from the [latest release](https://github.com/Wheemer/simple-thermostat/releases/latest).
2. Put the file in your Home Assistant `www` folder.
3. Add this Lovelace resource:

   ```yaml
   resources:
     - url: /local/simple-thermostat.js
       type: module
   ```

## Changelog

| Version | Changes |
|---------|---------|
| 3.1 | Release new tidy version number. |
| 3.0.44.2 | Fixed configured `unit` suffixes not displaying on extra entity rows. |
| 3.0.44.1 | Fixed `unit` suffix rendering for version 3 entity rows. |
| 3.0.44 | Tightened header toggle switch spacing to better match entity row spacing. |
| 3.0.43 | Tightened stacked header toggle spacing to better match entity rows. |
| 3.0.42 | Fixed header toggle icons not rendering when configured. |
| 3.0.41 | Added support for icons on header toggles. |
| 3.0.40 | Tightened entity row spacing to better match stacked header toggles. |
| 3.0.39 | Corrected entity row and header toggle spacing. |
| 3.0.38 | Balanced vertical spacing between entity rows and stacked header toggles. |
| 3.0.37 | Adjusted header toggle alignment and tightened the spacing between toggle labels and switches. |
| 3.0.36 | Added support for Home Assistant's `none` number format so dot decimals are preserved when selected. |
| 3.0.35 | Fixed numeric fan modes being hidden when a fan control row has explicit configuration. |
| 3.0.34 | Tightened spacing for multiple header toggles so they stack more compactly. |
| 3.0.33 | Fixed multiple header toggles stretching the thermostat card layout. |
| 3.0.32 | Restored the HACS install button in the README installation section. |
| 3.0.31 | Reorganized the README installation/configuration guidance and updated the examples image. |
| 3.0.30 | Fixed extra heading whitespace in rendered info item output after restoring direct icon heading clicks. |
| 3.0.29 | Fixed icon-only extra entity heading clicks by declaring the entity id before binding the icon click handler. |
| 3.0.28 | Restored entity popover clicks for icon-only extra entity headings in both standard and templated entity rows. |
| 3.0.27 | Restored entity popover clicks on icon-only extra entity headings after adding hover tooltips, and preserved icon-only extra entity heading spacing so rendered output matches the existing tests. |
| 3.0.26 | Used Home Assistant entity formatting for extra entity rows so display precision follows the entity setting when no row-level `decimals` override is set. |
| 3.0.25 | Restored extra entity toggle rows to the standard table layout while keeping icon tooltips. |
| 3.0.24 | Fixed icon-only toggle rows preserving table grid structure after adding heading-cell alignment. |
| 3.0.23 | Added hover tooltips for icon-only extra entity headings so the entity name is visible without labels. |
| 3.0.22 | Fixed icon-only extra entity toggles so the switch aligns beside the icon instead of appearing in a separate value column. |
| 3.0.21 | Scoped switch padding so extra entity toggles no longer add excessive row spacing while header toggles keep their existing spacing. |
| 3.0.20 | Increased the default target temperature font size, documented per-mode color CSS variables, and removed a stale generated declaration. |
| 3.0.19 | Added `header.toggles`, added `entities` as the preferred key for extra entity rows, and render toggle-capable extra entities as switches. |
| 3.0.18 | Added `swing_horizontal` and `swing_vertical` support. |
| 3.0.17 | Added `current_temperature_entity`. |
| 3.0.16 | Fixed font sizing after Home Assistant removed deprecated `--paper-*` CSS variables. |
| 3.0.15 | Fixed duplicate custom element registration error on Safari and iOS. |
| 3.0.14 | Fixed error when used inside collapsible or other custom container cards. |
| 3.0.13 | Fixed unlisted preset modes appearing when explicit mode config is provided. |
| 3.0.12 | Added `vane_horizontal` and `vane_vertical` support. |
| 3.0.11 | Show OFF for unavailable target temperature when heater is off. |
| 3.0.10 | Locale-aware number formatting for temperatures and sensor values. |
| 3.0.9 | Added row-level `_icons` option for mode controls. |
| 3.0.8 | Fixed `version: 3` templated sensor crash for some Home Assistant language configs. |
| 3.0.7 | Fixed target temperature font size on themes without paper-font variables. |
| 3.0.5 | Fixed updating-state CSS class binding for target temperature display. |
| 3.0.4 | Updated localization for Home Assistant 2026.5.0 compatibility. |
| 3.0.0 | Updated to Lit 3.x and current dependencies. |

## Basic Usage

```yaml
type: custom:simple-thermostat
entity: climate.living_room
```

## Example

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
layout:
  step: row
  mode:
    names: false
    icons: true
    headings: false
entities:
  - entity: sensor.living_room_temperature
    icon: mdi:thermometer
  - entity: sensor.living_room_humidity
    icon: mdi:water-percent
control:
  - hvac
  - preset
```

## Configuration

### Main Options

| Option | Type | Description |
|--------|------|-------------|
| `entity` | string | Climate entity id. Required. |
| `current_temperature_entity` | string | Entity used for current temperature instead of the climate entity. |
| `unit` | string or `false` | Override or hide the temperature unit. |
| `decimals` | number | Decimal places for temperature display. |
| `step_size` | number | Amount changed by the temperature buttons. Default `0.5`. |
| `fallback` | string | Text shown when no valid setpoint exists. Default `N/A`. |
| `header` | object or `false` | Header configuration. |
| `hide` | object | Hide built-in state or temperature rows. |
| `layout` | object | Layout settings. |
| `control` | array, object, or `false` | Mode controls. |
| `entities` | array or `false` | Extra entity rows. Preferred key. |
| `sensors` | array or `false` | Legacy alias for `entities`. |
| `setpoints` | object or `false` | Manual setpoint configuration. Usually not needed. |
| `service` | object | Override the service used to set temperature. |

### Hide Built-In Rows

```yaml
hide:
  state: true
  temperature: true
```

### Layout

```yaml
layout:
  step: row
  mode:
    names: false
    icons: true
    headings: false
  entities:
    type: table
    labels: true
```

`layout.step` can be `row` or `column`.

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
    entity: switch.fan
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

| Option | Type | Description |
|--------|------|-------------|
| `name` | string or `false` | Header title. Defaults to the climate entity name. |
| `icon` | string, object, or `false` | Header icon. |
| `toggle` | object | Single header toggle. |
| `toggles` | array | Multiple header toggles. |
| `faults` | array or `false` | Binary sensor fault icons. |

Toggle options:

| Option | Type | Description |
|--------|------|-------------|
| `entity` | string | Entity to toggle. |
| `name` | string or `true` | Toggle label. Use `true` for the entity friendly name. |
| `icon` | string | Show an icon instead of the text label. |

Fault options:

| Option | Type | Description |
|--------|------|-------------|
| `entity` | string | Binary sensor entity. |
| `icon` | string | Optional icon override. |
| `hide_inactive` | boolean | Hide the icon when the sensor is off. |

## Control

By default, the card shows supported `hvac` and `preset` controls.

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

Disable controls:

```yaml
control: false
```

Supported control types:

- `hvac`
- `fan`
- `preset`
- `swing`
- `swing_horizontal`
- `swing_vertical`
- `vane_horizontal`
- `vane_vertical`

Per-mode options:

| Option | Description |
|--------|-------------|
| `_name` | Override the row heading. |
| `_hide_when_off` | Hide this row when the climate entity is off. |
| `_icons` | Set to `false` to hide icons for this row. |
| `name` | Override a mode label. |
| `icon` | Override a mode icon. |
| `include` | Set to `false` to hide a mode. |

Quote `on` and `off` when using them as YAML keys:

```yaml
control:
  hvac:
    "off":
      name: Off
    "heat":
      name: Heat
```

## Extra Entities

Use `entities` to show extra rows in the card. The older `sensors` key still works.

```yaml
entities:
  - entity: sensor.living_room_humidity
  - entity: sensor.living_room_energy
    name: Energy today
  - attribute: min_temp
    name: Min temp
  - entity: input_boolean.heating_boost
    name: Boost
```

Toggle-capable entities render as switches automatically.

Supported toggle domains:

- `automation`
- `fan`
- `humidifier`
- `input_boolean`
- `light`
- `switch`

Entity options:

| Option | Type | Description |
|--------|------|-------------|
| `entity` | string | Entity id. |
| `name` | string | Label override. |
| `icon` | string | Icon shown instead of a text label. |
| `attribute` | string | Read an attribute instead of state. |
| `unit` | string | Unit suffix. |
| `decimals` | number | Decimal places for numeric values. |
| `type` | string | Use `relativetime` for relative time output. |

Hide extra entities:

```yaml
entities: false
```

## Version 3 Templated Entities

Set `version: 3` to use template-based entity rows.

```yaml
type: custom:simple-thermostat
entity: climate.living_room
version: 3
entities:
  - id: humidity
    entity: sensor.living_room_humidity
    label: Humidity
    template: "{{state.text}}%"
  - id: state
    show: false
```

Built-in rows `state` and `temperature` are added automatically unless you define rows with those ids.

Version 3 entity options:

| Option | Type | Description |
|--------|------|-------------|
| `id` | string | Unique row id. Use `state` or `temperature` to override built-ins. |
| `entity` | string | Template context entity. Defaults to the climate entity. |
| `label` | string or `false` | Row label. |
| `template` | string | Template to render. |
| `unit` | string | Unit suffix. |
| `decimals` | number | Decimal places. |
| `show` | boolean | Set to `false` to hide the row. |

## Setpoints

Setpoints are detected automatically. Override them only when needed.

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

## Service Override

Override the service used when setting temperature:

```yaml
service:
  domain: climate
  service: set_temperature
  data:
    entity_id: climate.living_room
```

## CSS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--st-spacing` | `4px` | Base spacing unit. |
| `--st-font-size-xl` | `28px` | Target temperature on wide screens. |
| `--st-font-size-l` | `22px` | Target temperature on narrow screens. |
| `--st-font-size-m` | `var(--ha-font-size-xl, 20px)` | Temperature unit. |
| `--st-font-size-title` | `var(--ha-card-header-font-size, 24px)` | Header title. |
| `--st-font-size-entities` | `var(--st-font-size-sensors, var(--ha-font-size-l, 16px))` | Extra entity and mode label text. |
| `--st-font-size-toggle-label` | `var(--ha-font-size-l, 16px)` | Header toggle label. |
| `--st-mode-background` | `var(--secondary-background-color)` | Inactive mode background. |
| `--st-mode-active-background` | `var(--primary-color)` | Active mode background. |
| `--st-mode-active-color` | `var(--text-primary-color)` | Active mode text. |
| `--auto-color` | `green` | Active auto mode. |
| `--heat_cool-color` | `springgreen` | Active heat/cool mode. |
| `--cool-color` | `#2b9af9` | Active cool mode. |
| `--heat-color` | `#ff8100` | Active heat mode. |
| `--off-color` | `#8a8a8a` | Active off mode. |
| `--fan_only-color` | `#8a8a8a` | Active fan-only mode. |
| `--dry-color` | `#efbd07` | Active dry mode. |
| `--st-toggle-label-color` | `var(--primary-text-color)` | Header toggle label color. |
| `--st-fault-inactive-color` | `var(--secondary-background-color)` | Inactive fault icon. |
| `--st-fault-active-color` | `var(--accent-color)` | Active fault icon. |

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
      --cool-color: rgba(43, 154, 249, 0.8);
    }
```

Theme override:

```yaml
my-theme:
  st-font-size-xl: 18px
  st-spacing: 2px
```
