# Sync Saves - Design Prompt para IA

Use este prompt em ferramentas de design AI como Figma AI, Uizard, Galileo AI, ou similares.

---

## 🎨 Prompt Principal (Completo)

```
Design a modern desktop application UI for "Sync Saves" - a cloud game save synchronization app. The design should be dark-themed, gaming-oriented, and premium-looking.

**Brand Identity:**
- App Name: Sync Saves
- Tagline: "Your saves, everywhere"
- Icon concept: Cloud with a game controller or save disk icon merged together

**Design Style:**
- Dark mode as default (deep blacks and dark grays)
- Glassmorphism effects with subtle backdrop blur on cards
- Vibrant accent colors: Primary purple/violet (#9333EA to #7C3AED gradient), Secondary cyan (#06B6D4)
- Modern gaming aesthetic - inspired by Steam, Discord, and Epic Games Launcher
- Smooth rounded corners (12-16px radius)
- Subtle glow effects on interactive elements
- Micro-animations implied through design (hover states, transitions)

**Typography:**
- Font: Inter or similar modern sans-serif
- Clean hierarchy with bold headings
- Monospace for technical info (file paths, versions)

**Color Palette:**
- Background Primary: #09090B (near black)
- Background Secondary: #18181B
- Background Elevated: #27272A
- Card Background: #3F3F46 with 80% opacity + blur
- Primary Accent: #9333EA (purple)
- Secondary Accent: #06B6D4 (cyan)
- Success: #22C55E (green)
- Warning: #EAB308 (yellow)
- Error: #EF4444 (red)
- Text Primary: #FAFAFA
- Text Secondary: #A1A1AA

**Layout Structure:**
Fixed left sidebar (240px) with:
- App logo and name at top
- Navigation items: Dashboard, My Games, History, Settings
- User profile section at bottom with avatar and name
- Collapse button

Main content area with:
- Top header bar showing page title, sync status indicator (green dot = synced), and "Sync Now" button
- Content area with cards and lists

**Pages to Design:**

1. **Login Page (Full screen)**
   - Centered card on gradient background (purple to cyan, subtle)
   - App logo large at top
   - "Sync Saves" title with tagline
   - Large "Sign in with Google" button with Google icon
   - Decorative gaming elements in background (subtle controller icons, cloud shapes)

2. **Dashboard**
   - 3 stat cards at top: "Games Syncing" (count), "Total Saves" (count), "Devices Connected" (count)
   - Cards have icons, large numbers, and subtle gradients
   - "Recent Activity" section below with list of recent sync events
   - Each activity item shows: game icon, game name, action (↑ Upload / ↓ Download), time ago, status icon

3. **My Games Page**
   - Grid or list view toggle
   - "Add Game" button (primary purple)
   - Game cards showing:
     - Game cover/placeholder image (left)
     - Game name (large)
     - Save folder path (truncated, monospace, muted)
     - Last sync time and version number
     - Status indicator (green dot = synced, yellow = syncing, red = error)
     - Action buttons: Sync, History, Settings (gear icon)
   - Empty state with illustration and "Add your first game" CTA

4. **Add Game Modal**
   - Overlay with blurred background
   - Centered modal card
   - Fields: Game Name (text input), Save Folder (path input with folder picker button)
   - Toggle: Enable auto-sync
   - Buttons: Cancel (ghost), Add Game (primary)

5. **Sync History Page**
   - Filter dropdown by game
   - Timeline-style list grouped by date
   - Each entry: timestamp, game name, action type, version number, status, device name
   - Color-coded action icons (green up arrow for upload, blue down arrow for download)

6. **Settings Page**
   - Sections in cards:
     - "This Device": name input, machine ID (read-only), OS badge
     - "Sync Settings": interval dropdown (1, 5, 10, 15, 30 min), checkboxes for "Start with Windows", "Minimize to tray"
     - "Account": email display, storage usage bar, Logout button (danger style)
   - "Manage Devices" section showing list of user's devices with last seen time

7. **System Tray Menu (small popup)**
   - App icon in system tray
   - Popup showing: sync status, last sync time, list of games with quick status
   - "Sync All Now" button
   - "Open App" and "Quit" options

**UI Components to Include:**
- Buttons: Primary (filled purple), Secondary (outlined), Ghost (transparent), Icon buttons
- Input fields: Text inputs with labels, File path picker with folder icon button
- Cards: Glassmorphism style with subtle border
- Toggle switches: Purple when active
- Dropdowns/Selects
- Status badges: Synced (green), Syncing (yellow pulse), Error (red), Disabled (gray)
- Progress bars: For storage usage
- Toast notifications: Success (green), Error (red), Info (blue)
- Avatar circles for user profile
- Icon set: Consistent line icons (home, gamepad, history, settings, cloud, sync arrows, folder)

**Interactions to suggest:**
- Hover states on all clickable elements (slight scale, glow)
- Active/pressed states
- Loading spinners for async operations
- Skeleton loaders for content loading
- Smooth transitions between pages

**Platform:**
Desktop application (Windows, macOS, Linux) - design for ~1280x800 minimum viewport

**Mood:**
Professional but playful, trustworthy for handling important game data, modern and premium feel like Discord or Spotify, gaming-oriented but not childish
```

---

## 🎯 Prompts Específicos por Página

### Login Page

```
Design a desktop app login page for "Sync Saves" game save sync app. Dark theme with deep black background (#09090B). Centered white glassmorphism card. Large cloud-gaming logo at top. App name "Sync Saves" in bold white, tagline "Your saves, everywhere" in gray below. Single large "Sign in with Google" button with Google icon, white background with subtle shadow. Subtle purple-to-cyan gradient glow behind the card. Decorative faded gaming icons in background (controllers, clouds, save icons). Modern, premium, minimal. Desktop viewport 1280x800.
```

### Dashboard

```
Design a desktop app dashboard for "Sync Saves". Dark sidebar on left (240px) with logo, nav items (Dashboard active, My Games, History, Settings), user profile at bottom. Main area with header showing "Dashboard" title and green "Synced" status badge. Three stat cards in row: "3 Games" with gamepad icon, "47 Saves" with cloud icon, "2 Devices" with desktop icon. Cards have dark glass effect with subtle purple gradients. Below, "Recent Activity" section with list items showing game thumbnails, names, sync action arrows (↑↓), timestamps, and status. Dark theme, purple accents, modern gaming aesthetic.
```

### Games List

```
Design a games library page for desktop app "Sync Saves". Left sidebar with navigation, "My Games" active. Main content shows "My Games" title with "+ Add Game" purple button. Grid of game cards, each with: placeholder game cover image, game name bold, file path in monospace gray text, "v12 • Synced 5m ago" info, green status dot, action icons (sync, history, settings). Empty space shows "Add your first game" illustration. Dark theme #09090B background, glassmorphism cards, purple accents, modern clean design.
```

### Add Game Modal

```
Design a modal dialog for adding a game to "Sync Saves" app. Blurred dark overlay behind. Centered modal card with glassmorphism effect. Header: "Add New Game" with X close button. Form fields: "Game Name" text input, "Save Folder Location" input with folder picker icon button on right. Toggle switch "Enable auto-sync" checked by default. Footer with "Cancel" ghost button and "Add Game" purple filled button. Dark theme, rounded corners, subtle shadows, clean modern design.
```

### Settings Page

```
Design a settings page for "Sync Saves" desktop app. Dark sidebar, "Settings" active. Main area with sections in cards: "This Device" card with device name input, read-only machine ID, Windows OS badge. "Sync Settings" card with dropdown for sync interval (5 minutes selected), checkboxes for startup options. "Account" card showing user email, storage progress bar (45MB / 1GB used), red "Logout" button. "Your Devices" card listing devices with names, OS icons, last seen times. Dark theme, organized layout, purple accents.
```

---

## 🖼️ Prompt para Logo/Ícone

```
Design a modern app icon for "Sync Saves" - a cloud game save synchronization app. Combine a cloud shape with a game save/floppy disk icon or game controller. Use purple (#9333EA) as primary color with cyan (#06B6D4) accent. Gradient effect. Rounded square icon shape suitable for desktop apps. Minimal, recognizable, modern. Dark background version and light background version.
```

---

## 📱 Prompt para System Tray

```
Design a small system tray popup menu for "Sync Saves" app. Small floating card (280px wide) appearing above system tray. Shows: "All Synced" status with green dot, "Last sync: 2 minutes ago" text, divider, list of 3 games with icons and quick status dots, "Sync All Now" button, divider, "Open App" and "Quit" text links. Dark glassmorphism card with subtle border, purple accents, compact modern design.
```

---

## 💡 Dicas de Uso

1. **Figma AI / Galileo AI**: Use o prompt principal completo
2. **Midjourney/DALL-E**: Use os prompts específicos por página, adicione "UI design, Figma mockup, high fidelity, 4K" ao final
3. **Uizard**: Cole a descrição das funcionalidades e deixe gerar
4. **v0.dev (Vercel)**: Use descrições mais técnicas com menção de componentes

Para resultados mais consistentes, gere cada página separadamente e depois combine no Figma.
