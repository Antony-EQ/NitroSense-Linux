import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const HISTORY_LEN = 80;
const UNIT = 28; // px por unidad de tecla

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ToastItem { id: number; message: string; removing: boolean; }

type Key = { l: string; w: number };

// ─── Layout teclado principal (español) ──────────────────────────────────────
const KB_MAIN: Key[][] = [
  [
    {l:'Esc',w:1},{l:'F1',w:1},{l:'F2',w:1},{l:'F3',w:1},{l:'F4',w:1},
    {l:'F5',w:1},{l:'F6',w:1},{l:'F7',w:1},{l:'F8',w:1},{l:'F9',w:1},
    {l:'F10',w:1},{l:'F11',w:1},{l:'F12',w:1},
    {l:'Impr',w:1},{l:'Pausa',w:1},{l:'Supr',w:1},
  ],
  [
    {l:'\\',w:1},{l:'1',w:1},{l:'2',w:1},{l:'3',w:1},{l:'4',w:1},{l:'5',w:1},
    {l:'6',w:1},{l:'7',w:1},{l:'8',w:1},{l:'9',w:1},{l:'0',w:1},{l:"'",w:1},
    {l:'¿',w:1},{l:'⌫',w:2},{l:'Ins',w:1},
  ],
  [
    {l:'Tab',w:1.5},{l:'Q',w:1},{l:'W',w:1},{l:'E',w:1},{l:'R',w:1},{l:'T',w:1},
    {l:'Y',w:1},{l:'U',w:1},{l:'I',w:1},{l:'O',w:1},{l:'P',w:1},{l:'+',w:1},
    {l:'*',w:1},{l:'↵',w:1.5},{l:'Inicio',w:1},
  ],
  [
    {l:'BloqM',w:1.75},{l:'A',w:1},{l:'S',w:1},{l:'D',w:1},{l:'F',w:1},{l:'G',w:1},
    {l:'H',w:1},{l:'J',w:1},{l:'K',w:1},{l:'L',w:1},{l:'Ñ',w:1},{l:'´',w:1},
    {l:'Ç',w:1},{l:'↩',w:1.25},{l:'FinPg',w:1},
  ],
  [
    {l:'⇧',w:1.25},{l:'<',w:1},{l:'Z',w:1},{l:'X',w:1},{l:'C',w:1},{l:'V',w:1},
    {l:'B',w:1},{l:'N',w:1},{l:'M',w:1},{l:',',w:1},{l:'.',w:1},{l:'-',w:1},
    {l:'⇧',w:1.75},{l:'↑',w:1},{l:'AvPg',w:1},
  ],
  [
    {l:'Ctrl',w:1.25},{l:'Fn',w:1},{l:'⊞',w:1},{l:'Alt',w:1.25},{l:'',w:4.5},
    {l:'AltGr',w:1.25},{l:'≡',w:1},{l:'Ctrl',w:1.25},{l:'←',w:1},{l:'↓',w:1},{l:'→',w:1},
  ],
];

// ─── Layout teclado numérico ──────────────────────────────────────────────────
const KB_NUM: Key[][] = [
  [{l:'BloqN',w:1},{l:'/',w:1},{l:'',w:1}],
  [{l:'7',w:1},{l:'8',w:1},{l:'9',w:1},{l:'-',w:1}],
  [{l:'4',w:1},{l:'5',w:1},{l:'6',w:1},{l:'+',w:1}],
  [{l:'1',w:1},{l:'2',w:1},{l:'3',w:1},{l:'↵',w:1}],
  [{l:'0',w:2},{l:'.',w:1},{l:'',w:1}],
];

// Ancho natural: main(16u) + gap + num(4u)
const KB_MAIN_W   = 16 * UNIT;
const KB_NUM_W    = 4  * UNIT;
const KB_GAP_W    = 10;
const KB_NATURAL_W = KB_MAIN_W + KB_GAP_W + KB_NUM_W;

// ─── KeyboardPreview ──────────────────────────────────────────────────────────
function KeyboardPreview({ color, effect }: { color: string; effect: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 20;
      setZoom(Math.min(1.05, Math.max(0.45, available / KB_NATURAL_W)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // La luz sale del borde y del texto — igual que en el teclado físico
  const keyStyle = (w: number) => ({
    width: `${w * UNIT}px`,
    borderColor: `rgba(${r},${g},${b},0.75)`,
    boxShadow: `
      0 0 6px rgba(${r},${g},${b},0.5),
      0 0 2px rgba(${r},${g},${b},0.8),
      inset 0 0 4px rgba(${r},${g},${b},0.1)
    `,
    color: `rgb(${r},${g},${b})`,
  });

  const renderSection = (rows: Key[][]) => (
    <div className="kb-section">
      {rows.map((row, ri) => (
        <div key={ri} className="kb-row">
          {row.map((key, ki) =>
            key.l === ''
              ? <div key={ki} className="kb-phantom" style={{ width: `${key.w * UNIT}px` }} />
              : <div key={ki} className="kb-key" style={keyStyle(key.w)}>
                  <span className="kb-key-label">{key.l}</span>
                </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className={`kb-container${effect !== null ? " kb-effect" : ""}`}>
      <div className="kb-inner" style={{ zoom }}>
        {renderSection(KB_MAIN)}
        <div style={{ width: `${KB_GAP_W}px`, flexShrink: 0 }} />
        {renderSection(KB_NUM)}
      </div>
    </div>
  );
}

// ─── FanGauge ─────────────────────────────────────────────────────────────────
function FanGauge({ rpm, maxRpm = 6000 }: { rpm: number; maxRpm?: number }) {
  const cx = 90, cy = 90, innerR = 67, outerR = 82, segments = 48;
  const active = Math.round((Math.min(rpm, maxRpm) / maxRpm) * segments);
  const spinDuration = rpm > 0 ? Math.max(0.4, 3 - (rpm / maxRpm) * 2.6) : 0;

  return (
    <svg
      className={`fan-svg${rpm > 0 ? " fan-spinning" : ""}`}
      width="176" height="176" viewBox="0 0 180 180"
    >
      <g style={{
        transformOrigin: "90px 90px",
        animation: spinDuration > 0 ? `fan-spin ${spinDuration}s linear infinite` : "none",
      }}>
        {Array.from({ length: segments }, (_, i) => {
          const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx + innerR * Math.cos(angle)}
              y1={cy + innerR * Math.sin(angle)}
              x2={cx + outerR * Math.cos(angle)}
              y2={cy + outerR * Math.sin(angle)}
              stroke={i < active ? "var(--accent-red)" : "#1e1e1e"}
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      <circle cx={cx} cy={cy} r="61" fill="#0a0a0a" />
      <circle cx={cx} cy={cy} r="61" fill="none" stroke="#1a1a1a" strokeWidth="1" />

      <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="25"
        fontWeight="800" fontFamily="Inter, sans-serif">
        {rpm}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#444" fontSize="10"
        fontWeight="700" letterSpacing="3" fontFamily="Inter, sans-serif">
        RPM
      </text>
    </svg>
  );
}

// ─── MonitorGraph ─────────────────────────────────────────────────────────────
function MonitorGraph({
  history, currentTemp, currentLoad, label,
}: {
  history: number[];
  currentTemp: number;
  currentLoad: number;
  label: string;
}) {
  const W = 400, H = 70;
  const maxVal = 100;
  const nonZero = history.filter(v => v > 0);
  const minVal = nonZero.length ? Math.min(...nonZero) : 0;
  const maxVal2 = nonZero.length ? Math.max(...nonZero) : 0;

  const pts = history.map((v, i) => {
    const x = (i / (HISTORY_LEN - 1)) * W;
    const y = H - (Math.min(v, maxVal) / maxVal) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const gradId = `grad-${label}`;

  return (
    <div className="monitor-row">
      <div className="monitor-header">
        <span className="monitor-label">{label}</span>
        <span className="monitor-range">
          {nonZero.length ? `Min: ${minVal}°  Max: ${maxVal2}°` : "Esperando datos…"}
        </span>
      </div>
      <div className="monitor-body">
        <svg className="monitor-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--accent-red)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`} />
          <polyline points={pts} fill="none" stroke="var(--accent-red)" strokeWidth="1.5" />
        </svg>
        <div className="monitor-vals">
          <span className="monitor-temp">{currentTemp}°</span>
          <span className="monitor-load">{currentLoad}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [fanMode, setFanMode] = useState("auto");
  const [customFanSpeed, setCustomFanSpeed] = useState(75);
  const [powerMode, setPowerMode] = useState("balance");
  const [systemModel, setSystemModel] = useState("Nitro AN515-57");

  const [cpuTemp, setCpuTemp] = useState(33);
  const [gpuTemp, setGpuTemp] = useState(28);
  const [cpuLoad] = useState(0);
  const [gpuLoad] = useState(0);
  const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(HISTORY_LEN).fill(0));
  const [gpuHistory, setGpuHistory] = useState<number[]>(new Array(HISTORY_LEN).fill(0));

  const [coolBoost, setCoolBoost] = useState(false);
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  const [rgbEffect, setRgbEffect] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("#ff0000");

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Toast: aparece 2.2s, sale con animación
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, removing: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
    }, 2200);
  };

  // Polling de temperaturas cada 2 s
  useEffect(() => {
    const fetchTemps = async () => {
      try {
        const cpu = await invoke<number>("get_cpu_temp");
        const gpu = await invoke<number>("get_gpu_temp");
        setCpuTemp(cpu);
        setGpuTemp(gpu);
        setCpuHistory(p => [...p.slice(1), cpu]);
        setGpuHistory(p => [...p.slice(1), gpu]);
      } catch (e) {
        console.error("Temperature fetch failed:", e);
      }
    };
    fetchTemps();
    const id = setInterval(fetchTemps, 2000);
    return () => clearInterval(id);
  }, []);

  // Restaurar estado al arrancar
  useEffect(() => {
    invoke("set_rgb_color", { r: 255, g: 0, b: 0 }).catch(console.error);
    invoke<string>("get_system_model").then(setSystemModel).catch(console.error);
    invoke<string>("get_power_mode").then(mode => {
      if (mode.includes("performance")) setPowerMode("performance");
      else if (mode.includes("power-saver")) setPowerMode("eco");
      else setPowerMode("balance");
    }).catch(console.error);

    const fm = localStorage.getItem("fanMode");
    const fs = localStorage.getItem("customFanSpeed");
    if (fs) setCustomFanSpeed(parseInt(fs, 10));
    if (fm) {
      setFanMode(fm);
      invoke("set_fan_mode", { mode: fm });
      invoke("set_fan_mode", { mode: fm, fanIndex: 1 }).catch(console.error);
      if (fm === "custom" && fs) {
        invoke("set_custom_fan_speed", { speed: parseInt(fs, 10) });
        invoke("set_custom_fan_speed", { speed: parseInt(fs, 10), fanIndex: 1 }).catch(console.error);
      }
    }

    const saved_cb = localStorage.getItem("coolBoost") === "true";
    setUseFahrenheit(localStorage.getItem("useFahrenheit") === "true");
    setCoolBoost(saved_cb);
    setAutoStart(localStorage.getItem("autoStart") === "true");

    // Sincronizar CoolBoost con el backend al arrancar
    invoke("set_cool_boost", { enable: saved_cb }).catch(console.error);
  }, []);

  const applyFanMode = (mode: string) => {
    setFanMode(mode);
    localStorage.setItem("fanMode", mode);
    invoke("set_fan_mode", { mode });
    invoke("set_fan_mode", { mode, fanIndex: 1 }).catch(console.error);
    const labels: Record<string, string> = { auto: "Auto", max: "Máximo", custom: "Personalizado" };
    showToast(`Ventilador: ${labels[mode]}`);
  };

  const applyPowerMode = (mode: string, label: string) => {
    setPowerMode(mode);
    invoke("set_power_mode", { mode: mode === "eco" ? "power-saver" : mode });
    showToast(`Plan de energía: ${label}`);
  };

  const toggleCoolBoost = () => {
    const v = !coolBoost;
    setCoolBoost(v);
    localStorage.setItem("coolBoost", String(v));
    invoke("set_cool_boost", { enable: v }).catch(console.error);
    showToast(`CoolBoost™ ${v ? "activado" : "desactivado"}`);
  };

  const applyRgbColor = (hex: string) => {
    setSelectedColor(hex);
    setRgbEffect(null);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    invoke("set_rgb_color", { r, g, b }).catch(console.error);
  };

  const getFanRPM = (temp: number, mode: string, isGpu: boolean) => {
    if (mode === "max") return isGpu ? 5500 : 6000;
    if (mode === "custom")
      return Math.round((customFanSpeed / 100) * (isGpu ? 5500 : 6000));
    // Auto: ambos ventiladores giran siempre; GPU tiene base menor y umbral más bajo
    const base = isGpu ? 1500 : 2200;
    const threshold = isGpu ? 40 : 45;
    return Math.min(
      Math.round(base + Math.max(0, temp - threshold) * 80),
      isGpu ? 5500 : 6000
    );
  };

  const display = (t: number) =>
    useFahrenheit ? Math.round((t * 9) / 5 + 32) : Math.round(t);
  const unit = useFahrenheit ? "°F" : "°C";

  const cpuRPM = getFanRPM(cpuTemp, fanMode, false);
  const gpuRPM = getFanRPM(gpuTemp, fanMode, true);

  const powerModes = [
    {
      mode: "eco", label: "Power Saver",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>,
    },
    {
      mode: "balance", label: "Equilibrio",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M3 7h18" /><path d="M6 7l-3 7s1 2 3 2 3-2 3-2l-3-7" /><path d="M18 7l-3 7s1 2 3 2 3-2 3-2l-3-7" /></svg>,
    },
    {
      mode: "performance", label: "High Performance",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
    },
  ];

  const colorPresets = [
    { hex: "#ff0000", label: "Rojo" },
    { hex: "#ff4400", label: "Naranja" },
    { hex: "#ffcc00", label: "Amarillo" },
    { hex: "#00ff00", label: "Verde" },
    { hex: "#00d2ff", label: "Cyan" },
    { hex: "#8800ff", label: "Violeta" },
    { hex: "#ff00ff", label: "Magenta" },
    { hex: "#ffffff", label: "Blanco" },
  ];

  const effects = [
    { mode: 2, speed: 3, label: "Neón" },
    { mode: 3, speed: 5, label: "Ola de Color" },
    { mode: 1, speed: 4, label: "Respiración" },
    { mode: 4, speed: 5, label: "Desplazamiento" },
  ];

  const settingsList = [
    {
      key: "coolboost",
      title: "CoolBoost™",
      desc: "Aumenta la velocidad máxima del ventilador en situaciones de carga extrema.",
      checked: coolBoost,
      onChange: (v: boolean) => {
        setCoolBoost(v);
        localStorage.setItem("coolBoost", String(v));
        invoke("set_cool_boost", { enable: v }).catch(console.error);
        showToast(`CoolBoost™ ${v ? "activado" : "desactivado"}`);
      },
    },
    {
      key: "fahrenheit",
      title: "Mostrar en Fahrenheit",
      desc: "Cambiar la unidad de temperatura de °C a °F.",
      checked: useFahrenheit,
      onChange: (v: boolean) => {
        setUseFahrenheit(v);
        localStorage.setItem("useFahrenheit", String(v));
      },
    },
    {
      key: "autostart",
      title: "Inicio Automático",
      desc: "Iniciar NitroSense automáticamente al encender el equipo.",
      checked: autoStart,
      onChange: (v: boolean) => {
        setAutoStart(v);
        localStorage.setItem("autoStart", String(v));
        invoke("toggle_autostart", { enable: v }).catch(console.error);
        showToast(`Inicio automático ${v ? "activado" : "desactivado"}`);
      },
    },
  ];

  return (
    <div className="app-root">
      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.removing ? "removing" : ""}`}>
            <span className="toast-dot" />
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <header className="ns-header">
        <div className="ns-acer-badge">
          {/* Logo NitroSense — llama oficial */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="white" aria-label="NitroSense">
            <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
          </svg>
        </div>
        <span className="ns-title">
          N&thinsp;I&thinsp;T&thinsp;R&thinsp;O&thinsp;S&thinsp;E&thinsp;N&thinsp;S&thinsp;E
        </span>
        <span className="ns-model">{systemModel}</span>
      </header>

      {/* ── Tabs ── */}
      <nav className="ns-tabs">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "lighting", label: "Iluminación RGB" },
          { id: "settings", label: "Ajustes" },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`ns-tab ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Dashboard ── */}
      {activeTab === "dashboard" && (
        <div className="ns-dashboard">
          {/* Panel izquierdo */}
          <aside className="ns-left">
            <section className="ns-section">
              <div className="ns-section-title">Fan Control</div>
              <div className="ns-fan-options">
                {[
                  { mode: "auto", label: "Auto" },
                  { mode: "max", label: "Max" },
                  { mode: "custom", label: "Custom" },
                ].map(({ mode, label }) => (
                  <div
                    key={mode}
                    className={`ns-fan-opt ${fanMode === mode ? "active" : ""}`}
                    onClick={() => applyFanMode(mode)}
                  >
                    <span className={`ns-radio ${fanMode === mode ? "active" : ""}`} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="2.5" fill={fanMode === mode ? "var(--accent-red)" : "#3a3a3a"} />
                      <path d="M12 9.5C10.5 7 8 5.5 6 6c0 2.5 1.5 5 3.5 6.5" stroke={fanMode === mode ? "var(--accent-red)" : "#3a3a3a"} strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M14.5 12C17 10.5 18.5 8 18 6c-2.5 0-5 1.5-6.5 3.5" stroke={fanMode === mode ? "var(--accent-red)" : "#3a3a3a"} strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9.5 14.5C8 17 8 20 10 21c1.5-2 2-5 1.5-7.5" stroke={fanMode === mode ? "var(--accent-red)" : "#3a3a3a"} strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="ns-fan-label">{label}</span>
                  </div>
                ))}
              </div>
              {fanMode === "custom" && (
                <div className="ns-custom-speed">
                  <input
                    type="range" min="0" max="100" value={customFanSpeed}
                    className="ns-slider"
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      setCustomFanSpeed(v);
                      localStorage.setItem("customFanSpeed", v.toString());
                      invoke("set_custom_fan_speed", { speed: v });
                      invoke("set_custom_fan_speed", { speed: v, fanIndex: 1 }).catch(console.error);
                    }}
                  />
                  <span className="ns-speed-val">{customFanSpeed}%</span>
                </div>
              )}
            </section>

            <section className="ns-section">
              <div className="ns-section-title">Power Plan</div>
              <div className="ns-power-opts">
                {powerModes.map(({ mode, label, icon }) => (
                  <div
                    key={mode}
                    className={`ns-power-opt ${powerMode === mode ? "active" : ""}`}
                    onClick={() => applyPowerMode(mode, label)}
                  >
                    <span className="ns-power-icon">{icon}</span>
                    <span className="ns-power-label">{label}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* Contenido derecho */}
          <div className="ns-right">
            <div className="ns-coolboost-row">
              <span className="ns-coolboost-badge" onClick={toggleCoolBoost}>
                CoolBoost™
                <span className={`ns-coolboost-dot ${coolBoost ? "active" : ""}`} />
              </span>
            </div>

            <div className="ns-gauges">
              <span className="ns-gauge-label">
                CPU
                <span className="ns-temp-sub">{display(cpuTemp)}{unit}</span>
              </span>
              <FanGauge rpm={cpuRPM} />
              <FanGauge rpm={gpuRPM} />
              <span className="ns-gauge-label">
                GPU
                <span className="ns-temp-sub">{display(gpuTemp)}{unit}</span>
              </span>
            </div>

            <div className="ns-monitoring">
              <div className="ns-monitor-header">
                <span className="ns-section-title" style={{ marginBottom: 0 }}>
                  Monitoring
                </span>
                <span className="ns-monitor-subtitle">
                  Temperature (°C) / Loading (%)
                </span>
              </div>
              <MonitorGraph
                history={cpuHistory}
                currentTemp={display(cpuTemp)}
                currentLoad={cpuLoad}
                label="CPU"
              />
              <MonitorGraph
                history={gpuHistory}
                currentTemp={display(gpuTemp)}
                currentLoad={gpuLoad}
                label="GPU"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── RGB Lighting ── */}
      {activeTab === "lighting" && (
        <div className="ns-tab-content">
          <div className="ns-rgb-layout">
            {/* Controles */}
            <div className="ns-rgb-controls">
              <div className="ns-panel">
                <div className="ns-panel-title">Color Estático</div>
                <div className="ns-color-presets">
                  {colorPresets.map(({ hex, label }) => (
                    <div
                      key={hex}
                      className={`ns-color-swatch ${selectedColor === hex && rgbEffect === null ? "active" : ""}`}
                      style={{
                        background: hex,
                        boxShadow:
                          selectedColor === hex && rgbEffect === null
                            ? `0 0 14px ${hex}88`
                            : "none",
                      }}
                      onClick={() => applyRgbColor(hex)}
                      title={label}
                    />
                  ))}
                  <input
                    type="color"
                    className="ns-color-picker"
                    value={selectedColor}
                    onChange={e => applyRgbColor(e.target.value)}
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div className="ns-panel">
                <div className="ns-panel-title">Efectos Dinámicos</div>
                <div className="ns-effects">
                  {effects.map(({ mode, speed, label }) => (
                    <button
                      key={mode}
                      className={`ns-effect-btn ${rgbEffect === mode ? "active" : ""}`}
                      onClick={() => {
                        const next = rgbEffect === mode ? null : mode;
                        setRgbEffect(next);
                        if (next !== null) {
                          invoke("set_rgb_effect", { mode, speed }).catch(console.error);
                          showToast(`Efecto: ${label}`);
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview del teclado */}
            <div className="ns-panel ns-kb-panel">
              <div className="ns-panel-title">
                Vista Previa del Teclado
                {rgbEffect !== null && (
                  <span className="ns-effect-badge">
                    {effects.find(e => e.mode === rgbEffect)?.label}
                  </span>
                )}
              </div>
              <KeyboardPreview color={selectedColor} effect={rgbEffect} />
            </div>
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      {activeTab === "settings" && (
        <div className="ns-tab-content">
          <div className="ns-section-title" style={{ marginBottom: "16px" }}>
            Ajustes del Sistema
          </div>
          <div className="ns-settings-list">
            {settingsList.map(({ key, title, desc, checked, onChange }) => (
              <div key={key} className="ns-setting-row">
                <div>
                  <div className="ns-setting-title">{title}</div>
                  <div className="ns-setting-desc">{desc}</div>
                </div>
                <label className="ns-switch">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                  />
                  <span className="ns-switch-track" />
                </label>
              </div>
            ))}
          </div>
          <div className="ns-version">
            NitroSense for Linux v1.0.0 · Backend: Facer (RGB) &amp; NBFC-Linux (Fans)
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
