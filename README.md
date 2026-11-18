<div align="center">

# Simple Thermostat

**Your climate controls, in less dashboard space.**

[![HACS Default](https://img.shields.io/badge/HACS-DEFAULT-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white&labelColor=555555)](https://github.com/hacs/integration)
[![Home Assistant 2024.8+](https://img.shields.io/badge/HOME%20ASSISTANT-2024.8%2B-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white&labelColor=555555)](https://www.home-assistant.io/)
[![Latest release](https://img.shields.io/github/v/release/Wheemer/simple-thermostat?style=for-the-badge&logo=github&logoColor=white&label=RELEASE&labelColor=555555&color=22C55E)](https://github.com/Wheemer/simple-thermostat/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Wheemer/simple-thermostat/total?style=for-the-badge&logo=github&logoColor=white&label=DOWNLOADS&labelColor=555555&color=8A2BE2)](https://github.com/Wheemer/simple-thermostat/releases)

</div>

A compact dashboard card for controlling existing climate, fan, humidifier, and dehumidifier entities. Use one card per device, or switch between devices in a [group card](#group-card).

📦 [Installation](#installation) · 🎛️ [Add a card](#add-a-card) · 🗂️ [Group card](#group-card) · 📖 [YAML reference](YAML_REFERENCE.md) · 📝 [Changelog](CHANGELOG.md)

> [!TIP]
> **Start with one card.** Pick an existing device in the visual editor, then add the readings and controls you want. Use a [group card](#group-card) to switch between devices in the same dashboard space.

## Installation

**Requires Home Assistant 2024.8 or newer.**

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Wheemer&repository=simple-thermostat&category=plugin)

1. Open **HACS** in Home Assistant.
2. Search for **Simple Thermostat** and choose **Download**.
3. Refresh the dashboard, then [add the card](#add-a-card).

Testing a fix? [Trying prereleases with HACS](PRERELEASES.md) is optional.

### Manual install

1. Download `simple-thermostat.js` from the [latest release](https://github.com/Wheemer/simple-thermostat/releases/latest).
2. Put it in Home Assistant's `config/www/` folder.
3. Register `/local/simple-thermostat.js` as a **JavaScript Module** in the dashboard's resource settings. For YAML-managed resources, use:

   ```yaml
   resources:
     - url: /local/simple-thermostat.js
       type: module
   ```
4. Refresh the dashboard, then [add the card](#add-a-card).

## Add a Card

1. Open a dashboard and choose **Edit dashboard**.
2. Select **Add card**.
3. Search for **Simple Thermostat**.
4. Pick your climate, fan, humidifier, or dehumidifier entity.
5. Save the card. The editor shows the controls available for that entity and lets you customize the layout, appearance, and extra rows.

For dashboard YAML, start with this and replace the entity ID with your own:

```yaml
type: custom:simple-thermostat
entity: climate.living_room
```

## Examples

🌡️ **Thermostats and ACs** · 🌀 **Fan speeds and swing controls** · 💧 **Humidity targets**

![Simple Thermostat examples: climate, fan, dehumidifier, swing, and vane controls](examples.png)

The gallery uses horizontal setpoint controls (`layout.step: row`).

## Group Card

Use **Simple Thermostat Group** when you want several climate, fan, humidifier, or dehumidifier cards to share one dashboard footprint. The group card keeps each selected Simple Thermostat card intact and adds a compact header for moving between them.

Add `custom:simple-thermostat-group` from the visual editor, choose the cards you want in the group, then use the arrows or menu to switch between them. The group header shows the selected card's state and current value when available, while controls such as fan modes stay in each card's normal **Configure** options. If activity-following is enabled, manual navigation pauses automatic switching for 30 seconds before returning to the most recently active card.

```yaml
type: custom:simple-thermostat-group
cards:
  - entity: climate.living_room_ac
    header:
      name: Living Room AC
  - entity: climate.bedroom_ac
    header:
      name: Bedroom AC
auto_select:
  mode: recent_activity
remember_selection: true
storage_key: upstairs_ac_group
```

For small groups, the selector can also be shown as visible tabs.

```yaml
type: custom:simple-thermostat-group
selector:
  style: tabs
cards:
  - entity: climate.living_room_ac
    header:
      name: Living Room AC
  - entity: climate.bedroom_ac
    header:
      name: Bedroom AC
```

Group options:

| Option               | Type                    | Description                                                                                                                                                             |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards` / `entities` | array                   | Cards shown inside the group. Each entry can be an entity id string or a normal Simple Thermostat card config.                                                          |
| `selected`           | string                  | Entity id to show first when no remembered selection is available.                                                                                                      |
| `auto_select`        | boolean, string, object | Set to `recent_activity` to follow meaningful device activity such as on/off and active-mode transitions. Temperature-only updates do not change the selected card.      |
| `remember_selection` | boolean                 | Remember the last selected card across dashboard reloads. Defaults to `true`.                                                                                           |
| `storage_key`        | string                  | Custom local storage key for remembered group selection and recent activity.                                                                                            |
| `selector`           | object                  | Configure the group selector. Use `style: tabs` for visible tab buttons, or leave unset for the normal header navigation. Also supports `icons`, `names`, and `states`. |
| `card`               | object                  | Shared Simple Thermostat config merged into every grouped card.                                                                                                         |

Targets whose main entity is `unavailable` or `unknown` are omitted from the group selector, even when that card has independent header toggles. Targets return automatically when Home Assistant reports them as available again.

Recent-activity selection remembers transitions observed by this browser. Measurement-only updates do not count as activity, including after reload. Without a recorded transition, startup uses the entity's current activity and state-change timestamp; activity cycles that happen entirely while the browser is closed cannot be reconstructed from the current state alone. Selection memory is local to the browser, not shared between devices.

## Domain Defaults

The card chooses sensible defaults from the selected entity:

| Domain       | Target      | Current value                                            | Default controls                          |
| ------------ | ----------- | -------------------------------------------------------- | ----------------------------------------- |
| `climate`    | Temperature | `current_temperature` or configured current value entity | HVAC, preset, fan, swing, vane            |
| `fan`        | Percentage  | Percentage when available                                | Fan speeds, direction, oscillating, state |
| `humidifier` | Humidity    | `current_humidity`                                       | Mode, state                               |

Dehumidifiers use the Home Assistant `humidifier` domain.

## Language and Localization

Simple Thermostat follows the language and number format selected in Home Assistant. Standard entity states, mode names, attribute values, dates, relative times, and numeric values use Home Assistant's localization APIs when translations are available.

Custom names, labels, and `state_labels` are displayed exactly as configured. This makes it possible to override integration terms that Home Assistant does not translate or to use shorter wording for a dashboard. The visual editor's configuration labels are currently shown in English; the rendered card itself continues to follow the active Home Assistant language.

## Advanced YAML

Use the [YAML reference](YAML_REFERENCE.md) for:

- advanced mode filtering,
- extra entity attributes, units, decimals, display modes, timer countdowns, and relative time,
- manual setpoint definitions,
- target locking, hold-repeat, and off-mode target step behavior,
- display-only state row labels,
- service overrides,
- target value tap, hold, and double tap actions,
- scoped custom CSS,
- [frontend template examples](examples/sensors.md),
- the full option reference.

Extra entity display modes include `row`, `auto`, `button`, `toggle`, and `chip`. The existing row layout remains the default; use `display: row` explicitly when you want to force the classic label/value row style.

The visual editor can suggest available entities registered to the same Home Assistant device. Suggestions are only added when selected and never change a card automatically.

Footer controls can show helper switches and actions below the normal mode rows. They support toggle-capable entities, `button` and `input_button` presses, plus `script` and `scene` actions:

```yaml
footer:
  - entity: switch.gree_ac_health
    name: Health
    icon: mdi:shield-check
```

## Troubleshooting

### The card is missing or still looks like the old version

Refresh the dashboard. If the browser still loads an old copy, clear its cache for Home Assistant. If you installed the card manually, check that the JavaScript module resource points to the file you downloaded.

### Switching from another Simple Thermostat card

If you installed this card from a different repository, remove that HACS entry before installing this one. Older card YAML keys such as `current_temperature_entity`, `sensors`, and `layout.sensors` are imported into the current configuration format. See the [YAML reference](YAML_REFERENCE.md) for current options.

### Compact rows look different in Brave Mobile

Brave Mobile can display some compact entity rows differently. Compare the same dashboard in the Home Assistant companion app or another browser.

### Setpoint controls stop at an unexpected temperature

Simple Thermostat uses the `min_temp` and `max_temp` limits reported by the Home Assistant entity. If a step button becomes disabled unexpectedly or Home Assistant rejects a temperature change, check those attributes under **Developer Tools → States**. Incorrect limits must be corrected in the integration or device configuration that provides the entity; the card cannot override Home Assistant's temperature validation.

## Changelog

Release history is maintained in [CHANGELOG.md](CHANGELOG.md).

Originally created by [@nervetattoo](https://github.com/nervetattoo/simple-thermostat), with modernization inspired by [duczz/ha-simple-thermostat](https://github.com/duczz/ha-simple-thermostat).
