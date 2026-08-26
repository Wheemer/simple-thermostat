# Extra Entity Templates

Simple Thermostat supports frontend templates for extra entity values, labels, and icons. These templates are rendered in the browser by the card; they are not Home Assistant backend Jinja templates.

Use the current `entities` configuration for new cards. Existing v3 `sensors` configurations are imported automatically for compatibility.

## Render an Entity State

Without a template, the card uses Home Assistant's formatted entity state. A template gives you direct control over the displayed value:

```yaml
type: custom:simple-thermostat
entity: climate.living_room
entities:
  - entity: sensor.living_room_humidity
    name: Humidity
  - entity: sensor.living_room_humidity
    name: Raw humidity
    template: '{{state.raw}}'
```

`state.raw` is the entity's raw state. `state.text` is Home Assistant's localized, formatted state.

## Render an Attribute

Use `attribute` when the value is already exposed as an entity attribute:

```yaml
entities:
  - entity: weather.home
    name: Outside
    attribute: temperature
    decimals: 1
```

When a template is also present, the template receives the full entity and the selected attribute becomes `state.raw`:

```yaml
entities:
  - entity: weather.home
    name: Outside
    attribute: temperature
    template: '{{state.raw|formatNumber({ decimals: 1 })}}'
```

## Render Attributes From the Main Entity

Omit `entity` and provide an attribute from the main climate, fan, or humidifier entity:

```yaml
entities:
  - attribute: min_temp
    name: Range
    template: '{{min_temp}} / {{max_temp}}'
```

Lists can be joined into readable text:

```yaml
entities:
  - attribute: hvac_modes
    name: Supported HVAC modes
    template: "{{hvac_modes|join(', ')}}"
```

## Use Another Entity as Context

The selected entity's attributes are exposed directly to the template:

```yaml
entities:
  - entity: sensor.multisensor_living_room
    name: Temperature
    template: '{{state.raw}} {{unit_of_measurement}}'
```

Use `state_attr(entity_id, attribute)` to read an attribute from another entity:

```yaml
entities:
  - entity: sensor.status_fenster_sz
    name: Window
    icon: "{{ state_attr('sensor.status_fenster_sz', 'icon') }}"
```

## Pass Custom Variables

The card-level `variables` object is available as `v` in every frontend template:

```yaml
type: custom:simple-thermostat
entity: climate.living_room
variables:
  icons:
    idle: mdi:sleep
    heating: mdi:radiator
entities:
  - entity: sensor.heating_action
    name: Action
    icon: '{{v.icons[state.raw]}}'
```

## Available Helpers and Filters

| Name | Description | Example |
| --- | --- | --- |
| `state.raw` | Raw state or selected attribute value. | `{{state.raw}}` |
| `state.text` | Home Assistant-formatted and localized state. | `{{state.text}}` |
| `state_attr()` | Read an attribute from another entity. | `{{state_attr('sensor.room', 'icon')}}` |
| `v` | Card-level custom variables. | `{{v.labels[state.raw]}}` |
| `icon` | Render a value as an icon in a value template. | `{{'mdi:sleep'\|icon}}` |
| `join` | Join a list into text. | `{{hvac_modes\|join(', ')}}` |
| `translate` | Resolve a Home Assistant translation. | `{{'on'\|translate('state.default.')}}` |
| `formatNumber` | Format a number with the card's locale and precision. | `{{state.raw\|formatNumber({ decimals: 1 })}}` |
| `relativetime` | Render a timestamp as a live relative time. | `{{state.raw\|relativetime}}` |
| `css` | Wrap text with sanitized inline CSS properties. | `{{state.text\|css({ color: 'red' })}}` |
| `debug` | Render a value as JSON for troubleshooting. | `{{state\|debug}}` |

## Language and Translations

Templates use the language and number format selected in Home Assistant:

- `state.text` uses Home Assistant's formatted entity state when available.
- `formatNumber` follows the Home Assistant number locale.
- `translate` reads Home Assistant's translation resources.
- `ui.<key>` exposes the native climate-card translation keys that Home Assistant currently provides.

For example:

```yaml
template: "{{'on'|translate('state.default.')}}"
```

Translation availability is controlled by Home Assistant and the entity's integration. If no translation exists, the card falls back to the raw value.

## Legacy v3 Sensor Configurations

Version 4 imports `sensors` as `entities`, `current_temperature_entity` as `current_value_entity`, and `layout.sensors` as `layout.entities`. Existing `version: 3` cards continue to use classic visual defaults unless `enhanced_visuals: true` is explicitly configured.

Use the [v3 documentation](https://github.com/Wheemer/simple-thermostat/tree/v3) when maintaining a dashboard that intentionally remains on version 3.
