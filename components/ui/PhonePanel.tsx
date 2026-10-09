"use client";

import { useState, type FormEvent } from "react";
import type { GameCommandApi, GameUiState } from "@/game/types";
import { JOB_DEFINITIONS } from "@/game/jobs/JobSystem";
import { SHOP_ITEMS } from "@/game/inventory/InventorySystem";
import { PROPERTIES_FOR_SALE, STARTER_PROPERTY } from "@/game/properties/PropertySystem";
import { COMPANY_LOCATIONS, COMPANY_REGISTRATION_COST, COMPANIES_FOR_SALE, BUSINESS_TYPES } from "@/game/companies/CompanySystem";
import { INVESTMENTS } from "@/game/investments/InvestmentSystem";

type AppId = "money" | "jobs" | "investments" | "cars" | "properties" | "companies" | "forbes";

type Props = {
  state: GameUiState;
  api: GameCommandApi;
};

const APPS: Array<{ id: AppId; name: string; icon: string; color: string; description: string }> = [
  { id: "money", name: "Money", icon: "₦", color: "#b56a2c", description: "Cash & activity" },
  { id: "jobs", name: "Jobs", icon: "↗", color: "#535c65", description: "Find a shift" },
  { id: "investments", name: "Invest", icon: "▥", color: "#4d6267", description: "Demo portfolio" },
  { id: "cars", name: "My Cars", icon: "▰", color: "#654a39", description: "Your garage" },
  { id: "properties", name: "Properties", icon: "⌂", color: "#60594f", description: "Homes & listings" },
  { id: "companies", name: "Companies", icon: "▦", color: "#594f5b", description: "Build a business" },
  { id: "forbes", name: "Axlori Forbes", icon: "✦", color: "#78623c", description: "Local wealth list" },
];

const money = (amount: number) => `₦${Math.max(0, Math.floor(amount)).toLocaleString("en-NG")}`;

export default function PhonePanel({ state, api }: Props) {
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [companyView, setCompanyView] = useState<"home" | "create" | "market">("home");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [companyLocation, setCompanyLocation] = useState(COMPANY_LOCATIONS[0]);

  const close = () => api.command({ type: "set-panel", panel: null });
  const back = () => {
    if (activeApp === "companies" && companyView !== "home") {
      setCompanyView("home");
      return;
    }
    setActiveApp(null);
  };
  const ownedPropertyIds = new Set(state.ownedPropertyIds);
  const ownedCompanies = state.companies;

  const submitCompany = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    api.command({ type: "create-company", name: companyName, businessType, location: companyLocation });
  };

  return (
    <div className="phone-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="phone-shell" aria-label="Axlori City smartphone">
        <div className="phone-notch"><span /></div>
        <div className="phone-statusbar">
          <span>{state.time}</span>
          <span className="phone-status-right"><span>AXLORI</span><span className="signal-bars"><i /><i /><i /><i /></span><span>▰</span></span>
        </div>
        <div className="phone-app-area">
          <header className="phone-header">
            <button className="phone-back-button" onClick={back} aria-label={activeApp ? "Back" : "Close phone"}>
              {activeApp ? "‹" : "×"}
            </button>
            <div className="phone-title-block">
              <p className="phone-eyebrow">AXLORI CITY · DEVICE</p>
              <h2>{activeApp ? APPS.find((app) => app.id === activeApp)?.name : "Axlori OS"}</h2>
            </div>
            <button className="phone-close-button" onClick={close}>DONE</button>
          </header>
          {state.toast && <div className="phone-toast-notice"><span>✦</span>{state.toast}</div>}

          {!activeApp && (
            <div className="phone-home-view">
              <div className="phone-greeting">
                <span className="phone-weather-dot" />
                <div><span>{state.timeOfDay} in Axlori</span><strong>{state.playerName}</strong></div>
                <span className="phone-money-pill">{money(state.money)}</span>
              </div>
              <div className="phone-app-grid">
                {APPS.map((app) => (
                  <button key={app.id} className="phone-app-tile" onClick={() => { setActiveApp(app.id); setCompanyView("home"); }}>
                    <span className="phone-app-icon" style={{ background: app.color }}>{app.icon}</span>
                    <span className="phone-app-name">{app.name}</span>
                    <span className="phone-app-description">{app.description}</span>
                  </button>
                ))}
              </div>
              <div className="phone-footnote"><span>◈</span> Local demo data · saved on this device</div>
            </div>
          )}

          {activeApp === "money" && (
            <div className="phone-scroll-view">
              <div className="phone-balance-card">
                <span className="phone-card-kicker">CASH ON HAND</span>
                <strong>{money(state.money)}</strong>
                <span>Available for in-game purchases</span>
                <div className="phone-balance-bottom"><span>Net worth</span><b>{money(state.netWorth)}</b></div>
              </div>
              <div className="phone-info-strip"><span>ACCOUNT BALANCE</span><b>Not separate in this demo</b><small>Your cash is the single virtual wallet.</small></div>
              <div className="phone-section-heading"><div><span>WALLET</span><h3>Recent activity</h3></div><span className="phone-live-tag">LOCAL</span></div>
              <div className="phone-transaction-list">
                {state.transactions.length ? state.transactions.slice(0, 6).map((transaction) => (
                  <div className="phone-transaction" key={transaction.id}>
                    <span className={`transaction-glyph ${transaction.kind}`}>{transaction.kind === "credit" ? "↙" : "↗"}</span>
                    <span className="transaction-copy"><b>{transaction.label}</b><small>{new Date(transaction.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</small></span>
                    <strong className={transaction.kind === "credit" ? "credit" : "debit"}>{transaction.kind === "credit" ? "+" : "−"}{money(transaction.amount)}</strong>
                  </div>
                )) : <p className="phone-empty-note">Your next purchase or job payment will show here.</p>}
              </div>
              <div className="phone-grant-card">
                <div><b>Founder test funds</b><small>One-time virtual demo grant for trying property & business systems.</small></div>
                <button disabled={state.demoGrantClaimed} onClick={() => api.command({ type: "claim-demo-grant" })}>
                  {state.demoGrantClaimed ? "CLAIMED" : `+ ${money(2_000_000)}`}
                </button>
              </div>
            </div>
          )}

          {activeApp === "jobs" && (
            <div className="phone-scroll-view">
              <div className="phone-section-heading"><div><span>WORK BOARD</span><h3>{state.job === "No active job" ? "Choose a route" : "Your current shift"}</h3></div></div>
              {state.job !== "No active job" && (
                <div className="phone-current-job">
                  <span className="phone-job-status"><i /> IN PROGRESS</span>
                  <b>{state.job}</b><p>{state.jobDetail}</p>
                  {state.jobProgress !== null && <div className="phone-progress"><i style={{ width: `${state.jobProgress}%` }} /></div>}
                  <button className="phone-text-button" onClick={() => api.command({ type: "abandon-job" })}>Leave this shift</button>
                </div>
              )}
              <div className="phone-job-list">
                {JOB_DEFINITIONS.map((job) => (
                  <article className="phone-job-card" key={job.id}>
                    <div className="phone-job-card-top"><span>{job.id === "delivery" ? "↗" : job.id === "shop" ? "▦" : "▰"}</span><b>{money(job.reward)}</b></div>
                    <h4>{job.title}</h4><p>{job.description}</p>
                    <div className="phone-job-location"><span>⌖</span>{job.workplace}</div>
                    <button className="phone-primary-button" disabled={state.job !== "No active job"} onClick={() => api.command({ type: "start-job", jobId: job.id })}>
                      {state.job !== "No active job" ? "CURRENT JOB ACTIVE" : "ACCEPT JOB"}
                    </button>
                  </article>
                ))}
              </div>
              <p className="phone-demo-caption">All jobs and pay are fictional in-game Naira. Shop shifts progress when you are at Alao Market.</p>
            </div>
          )}

          {activeApp === "investments" && (
            <div className="phone-scroll-view">
              <div className="phone-investment-intro"><span>SIMULATED LOCAL MARKET</span><h3>Small steps add up.</h3><p>Fictional demo listings only. Values are not real assets.</p></div>
              <div className="phone-investment-list">
                {INVESTMENTS.map((item) => {
                  const units = state.investments[item.id] ?? 0;
                  const changeUp = item.dailyChangePct >= 0;
                  return <article className="phone-investment-card" key={item.id}>
                    <div className="investment-mark">{item.ticker.slice(0, 1)}</div>
                    <div className="investment-main"><span>{item.ticker} · {item.sector}</span><b>{item.name}</b><small>{item.description}</small></div>
                    <div className="investment-price"><b>{money(item.unitPrice)}</b><span className={changeUp ? "credit" : "debit"}>{changeUp ? "+" : ""}{item.dailyChangePct.toFixed(1)}%</span></div>
                    <div className="investment-actions">
                      <span>{units} unit{units === 1 ? "" : "s"} owned</span>
                      <button disabled={state.money < item.unitPrice} onClick={() => api.command({ type: "buy-investment", investmentId: item.id })}>BUY 1</button>
                      {units > 0 && <button className="secondary" onClick={() => api.command({ type: "sell-investment", investmentId: item.id })}>SELL</button>}
                    </div>
                  </article>;
                })}
              </div>
              <div className="phone-info-strip"><span>PORTFOLIO VALUE</span><b>{money(INVESTMENTS.reduce((sum, item) => sum + item.unitPrice * (state.investments[item.id] ?? 0), 0))}</b><small>Quotes are simulated and have no real-world value.</small></div>
            </div>
          )}

          {activeApp === "cars" && (
            <div className="phone-scroll-view">
              <div className="phone-car-card">
                <div className="phone-car-art"><span>▰</span><i>AXLORI · 04</i></div>
                <div className="phone-car-details"><span className="phone-card-kicker">FICTIONAL CITY CAR</span><h3>Boro Sprint</h3><p>A nimble local runabout in warm amber. Enter it on the street and drive with WASD, arrows or the mobile stick.</p><div className="phone-car-stats"><span>CLASS<b>Compact</b></span><span>EST. VALUE<b>{money(1_800_000)}</b></span><span>STATUS<b>{state.ownsVehicle ? "Owned" : "Not owned"}</b></span></div></div>
              </div>
              <div className="phone-info-strip"><span>GARAGE</span><b>{state.ownsVehicle ? "1 vehicle owned" : "No vehicles owned"}</b><small>There is no vehicle dealership in this prototype, so no inactive purchase control is shown.</small></div>
            </div>
          )}

          {activeApp === "properties" && (
            <div className="phone-scroll-view">
              <div className="phone-section-heading"><div><span>MY HOMES</span><h3>Property portfolio</h3></div><span className="phone-live-tag">{1 + state.ownedPropertyIds.length} OWNED</span></div>
              <article className="phone-property-card owned-property"><span className="property-symbol">⌂</span><div><span className="phone-card-kicker">OWNED BY YOU</span><h4>{STARTER_PROPERTY.name}</h4><p>{STARTER_PROPERTY.location}</p></div><b>{money(STARTER_PROPERTY.value)}</b><small>{STARTER_PROPERTY.description}</small></article>
              {PROPERTIES_FOR_SALE.filter((property) => ownedPropertyIds.has(property.id)).map((property) => (
                <article className="phone-property-card owned-property" key={property.id}><span className="property-symbol">⌂</span><div><span className="phone-card-kicker">OWNED BY YOU</span><h4>{property.name}</h4><p>{property.location}</p></div><b>{money(property.value)}</b><small>{property.description}</small></article>
              ))}
              <div className="phone-section-heading compact-heading"><div><span>AVAILABLE IN DISTRICT</span><h3>Homes for sale</h3></div></div>
              {PROPERTIES_FOR_SALE.filter((property) => !ownedPropertyIds.has(property.id)).map((property) => (
                <article className="phone-property-card" key={property.id}><span className="property-symbol sale-symbol">⌂</span><div><span className="phone-card-kicker">HOUSE FOR SALE</span><h4>{property.name}</h4><p>{property.location}</p></div><b>{money(property.price)}</b><small>{property.description}</small><button className="phone-primary-button" disabled={state.money < property.price} onClick={() => api.command({ type: "buy-property", propertyId: property.id })}>{state.money < property.price ? "NOT ENOUGH CASH" : `BUY HOUSE · ${money(property.price)}`}</button></article>
              ))}
            </div>
          )}

          {activeApp === "companies" && (
            <div className="phone-scroll-view">
              {companyView === "home" && <>
                <div className="phone-company-hero"><span>BUSINESS DESK</span><h3>Your name on the sign.</h3><p>Create your own company or explore local businesses listed for sale.</p></div>
                <button className="phone-action-row" onClick={() => setCompanyView("create")}><span className="action-row-icon">＋</span><span><b>Create a company</b><small>Register a new local business · {money(COMPANY_REGISTRATION_COST)}</small></span><strong>›</strong></button>
                <button className="phone-action-row" onClick={() => setCompanyView("market")}><span className="action-row-icon purple">▦</span><span><b>Companies for sale</b><small>{COMPANIES_FOR_SALE.length} fictional listings</small></span><strong>›</strong></button>
                <div className="phone-section-heading compact-heading"><div><span>MY COMPANIES</span><h3>Owned by you</h3></div></div>
                {ownedCompanies.length === 0 ? <div className="phone-empty-card">No companies yet. The business desk is open.</div> : ownedCompanies.map((company) => <CompanyCard key={company.id} company={company} />)}
              </>}
              {companyView === "create" && <>
                <div className="phone-form-intro"><span>NEW REGISTRATION</span><h3>Start a company</h3><p>Build something local. The fee comes from your virtual cash wallet.</p></div>
                <form className="phone-company-form" onSubmit={submitCompany}>
                  <label>Company name<input required minLength={3} maxLength={36} placeholder="e.g. Axlori Foods" value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label>
                  <label>Business type<select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>{BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label>Location<select value={companyLocation} onChange={(event) => setCompanyLocation(event.target.value)}>{COMPANY_LOCATIONS.map((location) => <option key={location}>{location}</option>)}</select></label>
                  <div className="registration-cost"><span>REGISTRATION COST</span><b>{money(COMPANY_REGISTRATION_COST)}</b></div>
                  {state.money < COMPANY_REGISTRATION_COST && <p className="phone-validation-note">Your wallet needs {money(COMPANY_REGISTRATION_COST - state.money)} more. Try a job or claim the one-time demo founder grant in Money.</p>}
                  <button className="phone-primary-button" type="submit" disabled={state.money < COMPANY_REGISTRATION_COST}>CREATE COMPANY</button>
                </form>
              </>}
              {companyView === "market" && <>
                <div className="phone-form-intro"><span>LOCAL BUSINESS EXCHANGE</span><h3>Companies for sale</h3><p>Fictional demo businesses. Purchase prices are paid from your in-game cash.</p></div>
                {COMPANIES_FOR_SALE.map((company) => {
                  const owned = ownedCompanies.some((ownedCompany) => ownedCompany.id === company.id);
                  return <article className="phone-company-listing" key={company.id}>
                    <div className="company-listing-head"><span className="company-initial">{company.name.slice(0, 1)}</span><div><b>{company.name}</b><small>{company.businessType} · {company.location}</small></div><strong>{money(company.price)}</strong></div>
                    <p>{company.description}</p>
                    <div className="company-listing-bottom"><span>Value {money(company.value)} · {money(company.incomePerDay)}/day demo income</span><button disabled={owned || state.money < company.price} onClick={() => api.command({ type: "buy-company", companyId: company.id })}>{owned ? "OWNED" : state.money < company.price ? "INSUFFICIENT CASH" : "BUY COMPANY"}</button></div>
                  </article>;
                })}
              </>}
            </div>
          )}

          {activeApp === "forbes" && (
            <div className="phone-scroll-view">
              <div className="forbes-banner"><span>AXLORI CITY · DEMO RANKS</span><h3>AXLORI FORBES</h3><p>The local rich list, estimated from cash and assets.</p></div>
              <div className="forbes-list">
                {[
                  { name: "AxloriKing", worth: 82_500_000, badge: "01" },
                  { name: "CityBoss", worth: 61_200_000, badge: "02" },
                  { name: "Player123", worth: 45_700_000, badge: "03" },
                  { name: `You · ${state.playerName}`, worth: state.netWorth, badge: "YOU" },
                ].sort((a, b) => b.worth - a.worth).map((player, index) => (
                  <div className={`forbes-row ${player.name.startsWith("You") ? "you-row" : ""}`} key={player.badge}><span className="forbes-rank">{String(index + 1).padStart(2, "0")}</span><span className="forbes-avatar">{player.name.slice(0, 1)}</span><div><b>{player.name}</b><small>{player.name.startsWith("You") ? "Local save · portfolio estimate" : "Simulated city resident"}</small></div><strong>{money(player.worth)}</strong></div>
                ))}
              </div>
              <p className="phone-demo-caption">Local demo leaderboard only. No multiplayer or real player data is connected.</p>
            </div>
          )}

          <div className="phone-home-indicator"><span /></div>
        </div>
      </section>
    </div>
  );
}

function CompanyCard({ company }: { company: GameUiState["companies"][number] }) {
  return <article className="phone-owned-company"><span>{company.name.slice(0, 1)}</span><div><b>{company.name}</b><small>{company.businessType} · {company.location}</small></div><strong>{money(company.value)}</strong><p>Owned by {company.owner} · {money(company.incomePerDay)}/day demo income</p></article>;
}
