<div align="center">

# Simple Thermostat

### An HVAC, thermostat, climate, fan, and humidifier card for Home Assistant Lovelace UI

[![HACS Default](https://img.shields.io/badge/HACS-DEFAULT-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white&labelColor=555555)](https://github.com/hacs/integration)
[![Home Assistant 2024.8+](https://img.shields.io/badge/HOME%20ASSISTANT-2024.8%2B-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white&labelColor=555555)](https://www.home-assistant.io/)
[![Latest release](https://img.shields.io/github/v/release/Wheemer/simple-thermostat?style=for-the-badge&logo=github&logoColor=white&label=RELEASE&labelColor=555555&color=22C55E)](https://github.com/Wheemer/simple-thermostat/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Wheemer/simple-thermostat/total?style=for-the-badge&logo=github&logoColor=white&label=DOWNLOADS&labelColor=555555&color=8A2BE2)](https://github.com/Wheemer/simple-thermostat/releases)

<p>
  <strong>⭐ NEW V4 RELEASE ⭐</strong><br>
  Fan, humidifier, dehumidifier, modern actions, and enhanced visuals
</p>

<p>
  <strong>Now available in the default HACS catalog.</strong>
</p>

</div>

A community maintained fork of [simple-thermostat](https://github.com/nervetattoo/simple-thermostat) by [@nervetattoo](https://github.com/nervetattoo), kept working with current Home Assistant releases. The v4 modernization was heavily influenced by [duczz/ha-simple-thermostat](https://github.com/duczz/ha-simple-thermostat).

A compact Lovelace card for Home Assistant climate, fan, humidifier, and dehumidifier entities. It keeps the original small-card style while adding domain-aware setpoints, current values, action handling, richer mode controls, and enhanced visuals.

<div style="border: 1px solid rgba(65, 189, 245, 0.45); border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
  <strong style="color: #41bdf5;">New in v4:</strong> Fan, humidifier, and dehumidifier support, domain-aware controls, modern Home Assistant actions, richer mode buttons, and enhanced visuals.
</div>

![Simple Thermostat v4 examples](examples.png)

The example image uses the horizontal setpoint layout explicitly:

```yaml
layout:
  step: row
  mode:
    headings: false
    icons: true
    names: true
```

<div style="border: 1px solid rgba(65, 189, 245, 0.45); border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
  <strong style="color: #41bdf5;">Requires:</strong> Home Assistant 2024.8 or newer. v4 uses Home Assistant's current frontend action API.
</div>

<div style="border: 1px solid rgba(65, 189, 245, 0.45); border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
  <strong style="color: #41bdf5;">Compatibility:</strong> v4 imports older <code>current_temperature_entity</code>, <code>sensors</code>, and <code>layout.sensors</code> YAML into the current <code>current_value_entity</code>, <code>entities</code>, and <code>layout.entities</code> config shape. If you are staying on v3, use the <a href="https://github.com/Wheemer/simple-thermostat/tree/v3">v3 documentation</a>.
</div>

<div style="border: 1px solid rgba(65, 189, 245, 0.45); border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
  <strong style="color: #41bdf5;">Known browser limitation:</strong> Brave Mobile may render some compact entity-row layouts differently from the Home Assistant companion app and other mobile browsers. The Home Assistant app, Firefox Mobile, DuckDuckGo Mobile, and most desktop browsers are expected to render these layouts normally.
</div>

## Installation

### HACS

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Wheemer&repository=simple-thermostat&category=plugin)

1. Open **HACS** in Home Assistant.
2. Go to **Frontend** or search for **Simple Thermostat**.
3. Install **Simple Thermostat**.
4. Refresh Home Assistant and clear the browser cache if the old card is still loaded.

If you are helping test an unreleased fix, see [Trying prereleases with HACS](PRERELEASES.md). Most users should stay on the normal release channel.

### Migrating from another fork

If you installed `simple-thermostat` from another repository, uninstall the old HACS entry first. Then install **Simple Thermostat** from the default HACS catalog.

If you are not upgrading to v4, keep using the [v3 documentation](https://github.com/Wheemer/simple-thermostat/tree/v3) for the older config surface.

### Manual install

1. Download `simple-thermostat.js` from the [latest release](https://github.com/Wheemer/simple-thermostat/releases/latest).
2. Put it in your Home Assistant `www` folder.
3. Add this Lovelace resource:

   ```yaml
   resources:
     - url: /local/simple-thermostat.js
       type: module
   ```

## Add a Card

Use the Home Assistant visual editor for normal setup. In v4, the card reads the selected entity and shows the options that apply to that device, so most cards can be configured without opening YAML.

1. Open a dashboard and choose **Edit dashboard**.
2. Select **Add card**.
3. Search for **Simple Thermostat**.
4. Pick your climate, fan, humidifier, or dehumidifier entity.
5. Adjust the controls, header toggles, extra entity rows, target controls, and appearance in the editor.

The editor handles the common v4 setup:

- Entity and current value selection.
- Climate, fan, humidifier, and dehumidifier controls.
- Header toggles and toggle icons.
- Extra entity rows, names, icons, row layout, and optional button/toggle/chip display.
- Footer toggle controls for helper switches shown below the normal mode rows.
- Setpoint visibility, off-state display options, and v4 enhanced visuals.
- Advanced labels, precision, action type, and mode display options.

Use the YAML reference for specialized extra row formatting such as attributes, units, decimals, relative time, timer countdowns, and custom CSS.

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

## Domain Defaults

Recent-activity selection remembers transitions observed by this browser. Measurement-only updates do not count as activity, including after reload. Without a recorded transition, startup uses the entity's current activity and state-change timestamp; activity cycles that happen entirely while the browser is closed cannot be reconstructed from the current state alone. Selection memory is local to the browser, not shared between devices.

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

YAML is still supported for advanced customization, migration, and manual dashboard editing, but it is no longer the recommended starting point for v4.

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

### Setpoint controls stop at an unexpected temperature

Simple Thermostat uses the `min_temp` and `max_temp` limits reported by the Home Assistant entity. If a step button becomes disabled unexpectedly or Home Assistant rejects a temperature change, check those attributes under **Developer Tools → States**. Incorrect limits must be corrected in the integration or device configuration that provides the entity; the card cannot override Home Assistant's temperature validation.

## Changelog

Release history is maintained in [CHANGELOG.md](CHANGELOG.md).
