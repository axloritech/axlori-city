"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import CityMap from "@/components/ui/CityMap";
import PhonePanel from "@/components/ui/PhonePanel";
import { SHOP_ITEMS } from "@/game/inventory/InventorySystem";
import { JOB_DEFINITIONS } from "@/game/jobs/JobSystem";
import { FURNITURE_CATALOG } from "@/game/furniture/FurnitureSystem";
import { PROPERTIES_FOR_SALE, STARTER_PROPERTY } from "@/game/properties/PropertySystem";
import type { GameCommand, GameCommandApi, GameUiState, PanelName } from "@/game/types";
import { LANDMARKS } from "@/game/world/landmarks";

const fmt = (amount: number) => `₦${Math.max(0, Math.floor(amount)).toLocaleString("en-NG")}`;

const INITIAL_STATE: GameUiState = {
  ready: false,
  playerName: "Kamsi Okoro",
  money: 10_000,
  health: 100,
  energy: 68,
  job: "No active job",
  jobDetail: "Find a workplace or check your phone for a paid shift.",
  jobProgress: null,
  time: "--:-- --",
  timeOfDay: "Afternoon",
  location: "North Grove",
  prompt: "",
  insideHouse: false,
  houseName: "Amara Court · Flat 2B",
  ownsHouse: true,
  ownsVehicle: true,
  driving: false,
  inventory: {},
  player: { x: 360, y: 330 },
  jobTarget: null,
  panel: null,
  toast: "",
  weather: "sunny",
  napRemainingMs: null,
  contextId: null,
  ownedPropertyIds: [],
  furnitureOwned: {},
  placedFurniture: [],
  placementMode: false,
  selectedFurnitureId: null,
  companies: [],
  investments: {},
  demoGrantClaimed: false,
  netWorth: 8_310_000,
  transactions: [],
};

const WEATHER_LABEL: Record<GameUiState["weather"], string> = { sunny: "SUNNY", cloudy: "CLOUDY", rain: "RAIN" };

export default function GameShell() {
  const [hud, setHud] = useState<GameUiState>(INITIAL_STATE);
  const [api, setApi] = useState<GameCommandApi | null>(null);
  const [error, setError] = useState("");
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [hintsOn, setHintsOn] = useState(true);
  const [zoom, setZoom] = useState(1.15);
  const apiRef = useRef<GameCommandApi | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const napDeadlineRef = useRef<number | null>(null);
  const [napNow, setNapNow] = useState(() => Date.now());
  const isNapping = hud.napRemainingMs !== null;

  useEffect(() => {
    if (!isNapping) {
      napDeadlineRef.current = null;
      return;
    }
    if (napDeadlineRef.current === null && hud.napRemainingMs !== null) {
      napDeadlineRef.current = Date.now() + hud.napRemainingMs;
    }
    setNapNow(Date.now());
    const interval = window.setInterval(() => setNapNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [isNapping]);

  const onState = useCallback((state: GameUiState) => setHud(state), []);
  const onApi = useCallback((nextApi: GameCommandApi | null) => {
    apiRef.current = nextApi;
    setApi(nextApi);
  }, []);
  const onError = useCallback((message: string) => setError(message), []);
  const command = useCallback((value: GameCommand) => apiRef.current?.command(value), []);

  const setVirtualStick = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = stickRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const cx = bounds.left + bounds.width / 2;
    const cy = bounds.top + bounds.height / 2;
    const maxRadius = bounds.width * 0.34;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const length = Math.hypot(dx, dy);
    const scale = length > maxRadius ? maxRadius / length : 1;
    const x = Math.max(-1, Math.min(1, (dx * scale) / maxRadius));
    const y = Math.max(-1, Math.min(1, (dy * scale) / maxRadius));
    setStick({ x, y });
    apiRef.current?.move(x, y);
  };
  const resetStick = () => {
    draggingRef.current = false;
    setStick({ x: 0, y: 0 });
    apiRef.current?.move(0, 0);
  };
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setVirtualStick(event);
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) setVirtualStick(event);
  };

  const openPanel = (panel: PanelName | null) => command({ type: "set-panel", panel });
  const ownedIds = new Set(hud.ownedPropertyIds);
  const propertyContext = hud.contextId ? PROPERTIES_FOR_SALE.find((property) => property.id === hud.contextId) : undefined;
  const napRemaining = !isNapping ? null : napDeadlineRef.current === null ? hud.napRemainingMs ?? 0 : Math.max(0, napDeadlineRef.current - napNow);
  const napSeconds = napRemaining === null ? 0 : Math.ceil(napRemaining / 1_000);
  const napProgress = napRemaining === null ? 0 : 100 - (napRemaining / 15_000) * 100;

  return (
    <main className="game-shell">
      <GameCanvas onState={onState} onApi={onApi} onError={onError} />
      <div className="game-vignette" aria-hidden="true" />

      <div className="game-hud">
        <header className="hud-top-row">
          <div className="hud-brand-cluster">
            <button className="brand-badge" onClick={() => openPanel("menu")} aria-label="Open game menu">
              <span className="brand-mark"><i /><i /><i /><i /></span>
              <span className="brand-copy"><strong>AXLORI</strong><small>{hud.playerName.toUpperCase()} · RESIDENT</small></span>
            </button>
            <div className="hud-quick-actions">
              <button className="quick-action" onClick={() => openPanel("menu")} aria-label="Game menu"><span>☰</span><b>MENU</b></button>
              <button className="quick-action" onClick={() => openPanel("phone")} aria-label="Open in-game phone"><span>▯</span><b>PHONE</b></button>
              <button className="quick-action map-quick" onClick={() => openPanel("map")} aria-label="Open city map"><span>⌖</span><b>MAP</b></button>
            </div>
          </div>

          <div className="hud-status-cluster">
            <div className="hud-time-chip"><span className="time-orb">◷</span><div><strong>{hud.time}</strong><small>{hud.timeOfDay.toUpperCase()}</small></div></div>
            <div className={`hud-weather-chip weather-${hud.weather}`}><span>{hud.weather === "rain" ? "☂" : hud.weather === "cloudy" ? "☁" : "☀"}</span><b>{WEATHER_LABEL[hud.weather]}</b></div>
            <div className="hud-money-chip"><span>₦</span><div><small>CASH</small><strong>{fmt(hud.money)}</strong></div></div>
            <button className="hud-profile-chip" onClick={() => openPanel("character")} aria-label="Open character profile"><span className="avatar-pixel">K</span><span><b>{hud.playerName.split(" ")[0]}</b><small>RESIDENT</small></span></button>
          </div>
        </header>

        <div className="hud-left-stack">
          <div className="hud-location"><span className="location-pin">⌖</span><span><small>YOU ARE IN</small><strong>{hud.location}</strong></span></div>
          <button className="hud-job-card" onClick={() => openPanel("phone")} aria-label="Open current job in phone">
            <span className="job-card-top"><span className="job-pulse" />{hud.job === "No active job" ? "CITY LIFE" : "CURRENT SHIFT"}<span className="job-card-arrow">↗</span></span>
            <strong>{hud.job === "No active job" ? "Make your own day" : hud.job}</strong>
            <small>{hud.job === "No active job" ? "Tap to browse the Jobs app" : hud.jobDetail}</small>
            {hud.jobProgress !== null && <span className="job-progress-track"><i style={{ width: `${hud.jobProgress}%` }} /></span>}
          </button>
        </div>

        <div className="hud-health-panel">
          <div className="health-line"><span className="health-icon">♥</span><div className="meter-copy"><small>HEALTH</small><strong>{hud.health}%</strong></div><div className="meter-track health-track"><i style={{ width: `${hud.health}%` }} /></div></div>
          <div className="health-line"><span className="energy-icon">✦</span><div className="meter-copy"><small>ENERGY</small><strong>{hud.energy}%</strong></div><div className="meter-track energy-track"><i style={{ width: `${hud.energy}%` }} /></div></div>
        </div>

        <div className="hud-map-card">
          <div className="map-card-head"><span><i /> DISTRICT MAP</span><button onClick={() => openPanel("map")} aria-label="Expand city map">↗</button></div>
          <button className="map-graphic-button" onClick={() => openPanel("map")} aria-label="Open full map"><CityMap player={hud.player} target={hud.jobTarget} /></button>
          <div className="map-card-foot"><span><i className="legend-player" />YOU</span><span><i className="legend-shop" />SPOTS</span><b>{hud.jobTarget ? "ROUTE SET" : "NEMBE WARD"}</b></div>
        </div>

        <div className="hud-controls-tip"><span className="keyboard-key">W</span><span className="keyboard-key">A</span><span className="keyboard-key">S</span><span className="keyboard-key">D</span><div><b>WALK</b><small>Arrows also work</small></div><span className="controls-divider" /><span className="keyboard-key key-e">E</span><div><b>INTERACT</b><small>Explore nearby</small></div><span className="keyboard-key key-phone">P</span><div><b>PHONE</b><small>Open apps</small></div></div>

        {hud.insideHouse && !hud.panel && !hud.napRemainingMs && (
          <div className="inside-house-chip"><span>⌂</span><div><b>{hud.houseName}</b><small>OWNED BY YOU · HOME INTERIOR</small></div><button onClick={() => openPanel("furniture")}>FURNISH</button></div>
        )}

        {hud.placementMode && hud.insideHouse && !hud.panel && (
          <div className="placement-tools"><span>MOVE MODE · TAP A SPOT IN THE ROOM</span><button onClick={() => command({ type: "rotate-furniture" })} disabled={!hud.selectedFurnitureId}>ROTATE ↻</button><button onClick={() => command({ type: "remove-furniture" })} disabled={!hud.selectedFurnitureId}>REMOVE</button><button className="cancel-placement" onClick={() => command({ type: "cancel-furniture" })}>CANCEL</button></div>
        )}

        {hud.prompt && !hud.panel && !hud.napRemainingMs && (
          <button className="interaction-prompt" onClick={() => command({ type: "interact" })}>
            <span className="prompt-key">{hud.insideHouse ? "E" : "E"}</span><span>{hud.prompt.replace(/^Press E · /, "")}</span><b className="prompt-tap">TAP TO ACT</b>
          </button>
        )}

        <div className="hud-toast-stack" aria-live="polite">
          {hud.toast && <div className="game-toast"><span>✦</span>{hud.toast}</div>}
          {!hud.ready && !error && <div className="game-toast loading-toast"><span className="loading-dot" />Loading the district…</div>}
          {error && <div className="game-toast error-toast"><span>!</span>Game could not load: {error}</div>}
        </div>

        <div className="virtual-stick-wrap">
          <div
            ref={stickRef}
            className="virtual-stick"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={resetStick}
            onPointerCancel={resetStick}
            onLostPointerCapture={resetStick}
            aria-label="Virtual movement joystick"
          >
            <span className="stick-direction stick-up" /><span className="stick-direction stick-down" /><span className="stick-direction stick-left" /><span className="stick-direction stick-right" />
            <span className="stick-nub" style={{ transform: `translate(calc(-50% + ${stick.x * 31}px), calc(-50% + ${stick.y * 31}px))` }} />
          </div>
          <span className="stick-label">MOVE</span>
        </div>

        <div className="mobile-action-stack">
          {hud.insideHouse && <button className="mobile-furnish-button" onClick={() => openPanel("furniture")}>⌂ FURNISH</button>}
          {hud.prompt && <button className="mobile-interact-button" onClick={() => command({ type: "interact" })}><span>✦</span>INTERACT</button>}
          <button className="mobile-phone-button" onClick={() => openPanel("phone")}><span>▯</span>PHONE</button>
        </div>

        {hud.napRemainingMs !== null && (
          <div className="nap-overlay">
            <div className="nap-card"><span className="nap-moon">☾</span><small>AMARA COURT · REST</small><h2>Taking a nap…</h2><p>Phone and movement are resting with you.</p><strong>{napSeconds}</strong><span className="nap-seconds-label">SECONDS REMAINING</span><div className="nap-progress"><i style={{ width: `${napProgress}%` }} /></div><span className="nap-rest-note">A good rest restores your energy.</span></div>
          </div>
        )}
      </div>

      {hud.panel === "phone" && api && <PhonePanel state={hud} api={api} />}
      {hud.panel && hud.panel !== "phone" && (
        <GamePanel
          panel={hud.panel}
          state={hud}
          api={api}
          property={propertyContext}
          ownedIds={ownedIds}
          hintsOn={hintsOn}
          zoom={zoom}
          setHintsOn={setHintsOn}
          setZoom={setZoom}
          openPanel={openPanel}
        />
      )}
    </main>
  );
}

type GamePanelProps = {
  panel: Exclude<PanelName, "phone">;
  state: GameUiState;
  api: GameCommandApi | null;
  property?: (typeof PROPERTIES_FOR_SALE)[number];
  ownedIds: Set<string>;
  hintsOn: boolean;
  zoom: number;
  setHintsOn: (value: boolean) => void;
  setZoom: (value: number) => void;
  openPanel: (panel: PanelName | null) => void;
};

function GamePanel({ panel, state, api, property, ownedIds, hintsOn, zoom, setHintsOn, setZoom, openPanel }: GamePanelProps) {
  const send = (command: GameCommand) => api?.command(command);
  const close = () => openPanel(null);
  const title: Record<Exclude<PanelName, "phone">, string> = {
    menu: "City Menu", map: "District Map", inventory: "Your Bag", character: "Resident Profile", settings: "Game Settings", shop: "Neighbourhood Shop", bank: "Community Bank", property: property?.name ?? "House for Sale", furniture: "Home Furnishing", nap: "Take a Nap",
  };

  return (
    <div className="panel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={`game-panel ${panel === "menu" ? "menu-panel" : ""}`} aria-label={title[panel]}>
        <header className="game-panel-header"><div className="panel-heading-mark">{panel === "map" ? "⌖" : panel === "furniture" ? "⌂" : panel === "nap" ? "☾" : "✦"}</div><div><span>AXLORI CITY · {panel === "menu" ? "PAUSED" : "LIVE SYSTEM"}</span><h2>{title[panel]}</h2></div><button className="panel-close" onClick={close} aria-label="Close panel">×</button></header>
        {state.toast && <div className="panel-toast"><span>✦</span>{state.toast}</div>}
        <div className="game-panel-content">
          {panel === "menu" && <MenuPanel openPanel={openPanel} send={send} />}
          {panel === "map" && <MapPanel state={state} />}
          {panel === "inventory" && <InventoryPanel state={state} send={send} />}
          {panel === "character" && <CharacterPanel state={state} />}
          {panel === "settings" && <SettingsPanel hintsOn={hintsOn} zoom={zoom} setHintsOn={setHintsOn} setZoom={setZoom} send={send} />}
          {panel === "shop" && <ShopPanel state={state} send={send} />}
          {panel === "bank" && <BankPanel state={state} openPhone={() => openPanel("phone")} />}
          {panel === "property" && <PropertyPanel property={property} state={state} ownedIds={ownedIds} send={send} />}
          {panel === "furniture" && <FurniturePanel state={state} send={send} />}
          {panel === "nap" && <NapPanel state={state} send={send} close={close} />}
        </div>
      </section>
    </div>
  );
}

function MenuPanel({ openPanel, send }: { openPanel: (panel: PanelName | null) => void; send: (command: GameCommand) => void }) {
  const actions: Array<{ icon: string; label: string; detail: string; action: () => void }> = [
    { icon: "▶", label: "Resume", detail: "Back to the street", action: () => openPanel(null) },
    { icon: "⌖", label: "Map", detail: "District & routes", action: () => openPanel("map") },
    { icon: "▣", label: "Inventory", detail: "Items in your bag", action: () => openPanel("inventory") },
    { icon: "◉", label: "Character", detail: "Resident profile", action: () => openPanel("character") },
    { icon: "⚙", label: "Settings", detail: "Controls & view", action: () => openPanel("settings") },
    { icon: "▣", label: "Save Game", detail: "Store progress here", action: () => send({ type: "save" }) },
  ];
  return <>
    <div className="menu-resume-banner"><div><span>PAUSED ON UMU ILA WAY</span><strong>Take your time, Kamsi.</strong></div><span className="menu-pause-symbol">Ⅱ</span></div>
    <div className="menu-action-grid">{actions.map((action) => <button className="menu-action" key={action.label} onClick={action.action}><span>{action.icon}</span><div><b>{action.label}</b><small>{action.detail}</small></div><i>›</i></button>)}</div>
    <div className="panel-footnote">Local save · Browser storage · No account needed</div>
  </>;
}

function MapPanel({ state }: { state: GameUiState }) {
  return <div className="expanded-map-layout"><div className="expanded-map"><CityMap player={state.player} target={state.jobTarget} large /></div><div className="map-detail-column"><div className="panel-stat-card"><span>YOUR LOCATION</span><strong>{state.location}</strong><small>{Math.round(state.player.x)} / {Math.round(state.player.y)} district grid</small></div><div className="panel-stat-card"><span>ACTIVE ROUTE</span><strong>{state.job === "No active job" ? "No route set" : state.job}</strong><small>{state.jobDetail}</small></div><div className="map-legend"><b>IMPORTANT PLACES</b>{LANDMARKS.slice(0, 9).map((landmark) => <span key={landmark.id}><i className={`map-legend-dot kind-${landmark.kind}`} />{landmark.name}</span>)}</div></div></div>;
}

function InventoryPanel({ state, send }: { state: GameUiState; send: (command: GameCommand) => void }) {
  const entries = SHOP_ITEMS.filter((item) => (state.inventory[item.id] ?? 0) > 0);
  return <>
    <div className="inventory-summary"><span>POCKET CASH</span><b>{fmt(state.money)}</b><small>{entries.reduce((sum, item) => sum + (state.inventory[item.id] ?? 0), 0)} items in your bag</small></div>
    {entries.length === 0 ? <div className="empty-inventory"><span>▱</span><b>Your bag is light.</b><p>Visit Alao Market or Uju's Corner Shop to pick up snacks and useful bits.</p></div> : <div className="inventory-grid">{entries.map((item) => <article className="inventory-item" key={item.id}><span className="item-glyph">{item.emoji}</span><div><b>{item.name}</b><small>{item.description}</small></div><strong>×{state.inventory[item.id]}</strong><button onClick={() => send({ type: "use-item", itemId: item.id })}>USE</button></article>)}</div>}
  </>;
}

function CharacterPanel({ state }: { state: GameUiState }) {
  return <div className="character-panel"><div className="character-art"><span className="character-avatar-large">K</span><div><span>AXLORI RESIDENT</span><h3>{state.playerName}</h3><small>New to the district · Looking for a story</small></div></div><div className="character-stat-grid"><div><span>HEALTH</span><b>{state.health}%</b><i><em style={{ width: `${state.health}%` }} /></i></div><div><span>ENERGY</span><b>{state.energy}%</b><i><em className="energy-fill" style={{ width: `${state.energy}%` }} /></i></div><div><span>WALLET</span><b>{fmt(state.money)}</b><small>Virtual Naira</small></div><div><span>NET WORTH</span><b>{fmt(state.netWorth)}</b><small>Local asset estimate</small></div></div><div className="character-note"><span>✦</span><p>Walk the market lanes, meet neighbours, take a paid route, or make your first home feel like yours.</p></div></div>;
}

function SettingsPanel({ hintsOn, zoom, setHintsOn, setZoom, send }: { hintsOn: boolean; zoom: number; setHintsOn: (value: boolean) => void; setZoom: (value: number) => void; send: (command: GameCommand) => void }) {
  const updateZoom = (value: number) => { setZoom(value); send({ type: "camera-zoom", zoom: value }); };
  const updateHints = () => { const next = !hintsOn; setHintsOn(next); send({ type: "set-hints", enabled: next }); };
  return <div className="settings-list"><div className="settings-row"><div><b>Interaction hints</b><small>Show prompts when you approach people and places.</small></div><button className={`toggle-switch ${hintsOn ? "on" : ""}`} onClick={updateHints} aria-pressed={hintsOn}><i /></button></div><div className="settings-row zoom-setting"><div><b>Camera zoom</b><small>Change how much of Axlori you can see.</small></div><strong>{zoom.toFixed(1)}×</strong><input aria-label="Camera zoom" type="range" min="0.9" max="1.45" step="0.05" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} /></div><div className="settings-row"><div><b>Mobile controls</b><small>Virtual joystick and interact button appear on touch screens.</small></div><span className="settings-fixed-tag">AUTO</span></div><div className="settings-row"><div><b>Clock & weather</b><small>Clock follows your device's local time. Weather is randomized demo data.</small></div><span className="settings-fixed-tag">DEVICE</span></div><div className="panel-footnote">Your settings apply immediately. Progress is saved in this browser.</div></div>;
}

function ShopPanel({ state, send }: { state: GameUiState; send: (command: GameCommand) => void }) {
  return <>
    <div className="shop-banner"><span>MARKET STALL · FICTIONAL GOODS</span><b>{fmt(state.money)} <small>cash</small></b></div>
    <div className="shop-items-grid">{SHOP_ITEMS.map((item) => <article className="shop-item-card" key={item.id}><span className="shop-item-emoji">{item.emoji}</span><span className="shop-item-count">BAG ×{state.inventory[item.id] ?? 0}</span><h3>{item.name}</h3><p>{item.description}</p><div className="shop-item-footer"><b>{fmt(item.price)}</b><button disabled={state.money < item.price} onClick={() => send({ type: "buy-item", itemId: item.id })}>{state.money < item.price ? "LOW CASH" : "BUY"}</button></div></article>)}</div>
    <div className="work-shift-card"><span className="shift-icon">▦</span><div><b>Need a paid shift?</b><small>Help the Alao Market stallholders for 20 seconds and earn ₦1,750.</small></div><button disabled={state.job !== "No active job"} onClick={() => send({ type: "start-job", jobId: "shop" })}>{state.job !== "No active job" ? "BUSY" : "WORK SHIFT"}</button></div>
  </>;
}

function BankPanel({ state, openPhone }: { state: GameUiState; openPhone: () => void }) {
  return <div className="bank-panel"><div className="bank-hero"><span>OGBONNA COMMUNITY BANK</span><b>₦</b><h3>{fmt(state.money)}</h3><small>Available cash · in-game only</small></div><div className="bank-info"><span>LOCAL ACCOUNT</span><p>The first demo uses one cash wallet. There is no separate deposit account, online banking, or real-money connection.</p></div><button className="panel-primary-cta" onClick={openPhone}>OPEN MONEY APP <span>↗</span></button><div className="panel-footnote">Your cash is stored only in this browser's local save.</div></div>;
}

function PropertyPanel({ property, state, ownedIds, send }: { property?: (typeof PROPERTIES_FOR_SALE)[number]; state: GameUiState; ownedIds: Set<string>; send: (command: GameCommand) => void }) {
  if (!property) return <div className="empty-inventory"><b>Property listing not found.</b><p>Walk up to a marked house for sale to open its details.</p></div>;
  const owned = ownedIds.has(property.id);
  return <div className="property-detail-panel"><div className="property-house-art"><span>⌂</span><small>AXLORI PROPERTY BOARD</small></div><span className={`property-status ${owned ? "owned" : "for-sale"}`}>{owned ? "OWNED BY YOU" : "HOUSE FOR SALE"}</span><h3>{property.name}</h3><p className="property-location">⌖ {property.location}</p><p className="property-description">{property.description}</p><div className="property-finance"><span>{owned ? "ESTIMATED VALUE" : "ASKING PRICE"}<b>{fmt(owned ? property.value : property.price)}</b></span><span>YOUR CASH<b>{fmt(state.money)}</b></span></div>{owned ? <button className="panel-primary-cta" onClick={() => send({ type: "enter-property", propertyId: property.id })}>ENTER YOUR HOUSE <span>↗</span></button> : <button className="panel-primary-cta" disabled={state.money < property.price} onClick={() => send({ type: "buy-property", propertyId: property.id })}>{state.money < property.price ? `NEED ${fmt(property.price - state.money)} MORE` : `BUY HOUSE · ${fmt(property.price)}`} <span>⌂</span></button>}<div className="panel-footnote">Paid with virtual Naira only. Ownership is saved locally on this device.</div></div>;
}

function FurniturePanel({ state, send }: { state: GameUiState; send: (command: GameCommand) => void }) {
  return <div className="furniture-panel-content"><div className="furniture-intro"><span>HOME · {state.houseName}</span><p>Buy furniture with your cash, then tap a clear spot on the floor to place it. Select a placed item to move or rotate it.</p></div><div className="furniture-catalog-grid">{FURNITURE_CATALOG.map((item) => { const inBag = (state.furnitureOwned[item.id] ?? 0) > 0; return <article className="furniture-shop-card" key={item.id}><span className="furniture-icon">{item.icon}</span><div className="furniture-item-copy"><b>{item.name}</b><small>{item.description}</small><span>{fmt(item.price)} · BAG ×{state.furnitureOwned[item.id] ?? 0}</span></div><button disabled={!inBag && state.money < item.price} onClick={() => send({ type: inBag ? "place-furniture" : "buy-furniture", itemId: item.id })}>{inBag ? "PLACE FROM BAG" : state.money < item.price ? "LOW CASH" : "BUY & PLACE"}</button></article>; })}</div><div className="placed-furniture-list"><div className="phone-section-heading compact-heading"><div><span>IN THIS ROOM</span><h3>Placed furniture</h3></div><span className="phone-live-tag">{state.placedFurniture.length} ITEMS</span></div>{state.placedFurniture.map((placed) => { const def = FURNITURE_CATALOG.find((item) => item.id === placed.itemId); return <div className="placed-furniture-row" key={placed.instanceId}><span className="placed-furniture-icon">{def?.icon ?? "▣"}</span><div><b>{def?.name ?? placed.itemId}</b><small>Position {placed.x}, {placed.y} · rotated {placed.rotation}°</small></div>{state.selectedFurnitureId === placed.instanceId ? <span className="selected-furniture-tag">SELECTED</span> : <button onClick={() => send({ type: "move-furniture", instanceId: placed.instanceId })}>MOVE</button>}</div>; })}</div><div className="furniture-note"><span>✦</span> Your starter apartment includes a bed for naps. Furniture and room layout save on this device.</div></div>;
}

function NapPanel({ state, send, close }: { state: GameUiState; send: (command: GameCommand) => void; close: () => void }) {
  return <div className="nap-choice-panel"><div className="nap-choice-icon">☾</div><span>REST AT HOME</span><h3>Take a nap?</h3><p>Settle into your bed for 15 seconds. Movement, phone and normal actions pause while you rest. Your energy returns to 100% when you wake.</p><div className="nap-choice-facts"><span><b>15 sec</b><small>REAL-TIME REST</small></span><span><b>+100%</b><small>ENERGY RESTORED</small></span></div><button className="panel-primary-cta" onClick={() => send({ type: "start-nap" })}>TAKE A NAP <span>☾</span></button><button className="panel-secondary-cta" onClick={close}>NOT NOW</button></div>;
}
