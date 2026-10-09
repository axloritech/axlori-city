# Axlori City — Third-Person District Life

Axlori City is a locally saved, browser-playable life-simulation prototype set in an original Nigerian-inspired district. The main game is a real-time 3D scene: a full-sized procedural resident, over-the-shoulder perspective camera, walk/run controls, a small explorable town, pedestrians, a drivable car, enterable homes, and a responsive phone/HUD.

The game uses Next.js App Router, TypeScript, Three.js, and React Three Fiber. Its world and characters are built from lightweight original geometry; there are no GTA assets, external model downloads, paid services, AI APIs, Firebase, multiplayer, or real-money transactions. Currency, businesses, investments, marketplace rankings, weather, and saves are local/demo systems.

## Quick start

### Requirements

- Node.js **20.9 or later** and npm
- A recent browser with WebGL support
- For phones, Android Chrome is recommended

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The development server binds to `0.0.0.0`, so another device on the same trusted Wi-Fi can use `http://YOUR-COMPUTER-LAN-IP:3000`.

To verify a change:

```bash
npm run typecheck
npm run build
```

To run a production build locally:

```bash
npm run build
npm run start
```

## Playing

### Desktop

- **Walk:** WASD or the arrow keys. Movement is relative to the camera.
- **Run:** Hold **Shift**.
- **Rotate camera:** Hold and drag the **right mouse button** over the game view.
- **Interact:** **E** or the on-screen prompt.
- **Phone:** **P** or tap **PHONE**.
- **Map:** **M** or tap **MAP**.
- **Menu:** **Escape** or **MENU**. The menu also has a manual save action.
- **Save:** **F5**.

Camera zoom is adjustable in **Menu → Settings**.

### Android / touch

- Drag the left virtual stick to walk. The stick steers while driving.
- Drag the open/right side of the game screen to rotate the camera. Movement and camera drag can be used at the same time.
- Hold **RUN** while walking.
- Tap **INTERACT** near an object, person, building, car, or home; use **GO** and **BRAKE** while driving.
- **PHONE** opens the in-game apps.

The play surface fills the screen and prevents page scrolling while you play. Pointer capture and cancellation release the joystick, look drag, run, and driving controls when a touch is interrupted.

## Things to try

- **Explore:** Walk around the district roads, sidewalks, courtyard homes, market, park, fuel stop, taxi rank, and office blocks. Interact prompts appear close to usable locations and people.
- **Talk to residents:** Several simple pedestrians follow short routes and can be greeted.
- **Drive:** Walk to the orange **Boro Sprint**, interact to enter, steer with the movement control, and use **E/INTERACT** again to exit. The mobile interface shows accelerator and brake buttons while seated in the car.
- **Homes:** Amara Court is the starter apartment. Visit a listed house to inspect and buy it with virtual Naira; return to its door to enter.
- **Furniture and rest:** Open **FURNISH** inside a home. Buy pieces, place them on the floor, move or rotate them, and use the bed to take a 15-second nap that restores energy.
- **Jobs:** Use the Phone → Jobs app or interact at a local work spot to accept a delivery, shop, or taxi shift. Follow the orange 3D marker and mini-map route.
- **Money and business:** The phone includes a wallet, demo investments, vehicle/property apps, company registration and a simulated local marketplace/wealth list. The optional one-time **₦2,000,000 virtual founder grant** is a local test affordance, not real money.
- **Clock and weather:** The clock reads the device's current local time. Lighting follows its day/night cycle; lightweight demo weather can change while playing.

## Saves and limitations

Progress is saved in browser `localStorage` under `axlori-city-save-v1`. It is tied to the browser profile and origin (for example, localhost and a Vercel URL have separate saves). Clearing site data, using private browsing, or changing browser/device can remove or separate the save. No account or server database is involved.

This is a single-player local demo. It does not provide real banking, real investments, payments, multiplayer, an online leaderboard, server-side persistence, or production-scale city streaming. The map, market values, jobs, and weather are fictional gameplay data.

## Run and deploy from an Android phone

### Option A — Termux local development

1. Install **Termux from F-Droid** and allow storage access:

   ```bash
   termux-setup-storage
   pkg update
   pkg install nodejs-lts unzip git
   ```

2. Download `axlori-city-source.zip` to the phone's Downloads folder. Extract the archive into a project directory (the ZIP contains the project files at its root):

   ```bash
   mkdir -p ~/axlori-city
   unzip -o ~/storage/downloads/axlori-city-source.zip -d ~/axlori-city
   cd ~/axlori-city
   node -v
   npm ci
   npm run dev -- --port 3000
   ```

3. Keep Termux open and visit **http://127.0.0.1:3000** in Chrome on the same phone. To open the development server on another device on the same trusted Wi-Fi, use the phone's LAN IP and port 3000. Do not expose a development server to an untrusted network.

Some Android/Termux combinations do not have a compatible Next.js SWC binary. If `npm ci` or the build reports an unsupported platform/native-binary error, use Option B; Vercel builds the source on its supported runtime and the deployed site still plays in the phone browser.

### Option B — Vercel deployment from a phone

No environment variables or paid services are required for the demo. Vercel account/provider terms can change; check the current plan before publishing.

1. Put the source ZIP contents in a GitHub repository. You can upload files using GitHub's mobile website, or use Git in Termux. For a new repository, replace `YOUR-ACCOUNT` with your GitHub username:

   ```bash
   cd ~/axlori-city
   git init -b main
   git add .
   git commit -m "Add Axlori City 3D district"
   git remote add origin https://github.com/YOUR-ACCOUNT/axlori-city.git
   git push -u origin main
   ```

   GitHub authentication may require signing in through the browser or configuring a personal access token/SSH key; never put a token in the source ZIP or commit it to the repository.

2. In the phone browser, open **vercel.com/new**, sign in, and import the repository.
3. Keep the detected framework as **Next.js** and the project root at the repository root. Use the lockfile-based install (`npm install` or `npm ci`) and build command `npm run build`. No environment variables are needed.
4. Deploy, then open the supplied `.vercel.app` address in Android Chrome. WebGL must be available in the browser.
5. For updates, push the changed files to the connected branch; Vercel will create a new deployment.

A local production server can also be run with `npm run build && npm run start` on a compatible Node.js host.

## Project layout

```text
app/                         Next.js App Router and global styles
components/GameCanvas.tsx     Client-only entry for the 3D renderer
components/GameCanvasInner.tsx Three.js Canvas, GameRuntime and desktop input
components/GameShell.tsx      HUD, touch controls, menus, map and phone UI
components/ui/                Responsive in-game apps and district map
game/runtime/GameRuntime.ts   Gameplay, movement, collisions, jobs and interactions
game/scene/                  Procedural 3D world, character, vehicle, camera, home and weather
game/world/CityLayout.ts     Map-to-world conversion, building specs and collision data
game/world/landmarks.ts       District landmarks and interaction data
game/jobs/                   Delivery, shop and taxi job definitions
game/inventory/               Virtual items and wallet inventory
game/houses/                  Home entry and nap timer
game/properties/              Property listings and ownership
game/furniture/               Furniture catalog, placement and storage
game/companies/               Fictional local business marketplace
game/investments/             Simulated demo investments
game/time/                    Device-local clock

game/weather/                 Random local weather state
game/economy/                 Recent wallet activity
game/save/                    Local save-provider interface and localStorage adapter
```

The renderer and gameplay data are separate: `GameRuntime` operates in the existing district coordinate system, while scene components convert that data to 3D. The 3D art is procedural and designed to keep the project dependency-light.

## Checks

For this 3D integration, `npm run typecheck` and `npm run build` completed successfully. The production server also returned the home page and expected document title over HTTP. A full browser interaction test and physical Android-device performance/playability test have **not** been performed yet.
