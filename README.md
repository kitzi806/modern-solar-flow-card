# Modern Solar Flow Card

| Light Mode | Dark Mode |
| --- | --- |
| ![Light Mode](Screenshot-bright.png) | ![Dark Mode](Screenshot-dark.png) |

A modern, animated power flow card for Home Assistant, inspired by the FusionSolar design. It provides a beautiful visualization of your energy flows (Solar, Battery, Grid, Home, and an optional Heat Pump/Extra Load).

## Features
- **Visual Editor**: Configure everything via the Home Assistant UI. No YAML required.
- **Animated Flows**: Real-time animation of energy directions with smooth updates.
- **Dynamic Autarky Ring**: A visual indicator around the home icon showing the current mix of self-produced vs. grid energy.
- **Integrated Icons**: Modern icons for all components (Solar, Battery, Home, Grid, Heat Pump).
- **Auto-Calculation**: Automatically calculates home consumption from available sensors (Solar + Grid + Battery).
- **Flexible Logic**: Inversion toggles for Grid, Battery, and Heat Pump sensors to match any setup.
- **Dynamic Labels**: Change all text (e.g., rename "WP" to "Car Charger").
- **Theme Support**: Automatically adapts to Dark and Light modes with enhanced neon-glow effects in dark mode.
- **Daily Stats**: Built-in donut charts for self-consumption and PV-coverage (optional).

## Color Logic

The card uses colors to indicate the source and status of your energy:

### Flow Lines (Animations)
- <span style="color: #4ade80;">**Green**</span>: Clean energy from Solar or Battery to Home, or from Home to Heat Pump (if no grid import).
- <span style="color: #60a5fa;">**Blue**</span>: Energy flowing into the Battery (charging).
- <span style="color: #f87171;">**Red**</span>: "Dirty" energy from the Grid to Home/Battery, or Home to Heat Pump (if grid import is active).

### Home Circle (Autarky Ring)
- **Green Part**: Percentage of consumption covered by self-produced energy (Solar/Battery).
- **Red Part**: Percentage of consumption currently supplied by the Grid.

### Component Status (Circle Borders)
- **Battery**: **Blue** (Charging), **Green** (Discharging).
- **Grid**: **Red** (Import), **Green** (Export/Feed-in).
- **Home**: Green (>90% Autarky), Orange (>30%), Red (<30%).

## Installation

### HACS (Recommended)
1. Go to **HACS** -> **Frontend**.
2. Click the three dots in the top right and select **Custom repositories**.
3. Add the URL `https://github.com/kitzi806/modern-solar-flow-card` and select **Lovelace** as the category.
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
| `grid_entity` | Entity providing current grid power (W). |
| `use_home_calc` | If enabled, calculates home consumption automatically (Default: True). |
| `home_entity` | (Optional) Manually specify an entity for home consumption. |
| `battery_power_entity` | Entity providing current battery power (W). |
| `battery_entity` | Entity providing battery state of charge (%). |
| `wp_entity` | (Optional) Heat pump or extra load (supports sensors, switches, etc.). |
| `invert_grid` | Invert grid logic (Toggle if Export/Import are swapped). |
| `invert_battery` | Invert battery logic (Toggle if Charging/Discharging are swapped). |
| `invert_wp` | Invert heat pump logic (e.g. if Switch OFF = Active). |
| `price_entity` | (Optional) Current electricity price sensor. |
| `show_daily_stats` | Toggle visibility of the statistics footer. |

## Support
If you like this card, please give it a ⭐ on GitHub!