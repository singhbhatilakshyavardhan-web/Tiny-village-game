# A Tiny Living Village 🏡🌾

> **Demo 3 – Autonomous Social Village Simulation**  
> An interactive, living, browser-based village simulation where 12 autonomous villagers live, remember, converse, trade, form friendships, develop rivalries, and write personal daily journals. Built with 100% pure vanilla HTML5, CSS3, and the HTML Canvas API with **zero external libraries, assets, or build tools**.

---

## 🌟 Overview

**A Tiny Living Village** simulates an emergent miniature society nestled in a cozy top-down valley. Every villager possesses their own personality, home, occupation, daily routine, inventory, economic wealth, and evolving web of relationships.

Unlike random wander simulations, every action in *A Tiny Living Village* is driven by a **Utility AI Decision Engine** combined with actual simulation history:
- Villagers produce goods according to their jobs and trade at the central marketplace.
- Memories are recorded from real interactions (trades, gifts, arguments, apologies, gossip).
- Relationships are asymmetric (individual perspectives from -100 to +100).
- Rumors originate from real village events and spread from neighbor to neighbor, distorting across hops.
- Every evening, each villager writes an authentic personal **diary entry** grounded strictly in what happened to them that day.

---

## ✨ Key Features

### 1. Beautiful Cozy Top-Down Pixel World
- **Programmatic Procedural Graphics**: Drawn entirely on HTML5 Canvas using shapes, gradients, and custom pixel-art sprites.
- **12 Unique Houses & Workshops**: The Bakery, Blacksmith Forge, Farmstead & Windmill, Herbalist Cottage, Angler Shack, Loom Studio, Lumber Cabin, Inn & Tavern, Carpenter Workshop, Pottery Kiln, Archive Tower, and Blossom Cottage.
- **Detailed Scenery**: Market plaza with striped awnings, animated water pond with lotus blossoms, tilled crop fields, rotating windmill sails, sheep pasture, lush forest, gardens, cobblestone roads, and chimney smoke particles.
- **Dynamic Day & Night Lighting**: Continuous simulation clock with Dawn, Morning, Afternoon, Sunset, and Night with glowing amber windows, street lanterns, and floating fireflies.

### 2. The 12 Villagers & Personalities
| Villager | Age | Occupation | Personality | Primary Good | Home Location |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Mira Vance** | 28 | Baker | Generous | Fresh Bread | Mira's Hearth Bakery |
| **Tomas Miller** | 34 | Farmer | Friendly | Fresh Vegetables | Tomas's Farmstead |
| **Bram Ironfoot** | 42 | Blacksmith | Stubborn | Forged Tools | Bram's Ironworks |
| **Anya Moss** | 26 | Herbalist | Introverted | Healing Salves | Anya's Herbal Sanity |
| **Finn Waters** | 22 | Fisherman | Curious | River Trout | Finn's Angler Shack |
| **Lina Weaver** | 29 | Weaver | Ambitious | Spun Wool Cloth | Lina's Loom Studio |
| **Oren Thorne** | 31 | Woodcutter | Shy | Firewood Timber | Oren's Timber Cabin |
| **Pippa Sweetwater** | 25 | Tavern Keeper | Romantic | Hearty Stew | The Whispering Willow |
| **Jory Timberly** | 38 | Carpenter | Friendly | Sturdy Lumber | Jory's Workshop |
| **Selah Clay** | 27 | Potter | Jealous | Glazed Ceramic Urns | Selah's Clay & Kiln |
| **Cedric Pendelton** | 65 | Scholar & Elder | Curious | Village Chronicles | Cedric's Tower |
| **Elowen Meadow** | 24 | Florist & Gardener | Generous | Fragrant Bouquets | Elowen's Blossom Cottage |

### 3. Real Memory & Dynamic Personal Diary
- **Memory Database**: Real simulation events create structured memory records (e.g. `[Day 2, 11:45 AM] Tomas gave me fresh carrots when I was hungry`).
- **Grounded Dynamic Journals**: At twilight, each villager reflects on the day's events in their own voice, flavored by their personality, relationships, and emotional state.

### 4. Dynamic Rumor Propagation System
- Rumors originate from actual disputes, generous gifts, or rare trades.
- Rumors spread when neighbors stop to gossip.
- Personality influences distortion: Ambitious and Jealous villagers exaggerate drama, Romantic villagers embellish sentiment, and friends defend each other against false gossip.

### 5. Economy & Marketplace
- Resource production loops: Bread, Wood, Fish, Vegetables, Flowers, Pottery, Wool, Tools, and Salves.
- Currency exchange (Gold coins), price negotiation based on greed/generosity, and inventory tracking.

### 6. Interactive Inspector & Simulation Controls
- **Click any villager or house** to inspect 6 comprehensive tabs:
  1. **Profile**: Biography, schedule, internal thoughts, and recent dialogues.
  2. **Needs & Mood**: Real-time meters for Hunger, Energy, Happiness, and Social need.
  3. **Relationships**: Complete list of all 11 other villagers with asymmetric numerical scores (-100 to +100) and personal opinions.
  4. **Memories**: Chronological timeline of events remembered.
  5. **Personal Diary**: Leather-bound parchment journal containing daily reflections.
  6. **Inventory & Wealth**: Gold purse and carried goods.
- **Simulation Speeds**: 1×, 2×, 4×, 8× and Pause/Resume.
- **Camera Navigation**: Click and drag or WASD/Arrow keys to pan; mouse wheel to zoom in/out; Follow-cam mode to track any villager.
- **Persistent State**: Auto-saves to `localStorage` every night, with manual Save and Reset controls.

---

## 🛠️ Technology Stack

Strict zero-dependency architecture:
* **HTML5**: Semantic layout, accessible dialog modals, custom HUD.
* **CSS3**: Modern variables, responsive flexbox/grid, glassmorphism, cozy parchment themes.
* **Vanilla JavaScript (ES6+)**: Modular object-oriented systems (TimeSystem, MemorySystem, RumorSystem, RelationshipSystem, DiarySystem, WorldRenderer, UIController).
* **HTML Canvas API**: 100% programmatic rendering of terrain, architecture, water reflections, particles, lighting, and animated sprites.

---

## 🚀 How to Run Locally

Because the project requires **no build tools, no Node.js packages, and no external assets**, you can run it immediately:

### Option A: Direct Browser Launch
Simply double-click `index.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari).

### Option B: Local Web Server (Recommended)
Using Python:
```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

Or using Node (`npx`):
```bash
npx serve .
```

---

## 🌐 How to Publish on GitHub Pages

1. **Create a GitHub Repository**:
   Create a new public repository on GitHub (e.g. `tiny-living-village`).

2. **Push the Files**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: A Tiny Living Village simulation"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tiny-living-village.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository settings on GitHub (**Settings** > **Pages**).
   - Under **Build and deployment** > **Branch**, select `main` branch and `/ (root)` folder.
   - Click **Save**.
   - Your interactive village simulation will be live at:
     `https://YOUR_USERNAME.github.io/tiny-living-village/`

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Pan Camera** | Click & Drag canvas or `W` `A` `S` `D` / Arrow keys |
| **Zoom In / Out** | Mouse Wheel or `+` / `-` floating buttons |
| **Inspect Villager** | Click villager on canvas or click their card in the bottom roster |
| **Pause / Resume** | `Spacebar` or Pause button on top HUD |
| **Adjust Speed** | Click `1×`, `2×`, `4×`, or `8×` buttons |
| **Follow Villager** | Click "Follow with Camera" in inspector modal |
| **Close Modal** | `Escape` key or `✕` button |

---

## 📜 License

MIT License. Free to explore, modify, and expand!
