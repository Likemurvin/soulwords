# Project Agent Documentation - SoulWords

## 🚀 Overview
This is a high-fidelity, single-page application (SPA) built using **React** and **Vite**. It functions as a game client, likely intended to be integrated with Telegram Mini Apps (TMA) given the use of `window?.Telegram?.WebApp`. The application follows a robust, unidirectional data flow pattern centered around **Zustand** stores for global state management.

The project simulates a competitive word/match game where users accumulate experience, manage resources (Souls, Stamina), and customize their profiles.

## 🏗️ Architecture Diagram
The architecture follows a classic client-side pattern:

**Presentation Layer (React Components)** $\xrightarrow{\text{Renders/Listens}}$ **Application Logic (Hooks/Routers)** $\xrightarrow{\text{Reads/Writes}}$ **State Management Layer (Zustand Stores)** $\xrightarrow{\text{Persists to/Loads from}}$ **Data Layer (Local Storage / Utilities)**

### Key Data Flow Entities:
1.  **`App.jsx`**: Application root. Provides `<NavProvider>` and mounts the main `<Router />`.
2.  **`NavProvider/useNav`**: The orchestrator of the app flow. It manages the `screen` state (e.g., `SCREENS.HUB`, `SCREENS.GAME`) and handles transitions (`go`, `back`, `replace`), mimicking a navigation stack.
3.  **Screens**: Specific views (`HubScreen`, `GameScreen`, `ShopScreen`, etc.) that display the current state and dispatch actions to the stores.
4.  **Stores (The Brains)**: Pure functions handling complex state changes and business logic.

## 🧩 Modules & Responsibilities

### 1. State Management Stores (Zustand)
These stores are the single source of truth for all global application data.

*   **`useUserStore`**: **(Profile & Persistence)**
    *   Manages the player's identity (`tgId`, `name`).
    *   Tracks core progression metrics (`souls`, `stamina`, `wins`, game statistics).
    *   Handles login/logout using the unique Telegram ID (`tgId`) for persistence via `storage.js`.
    *   Provides methods to modify profile stats (`addSouls`, `drainStamina`, `resetProgress`).
*   **`useGameStore`**: **(Gameplay)**
    *   Holds the transient, real-time state of a competitive match (`INITIAL_MATCH`).
    *   Tracks round progression, timers (total/free), word history (`curWord`, `usedWords`), and match scores/resources exchanged during a round.
    *   Manages lifecycle events: `startMatch`, `nextRound`, `endMatch`.
*   **`useCosmStore`**: **(Customization)**
    *   Manages visual assets (`dice`, `portrait`, `profileBg`, etc.).
    *   Handles the crucial feature of **unlocking** new items, tracking ownership via `ownedDice`, `ownedPortraits`, etc.
    *   Syncs state and unlocked lists to storage (`loadCosm`/`saveCosm`).
*   **`useMedalStore`**: **(Meta-Progression / Boosters)**
    *   Manages consumable/stackable boosters (`souls`, `stam`, `aur`).
    *   Provides multipliers derived from stack height (e.g., `soulsMult`, `stamMult`), allowing the user to apply powerful, temporary boosts.
    *   Tracks expiration dates for boosters.

### 2. Utility & Plumbing Layer
*   **`src/utils/storage.js`**: The abstracted persistence layer (likely uses `localStorage` or similar). It isolates the stores from the underlying storage mechanism, allowing them to simply call `loadX` or `saveX`.
*   **`src/components/Nav.jsx`**: The navigation logic heart of the application. It implements a stack-based history (`history`) and controls movement between screens, providing contextual cues like the persistent `TabBar` when applicable.

## 🧭 Navigation Flow
The application supports a detailed view hierarchy:

| Screen ID | Purpose | Key Actions/Interactions |
| :--- | :--- | :--- |
| `LOGIN` | Entry Point | Authenticates/loads user data (`useUserStore`). |
| `HUB` | Home Base | Main menu; view profile, access tabs. |
| `ROOMS` | Multiplayer Queue | Initiating matches (`useGameStore`). |
| `GAME` | Active Match | Core gameplay loop; tracking rounds, timers (`useGameStore`). |
| `SHOP` | Store/Acquisition | Buying/spending resources, possibly using multipliers. |
| `PROFILE` | My Page | Viewing overall stats (`useUserStore`). |
| `ACHIEVEMENTS` | Progress Tracking | Viewing rewards/milestones. |
| `COSM` | Customization Menu | Applying and unlocking visual items (`useCosmStore`). |
| `MATCH_OVER` | Post-Game Screen | Displaying match results and awarding resources. |
| `ROUND_START` | Pre-Game Screen | Final preparation before match activity. |

## ✅ Conclusion
This is a professionally structured, feature-rich game client. All parts are modularized into small, focused concerns (e.g., `useUserStore` only handles *user data*, not the game session itself). The use of dedicated stores and a controlled navigation flow ensures maintainability and scalability as new features are added.