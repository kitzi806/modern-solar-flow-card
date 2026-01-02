# Modern Solar Flow Card

A modern, animated power flow card for Home Assistant, inspired by the FusionSolar design. It provides a beautiful visualization of your energy flows (Solar, Battery, Grid, Home, and an optional Heat Pump/Extra Load).

## Features
- **Visual Editor**: Configure everything via the Home Assistant UI. No YAML required.
- **Animated Flows**: Real-time animation of energy directions.
- **Dynamic Labels**: Change all text (e.g., rename "WP" to "Car Charger").
- **Theme Support**: Automatically adapts to Dark and Light modes.
- **Daily Stats**: Built-in donut charts for self-consumption and PV-coverage.

## Installation

### HACS (Recommended)
1. Go to **HACS** -> **Frontend**.
2. Click the three dots in the top right and select **Custom repositories**.
3. Add the URL of this repository and select **Lovelace** as the category.
4. Click **Install**.

### Manual
1. Download `modern-solar-flow-card.js` from the latest release.
2. Upload it to your `<config>/www/` directory.
3. Add the resource in HA: **Settings** -> **Dashboards** -> **Resources** -> **Add Resource**.
   - URL: `/local/modern-solar-flow-card.js`
   - Type: `JavaScript Module`

## Configuration

The card is best configured using the UI editor.

| Name | Description |
| --- | --- |
| `solar_entity` | Entity providing current solar power (W). |
| `grid_entity` | Entity providing current grid power (W). Positive = Import, Negative = Export. |
| `battery_power_entity` | Entity providing current battery power (W). Positive = Discharging, Negative = Charging. |
| `battery_entity` | Entity providing battery state of charge (%). |
| `wp_entity` | (Optional) Heat pump or extra load. Can be a power sensor (W) or a binary sensor. |
| `price_entity` | (Optional) Current electricity price sensor. |

*Note: Use the "Invert" toggles in the editor if your sensors use different sign conventions.*
