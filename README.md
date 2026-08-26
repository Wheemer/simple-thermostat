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

### Feature acknowledgements

- Dual-target bounds and entity-safe queued actions were adapted from work by [Martin Müller (@duczz)](https://github.com/duczz/ha-simple-thermostat) in [4371180](https://github.com/duczz/ha-simple-thermostat/commit/4371180cb499ba292f44260aa19a842f33a7f68b) and [d8561a0](https://github.com/duczz/ha-simple-thermostat/commit/d8561a0ecee90351050ac3dc37ed997862351fe9).
- The read-only setpoint option was inspired by [@temuccio's proposal](https://github.com/nervetattoo/simple-thermostat/pull/423).
- Optional hold-repeat behavior was inspired by pointer interaction work from [Esam / @Ava-AgentOne](https://github.com/Ava-AgentOne/simple-thermostat-card/commit/3ab89cae5a4b7ebed8bb62b2c0a512ba203b296b).
- Same-device editor suggestions were inspired by [@priyam13coding's editor discovery work](https://github.com/priyam13coding/simple-compact-thermostat-card/commit/a7da7839d9304982f24a364dc3face66f6554492).
- The tabbed group selector was inspired by [@m1xminus's multi-AC selector idea](https://github.com/Wheemer/simple-thermostat/issues/16).

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

## Add A Card

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

For small groups, the selector can also be shown as visible tabs. This option was inspired by @m1xminus's multi-AC selector idea in [#16](https://github.com/Wheemer/simple-thermostat/issues/16).

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
| `auto_select`        | boolean, string, object | Set to `recent_activity` to switch to the most recently active device.                                                                                                  |
| `remember_selection` | boolean                 | Remember the last selected card across dashboard reloads. Defaults to `true`.                                                                                           |
| `storage_key`        | string                  | Custom local storage key for remembered group selection and recent activity.                                                                                            |
| `selector`           | object                  | Configure the group selector. Use `style: tabs` for visible tab buttons, or leave unset for the normal header navigation. Also supports `icons`, `names`, and `states`. |
| `card`               | object                  | Shared Simple Thermostat config merged into every grouped card.                                                                                                         |

## Domain Defaults

The card chooses sensible defaults from the selected entity:

| Domain       | Target      | Current value                                            | Default controls                          |
| ------------ | ----------- | -------------------------------------------------------- | ----------------------------------------- |
| `climate`    | Temperature | `current_temperature` or configured current value entity | HVAC, preset, fan, swing, vane            |
| `fan`        | Percentage  | Percentage when available                                | Fan speeds, direction, oscillating, state |
| `humidifier` | Humidity    | `current_humidity`                                       | Mode, state                               |

Dehumidifiers use the Home Assistant `humidifier` domain.

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
- the full option reference.

Extra entity display modes include `row`, `auto`, `button`, `toggle`, and `chip`. The existing row layout remains the default; use `display: row` explicitly when you want to force the classic label/value row style.

The visual editor can suggest available entities registered to the same Home Assistant device. Suggestions are only added when selected and never change a card automatically.

Footer controls can show switch-style helper entities below the normal mode rows:

```yaml
footer:
  - entity: switch.gree_ac_health
    name: Health
    icon: mdi:shield-check
```

## Changelog

<table border="1" cellspacing="0" cellpadding="6">
  <thead>
    <tr>
      <th nowrap>Version</th>
      <th>Changes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="7" nowrap><strong>v4.3.2</strong></td>
      <td>Prevents dual heat/cool targets from being stepped past each other.</td>
    </tr>
    <tr><td>Keeps pending and optimistic target changes attached to the entity where they began.</td></tr>
    <tr><td>Reports rejected Home Assistant actions in the browser console with the action name.</td></tr>
    <tr><td>Adds optional target locking while keeping the target value visible.</td></tr>
    <tr><td>Adds optional press-and-hold repetition for target step buttons.</td></tr>
    <tr><td>Adds editor suggestions for available entities registered to the same Home Assistant device.</td></tr>
    <tr><td>Credits the upstream authors and repositories whose work inspired these additions.</td></tr>
    <tr>
      <td rowspan="5" nowrap><strong>v4.3.1</strong></td>
      <td>Improves setpoint reliability when a card is reconfigured or removed while an update is pending.</td>
    </tr>
    <tr><td>Keeps each group target's styling isolated and prevents settings changes from being mistaken for new device activity.</td></tr>
    <tr><td>Improves shared and per-target settings in the group card editor.</td></tr>
    <tr><td>Improves unavailable-entity handling and embedded group-card sizing.</td></tr>
    <tr><td>Adds desktop and narrow-mobile browser checks to guard against layout regressions.</td></tr>
    <tr>
      <td rowspan="8" nowrap><strong>v4.3.0</strong></td>
      <td>Rolls the tested v4.2 prerelease line into the normal release channel.</td>
    </tr>
    <tr><td>Adds optional extra entity display modes: <code>row</code>, <code>auto</code>, <code>button</code>, <code>toggle</code>, and <code>chip</code>, with editor support.</td></tr>
    <tr><td>Adds footer toggle controls for helper switches that should appear below the normal mode rows.</td></tr>
    <tr><td>Adds an optional tabbed selector style for <code>custom:simple-thermostat-group</code>, inspired by @m1xminus's multi-AC selector idea in <a href="https://github.com/Wheemer/simple-thermostat/issues/16">#16</a>.</td></tr>
    <tr><td>Improves group-card selector editing, tab behavior, remembered selection, and embedded-card layout stability.</td></tr>
    <tr><td>Improves sparse HVAC/fan label layout, compact dual-setpoint cards, active mode colors, and card-level color overrides.</td></tr>
    <tr><td>Adds Dependabot and CodeQL coverage, plus dependency/security cleanup from the v4.2 prerelease cycle.</td></tr>
    <tr><td>Refreshes the issue templates to make bug reports and feature requests easier to open.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.12</strong></td>
      <td>Restores the tabbed Simple Thermostat Group layout, inspired by @m1xminus's multi-AC selector idea in <a href="https://github.com/Wheemer/simple-thermostat/issues/16">#16</a>, to the confirmed v4.2.10 behavior.</td>
    </tr>
    <tr><td>Keeps the visual editor selector-style improvements while preventing the v4.2.11 tab overlay regression.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.11</strong></td>
      <td>Kept the selected card header visible when using the group card's tabbed selector style.</td>
    </tr>
    <tr><td>Preserved selected card header titles, icons, more-info behavior, and header toggles above the tab row.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.10</strong></td>
      <td>Made the Simple Thermostat Group selector style visible as a two-button choice in the visual editor.</td>
    </tr>
    <tr><td>Kept <code>selector.style: tabs</code> as the YAML value written by the editor's <strong>Tabbed buttons</strong> option.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.2.9</strong></td>
      <td>Added an optional tabbed selector style for <code>custom:simple-thermostat-group</code>, inspired by @m1xminus's multi-AC selector idea in <a href="https://github.com/Wheemer/simple-thermostat/issues/16">#16</a>.</td>
    </tr>
    <tr><td>Added a <strong>Selector style</strong> control to the group card visual editor.</td></tr>
    <tr><td>Documented <code>selector.style: tabs</code> in the README and YAML reference.</td></tr>
    <tr><td>Kept the existing arrow/menu group selector as the default so current group cards do not change unless the new tabbed style is selected.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.8</strong></td>
      <td>Clarified the footer control name override field in the visual editor.</td>
    </tr>
    <tr><td>Added editor coverage to ensure the footer name override is visible in the visual editor.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.2.7</strong></td>
      <td>Added footer toggle controls for helper switches that should appear below the normal mode rows.</td>
    </tr>
    <tr><td>Added visual editor support for footer controls with entity, name, icon, add, and remove actions.</td></tr>
    <tr><td>Documented the new <code>footer</code> YAML option and added regression coverage for rendering, toggling, hiding, sizing, and editor behavior.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.6</strong></td>
      <td>Restores compact vertical steppers for cards with extra entity rows and dual heat/cool setpoints when no step layout is configured.</td>
    </tr>
    <tr><td>Keeps explicit <code>layout.step: row</code> configurations respected for users who intentionally choose side-by-side steppers.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.2.5</strong></td>
      <td>Aligns HVAC mode colors with Home Assistant theme variables such as <code>--state-climate-heat-cool-color</code>, removing the unreadable <code>springgreen</code> default.</td>
    </tr>
    <tr><td>Stacks sparse <code>heat_cool</code> and <code>fan_only</code> labels beside their icons so long English labels no longer clip.</td></tr>
    <tr><td>Falls back to a taller column button for long localized labels that cannot be split cleanly.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.2.4</strong></td>
      <td>Hardens template CSS sanitizing by blocking additional unsafe URL schemes.</td>
    </tr>
    <tr><td>Clears the CodeQL code scanning alerts introduced after security scanning was enabled.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.2.3</strong></td>
      <td>Updates shell-quote through concurrently to resolve the Dependabot security alert.</td>
    </tr>
    <tr><td>Updates postcss and pins vulnerable transitive packages to patched versions.</td></tr>
    <tr><td>Refreshes Babel, js-yaml, brace-expansion, nanoid, and svgo through the lockfile cleanup.</td></tr>
    <tr><td>Confirms the package audit is clean after the dependency updates.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.2.2</strong></td>
      <td>Fixes the visual editor's extra entity display dropdowns so selections apply and the menu closes normally.</td>
    </tr>
    <tr><td>Allows extra entity display controls to return to the default row behavior from the editor.</td></tr>
    <tr><td>Adds Dependabot configuration for grouped npm and GitHub Actions dependency updates.</td></tr>
    <tr><td>Adds CodeQL scanning for JavaScript and TypeScript security analysis.</td></tr>
    <tr>
      <td rowspan="7" nowrap><strong>v4.2.1</strong></td>
      <td>Keeps card-level active mode overrides working while preserving the semantic active colors introduced in v4.</td>
    </tr>
    <tr><td>Restores classic visuals automatically for imported <code>version: 3</code> cards unless <code>enhanced_visuals: true</code> is explicitly set.</td></tr>
    <tr><td>Includes the latest v4.2.0 layout, group-card, fan step, and mobile compatibility fixes.</td></tr>
    <tr><td>Added optional extra entity display modes: <code>row</code>, <code>auto</code>, <code>button</code>, <code>toggle</code>, and <code>chip</code>.</td></tr>
    <tr><td>Added a card-level <code>layout.entities.display</code> default and per-entity <code>entities[].display</code> overrides.</td></tr>
    <tr><td>Made compact entity controls own their label so button, toggle, and chip displays do not duplicate labels or overlap table columns.</td></tr>
    <tr><td>Kept existing extra entity rows as the default when no display mode is configured.</td></tr>
    <tr>
      <td rowspan="7" nowrap><strong>v4.2.0</strong></td>
      <td>Rolls the tested v4.1 prerelease fixes into the normal release channel.</td>
    </tr>
    <tr><td>Restores compact and mobile entity-row behavior so labels, values, and units stay paired more reliably.</td></tr>
    <tr><td>Improves sparse HVAC and fan control rows so buttons stay on one line where practical while preserving enhanced v4 visuals.</td></tr>
    <tr><td>Restores mode color overrides such as <code>--fan_only-color</code> across active mode and fan-speed controls.</td></tr>
    <tr><td>Uses Home Assistant fan <code>percentage_step</code> values for fan setpoint buttons.</td></tr>
    <tr><td>Improves Simple Thermostat Group sizing, remembered selection, navigation, and title more-info behavior.</td></tr>
    <tr><td>Documents Brave Mobile as a known browser limitation for some compact entity-row layouts.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.1.11</strong></td>
      <td>Uses Home Assistant fan <code>percentage_step</code> values for setpoint buttons, so fans step through their supported speeds instead of moving one percent at a time.</td>
    </tr>
    <tr><td>Improves Lovelace card-size estimates by ignoring controls with no visible options.</td></tr>
    <tr><td>Keeps setpoint units visually smaller without breaking the value/unit pairing.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.1.10</strong></td>
      <td>Restored non-wrapping extra entity labels so mobile sensor names stay together like earlier versions.</td>
    </tr>
    <tr><td>Kept left entity alignment scoped to alignment only, without changing label/value wrapping behavior.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.1.9</strong></td>
      <td>Restored the compact mobile entity-column width for dual setpoint cards with vertical step buttons.</td>
    </tr>
    <tr><td>Added <code>--st-entity-column-min-width</code> so narrow entity-table layouts can be tuned without changing the card config.</td></tr>
    <tr>
      <td rowspan="5" nowrap><strong>v4.1.8</strong></td>
      <td>Restored custom <code>--fan_only-color</code> overrides for Fan only and fan-speed controls across the v4 visual paths.</td>
    </tr>
    <tr><td>Kept host, card-mod, and card-level Fan only color overrides from being masked by the card surface defaults.</td></tr>
    <tr><td>Kept fan controls on the same public color path used by the working v4.0.37 behavior.</td></tr>
    <tr><td>Made Simple Thermostat Group navigation buttons transparent and tightened the top header spacing.</td></tr>
    <tr><td>Added CSS regression coverage for Fan only and fan control color overrides.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.1.7</strong></td>
      <td>Fixed a 4.1 mobile regression where three visible HVAC mode buttons could wrap into two rows.</td>
    </tr>
    <tr><td>Kept four-button HVAC rows compact enough for enhanced visuals while preserving the larger primary control styling.</td></tr>
    <tr><td>Restored the larger primary HVAC icon size for dense mode rows.</td></tr>
    <tr><td>Made active fan speeds and Fan only use fan-themed coloring instead of resembling Off.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.1.6</strong></td>
      <td>Restored the older active-mode color cascade so custom active backgrounds and mode colors such as <code>--fan_only-color</code> work together again.</td>
    </tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.1.5</strong></td>
      <td>Restored the default dual-setpoint entity layout so compact/mobile cards no longer get forced into a special split layout.</td>
    </tr>
    <tr><td>Fixed relative-time template rows so they render with Home Assistant's standard relative-time element attributes.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.1.4</strong></td>
      <td>Fixed active mode button backgrounds so card-level color variables such as <code>--fan_only-color</code> are used directly in both visual styles.</td>
    </tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.1.3</strong></td>
      <td>Fixed enhanced visual mode buttons so <code>--fan_only-color</code> applies to the active Fan only button.</td>
    </tr>
    <tr><td>Added <code>state_labels</code> for display-only aliases on the built-in state row.</td></tr>
    <tr>
      <td rowspan="5" nowrap><strong>v4.1.2</strong></td>
      <td>Restored <code>--fan_only-color</code> as the active Fan only button color source.</td>
    </tr>
    <tr><td>Added missing Simple Thermostat Group YAML documentation for activity following, remembered selection, and custom storage keys.</td></tr>
    <tr><td>Added group-card sizing hints for better Lovelace masonry placement.</td></tr>
    <tr><td>Fixed relative-time templates so they use Home Assistant's current relative-time binding path.</td></tr>
    <tr><td>Updated release/development docs so generated bundles stay out of source commits.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.1.1</strong></td>
      <td>Improved compact mobile layouts with extra entity rows and dual setpoints so labels and values stay paired instead of being squeezed.</td>
    </tr>
    <tr><td>Restored the active button accent override, including <code>--st-mode-active-accent-opacity: 0</code> for users who hide the underline.</td></tr>
    <tr>
      <td rowspan="8" nowrap><strong>v4.1.0</strong></td>
      <td>Rolled the recent v4 prerelease fixes into the normal release channel.</td>
    </tr>
    <tr><td>Improved compact and mobile entity rows so labels, values, and units stay paired more reliably.</td></tr>
    <tr><td>Restored safer default setpoint layout behavior while still respecting explicit <code>layout.step: row</code> configs.</td></tr>
    <tr><td>Fixed classic <code>enhanced_visuals: false</code> mode and fan rows so buttons stay evenly sized without losing the old stacked icon-over-label style.</td></tr>
    <tr><td>Improved multi-card embedding so grouped cards keep their own surface, spacing, remembered selection, and recent-activity behavior more reliably.</td></tr>
    <tr><td>Fixed setpoint debouncing so rapid plus/minus clicks send the final target instead of every intermediate value.</td></tr>
    <tr><td>Added cleaner off-state visibility options for current values, setpoints, control rows, toggles, and Off buttons.</td></tr>
    <tr><td>Added support for separate <code>select.*</code> controls, useful for devices with independent horizontal/vertical swing selectors.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.40</strong></td>
      <td>Restored active mode accent styling for users who customize the underline and button glow.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.39</strong></td>
      <td>Standardized off-state hide options across built-in values, entity rows, controls, toggles, and Off buttons.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.38</strong></td>
      <td>Added flat off-state visibility options for current values and setpoints while keeping legacy aliases working.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.37</strong></td>
      <td>Restored the known-good compact card spacing baseline while keeping v4 compatibility fixes in place.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.36</strong></td>
      <td>Fixed setpoint debouncing so rapid target changes collapse into one final Home Assistant service call.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.35</strong></td>
      <td>Fixed <code>hide_when_off</code> for extra entity rows so documented row hiding works when the main entity is off.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.34</strong></td>
      <td>Restored the safer column setpoint default for cards that do not explicitly set <code>layout.step</code>, while preserving explicit horizontal row layouts.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.33</strong></td>
      <td>Improved support for separate horizontal and vertical swing select entities.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.32</strong></td>
      <td>Refined compact mobile entity-row spacing for recent layout compatibility fixes.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.31</strong></td>
      <td>Improved mobile layout handling for compact cards with long entity labels and values.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.30</strong></td>
      <td>Kept entity label/value rows intact in compact dual-setpoint layouts so mobile cards do not collapse normal labels into stacked words.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.29</strong></td>
      <td>Kept dual heat/cool setpoints compact when extra entity rows are shown and no step layout is explicitly configured.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.28</strong></td>
      <td>Made the active button underline use one accent path so <code>--st-mode-active-accent-opacity: 0</code> can hide it cleanly.</td>
    </tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.27</strong></td>
      <td>Kept sparse HVAC mode rows on one line on narrow mobile screens when one mode is hidden.</td>
    </tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.26</strong></td>
      <td>Fixed order-only YAML edits so Home Assistant enables Save when control or option order changes.</td>
    </tr>
    <tr><td>Kept configured control order stable when editing cards in the visual editor.</td></tr>
    <tr><td>Balanced entity label sizing so long labels can wrap cleanly without forcing normal mobile labels to split too early.</td></tr>
    <tr><td>Reduced extra vertical space above sparse main control rows without changing button height.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.0.25</strong></td>
      <td>Restored the active button underline so enhanced visuals show the tuned bottom accent by default.</td>
    </tr>
    <tr><td>Added <code>--st-mode-active-accent-opacity</code> for intentionally hiding or dimming the active underline without changing its color source.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.0.24</strong></td>
      <td>Kept entity labels and values paired when using separator-free or left-aligned entity rows.</td>
    </tr>
    <tr><td>Preserved configured <code>control</code> order when changing enabled controls in the visual editor.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.23</strong></td>
      <td>Added <code>layout.entities.alignment</code> so entity labels can use right-aligned or left-aligned table styling.</td>
    </tr>
    <tr><td>Improved separator-free entity rows so labels and values keep clear table spacing.</td></tr>
    <tr><td>Refined multi-card selector navigation and menu behavior so the current card is clearer and controls stay steady while switching.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.22</strong></td>
      <td>Added <code>_order</code> for numeric mode options that cannot preserve YAML key order after Home Assistant parses the config.</td>
    </tr>
    <tr><td>Improved fan speed icon handling for numeric speeds and <code>medium_high</code> style fan ladders.</td></tr>
    <tr><td>Restored dynamic extra-entity icon templates, including legacy <code>{{icon|icon}}</code> rows and <code>state_attr()</code> icon lookups.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.21</strong></td>
      <td>Preserved configured option order inside mode rows so fan, preset, swing, and HVAC options can be arranged from YAML.</td>
    </tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.0.20</strong></td>
      <td>Added <code>layout.entities.separator: false</code> to hide the colon after entity row labels.</td>
    </tr>
    <tr><td>Fixed value-only entity rows so current value and state text keep proper spacing.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.0.19</strong></td>
      <td>Restored explicit <code>control:</code> ordering for configured HVAC, preset, fan, and swing rows.</td>
    </tr>
    <tr><td>Restored explicit per-mode <code>icon:</code> overrides, including icon-only swing and vane controls.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.18</strong></td>
      <td>Improved compatibility for compact v3-style layouts with entity rows and dual setpoints.</td>
    </tr>
    <tr><td>Restored more natural entity label/value sizing so long labels wrap cleanly while values stay readable.</td></tr>
    <tr><td>Tuned the multi-card header/body spacing for a cleaner embedded-card fit.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.17</strong></td>
      <td>Restored off-mode climate target changes by default and added <code>disable_setpoint_change_when_off</code> for TRV-style setups that need the buttons locked while off.</td>
    </tr>
    <tr><td>Show current temperature on fan-based AC cards when the fan entity exposes a temperature attribute.</td></tr>
    <tr><td>Tightened the Simple Thermostat Group menu button while keeping the embedded card isolated from the group header.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.16</strong></td>
      <td>Restored support for <code>name: false</code> on individual mode controls so buttons can be shown as icon-only again.</td>
    </tr>
    <tr>
      <td rowspan="6" nowrap><strong>v4.0.15</strong></td>
      <td>Restored the original Simple Thermostat active mode color assignments for Heat, Cool, Heat/Cool, Dry, Auto, Fan only, and Off.</td>
    </tr>
    <tr><td>Restored <code>template:</code> support for extra entity rows, including legacy <code>state.raw|formatNumber</code> templates and attribute-based calculations.</td></tr>
    <tr><td>Improved long extra-entity label wrapping so labels can wrap while values stay on one line.</td></tr>
    <tr><td>Reduced wasted horizontal space for vertical setpoint controls when extra entity rows are shown.</td></tr>
    <tr><td>Reduced header icon prominence while keeping setpoint controls and mode buttons unchanged.</td></tr>
    <tr><td>Paused group-card activity-following briefly after manual navigation so the selector does not fight user input.</td></tr>
    <tr>
      <td rowspan="1" nowrap><strong>v4.0.14</strong></td>
      <td>Fixed object-style <code>control</code> configs so entries set to <code>false</code> stay hidden.</td>
    </tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.13</strong></td>
      <td>Fixed legacy <code>sensors:</code> labels importing as long Home Assistant friendly names.</td>
    </tr>
    <tr><td>Restored legacy <code>show: false</code> behavior for imported sensor rows.</td></tr>
    <tr><td>Preserved the old vertical setpoint stepper default for imported <code>version: 3</code> cards unless <code>layout.step</code> is explicitly configured.</td></tr>
    <tr><td>Improved dual-setpoint layout so entity rows do not collide with heat/cool target controls.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.12</strong></td>
      <td>Added <code>hide_when</code> for mode-aware setpoint visibility.</td>
    </tr>
    <tr><td>Added optional activity-following selection to <code>custom:simple-thermostat-group</code>.</td></tr>
    <tr><td>Added a quick fade when switching grouped cards.</td></tr>
    <tr><td>Removed the unused group selector style editor option.</td></tr>
    <tr>
      <td rowspan="2" nowrap><strong>v4.0.0-rc.11</strong></td>
      <td>Disabled climate setpoint step buttons while the climate entity is <code>off</code>.</td>
    </tr>
    <tr><td>Added regression coverage for TRV-style <code>OFF</code> target values so the card no longer steps from <code>OFF</code> into invalid low temperatures.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.0-rc.10</strong></td>
      <td>Added <code>custom:simple-thermostat-group</code> for switching between multiple thermostat cards in one dashboard footprint.</td>
    </tr>
    <tr><td>Kept each grouped card rendered by the normal Simple Thermostat card so existing per-card layouts and controls stay intact.</td></tr>
    <tr><td>Added carousel arrows, direct selection menu, optional header toggles, remembered selection, and a visual editor for grouped cards.</td></tr>
    <tr><td>Added regression coverage for group rendering, selection, menu behavior, title fitting, and embedded card isolation.</td></tr>
    <tr>
      <td rowspan="5" nowrap><strong>v4.0.0-rc.8</strong></td>
      <td>Improved inactive mode button contrast on tinted or custom card backgrounds.</td>
    </tr>
    <tr><td>Used AC-aware default header icons for cooling-capable climate entities.</td></tr>
    <tr><td>Kept off-icon slash overlays working with fallback climate icons.</td></tr>
    <tr><td>Contained card sizing and internal layers inside dashboard wrappers.</td></tr>
    <tr><td>Preferred Home Assistant's service-call path for card actions when available.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.0-rc.7</strong></td>
      <td>Kept the latest Home Assistant state when <code>hass</code> arrives before <code>setConfig</code>.</td>
    </tr>
    <tr><td>Hydrated the card as soon as config is assigned.</td></tr>
    <tr><td>Added regression coverage for Home Assistant state/config ordering.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.0-rc.6</strong></td>
      <td>Polished the visual editor into a clearer setup flow.</td>
    </tr>
    <tr><td>Added simple extra entity row editing for entity, name, and icon.</td></tr>
    <tr><td>Moved precision, fallback, custom labels, actions, and mode display options into Advanced.</td></tr>
    <tr><td>Updated editor-first README guidance.</td></tr>
    <tr>
      <td rowspan="3" nowrap><strong>v4.0.0-rc.5</strong></td>
      <td>Aligned card lifecycle behavior more closely with v3.</td>
    </tr>
    <tr><td>Removed extra loading and missing-entity wrapper behavior.</td></tr>
    <tr><td>Added detach and reattach lifecycle regression coverage.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.0-rc.4</strong></td>
      <td>Hardened card lifecycle when Home Assistant provides state before config.</td>
    </tr>
    <tr><td>Kept optional extra entity rows from breaking the card during transient missing states.</td></tr>
    <tr><td>Mapped <code>auto_comfort</code> preset variants to the comfort icon.</td></tr>
    <tr><td>Added lifecycle and icon regression tests.</td></tr>
    <tr>
      <td rowspan="4" nowrap><strong>v4.0.0-rc.3</strong></td>
      <td>Preserved last valid render during transient missing entity updates.</td>
    </tr>
    <tr><td>Tightened single-row entity spacing.</td></tr>
    <tr><td>Standardized dense mode button sizing.</td></tr>
    <tr><td>Added lifecycle regression tests.</td></tr>
    <tr>
      <td rowspan="7" nowrap><strong>v4.0.0-rc.2</strong></td>
      <td>Improved <code>enhanced_visuals: false</code> v3-style defaults.</td>
    </tr>
    <tr><td>Improved state text for climate, fan, humidifier, and dehumidifier cards.</td></tr>
    <tr><td>Refined header and entity toggle colors.</td></tr>
    <tr><td>Increased active icon animation visibility.</td></tr>
    <tr><td>Cleaned up dense climate mode layouts.</td></tr>
    <tr><td>Added contextual fan speed icons.</td></tr>
    <tr><td>Linked v3 documentation.</td></tr>
    <tr>
      <td rowspan="6" nowrap><strong>v4.0.0-rc.1</strong></td>
      <td>Added domain-aware climate, fan, humidifier, and dehumidifier support.</td>
    </tr>
    <tr><td>Added fan percentage setpoints and mode controls.</td></tr>
    <tr><td>Added humidifier and dehumidifier humidity controls.</td></tr>
    <tr><td>Added v4 enhanced visuals.</td></tr>
    <tr><td>Added Home Assistant 2024.8+ action support.</td></tr>
    <tr><td>Kept legacy config aliases supported.</td></tr>
  </tbody>
</table>
