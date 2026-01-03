const CARD_VERSION = '1.0.3';

console.info(
  `%c  MODERN-SOLAR-FLOW-CARD  \n%c  Version ${CARD_VERSION}    `,
  'color: #4ade80; font-weight: bold; background: #111827',
  'color: white; font-weight: bold; background: #374151',
);

class ModernSolarFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this._createCard();
    }
    this._updateContent();
  }

  setConfig(config) {
    // If config changes, we might need to redraw layout
    const oldConfig = this.config;
    this.config = {
      solar_label: 'PV Ertrag',
      grid_label: 'Netz',
      battery_label: 'Akku',
      home_label: 'Haus',
      wp_label: 'WP',
      invert_grid: false,
      invert_battery: false,
      show_daily_stats: true,
      ...config
    };
    
    // Trigger re-creation if crucial layout flags change
    if (oldConfig && (oldConfig.show_daily_stats !== this.config.show_daily_stats || oldConfig.wp_entity !== this.config.wp_entity)) {
        if (this.content) {
             this.content.innerHTML = ''; // Force clear
             this._createCard();
        }
    }
  }

  _createCard() {
    if (this.content && this.content.innerHTML !== '') return; // Already created

    if (!this.content) {
        const card = document.createElement('ha-card');
        this.content = document.createElement('div');
        this.content.className = 'solar-root';
        card.appendChild(this.content);
        this.shadowRoot.appendChild(card);
    }

    const config = this.config || {};
    const isDark = (this._hass && this._hass.themes && this._hass.themes.darkMode) ?? false;
    const isDailyVisible = config.show_daily_stats !== false;

    // We define CSS vars here initially, but they are also updated in _updateContent to react to theme changes
    // However, defining the structure is key.
    
    // We need unique IDs for paths to update them later
    // Paths: S-H, S-B, S-G, B-H, G-H, G-B, H-W
    // We create them in the DOM.

    this.content.innerHTML = `
      <style id="ms-style"></style>
      <div class="diagram-area">
        <div class="price-badge hidden" id="ms-price-badge"><span>⚡</span><span id="ms-price-val"></span></div>
        
        <svg id="ms-svg">
            <g id="ms-paths">
                <!-- Solar Paths -->
                <path id="p-bg-s-h" class="path-bg"></path><path id="p-flow-s-h" class="path-flow"></path>
                <path id="p-bg-s-b" class="path-bg"></path><path id="p-flow-s-b" class="path-flow flow-blue"></path>
                <path id="p-bg-s-g" class="path-bg"></path><path id="p-flow-s-g" class="path-flow"></path>
                
                <!-- Batt Paths -->
                <path id="p-bg-b-h" class="path-bg"></path><path id="p-flow-b-h" class="path-flow flow-green"></path>
                
                <!-- Grid Paths -->
                <path id="p-bg-g-h" class="path-bg"></path><path id="p-flow-g-h" class="path-flow flow-red"></path>
                <path id="p-bg-g-b" class="path-bg"></path><path id="p-flow-g-b" class="path-flow flow-red"></path>
                
                <!-- WP Path -->
                <path id="p-bg-h-w" class="path-bg hidden"></path><path id="p-flow-h-w" class="path-flow hidden"></path>
            </g>
        </svg>

        <div class="circle c-solar" id="ms-solar">
          <div class="val" id="val-solar">--<span class="unit">W</span></div>
          <div class="label" id="label-solar">${config.solar_label}</div>
        </div>

        <div class="circle c-batt" id="ms-batt">
          <div class="val" id="val-batt-soc">--<span class="unit">%</span></div>
          <div class="sub-val" id="val-batt-power">-- W</div>
          <div class="label" id="label-batt">${config.battery_label}</div>
        </div>

        <div class="circle c-home" id="ms-home">
          <div class="val" id="val-home">--<span class="unit">W</span></div>
          <div class="label" id="label-home">${config.home_label}</div>
        </div>

        <div class="circle c-grid" id="ms-grid">
          <div class="val" id="val-grid">--<span class="unit">W</span></div>
          <div class="label" id="label-grid">${config.grid_label}</div>
        </div>

        <div class="circle c-wp hidden" id="ms-wp">
          <div class="val" id="val-wp">--</div>
          <div class="label" id="label-wp">${config.wp_label}</div>
        </div>
      </div>

      <div class="stats-footer ${!isDailyVisible ? 'hidden' : ''}" id="ms-footer">
        <div class="stat-block">
          <div class="chart-wrap" id="chart-solar"></div>
          <div class="stat-info">
            <div class="stat-main" id="stat-solar-val">-- kWh</div>
            <div class="stat-sub"><span class="dot" style="background:var(--ms-color-solar)"></span><span id="stat-solar-self">-- Eigen</span></div>
            <div class="stat-sub"><span class="dot" style="background:var(--ms-color-orange)"></span><span id="stat-solar-grid">-- Netz</span></div>
          </div>
        </div>
        <div class="stat-block">
          <div class="chart-wrap" id="chart-cons"></div>
          <div class="stat-info">
            <div class="stat-main" id="stat-cons-val">-- kWh</div>
            <div class="stat-sub"><span class="dot" style="background:var(--ms-color-blue)"></span><span id="stat-cons-pv">-- PV</span></div>
            <div class="stat-sub"><span class="dot" style="background:var(--ms-color-red)"></span><span id="stat-cons-grid">-- Netz</span></div>
          </div>
        </div>
      </div>
    `;

    // Initialize ResizeObserver only once
    if (!this._ro) {
        this._ro = new ResizeObserver(() => {
          if (this._resizeTimer) clearTimeout(this._resizeTimer);
          this._resizeTimer = setTimeout(() => this._drawPaths(), 100);
        });
        this._ro.observe(this.content);
    }
  }

  _updateContent() {
    if (!this.config || !this._hass || !this.content) return;

    const hass = this._hass;
    const config = this.config;
    const isDark = hass.themes?.darkMode ?? false;

    // Update CSS variables (Theme)
    const styleVars = isDark ? `
      --ms-bg: linear-gradient(180deg, #111827 0%, #000000 100%);
      --ms-card-border: 1px solid #1f2937;
      --ms-shadow: 0 4px 15px rgba(0,0,0,0.5);
      --ms-circle-bg: #1f2937;
      --ms-circle-border: 3px solid #374151;
      --ms-text-val: #ffffff;
      --ms-text-label: #9ca3af;
      --ms-text-unit: #6b7280;
      --ms-path-bg: #374151;
      --ms-glow: drop-shadow(0 0 3px rgba(74, 222, 128, 0.5));
      --ms-bar-bg: rgba(31, 41, 55, 0.6);
      --ms-color-solar: #4ade80;
      --ms-color-red: #f87171;
      --ms-color-blue: #60a5fa;
      --ms-color-orange: #fb8c00;
      --ms-color-wp: #fb8c00;
    ` : `
      --ms-bg: linear-gradient(180deg, #e1f5fe 0%, #ffffff 100%);
      --ms-card-border: none;
      --ms-shadow: 0 4px 15px rgba(0,0,0,0.05);
      --ms-circle-bg: #ffffff;
      --ms-circle-border: 4px solid transparent;
      --ms-text-val: #333333;
      --ms-text-label: #666666;
      --ms-text-unit: #888888;
      --ms-path-bg: #e0e0e0;
      --ms-glow: none;
      --ms-bar-bg: rgba(255, 255, 255, 0.7);
      --ms-color-solar: #66bb6a;
      --ms-color-red: #ef5350;
      --ms-color-blue: #42a5f5;
      --ms-color-orange: #ff9800;
      --ms-color-wp: #ff9800;
    `;

    const css = `
        .solar-root {
          ${styleVars}
          position: relative;
          isolation: isolate;
          height: ${config.show_daily_stats !== false ? '540px' : '440px'};
          background: var(--ms-bg);
          border: var(--ms-card-border);
          border-radius: 20px;
          box-shadow: var(--ms-shadow);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: 'Roboto', sans-serif;
          box-sizing: border-box;
          transition: height 0.3s ease;
        }
        .diagram-area { position: relative; flex-grow: 1; width: 100%; }
        .price-badge {
          position: absolute; top: 15px; right: 15px;
          background: var(--ms-circle-bg); opacity: 0.9;
          border: 1px solid var(--ms-text-unit);
          padding: 4px 10px; border-radius: 15px;
          font-size: 12px; font-weight: 700; color: var(--ms-text-val);
          z-index: 50; display: flex; align-items: center; gap: 6px;
        }
        .hidden { display: none !important; }
        .circle {
          position: absolute; background: var(--ms-circle-bg); border-radius: 50%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          border: var(--ms-circle-border); box-shadow: 0 8px 20px rgba(0,0,0,0.12); z-index: 20;
          transition: border-color 0.3s ease;
        }
        .c-solar { top: 20px; left: 50%; transform: translateX(-50%); width: 115px; height: 115px; border-color: var(--ms-color-solar); }
        .c-batt  { top: 180px; left: 10px; width: 95px; height: 95px; }
        .c-home  { top: 180px; left: 50%; transform: translateX(-50%); width: 95px; height: 95px; }
        .c-grid  { top: 180px; right: 10px; width: 95px; height: 95px; }
        .c-wp    { top: 360px; left: 50%; transform: translateX(-50%); width: 70px; height: 70px; border-color: var(--ms-color-wp); }
        
        .status-red { border-color: var(--ms-color-red) !important; }
        .status-green { border-color: var(--ms-color-solar) !important; }
        .status-blue { border-color: var(--ms-color-blue) !important; }
        .status-wp { border-color: var(--ms-color-wp) !important; }
        
        .val { font-size: 20px; font-weight: 900; color: var(--ms-text-val); line-height: 1.1; }
        .unit { font-size: 12px; font-weight: 500; color: var(--ms-text-unit); margin-left: 2px; }
        .sub-val { font-size: 13px; font-weight: 600; color: var(--ms-text-unit); margin-top: 2px; }
        .label { font-size: 10px; font-weight: 700; color: var(--ms-text-label); text-transform: uppercase; margin-top: 2px; }
        .c-solar .val { font-size: 28px; }
        .c-solar .label { color: var(--ms-color-solar); }
        
        #ms-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
        .path-bg { fill: none; stroke: var(--ms-path-bg); stroke-width: 4px; opacity: 0.9; }
        .path-flow { fill: none; stroke: var(--ms-color-solar); stroke-width: 4px; stroke-dasharray: 12; opacity: 0; filter: var(--ms-glow); transition: stroke 0.3s ease; }
        .path-flow.flow-red { stroke: var(--ms-color-red) !important; }
        .path-flow.flow-green { stroke: var(--ms-color-solar) !important; }
        .path-flow.flow-blue { stroke: var(--ms-color-blue) !important; }
        .path-flow.flow-wp { stroke: var(--ms-color-wp) !important; }
        .active { opacity: 1; animation: dash 1s linear infinite; }
        @keyframes dash { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
        
        .stats-footer { height: 100px; background: var(--ms-bar-bg); backdrop-filter: blur(5px); border-top: 1px solid var(--ms-text-unit); display: flex; justify-content: space-around; align-items: center; padding: 0 10px; z-index: 30; }
        .stat-block { width: 45%; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .chart-wrap { width: 55px; height: 55px; }
        .donut-chart { width: 100%; height: 100%; transform: rotate(-90deg); }
        .donut-bg { fill: none; stroke-width: 4; }
        .donut-seg { fill: none; stroke-width: 4; stroke-linecap: round; }
        .stat-info { display: flex; flex-direction: column; justify-content: center; }
        .stat-main { font-size: 15px; font-weight: 900; color: var(--ms-text-val); }
        .stat-sub { font-size: 10px; color: var(--ms-text-unit); display: flex; align-items: center; gap: 5px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    `;
    
    // Inject Styles only if changed (simple check)
    const styleEl = this.content.querySelector('#ms-style');
    if (styleEl && styleEl.innerHTML !== css) {
        styleEl.innerHTML = css;
    }

    // Helper functions
    const fnum = (x) => { const v = parseFloat(x); return Number.isFinite(v) ? v : 0; };
    const state = (eid) => (eid && hass.states[eid] ? hass.states[eid].state : null);
    const getVal = (eid) => (eid ? fnum(state(eid)) : 0);
    const ent = (eid) => (eid ? hass.states[eid] : null);

    // --- Data Calculation ---
    const solarVal = getVal(config.solar_entity);
    let gridVal = getVal(config.grid_entity);
    if (config.invert_grid) gridVal *= -1;

    let battPower = getVal(config.battery_power_entity);
    if (config.invert_battery) battPower *= -1; 
    const battSoc = getVal(config.battery_entity);
    
    let homeVal = 0;
    if (config.home_entity) {
      homeVal = getVal(config.home_entity);
    } else {
      homeVal = solarVal + gridVal + battPower; 
    }

    const dSolar = getVal(config.solar_daily_entity);
    const dGrid = getVal(config.grid_daily_entity); // Export or Import? Often Import/Export are separate.
    // Assuming this is "Grid Energy" for stats.
    const dSelf = getVal(config.self_daily_entity);
    const dCons = getVal(config.consumption_daily_entity);

    const pSolarSelf = dSolar > 0 ? (dSelf / dSolar) * 100 : 0;
    const pConsPV = dCons > 0 ? (dSelf / dCons) * 100 : 0;

    const priceEntity = ent(config.price_entity);
    const priceVal = priceEntity ? fnum(priceEntity.state) : 0;
    const priceUnit = priceEntity?.attributes?.unit_of_measurement ?? '';

    // WP Logic
    const wpEntity = ent(config.wp_entity);
    let wpStateText = 'AUS';
    let isWpRunning = false;
    if (wpEntity) {
      const s = String(wpEntity.state).toLowerCase();
      const n = fnum(wpEntity.state);
      if (!isNaN(parseFloat(wpEntity.state)) && Number.isFinite(n) && (n > 10 || n < -10)) {
         wpStateText = `${Math.round(Math.abs(n))} W`;
         isWpRunning = true;
      } else if (['on', 'true', '1', 'running'].includes(s)) {
        isWpRunning = true;
        wpStateText = 'EIN';
      }
    }

    // Flow Logic
    const THRESHOLD = 10;
    const isSolarProducing = solarVal > THRESHOLD;
    const isGridImport = gridVal > THRESHOLD;
    const isGridExport = gridVal < -THRESHOLD;
    const isBattDischarging = battPower > THRESHOLD;
    const isBattCharging = battPower < -THRESHOLD;

    let s_to_h = false, s_to_b = false, s_to_g = false;
    let g_to_h = false, b_to_h = false, g_to_b = false, h_to_wp = false;

    if (isSolarProducing) {
      s_to_h = true;
      if (isBattCharging) s_to_b = true;
      if (isGridExport) s_to_g = true;
    }
    if (isGridImport) {
      g_to_h = true;
      if (isBattCharging) { g_to_b = true; s_to_b = false; }
    }
    if (isBattDischarging) b_to_h = true;
    if (isWpRunning) h_to_wp = true;

    // --- DOM Updates ---
    const setText = (id, text) => {
        const el = this.content.querySelector(id);
        if (el) el.innerHTML = text; // innerHTML to support <span class="unit"> 
    };
    
    const setClass = (id, cls, condition) => {
        const el = this.content.querySelector(id);
        if (!el) return;
        if (condition) el.classList.add(cls);
        else el.classList.remove(cls);
    };

    const toggleClass = (id, cls, force) => {
         const el = this.content.querySelector(id);
         if (el) el.classList.toggle(cls, force);
    }

    // Values
    setText('#val-solar', `${Math.abs(Math.round(solarVal))}<span class="unit">W</span>`);
    setText('#val-batt-soc', `${Math.abs(Math.round(battSoc))}<span class="unit">%</span>`);
    setText('#val-batt-power', `${Math.abs(Math.round(battPower))} W`);
    setText('#val-home', `${Math.abs(Math.round(homeVal))}<span class="unit">W</span>`);
    setText('#val-grid', `${Math.abs(Math.round(gridVal))}<span class="unit">W</span>`);

    // Labels (in case config changed)
    setText('#label-solar', config.solar_label);
    setText('#label-batt', config.battery_label);
    setText('#label-home', config.home_label);
    setText('#label-grid', config.grid_label);
    setText('#label-wp', config.wp_label);

    // Status Circles
    const battEl = this.content.querySelector('#ms-batt');
    battEl.className = 'circle c-batt'; // reset
    if (isBattDischarging) battEl.classList.add('status-green');
    else if (isBattCharging) battEl.classList.add('status-blue');

    const gridEl = this.content.querySelector('#ms-grid');
    gridEl.className = 'circle c-grid';
    if (isGridImport) gridEl.classList.add('status-red');
    else if (isGridExport) gridEl.classList.add('status-green');

    // WP
    const wpEl = this.content.querySelector('#ms-wp');
    const wpPathBg = this.content.querySelector('#p-bg-h-w');
    const wpPathFlow = this.content.querySelector('#p-flow-h-w');
    
    if (wpEntity) {
        wpEl.classList.remove('hidden');
        if (wpPathBg) wpPathBg.classList.remove('hidden');
        if (wpPathFlow) wpPathFlow.classList.remove('hidden');
        
        setText('#val-wp', wpStateText);
        wpEl.classList.toggle('status-wp', isWpRunning);
        
        // WP Line Color
        let wpLineClass = 'flow-wp';
        if (h_to_wp) {
            if (isGridImport) wpLineClass = 'flow-red';
            else if (isBattDischarging || isSolarProducing) wpLineClass = 'flow-green';
        }
        
        if (wpPathFlow) {
            wpPathFlow.setAttribute('class', `path-flow ${wpLineClass} ${h_to_wp ? 'active' : ''}`);
        }
    } else {
        wpEl.classList.add('hidden');
        if (wpPathBg) wpPathBg.classList.add('hidden');
        if (wpPathFlow) wpPathFlow.classList.add('hidden');
    }

    // Price
    const priceBadge = this.content.querySelector('#ms-price-badge');
    if (priceEntity) {
        priceBadge.classList.remove('hidden');
        setText('#ms-price-val', `${priceVal.toFixed(3)} ${priceUnit}`);
    } else {
        priceBadge.classList.add('hidden');
    }

    // Paths Active State
    // We toggle the 'active' class. We do NOT rewrite the elements.
    const setPath = (id, active) => {
        const p = this.content.querySelector(id);
        if (p) p.classList.toggle('active', active);
    };

    setPath('#p-flow-s-h', s_to_h);
    setPath('#p-flow-s-b', s_to_b);
    setPath('#p-flow-s-g', s_to_g);
    setPath('#p-flow-b-h', b_to_h);
    setPath('#p-flow-g-h', g_to_h);
    setPath('#p-flow-g-b', g_to_b);

    // Footer Stats
    const footer = this.content.querySelector('#ms-footer');
    if (config.show_daily_stats !== false) {
        footer.classList.remove('hidden');
        
        // Update Chart 1
        setText('#stat-solar-val', `${dSolar.toFixed(1)} kWh`);
        setText('#stat-solar-self', `${dSelf.toFixed(1)} Eigen`);
        setText('#stat-solar-grid', `${(dSolar - dSelf).toFixed(1)} Netz`);
        this.content.querySelector('#chart-solar').innerHTML = mkRing(pSolarSelf, 'var(--ms-color-solar)', 'var(--ms-color-orange)');

        // Update Chart 2
        setText('#stat-cons-val', `${dCons.toFixed(1)} kWh`);
        setText('#stat-cons-pv', `${pConsPV.toFixed(0)}% PV`);
        setText('#stat-cons-grid', `${(100 - pConsPV).toFixed(0)}% Netz`);
        this.content.querySelector('#chart-cons').innerHTML = mkRing(pConsPV, 'var(--ms-color-blue)', 'var(--ms-color-red)');
    } else {
        footer.classList.add('hidden');
    }
  }

  _drawPaths() {
    if (!this.content) return;
    const svg = this.content.querySelector('#ms-svg');
    const area = this.content.querySelector('.diagram-area');
    if (!svg || !area) return;

    const getPos = (id) => {
      const el = this.content.querySelector(id);
      if (!el || el.classList.contains('hidden')) return null;
      const r = el.getBoundingClientRect();
      const ar = area.getBoundingClientRect();
      return { x: (r.left - ar.left) + r.width / 2, y: (r.top - ar.top) + r.height / 2 };
    };

    const S = getPos('#ms-solar'), B = getPos('#ms-batt'), H = getPos('#ms-home'), G = getPos('#ms-grid'), W = getPos('#ms-wp');
    if (!S || !B || !H || !G) return; // Wait for layout

    svg.setAttribute('viewBox', `0 0 ${area.clientWidth} ${area.clientHeight}`);
    const line = (a, b) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    const curve = (a, b) => {
      const bend = 0.35;
      return `M ${a.x} ${a.y} C ${a.x} ${a.y + (b.y - a.y) * bend}, ${b.x} ${a.y + (b.y - a.y) * bend}, ${b.x} ${b.y}`;
    };

    // Update 'd' attributes of existing paths
    const setD = (id, d) => {
        const bg = this.content.querySelector(id.replace('flow', 'bg'));
        const flow = this.content.querySelector(id);
        if (bg) bg.setAttribute('d', d);
        if (flow) flow.setAttribute('d', d);
    }

    setD('#p-flow-s-h', line(S, H));
    setD('#p-flow-s-b', curve(S, B));
    setD('#p-flow-s-g', curve(S, G));
    setD('#p-flow-b-h', line(B, H));
    setD('#p-flow-g-h', line(G, H));
    setD('#p-flow-g-b', line(G, B));
    
    if (W) {
        setD('#p-flow-h-w', line(H, W));
    }
  }

  static getConfigElement() { return document.createElement('modern-solar-flow-card-editor'); }
  static getStubConfig() { return { solar_label: 'Solar', grid_label: 'Netz', home_label: 'Haus', battery_label: 'Akku', wp_label: 'WP', show_daily_stats: true }; }
}

class ModernSolarFlowCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this.render(); }
  set hass(hass) { 
    this._hass = hass;
    const form = this.querySelector('ha-form');
    if (form) form.hass = hass;
  }
  render() {
    if (this.innerHTML) return;
    const form = document.createElement('ha-form');
    form.schema = [
      { name: "solar_entity", label: "Solar Leistung (W)", selector: { entity: { domain: "sensor" } } },
      { name: "grid_entity", label: "Netz Leistung (W)", selector: { entity: { domain: "sensor" } } },
      { name: "home_entity", label: "Hausverbrauch Leistung (W) [Optional]", selector: { entity: { domain: "sensor" } } },
      { name: "invert_grid", label: "Netz invertieren (Export ist positiv)", selector: { boolean: {} } },
      { name: "battery_power_entity", label: "Batterie Leistung (W)", selector: { entity: { domain: "sensor" } } },
      { name: "invert_battery", label: "Batterie invertieren (Laden ist positiv)", selector: { boolean: {} } },
      { name: "battery_entity", label: "Batterie Ladestand (%)", selector: { entity: { domain: "sensor" } } },
      { name: "wp_entity", label: "Wärmepumpe/Zusatzlast (Optional)", selector: { entity: { domain: ["binary_sensor", "sensor"] } } },
      { name: "price_entity", label: "Strompreis (Optional)", selector: { entity: { domain: "sensor" } } },
      
      { name: "", type: "section", header: "Tageswerte (kWh)" },
      { name: "show_daily_stats", label: "Tageswerte anzeigen?", selector: { boolean: {} } },
      { name: "solar_daily_entity", label: "Solar Tagesertrag", selector: { entity: { domain: "sensor" } } },
      { name: "grid_daily_entity", label: "Netz Einspeisung Tag", selector: { entity: { domain: "sensor" } } },
      { name: "consumption_daily_entity", label: "Gesamtverbrauch Tag", selector: { entity: { domain: "sensor" } } },
      { name: "self_daily_entity", label: "Eigenverbrauch Tag", selector: { entity: { domain: "sensor" } } },
      
      { name: "", type: "section", header: "Beschriftungen" },
      { name: "solar_label", label: "Label Solar", selector: { text: {} } },
      { name: "grid_label", label: "Label Netz", selector: { text: {} } },
      { name: "battery_label", label: "Label Akku", selector: { text: {} } },
      { name: "home_label", label: "Label Haus", selector: { text: {} } },
      { name: "wp_label", label: "Label Zusatzlast", selector: { text: {} } },
    ];
    form.data = this._config;
    if (this._hass) form.hass = this._hass;
    form.computeLabel = (s) => s.label;
    form.addEventListener('value-changed', (ev) => {
      const event = new Event("config-changed", { bubbles: true, composed: true });
      event.detail = { config: ev.detail.value };
      this.dispatchEvent(event);
    });
    this.appendChild(form);
  }
}

customElements.define('modern-solar-flow-card', ModernSolarFlowCard);
customElements.define('modern-solar-flow-card-editor', ModernSolarFlowCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'modern-solar-flow-card', name: 'Modern Solar Flow Card', preview: true });