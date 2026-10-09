# Axlori City

A small, playable browser prototype for an original Nigerian-inspired pixel-art life simulator. The game runs in Phaser 3; Next.js App Router hosts it and the responsive game UI. The world, characters, signs, furnishings, phone UI, and economy are original and drawn/generated locally—there are no paid APIs, AI APIs, Firebase, external game assets, real-money payments, or multiplayer services.

## Run it

### Requirements

- Node.js **20.9 or later** and npm
- A modern browser with Canvas/WebGL support

### On a computer

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The dev script binds Next.js to `0.0.0.0` so the same server can also be opened by a phone on the same Wi-Fi network. To check the project:

```bash
npm run typecheck
npm run build
```

### Run/test from an Android phone

For reliable phone testing, the easiest path is to deploy the source to Vercel from the phone (instructions below), then open the deployment URL in Chrome. A local Termux run is also possible on supported Android devices:

1. Install **Termux from F-Droid** (the Play Store build is often out of date).
2. In Termux, allow storage access and install the tools:

   ```bash
   termux-setup-storage
   pkg update
   pkg install nodejs-lts git unzip gh
   ```

3. Download/unzip the project source into the phone's Downloads folder. In Termux:

   ```bash
   cd ~/storage/downloads
   unzip -o axlori-city-source.zip -d ~
   cd ~/axlori-city
   node -v
   npm install
   npm run dev -- --port 3000
   ```

   Keep Termux open, then visit **http://127.0.0.1:3000** in the phone's browser. The project needs Node 20.9+. Native Next.js tooling varies by Android/Termux build; if `npm install` reports a Next/SWC platform error, use the Vercel workflow below—Vercel builds on its supported Linux runtime and the resulting game still plays on the phone.

4. To test from a second device on the same Wi-Fi, find the Android/host device's LAN IP and open `http://DEVICE-LAN-IP:3000`. Do not expose the development server to an untrusted network.

## Deploy to Vercel from a phone

No paid APIs or environment variables are required. A free Vercel Hobby account is enough for a personal prototype; account/provider terms may change.

1. Put the project source in a GitHub repository. One phone-friendly route is to extract the source zip in Termux, then run:

   ```bash
   cd ~/axlori-city
   git init -b main
   gh auth login
   gh repo create axlori-city --public --source=. --remote=origin --push
   ```

   Follow GitHub CLI's browser sign-in prompt on the phone. You can choose a private repository instead if you prefer.

2. In the phone browser, open **vercel.com/new**, sign in with GitHub, and import the `axlori-city` repository.
3. Keep the detected framework as **Next.js**. Use the repository root as the project root; leave the install command at `npm install` and the build command at `npm run build`. No environment variables are needed.
4. Tap **Deploy**. When Vercel finishes, open the `.vercel.app` URL on Android Chrome. The game uses the full viewport and touch joystick/interact buttons.
5. After code changes, push to the same GitHub branch; Vercel automatically creates a new deployment.

The project is standard Next.js and can also be deployed with `npm run build` / `npm run start` on another compatible host.

## Playing the prototype

- **Walk:** WASD or arrow keys. On touch screens, drag the virtual stick.
- **Interact:** E on keyboard, or the on-screen **INTERACT** button.
- **Phone:** P on keyboard, or tap **PHONE**. Apps include Money, Jobs, Investments, My Cars, Properties, Companies, and Axlori Forbes.
- **Map:** M or **MAP**.
- **Menu:** Escape or **MENU**. It includes Resume, Map, Inventory, Character, Settings, and Save.
- **Vehicle:** Walk close to the amber Boro Sprint and interact to enter/exit; steer with the same controls.
- **Homes:** Amara Court is your starter apartment. Oruama Homes is a low-cost test listing; Koru Courtyard House is a higher-priced listing. Walk to a for-sale home to view/buy it, then interact again to enter after purchase.
- **Furnishing:** While inside a home, tap **FURNISH**. Buy furniture or place an item already in your furniture bag, then tap a floor spot. Choose a placed item to move it; use the placement toolbar to rotate/remove/cancel.
- **Nap:** Walk near a bed and interact, then choose **TAKE A NAP**. The 15-second rest locks normal movement/actions and restores energy at the end.
- **Jobs:** Open Phone → Jobs to accept Delivery Worker, Shop Worker, or Taxi Driver shifts. Alternatively, interact with Axlori Couriers, Alao Market, or Riverside Taxi Rank. Shop shifts count down while near Alao Market; delivery/taxi routes complete when you reach their marked destination.
- **Money/company testing:** Phone → Money contains an optional one-time **₦2,000,000 virtual founder test grant**, intended to make the ₦100,000 company-registration flow, furniture, investments, property, and demo company marketplace testable without grinding. This is fictional local-save currency and has no cash value.
- **Clock/weather:** The clock follows the browser/device's current local time. City twilight uses that same time. Fictional Sunny/Cloudy/Rain conditions change randomly while playing; rain uses a lightweight pooled particle effect.

All money, jobs, purchases, properties, furniture placement, company registrations, demo investments, and the grant remain virtual. Nothing is connected to a bank or payment provider.

## Save data

Progress is stored in browser `localStorage` under `axlori-city-save-v1`. The save contains player position, cash, active job, inventory, house/property ownership, car position/ownership, placed/owned furniture, companies, investments, grant status, and recent wallet activity. Saves are per browser origin/device; private browsing or clearing site data removes them. The save provider is behind an interface so a server/database adapter can replace local storage later.

## Project layout

```text
app/                         Next.js App Router and global styles
components/                  Phaser host and responsive HTML HUD/phone UI
game/GameScene.ts            Phaser scene orchestration and interactions
game/player/                 Movement controller and generated character textures
game/world/                  Original district layout, landmarks, art and collisions
game/npcs/                   Lightweight pedestrian routes and interactions
game/vehicles/               Boro Sprint driving and generated car art
game/jobs/                   Delivery, shop-worker and taxi route data/logic
game/inventory/              Virtual shop items and wallet inventory
game/houses/                 Home entry and nap timer
game/properties/             Local property listings and ownership
game/furniture/              Furniture catalog, placement, rotation and storage
game/companies/              Business creation and fictional company marketplace
game/investments/            Simulated local investment listings
game/time/                   Device-local clock adapter (replaceable with server time)
game/weather/                Random weather state and pooled rain particles
game/economy/                 Recent wallet transaction log
game/save/                    SaveProvider seam and localStorage implementation
```

The economy, clock, weather, property, company, furniture, and save modules are deliberately local/demo systems. Multiplayer, Supabase, online leaderboards, and real-money features are not implemented in this testing version.
