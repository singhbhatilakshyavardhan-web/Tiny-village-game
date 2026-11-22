/**
 * ============================================================================
 * A Tiny Living Village - Autonomous Social Simulation
 * Pure Vanilla JavaScript & HTML5 Canvas API
 * ============================================================================
 */

'use strict';

/* ============================================================================
   1. CONFIGURATION & CONSTANTS
   ============================================================================ */

const CONFIG = {
  WORLD_WIDTH: 1800,
  WORLD_HEIGHT: 1300,
  TIME_SCALE: 1, // baseline minutes per second
  DAY_START_HOUR: 6,
  BASE_SPEEDS: [1, 2, 4, 8],
  INTERACTION_RANGE: 44,
  MAX_MEMORIES: 50,
  MAX_FEED_EVENTS: 120,
  STORAGE_KEY: 'tiny_living_village_save_v1'
};

const ITEMS = {
  BREAD: { id: 'BREAD', name: 'Fresh Bread', icon: '🍞', basePrice: 6, category: 'food', nutrition: 35 },
  VEGETABLES: { id: 'VEGETABLES', name: 'Fresh Vegetables', icon: '🥕', basePrice: 4, category: 'food', nutrition: 25 },
  FISH: { id: 'FISH', name: 'River Trout', icon: '🐟', basePrice: 5, category: 'food', nutrition: 30 },
  STEW: { id: 'STEW', name: 'Hearty Stew', icon: '🍲', basePrice: 8, category: 'food', nutrition: 50 },
  WOOD: { id: 'WOOD', name: 'Firewood Timber', icon: '🪵', basePrice: 4, category: 'material' },
  FLOWERS: { id: 'FLOWERS', name: 'Fragrant Bouquet', icon: '💐', basePrice: 5, category: 'gift' },
  POTTERY: { id: 'POTTERY', name: 'Glazed Urn', icon: '🏺', basePrice: 9, category: 'luxury' },
  WOOL: { id: 'WOOL', name: 'Spun Wool Cloth', icon: '🧶', basePrice: 8, category: 'material' },
  HERB_SALVE: { id: 'HERB_SALVE', name: 'Healing Salve', icon: '🌿', basePrice: 7, category: 'remedy' },
  IRON_TOOL: { id: 'IRON_TOOL', name: 'Forged Tool', icon: '⚒️', basePrice: 12, category: 'tool' },
  SCROLL: { id: 'SCROLL', name: 'Village Chronicle', icon: '📜', basePrice: 10, category: 'lore' }
};

const RELATION_TIERS = [
  { min: 75, name: 'Best Friend', class: 'tier-best-friend', badge: 'Best Friend' },
  { min: 45, name: 'Close Friend', class: 'tier-close-friend', badge: 'Close Friend' },
  { min: 15, name: 'Friend', class: 'tier-friend', badge: 'Friend' },
  { min: -10, name: 'Acquaintance', class: 'tier-acquaintance', badge: 'Acquaintance' },
  { min: -35, name: 'Disliked', class: 'tier-disliked', badge: 'Disliked' },
  { min: -65, name: 'Rival', class: 'tier-rival', badge: 'Rival' },
  { min: -100, name: 'Enemy', class: 'tier-enemy', badge: 'Enemy' }
];

/* ============================================================================
   2. TIME & CLOCK SYSTEM
   ============================================================================ */

class TimeSystem {
  constructor() {
    this.day = 1;
    this.hour = 7;
    this.minute = 30;
    this.secondAccumulator = 0;
    this.speedMultiplier = 1;
    this.isPaused = false;
  }

  update(dt) {
    if (this.isPaused) return;

    // dt is in seconds. Base: 1 real second = 1.5 in-game minutes at 1x
    this.secondAccumulator += dt * this.speedMultiplier * 1.5;

    while (this.secondAccumulator >= 1) {
      this.secondAccumulator -= 1;
      this.minute += 1;

      if (this.minute >= 60) {
        this.minute = 0;
        this.hour += 1;

        if (this.hour >= 24) {
          this.hour = 0;
          this.day += 1;
          window.villageApp?.onNewDay(this.day);
        }
      }
    }
  }

  getTimeString() {
    const period = this.hour >= 12 ? 'PM' : 'AM';
    const displayHour = this.hour % 12 === 0 ? 12 : this.hour % 12;
    const displayMinute = this.minute < 10 ? `0${this.minute}` : this.minute;
    return `${displayHour}:${displayMinute} ${period}`;
  }

  getPhase() {
    if (this.hour >= 5 && this.hour < 7) return { name: 'Dawn', icon: '🌅', light: 'dawn' };
    if (this.hour >= 7 && this.hour < 12) return { name: 'Morning', icon: '☀️', light: 'day' };
    if (this.hour >= 12 && this.hour < 17) return { name: 'Afternoon', icon: '🌤️', light: 'day' };
    if (this.hour >= 17 && this.hour < 20) return { name: 'Sunset', icon: '🌇', light: 'sunset' };
    return { name: 'Night', icon: '🌙', light: 'night' };
  }

  isNight() {
    return this.hour >= 21 || this.hour < 5;
  }
}

/* ============================================================================
   3. MEMORY SYSTEM
   ============================================================================ */

class MemorySystem {
  static createMemory({ day, time, type, subjectId, subjectName, details, sentiment = 'neutral', impact = 5 }) {
    return {
      id: 'mem_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      day,
      time,
      type,
      subjectId,
      subjectName,
      details,
      sentiment, // 'positive', 'negative', 'neutral'
      impact     // 1 to 10
    };
  }
}

/* ============================================================================
   4. DYNAMIC RUMOR SYSTEM
   ============================================================================ */

class RumorSystem {
  constructor() {
    this.rumors = [];
  }

  createRumorFromEvent({ originalDay, eventType, sourceVillager, subjectVillager, baseText, spicySeed }) {
    const id = 'rumor_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const rumor = {
      id,
      originalDay,
      eventType,
      sourceId: sourceVillager.id,
      sourceName: sourceVillager.name,
      subjectId: subjectVillager.id,
      subjectName: subjectVillager.name,
      storytellerId: sourceVillager.id,
      storytellerName: sourceVillager.name,
      hops: 0,
      distortionLevel: 0,
      text: baseText,
      spicySeed: spicySeed || 1,
      believers: new Set([sourceVillager.id]),
      rejecters: new Set()
    };
    this.rumors.unshift(rumor);
    if (this.rumors.length > 25) this.rumors.pop();
    return rumor;
  }

  propagateRumor(rumor, speaker, listener) {
    if (!rumor) return null;

    // Check listener affinity toward the subject
    const listenerAffinity = listener.getRelationship(rumor.subjectId);
    let believed = false;

    // Listener reaction based on personality & affinity
    if (listenerAffinity > 40 && listener.personality !== 'Jealous') {
      // Defend friend!
      rumor.rejecters.add(listener.id);
      believed = false;
    } else if (listener.personality === 'Curious' || listener.personality === 'Jealous' || listenerAffinity < 10) {
      rumor.believers.add(listener.id);
      believed = true;
    } else {
      // 50% chance
      if (Math.random() > 0.35) {
        rumor.believers.add(listener.id);
        believed = true;
      } else {
        rumor.rejecters.add(listener.id);
      }
    }

    // Distort message slightly based on speaker personality
    rumor.hops += 1;
    rumor.storytellerId = speaker.id;
    rumor.storytellerName = speaker.name;

    if (speaker.personality === 'Romantic') {
      rumor.text = rumor.text.replace(/seen talking/g, 'sharing passionate whispered secrets');
      rumor.distortionLevel += 1;
    } else if (speaker.personality === 'Jealous' || speaker.personality === 'Ambitious') {
      rumor.text = rumor.text.replace(/argued/g, 'shouted bitterly and threw wares');
      rumor.text = rumor.text.replace(/fair price/g, 'hidden greedy scam');
      rumor.distortionLevel += 2;
    } else if (speaker.personality === 'Curious') {
      rumor.distortionLevel += 1;
    }

    if (believed) {
      // listener shifts opinion of subject
      const penalty = rumor.eventType === 'conflict' ? -8 : (rumor.eventType === 'good' ? 5 : -4);
      listener.modifyRelationship(rumor.subjectId, penalty, `Heard rumors about them: "${rumor.text}"`);
    }

    return { rumor, believed };
  }
}

/* ============================================================================
   5. RELATIONSHIP SYSTEM
   ============================================================================ */

class RelationshipSystem {
  static getTier(score) {
    for (const tier of RELATION_TIERS) {
      if (score >= tier.min) return tier;
    }
    return RELATION_TIERS[RELATION_TIERS.length - 1];
  }

  static getPerspectiveDescription(score, otherName, personality) {
    if (score >= 75) return `${otherName} is my dearest companion in the entire village. I trust them with my life.`;
    if (score >= 45) return `I deeply value ${otherName}'s presence and love our conversations.`;
    if (score >= 15) return `${otherName} is a pleasant neighbor. We get along quite well.`;
    if (score >= -10) return `I don't know ${otherName} very intimately, but they seem decent enough.`;
    if (score >= -35) return `I find ${otherName} rather difficult and prefer keeping a polite distance.`;
    if (score >= -65) return `${otherName} and I have clashed repeatedly. There is clear tension between us.`;
    return `${otherName} has wronged me. I consider them an outright enemy.`;
  }
}

/* ============================================================================
   6. DYNAMIC DIARY ENGINE
   ============================================================================ */

class DiarySystem {
  static generateDailyEntry(villager, day) {
    const todayMemories = villager.memories.filter(m => m.day === day);
    const p = villager.personality;
    let entryText = '';

    // Salutation & Opening reflection based on personality
    if (p === 'Generous') {
      entryText += `The sun sets over our quiet valley, and my heart feels full thinking of our community. `;
    } else if (p === 'Stubborn') {
      entryText += `Another long day done. Things would run far smoother around here if people simply worked with conviction. `;
    } else if (p === 'Introverted') {
      entryText += `Night has finally quieted the village paths. The solitude of my home is a welcome comfort after the day's noise. `;
    } else if (p === 'Romantic') {
      entryText += `The twilight glow casts such enchanting shadows across the village square tonight. `;
    } else if (p === 'Jealous') {
      entryText += `Evening arrives, and I cannot help observing how fortune smiles upon some while others toil in the background. `;
    } else if (p === 'Curious') {
      entryText += `What a fascinating day of discoveries and village happenings! Every corner of this place holds a story. `;
    } else if (p === 'Ambitious') {
      entryText += `Closing the ledger for the day. Every trade and interaction brings me closer to the prosperity I envision. `;
    } else if (p === 'Shy') {
      entryText += `The stars are peeking through my window. I am glad to be safely inside my quiet haven. `;
    } else {
      entryText += `The bells chime evening in the village. Another day woven into memory. `;
    }

    // Reflect on actual memories
    if (todayMemories.length > 0) {
      // Pick up to 3 highest impact memories
      const topMemories = [...todayMemories].sort((a, b) => b.impact - a.impact).slice(0, 3);
      entryText += '\n\n';

      topMemories.forEach(mem => {
        if (mem.type === 'TRADE') {
          entryText += `I concluded business with ${mem.subjectName}. ${mem.details} `;
        } else if (mem.type === 'ARGUMENT') {
          entryText += `There was bitter disagreement with ${mem.subjectName}. ${mem.details} It left a foul taste in my mouth. `;
        } else if (mem.type === 'APOLOGY') {
          entryText += `Words of reconciliation passed with ${mem.subjectName}. It takes courage to mend what was broken. `;
        } else if (mem.type === 'GIFT') {
          entryText += `A heartwarming moment occurred when ${mem.details} Kindness like that is never forgotten. `;
        } else if (mem.type === 'RUMOR') {
          entryText += `Word reached my ears regarding ${mem.subjectName}: ${mem.details} One must wonder where truth ends and whispers begin. `;
        } else {
          entryText += `${mem.details} `;
        }
      });
    } else {
      entryText += `\nThe day passed in gentle routine without major disruption. My hands stayed busy and the quiet hours brought peace.`;
    }

    // Closing thought based on happiness & energy
    entryText += '\n\n';
    if (villager.happiness > 70) {
      entryText += `I retire tonight in joyful spirits, eager for tomorrow's sunrise.`;
    } else if (villager.happiness < 40) {
      entryText += `I hope tomorrow treats my weary soul with greater gentleness.`;
    } else {
      entryText += `May the night grant restful sleep to all our hearths.`;
    }

    return {
      day,
      dateText: `Day ${day} – Evening Reflection`,
      body: entryText
    };
  }
}

/* ============================================================================
   7. WORLD MAP, BUILDINGS, POIs & WAYPOINTS
   ============================================================================ */

const WORLD_DATA = {
  buildings: [
    {
      id: 'mira_house',
      ownerId: 'mira',
      name: "Mira's Hearth Bakery",
      x: 410, y: 310, w: 160, h: 120,
      door: { x: 490, y: 435 },
      wallColor: '#c8a47e',
      roofColor: '#b85d39',
      chimney: { x: 540, y: 315 },
      sign: '🥖'
    },
    {
      id: 'tomas_house',
      ownerId: 'tomas',
      name: "Tomas's Farmstead",
      x: 180, y: 830, w: 150, h: 120,
      door: { x: 255, y: 955 },
      wallColor: '#d6b896',
      roofColor: '#9c6644',
      chimney: { x: 210, y: 835 },
      sign: '🌾'
    },
    {
      id: 'bram_house',
      ownerId: 'bram',
      name: "Bram's Ironworks",
      x: 1280, y: 270, w: 160, h: 125,
      door: { x: 1360, y: 400 },
      wallColor: '#8a939e',
      roofColor: '#4b5563',
      chimney: { x: 1410, y: 275 },
      sign: '⚒️'
    },
    {
      id: 'anya_house',
      ownerId: 'anya',
      name: "Anya's Herbal Sanity",
      x: 170, y: 230, w: 140, h: 110,
      door: { x: 240, y: 345 },
      wallColor: '#a7b89f',
      roofColor: '#4f772d',
      chimney: { x: 280, y: 235 },
      sign: '🌿'
    },
    {
      id: 'finn_house',
      ownerId: 'finn',
      name: "Finn's Angler Shack",
      x: 1420, y: 890, w: 130, h: 100,
      door: { x: 1485, y: 995 },
      wallColor: '#8ca1a9',
      roofColor: '#415a77',
      chimney: { x: 1440, y: 895 },
      sign: '🐟'
    },
    {
      id: 'lina_house',
      ownerId: 'lina',
      name: "Lina's Loom Studio",
      x: 580, y: 860, w: 140, h: 110,
      door: { x: 650, y: 975 },
      wallColor: '#d8b4e2',
      roofColor: '#8e44ad',
      chimney: { x: 690, y: 865 },
      sign: '🧶'
    },
    {
      id: 'oren_house',
      ownerId: 'oren',
      name: "Oren's Timber Cabin",
      x: 1590, y: 330, w: 140, h: 110,
      door: { x: 1660, y: 445 },
      wallColor: '#a2704f',
      roofColor: '#5c3a21',
      chimney: { x: 1700, y: 335 },
      sign: '🪵'
    },
    {
      id: 'pippa_house',
      ownerId: 'pippa',
      name: "The Whispering Willow Inn",
      x: 430, y: 560, w: 170, h: 130,
      door: { x: 515, y: 695 },
      wallColor: '#d4a373',
      roofColor: '#bc4749',
      chimney: { x: 570, y: 565 },
      sign: '🍻'
    },
    {
      id: 'jory_house',
      ownerId: 'jory',
      name: "Jory's Woodcraft Workshop",
      x: 1390, y: 570, w: 150, h: 115,
      door: { x: 1465, y: 690 },
      wallColor: '#deb887',
      roofColor: '#8b5a2b',
      chimney: { x: 1510, y: 575 },
      sign: '🪚'
    },
    {
      id: 'selah_house',
      ownerId: 'selah',
      name: "Selah's Clay & Kiln",
      x: 1160, y: 850, w: 140, h: 110,
      door: { x: 1230, y: 965 },
      wallColor: '#d38b5d',
      roofColor: '#a0522d',
      chimney: { x: 1270, y: 855 },
      sign: '🏺'
    },
    {
      id: 'cedric_house',
      ownerId: 'cedric',
      name: "Cedric's Tower of Archives",
      x: 820, y: 170, w: 145, h: 130,
      door: { x: 890, y: 305 },
      wallColor: '#b0c4de',
      roofColor: '#2f4f4f',
      chimney: { x: 935, y: 175 },
      sign: '📜'
    },
    {
      id: 'elowen_house',
      ownerId: 'elowen',
      name: "Elowen's Blossom Cottage",
      x: 1070, y: 210, w: 140, h: 110,
      door: { x: 1140, y: 325 },
      wallColor: '#f7d6e0',
      roofColor: '#e07a5f',
      chimney: { x: 1180, y: 215 },
      sign: '🌺'
    }
  ],

  marketStalls: [
    { id: 'stall_bread', x: 890, y: 570, w: 50, h: 36, color: '#e63946', good: 'BREAD', name: 'Bread Stall' },
    { id: 'stall_farm', x: 970, y: 570, w: 50, h: 36, color: '#2a9d8f', good: 'VEGETABLES', name: 'Produce Stall' },
    { id: 'stall_craft', x: 1050, y: 570, w: 50, h: 36, color: '#e76f51', good: 'POTTERY', name: 'Pottery & Craft' },
    { id: 'stall_fish', x: 970, y: 700, w: 50, h: 36, color: '#457b9d', good: 'FISH', name: 'Fisherman Stall' }
  ],

  fountain: { x: 995, y: 645, radius: 26 },

  pond: {
    x: 1320, y: 1100, w: 340, h: 210,
    dock: { x: 1380, y: 1080, w: 32, h: 60 }
  },

  cropFields: [
    { x: 140, y: 1010, w: 220, h: 130, crop: 'carrots' },
    { x: 140, y: 1170, w: 220, h: 110, crop: 'wheat' }
  ],

  windmill: { x: 380, y: 1050, w: 75, h: 90 },

  gardens: { x: 1040, y: 340, w: 180, h: 120 },

  sheepPen: { x: 740, y: 920, w: 130, h: 120 },

  // Pre-mapped Waypoint Network for realistic path traversal without getting stuck
  waypoints: [
    // Town Square
    { id: 'sq_center', x: 995, y: 645 },
    { id: 'sq_north', x: 995, y: 530 },
    { id: 'sq_south', x: 995, y: 770 },
    { id: 'sq_west', x: 850, y: 645 },
    { id: 'sq_east', x: 1150, y: 645 },

    // North Road
    { id: 'road_n1', x: 995, y: 400 },
    { id: 'road_n2', x: 995, y: 310 },
    { id: 'cedric_door', x: 890, y: 320 },
    { id: 'elowen_door', x: 1140, y: 335 },
    { id: 'gardens_spot', x: 1100, y: 400 },

    // North West Road (Anya & Bakery)
    { id: 'road_nw1', x: 700, y: 440 },
    { id: 'bakery_door', x: 490, y: 445 },
    { id: 'road_nw2', x: 350, y: 440 },
    { id: 'anya_door', x: 240, y: 355 },

    // West Road (Tavern & Farm)
    { id: 'road_w1', x: 680, y: 645 },
    { id: 'tavern_door', x: 515, y: 710 },
    { id: 'road_sw1', x: 480, y: 820 },
    { id: 'farm_door', x: 255, y: 965 },
    { id: 'farm_field', x: 260, y: 1080 },
    { id: 'windmill_spot', x: 420, y: 1100 },

    // South Road (Lina & Sheep)
    { id: 'road_s1', x: 850, y: 880 },
    { id: 'lina_door', x: 650, y: 985 },
    { id: 'sheep_spot', x: 790, y: 980 },

    // East Road (Jory, Bram, Forest)
    { id: 'road_e1', x: 1280, y: 645 },
    { id: 'jory_door', x: 1465, y: 705 },
    { id: 'bram_door', x: 1360, y: 410 },
    { id: 'forest_road', x: 1540, y: 450 },
    { id: 'oren_door', x: 1660, y: 455 },
    { id: 'forest_deep', x: 1720, y: 300 },

    // South East Road (Pottery, Finn, Pond)
    { id: 'road_se1', x: 1150, y: 820 },
    { id: 'selah_door', x: 1230, y: 975 },
    { id: 'road_se2', x: 1360, y: 980 },
    { id: 'finn_door', x: 1485, y: 1005 },
    { id: 'dock_spot', x: 1395, y: 1090 }
  ]
};

// Build connections between waypoints
const WAYPOINT_GRAPH = {};
function initWaypointGraph() {
  WORLD_DATA.waypoints.forEach(wp => {
    WAYPOINT_GRAPH[wp.id] = [];
  });

  function connect(a, b) {
    if (!WAYPOINT_GRAPH[a] || !WAYPOINT_GRAPH[b]) return;
    if (!WAYPOINT_GRAPH[a].includes(b)) WAYPOINT_GRAPH[a].push(b);
    if (!WAYPOINT_GRAPH[b].includes(a)) WAYPOINT_GRAPH[b].push(a);
  }

  // Town Square connections
  connect('sq_center', 'sq_north');
  connect('sq_center', 'sq_south');
  connect('sq_center', 'sq_west');
  connect('sq_center', 'sq_east');

  // North branch
  connect('sq_north', 'road_n1');
  connect('road_n1', 'road_n2');
  connect('road_n2', 'cedric_door');
  connect('road_n2', 'elowen_door');
  connect('road_n1', 'gardens_spot');
  connect('gardens_spot', 'elowen_door');

  // North-West branch
  connect('sq_north', 'road_nw1');
  connect('sq_west', 'road_nw1');
  connect('road_nw1', 'bakery_door');
  connect('bakery_door', 'road_nw2');
  connect('road_nw2', 'anya_door');

  // West & South-West branch
  connect('sq_west', 'road_w1');
  connect('road_w1', 'tavern_door');
  connect('tavern_door', 'road_sw1');
  connect('road_sw1', 'farm_door');
  connect('farm_door', 'farm_field');
  connect('farm_door', 'windmill_spot');

  // South branch
  connect('sq_south', 'road_s1');
  connect('road_s1', 'lina_door');
  connect('road_s1', 'sheep_spot');
  connect('road_s1', 'road_se1');

  // East branch
  connect('sq_east', 'road_e1');
  connect('road_e1', 'jory_door');
  connect('road_e1', 'bram_door');
  connect('bram_door', 'road_n1');
  connect('road_e1', 'forest_road');
  connect('forest_road', 'oren_door');
  connect('oren_door', 'forest_deep');

  // South-East branch
  connect('sq_east', 'road_se1');
  connect('road_se1', 'selah_door');
  connect('selah_door', 'road_se2');
  connect('road_se2', 'finn_door');
  connect('road_se2', 'dock_spot');
  connect('jory_door', 'road_se2');
}
initWaypointGraph();

/* Pathfinding on Waypoints */
function findWaypointPath(startWpId, targetWpId) {
  if (startWpId === targetWpId) return [targetWpId];

  const queue = [[startWpId]];
  const visited = new Set([startWpId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];

    if (curr === targetWpId) return path;

    const neighbors = WAYPOINT_GRAPH[curr] || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
    }
  }
  return [targetWpId];
}

function getNearestWaypoint(x, y) {
  let closest = WORLD_DATA.waypoints[0];
  let minD = Infinity;
  for (const wp of WORLD_DATA.waypoints) {
    const d = (wp.x - x) ** 2 + (wp.y - y) ** 2;
    if (d < minD) {
      minD = d;
      closest = wp;
    }
  }
  return closest;
}

/* ============================================================================
   8. VILLAGER DATA & INITIAL DEFINITIONS
   ============================================================================ */

const VILLAGERS_DEF = [
  {
    id: 'mira',
    name: 'Mira Vance',
    age: 28,
    occupation: 'Baker',
    personality: 'Generous',
    bio: 'Mira is the heart of the village morning. She starts firing her hearth before sunrise and loves to slip extra warm buns to hungry neighbors.',
    homeBuildingId: 'mira_house',
    doorWp: 'bakery_door',
    workWp: 'bakery_door',
    marketWp: 'sq_west',
    color: '#e76f51',
    hairColor: '#8d5524',
    clothesColor: '#f4a261',
    apronColor: '#ffffff',
    primaryGood: 'BREAD',
    wealth: 48,
    schedule: { wake: 5, workStart: 6, lunch: 12, market: 16, rest: 21 }
  },
  {
    id: 'tomas',
    name: 'Tomas Miller',
    age: 34,
    occupation: 'Farmer',
    personality: 'Friendly',
    bio: 'Patient and hardworking, Tomas understands the rhythms of soil and season. He is quick to smile and always ready to lend a spade or cart.',
    homeBuildingId: 'tomas_house',
    doorWp: 'farm_door',
    workWp: 'farm_field',
    marketWp: 'sq_south',
    color: '#2a9d8f',
    hairColor: '#e9c46a',
    clothesColor: '#264653',
    primaryGood: 'VEGETABLES',
    wealth: 42,
    schedule: { wake: 6, workStart: 7, lunch: 12, market: 15, rest: 21 }
  },
  {
    id: 'bram',
    name: 'Bram Ironfoot',
    age: 42,
    occupation: 'Blacksmith',
    personality: 'Stubborn',
    bio: 'A master of tempered steel and anvil work. Bram has high standards, speaks in few words, and detests anyone mishandling forged tools.',
    homeBuildingId: 'bram_house',
    doorWp: 'bram_door',
    workWp: 'bram_door',
    marketWp: 'sq_east',
    color: '#495057',
    hairColor: '#212529',
    clothesColor: '#6c757d',
    primaryGood: 'IRON_TOOL',
    wealth: 65,
    schedule: { wake: 6, workStart: 7, lunch: 13, market: 17, rest: 22 }
  },
  {
    id: 'anya',
    name: 'Anya Moss',
    age: 26,
    occupation: 'Herbalist',
    personality: 'Introverted',
    bio: 'Anya spends hours foraging forest glades for wild thyme, chamomile, and soothing roots. Quiet and perceptive, she observes everything.',
    homeBuildingId: 'anya_house',
    doorWp: 'anya_door',
    workWp: 'forest_road',
    marketWp: 'sq_north',
    color: '#588157',
    hairColor: '#344e41',
    clothesColor: '#a3b18a',
    primaryGood: 'HERB_SALVE',
    wealth: 38,
    schedule: { wake: 7, workStart: 8, lunch: 12, market: 16, rest: 21 }
  },
  {
    id: 'finn',
    name: 'Finn Waters',
    age: 22,
    occupation: 'Fisherman',
    personality: 'Curious',
    bio: 'Finn knows every ripple of the village pond. Inquisitive by nature, he loves hearing stories of distant lands and strange catches.',
    homeBuildingId: 'finn_house',
    doorWp: 'finn_door',
    workWp: 'dock_spot',
    marketWp: 'sq_south',
    color: '#3a86ff',
    hairColor: '#d4a373',
    clothesColor: '#0077b6',
    primaryGood: 'FISH',
    wealth: 34,
    schedule: { wake: 5, workStart: 6, lunch: 12, market: 15, rest: 21 }
  },
  {
    id: 'lina',
    name: 'Lina Weaver',
    age: 29,
    occupation: 'Weaver',
    personality: 'Ambitious',
    bio: 'Lina transforms raw sheep wool into vibrant dyed tapestries and fine cloaks. She takes pride in trade and aspires to make the village renowned.',
    homeBuildingId: 'lina_house',
    doorWp: 'lina_door',
    workWp: 'sheep_spot',
    marketWp: 'sq_center',
    color: '#9d4edd',
    hairColor: '#5a189a',
    clothesColor: '#c77dff',
    primaryGood: 'WOOL',
    wealth: 55,
    schedule: { wake: 6, workStart: 8, lunch: 13, market: 16, rest: 22 }
  },
  {
    id: 'oren',
    name: 'Oren Thorne',
    age: 31,
    occupation: 'Woodcutter',
    personality: 'Shy',
    bio: 'A gentle giant who feels most comfortable amongst the tall pines. Oren speaks softly, carves wooden animal figurines, and shies from crowds.',
    homeBuildingId: 'oren_house',
    doorWp: 'oren_door',
    workWp: 'forest_deep',
    marketWp: 'sq_east',
    color: '#6f4e37',
    hairColor: '#3b2f2f',
    clothesColor: '#8b5a2b',
    primaryGood: 'WOOD',
    wealth: 40,
    schedule: { wake: 6, workStart: 7, lunch: 12, market: 17, rest: 21 }
  },
  {
    id: 'pippa',
    name: 'Pippa Sweetwater',
    age: 25,
    occupation: 'Tavern Keeper',
    personality: 'Romantic',
    bio: 'Lively, expressive, and a wonderful cook. Pippa runs the Whispering Willow Inn with laughter, candlelit stews, and a keen ear for village gossip.',
    homeBuildingId: 'pippa_house',
    doorWp: 'tavern_door',
    workWp: 'tavern_door',
    marketWp: 'sq_center',
    color: '#e63946',
    hairColor: '#f1faee',
    clothesColor: '#a8dadc',
    primaryGood: 'STEW',
    wealth: 52,
    schedule: { wake: 7, workStart: 9, lunch: 14, market: 17, rest: 23 }
  },
  {
    id: 'jory',
    name: 'Jory Timberly',
    age: 38,
    occupation: 'Carpenter',
    personality: 'Friendly',
    bio: 'Jory crafts sturdy oak tables, repairing cottage roofs and fence gates. He is always whistling a tune and eager to share lunch with anyone nearby.',
    homeBuildingId: 'jory_house',
    doorWp: 'jory_door',
    workWp: 'jory_door',
    marketWp: 'sq_east',
    color: '#b08968',
    hairColor: '#7f5539',
    clothesColor: '#ddb892',
    primaryGood: 'WOOD',
    wealth: 46,
    schedule: { wake: 6, workStart: 8, lunch: 12, market: 16, rest: 22 }
  },
  {
    id: 'selah',
    name: 'Selah Clay',
    age: 27,
    occupation: 'Potter',
    personality: 'Jealous',
    bio: 'An artisan of clay and glazed urns. Selah works diligently, but secretly measures her standing against her neighbors and can hold sharp grudges.',
    homeBuildingId: 'selah_house',
    doorWp: 'selah_door',
    workWp: 'selah_door',
    marketWp: 'sq_south',
    color: '#e07a5f',
    hairColor: '#3d405b',
    clothesColor: '#f4f1de',
    primaryGood: 'POTTERY',
    wealth: 43,
    schedule: { wake: 7, workStart: 8, lunch: 13, market: 16, rest: 22 }
  },
  {
    id: 'cedric',
    name: 'Cedric Pendelton',
    age: 65,
    occupation: 'Scholar & Elder',
    personality: 'Curious',
    bio: 'The village historian and stargazer. Cedric preserves the village chronicles, mentors the youth, and loves nothing more than discussing ancient lore.',
    homeBuildingId: 'cedric_house',
    doorWp: 'cedric_door',
    workWp: 'cedric_door',
    marketWp: 'sq_north',
    color: '#1d3557',
    hairColor: '#e0e1dd',
    clothesColor: '#457b9d',
    primaryGood: 'SCROLL',
    wealth: 70,
    schedule: { wake: 6, workStart: 8, lunch: 12, market: 15, rest: 21 }
  },
  {
    id: 'elowen',
    name: 'Elowen Meadow',
    age: 24,
    occupation: 'Florist & Gardener',
    personality: 'Generous',
    bio: 'Elowen cultivates radiant marigolds, roses, and lavender. She brings cheer to every doorstep and often surprises neighbors with blooming bouquets.',
    homeBuildingId: 'elowen_house',
    doorWp: 'elowen_door',
    workWp: 'gardens_spot',
    marketWp: 'sq_north',
    color: '#ffb703',
    hairColor: '#fb8500',
    clothesColor: '#8ecae6',
    primaryGood: 'FLOWERS',
    wealth: 36,
    schedule: { wake: 6, workStart: 7, lunch: 12, market: 15, rest: 21 }
  }
];

/* ============================================================================
   9. VILLAGER CLASS (NEEDS, AI, MOVEMENT, RENDERING)
   ============================================================================ */

class Villager {
  constructor(def) {
    Object.assign(this, def);

    // Initial Coordinates at home door
    const homeWp = WORLD_DATA.waypoints.find(w => w.id === this.doorWp);
    this.x = homeWp ? homeWp.x : 500;
    this.y = homeWp ? homeWp.y : 500;
    this.targetX = this.x;
    this.targetY = this.y;
    this.currentWaypointId = this.doorWp;
    this.pathWaypoints = [];
    this.moveSpeed = 48; // px/sec

    // Needs (0 - 100)
    this.hunger = 80 + Math.floor(Math.random() * 20);
    this.energy = 85 + Math.floor(Math.random() * 15);
    this.happiness = 75 + Math.floor(Math.random() * 20);
    this.social = 70 + Math.floor(Math.random() * 25);

    // Inventory: key -> count
    this.inventory = {};
    if (this.primaryGood) {
      this.inventory[this.primaryGood] = 2 + Math.floor(Math.random() * 3);
    }
    this.inventory['BREAD'] = (this.inventory['BREAD'] || 0) + 1;

    // Relationships: otherId -> numerical score (-100 to 100)
    this.relationships = {};
    VILLAGERS_DEF.forEach(v => {
      if (v.id !== this.id) {
        // Initial mild affinity based on personality synergy
        let base = 5;
        if (this.personality === 'Friendly' || v.personality === 'Friendly') base += 10;
        if (this.personality === 'Jealous' && v.personality === 'Ambitious') base -= 10;
        if (this.personality === 'Stubborn' && v.personality === 'Stubborn') base -= 5;
        this.relationships[v.id] = base;
      }
    });

    // Memory & Diary
    this.memories = [];
    this.diaries = [];
    this.knownRumors = [];

    // Current State & Animation
    this.currentGoal = 'IDLE'; // 'SLEEP', 'WORK', 'EAT', 'SOCIALIZE', 'MARKET', 'REST'
    this.currentActionText = 'Stretching and enjoying the village morning air.';
    this.currentThought = 'The day begins with promise. I should prepare my tools.';
    this.moodBadge = 'Content';
    this.emote = null; // { icon: '💬', timer: 3 }
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.isMoving = false;
    this.facing = 'down'; // 'left', 'right', 'up', 'down'
    this.interactionCooldown = 0;
    this.recentDialogues = [];
  }

  getRelationship(otherId) {
    return this.relationships[otherId] !== undefined ? this.relationships[otherId] : 0;
  }

  modifyRelationship(otherId, amount, reason) {
    if (this.relationships[otherId] === undefined) this.relationships[otherId] = 0;
    const oldScore = this.relationships[otherId];
    this.relationships[otherId] = Math.max(-100, Math.min(100, oldScore + amount));
    
    // Check tier crossing
    const oldTier = RelationshipSystem.getTier(oldScore);
    const newTier = RelationshipSystem.getTier(this.relationships[otherId]);
    if (oldTier.name !== newTier.name) {
      window.villageApp?.addFeedEvent({
        type: amount > 0 ? 'social' : 'conflict',
        category: 'Relation',
        text: `${this.name} now considers ${window.villageApp.getVillagerName(otherId)} a ${newTier.name}!`,
        villager1: this.id,
        villager2: otherId
      });
    }
  }

  addMemory(memData) {
    const mem = MemorySystem.createMemory(memData);
    this.memories.unshift(mem);
    if (this.memories.length > CONFIG.MAX_MEMORIES) this.memories.pop();
    return mem;
  }

  setEmote(icon, duration = 3.5) {
    this.emote = { icon, timer: duration };
  }

  showDialogueBubble(speakerName, text) {
    this.recentDialogues.unshift({ speaker: speakerName, text, time: window.villageApp.time.getTimeString() });
    if (this.recentDialogues.length > 5) this.recentDialogues.pop();
  }

  /* Utility AI - Decision Making System */
  evaluateNeedsAndGoals(time) {
    // 1. Sleeping at Night
    if (time.isNight() || (time.hour >= this.schedule.rest && this.energy < 40)) {
      if (this.currentGoal !== 'SLEEP') {
        this.currentGoal = 'SLEEP';
        this.currentActionText = 'Sleeping soundly at home.';
        this.currentThought = 'Rest is sweet after an honest day.';
        this.moodBadge = 'Peaceful';
        this.setDestinationWaypoint(this.doorWp);
      }
      return;
    }

    // 2. Severe Hunger overrides schedule
    if (this.hunger < 30) {
      this.currentGoal = 'EAT';
      // If has food in inventory, eat!
      for (const itemKey of ['BREAD', 'STEW', 'VEGETABLES', 'FISH']) {
        if (this.inventory[itemKey] && this.inventory[itemKey] > 0) {
          this.inventory[itemKey]--;
          this.hunger = Math.min(100, this.hunger + (ITEMS[itemKey]?.nutrition || 30));
          this.currentActionText = `Eating a portion of ${ITEMS[itemKey].name}.`;
          this.currentThought = 'Ah, this sustenance hits the spot!';
          this.setEmote('🍞', 3);
          return;
        }
      }
      // If no food, head to bakery or tavern to buy!
      this.currentActionText = 'Heading to the bakery to buy fresh food.';
      this.currentThought = 'My stomach rumbles. I must fetch a warm loaf.';
      this.setDestinationWaypoint('bakery_door');
      return;
    }

    // 3. Work hours
    if (time.hour >= this.schedule.workStart && time.hour < this.schedule.lunch) {
      if (this.currentGoal !== 'WORK') {
        this.currentGoal = 'WORK';
        this.currentActionText = `Focusing on ${this.occupation} duties.`;
        this.setDestinationWaypoint(this.workWp);
      }
      return;
    }

    // 4. Lunch break
    if (time.hour >= this.schedule.lunch && time.hour < this.schedule.lunch + 1) {
      if (this.currentGoal !== 'LUNCH') {
        this.currentGoal = 'LUNCH';
        this.currentActionText = 'Taking a relaxing midday lunch break.';
        this.setDestinationWaypoint(Math.random() > 0.5 ? 'tavern_door' : 'sq_center');
      }
      return;
    }

    // 5. Afternoon Market / Errand time
    if (time.hour >= this.schedule.market && time.hour < this.schedule.market + 2) {
      if (this.currentGoal !== 'MARKET') {
        this.currentGoal = 'MARKET';
        this.currentActionText = 'Visiting the village marketplace.';
        this.currentThought = 'Time to check the market stalls and see what neighbors are offering.';
        this.setDestinationWaypoint(this.marketWp);
      }
      return;
    }

    // 6. Social time / Leisure
    if (this.social < 45 || Math.random() < 0.2) {
      this.currentGoal = 'SOCIALIZE';
      this.currentActionText = 'Strolling through the village looking for friends.';
      // pick a friend to visit or town square
      const bestFriendId = Object.keys(this.relationships).reduce((best, curr) => 
        (this.relationships[curr] > (this.relationships[best] || -999) ? curr : best), null);
      
      const friendObj = window.villageApp?.villagers.find(v => v.id === bestFriendId);
      if (friendObj && Math.random() > 0.4) {
        this.setDestinationWaypoint(friendObj.doorWp);
      } else {
        this.setDestinationWaypoint('sq_center');
      }
      return;
    }

    // Default: Work or stroll
    if (this.currentGoal === 'IDLE' || this.pathWaypoints.length === 0) {
      this.currentGoal = 'STROLL';
      this.currentActionText = 'Taking a peaceful walk around the village grounds.';
      const wanderWps = ['sq_center', 'gardens_spot', 'dock_spot', 'sheep_spot'];
      const chosen = wanderWps[Math.floor(Math.random() * wanderWps.length)];
      this.setDestinationWaypoint(chosen);
    }
  }

  setDestinationWaypoint(targetWpId) {
    const currentNearest = getNearestWaypoint(this.x, this.y);
    const path = findWaypointPath(currentNearest.id, targetWpId);
    this.pathWaypoints = path;
  }

  update(dt, time) {
    // 1. Needs Decay & Regen
    // dt scaled with speedMultiplier
    const rate = dt * 0.08;

    if (this.currentGoal === 'SLEEP') {
      this.energy = Math.min(100, this.energy + rate * 3.5);
      this.hunger = Math.max(0, this.hunger - rate * 0.3);
      this.setEmote('💤', 2);
    } else {
      this.energy = Math.max(0, this.energy - rate * 0.8);
      this.hunger = Math.max(0, this.hunger - rate * 1.0);
      this.social = Math.max(0, this.social - rate * 0.6);
    }

    // Cooldowns
    if (this.interactionCooldown > 0) this.interactionCooldown -= dt;
    if (this.emote) {
      this.emote.timer -= dt;
      if (this.emote.timer <= 0) this.emote = null;
    }

    // Work production logic
    if (this.currentGoal === 'WORK' && Math.random() < 0.005 * dt * 30) {
      if (this.primaryGood) {
        this.inventory[this.primaryGood] = (this.inventory[this.primaryGood] || 0) + 1;
        this.addMemory({
          day: time.day,
          time: time.getTimeString(),
          type: 'WORK',
          subjectId: this.id,
          subjectName: this.name,
          details: `Produced a fresh batch of ${ITEMS[this.primaryGood]?.name || this.primaryGood}.`,
          sentiment: 'positive',
          impact: 3
        });
        this.setEmote('✨', 2.5);
      }
    }

    // Update Mood Badge based on needs
    if (this.hunger < 25) this.moodBadge = 'Starving';
    else if (this.energy < 25) this.moodBadge = 'Exhausted';
    else if (this.social < 25) this.moodBadge = 'Lonely';
    else if (this.happiness > 80) this.moodBadge = 'Joyful';
    else if (this.happiness < 40) this.moodBadge = 'Discontent';
    else this.moodBadge = 'Content';

    // 2. Movement Logic along Waypoint Path
    if (this.pathWaypoints.length > 0) {
      const nextWpId = this.pathWaypoints[0];
      const targetWp = WORLD_DATA.waypoints.find(w => w.id === nextWpId);

      if (targetWp) {
        const dx = targetWp.x - this.x;
        const dy = targetWp.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
          // Reached waypoint
          this.x = targetWp.x;
          this.y = targetWp.y;
          this.currentWaypointId = nextWpId;
          this.pathWaypoints.shift();
          if (this.pathWaypoints.length === 0) {
            this.isMoving = false;
          }
        } else {
          this.isMoving = true;
          const step = Math.min(dist, this.moveSpeed * dt * time.speedMultiplier);
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;

          // Facing direction
          if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
          } else {
            this.facing = dy > 0 ? 'down' : 'up';
          }

          // Walk animation frames
          this.walkTimer += dt * 8 * time.speedMultiplier;
          if (this.walkTimer >= 1) {
            this.walkTimer = 0;
            this.walkFrame = (this.walkFrame + 1) % 4;
          }
        }
      }
    } else {
      this.isMoving = false;
      this.walkFrame = 0;
    }
  }

  /* Draw Villager Sprite programmatically using Canvas */
  draw(ctx, isSelected = false) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));

    // Selection Halo
    if (isSelected) {
      ctx.beginPath();
      ctx.ellipse(0, 4, 18, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230, 175, 46, 0.45)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e6af2e';
      ctx.stroke();
    }

    // Soft Shadow
    ctx.beginPath();
    ctx.ellipse(0, 3, 11, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();

    // Walking bobbing offset
    const bob = this.isMoving ? (this.walkFrame % 2 === 0 ? -1 : 1) : 0;
    const legOffset = this.isMoving ? (this.walkFrame === 1 ? -3 : (this.walkFrame === 3 ? 3 : 0)) : 0;

    // Legs / Feet
    ctx.fillStyle = '#222';
    // Left foot
    ctx.fillRect(-5, 0 + legOffset, 4, 4);
    // Right foot
    ctx.fillRect(1, 0 - legOffset, 4, 4);

    // Torso / Clothing
    ctx.fillStyle = this.clothesColor || '#457b9d';
    ctx.fillRect(-6, -14 + bob, 12, 14);

    // Apron or accessories
    if (this.occupation === 'Baker' || this.occupation === 'Potter') {
      ctx.fillStyle = this.apronColor || '#ffffff';
      ctx.fillRect(-4, -11 + bob, 8, 11);
    } else if (this.occupation === 'Blacksmith') {
      ctx.fillStyle = '#343a40';
      ctx.fillRect(-5, -12 + bob, 10, 12);
    } else if (this.occupation === 'Herbalist' || this.occupation === 'Florist') {
      ctx.fillStyle = '#2d6a4f';
      ctx.fillRect(-5, -6 + bob, 10, 3); // Belt
    }

    // Arms
    ctx.fillStyle = this.clothesColor || '#457b9d';
    ctx.fillRect(-8, -13 + bob - legOffset * 0.5, 3, 9);
    ctx.fillRect(5, -13 + bob + legOffset * 0.5, 3, 9);

    // Hands
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(-8, -4 + bob - legOffset * 0.5, 3, 3);
    ctx.fillRect(5, -4 + bob + legOffset * 0.5, 3, 3);

    // Head
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(-5, -23 + bob, 10, 10);

    // Hair
    ctx.fillStyle = this.hairColor || '#5c3d28';
    if (this.age > 60) {
      // Scholar silver hair & beard
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-6, -25 + bob, 12, 5);
      ctx.fillRect(-5, -16 + bob, 10, 6); // Beard
    } else {
      ctx.fillRect(-6, -26 + bob, 12, 5);
      if (this.facing === 'left') ctx.fillRect(-7, -24 + bob, 3, 7);
      else if (this.facing === 'right') ctx.fillRect(4, -24 + bob, 3, 7);
      else ctx.fillRect(-6, -24 + bob, 2, 7);
    }

    // Headwear / Hats
    if (this.occupation === 'Baker') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -29 + bob, 12, 5);
      ctx.fillRect(-4, -32 + bob, 8, 4);
    } else if (this.occupation === 'Farmer') {
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(-9, -26 + bob, 18, 3);
      ctx.fillRect(-5, -30 + bob, 10, 4);
    } else if (this.occupation === 'Florist') {
      // Flower crown
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(-5, -26 + bob, 2, 2);
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(-1, -26 + bob, 2, 2);
      ctx.fillStyle = '#06d6a0';
      ctx.fillRect(3, -26 + bob, 2, 2);
    }

    // Face / Eyes
    ctx.fillStyle = '#1e293b';
    if (this.facing === 'left') {
      ctx.fillRect(-4, -20 + bob, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(2, -20 + bob, 2, 2);
    } else {
      ctx.fillRect(-3, -20 + bob, 2, 2);
      ctx.fillRect(1, -20 + bob, 2, 2);
    }

    // Floating Emote Bubble
    if (this.emote && window.villageApp?.showEmotes) {
      ctx.save();
      ctx.translate(0, -38 + bob);
      // Bubble bg
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2d3748';
      ctx.stroke();

      // Bubble pointer
      ctx.beginPath();
      ctx.moveTo(-3, 10);
      ctx.lineTo(0, 14);
      ctx.lineTo(3, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Emote Icon
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emote.icon, 0, 1);
      ctx.restore();
    }

    // Floating Nameplate
    if (window.villageApp?.showNames) {
      ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      const nameWidth = ctx.measureText(this.name).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(-nameWidth / 2 - 4, 7, nameWidth + 8, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.name, 0, 16);
    }

    ctx.restore();
  }
}

/* ============================================================================
   10. INTERACTION & SOCIAL DIALOGUE ENGINE
   ============================================================================ */

class SocialEngine {
  static checkAndTriggerInteractions(villagers, time, rumorSystem) {
    const len = villagers.length;

    for (let i = 0; i < len; i++) {
      const v1 = villagers[i];
      if (v1.currentGoal === 'SLEEP' || v1.interactionCooldown > 0) continue;

      for (let j = i + 1; j < len; j++) {
        const v2 = villagers[j];
        if (v2.currentGoal === 'SLEEP' || v2.interactionCooldown > 0) continue;

        const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y);
        if (dist <= CONFIG.INTERACTION_RANGE) {
          SocialEngine.resolveInteraction(v1, v2, time, rumorSystem);
          v1.interactionCooldown = 7; // cooldown in simulation seconds
          v2.interactionCooldown = 7;
          return; // one interaction per tick to avoid spam
        }
      }
    }
  }

  static resolveInteraction(v1, v2, time, rumorSystem) {
    const rel1to2 = v1.getRelationship(v2.id);
    const rel2to1 = v2.getRelationship(v1.id);
    const avgRel = (rel1to2 + rel2to1) / 2;

    // Pick interaction type based on relationship, needs, and personality
    const roll = Math.random();

    // 1. Apology if previous conflict existed
    if (avgRel < 0 && (v1.personality === 'Friendly' || v2.personality === 'Generous') && roll < 0.35) {
      SocialEngine.conductApology(v1, v2, time);
      return;
    }

    // 2. Argument / Dispute if personality clash or rival
    if (avgRel < 5 && (v1.personality === 'Stubborn' || v1.personality === 'Jealous' || v2.personality === 'Stubborn') && roll < 0.35) {
      SocialEngine.conductArgument(v1, v2, time, rumorSystem);
      return;
    }

    // 3. Trade if at market or someone needs food/resources
    if (time.hour >= 11 && time.hour <= 18 && roll < 0.5) {
      const tradeDone = SocialEngine.conductTrade(v1, v2, time);
      if (tradeDone) return;
    }

    // 4. Share Rumor / Gossip
    if (rumorSystem.rumors.length > 0 && roll < 0.65) {
      const gossiped = SocialEngine.conductGossip(v1, v2, time, rumorSystem);
      if (gossiped) return;
    }

    // 5. Friendly Gift or Sharing Food
    if ((v1.personality === 'Generous' || v2.personality === 'Generous' || avgRel > 40) && roll < 0.8) {
      const gifted = SocialEngine.conductGift(v1, v2, time);
      if (gifted) return;
    }

    // 6. Default: Warm Friendly Chat
    SocialEngine.conductChat(v1, v2, time);
  }

  static conductChat(v1, v2, time) {
    v1.setEmote('💬');
    v2.setEmote('💬');
    v1.social = Math.min(100, v1.social + 15);
    v2.social = Math.min(100, v2.social + 15);
    v1.happiness = Math.min(100, v1.happiness + 5);
    v2.happiness = Math.min(100, v2.happiness + 5);

    v1.modifyRelationship(v2.id, 4, 'Pleasant conversation');
    v2.modifyRelationship(v1.id, 4, 'Pleasant conversation');

    const topics = [
      'the upcoming harvest and weather',
      'recent news from the wandering merchants',
      'the quiet beauty of the village pond',
      'recipes and cozy hearth traditions'
    ];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    v1.showDialogueBubble(v2.name, `We chatted about ${topic}.`);
    v2.showDialogueBubble(v1.name, `We shared thoughts about ${topic}.`);

    v1.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'CHAT',
      subjectId: v2.id,
      subjectName: v2.name,
      details: `Enjoyed a lovely conversation with ${v2.name} regarding ${topic}.`,
      sentiment: 'positive',
      impact: 3
    });

    v2.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'CHAT',
      subjectId: v1.id,
      subjectName: v1.name,
      details: `Shared a friendly chat with ${v1.name} about ${topic}.`,
      sentiment: 'positive',
      impact: 3
    });

    window.villageApp?.addFeedEvent({
      type: 'social',
      category: 'Chat',
      text: `${v1.name} and ${v2.name} paused by the path to chat about ${topic}.`,
      villager1: v1.id,
      villager2: v2.id
    });
  }

  static conductGift(v1, v2, time) {
    const giver = v1.personality === 'Generous' ? v1 : v2;
    const receiver = giver === v1 ? v2 : v1;

    // Check if giver has bread, vegetables, or flowers to share
    const giftItems = ['FLOWERS', 'BREAD', 'VEGETABLES', 'STEW'];
    let chosenItem = null;
    for (const item of giftItems) {
      if (giver.inventory[item] && giver.inventory[item] > 1) {
        chosenItem = item;
        break;
      }
    }

    if (!chosenItem) return false;

    giver.inventory[chosenItem]--;
    receiver.inventory[chosenItem] = (receiver.inventory[chosenItem] || 0) + 1;

    giver.setEmote('❤️');
    receiver.setEmote('❤️');

    giver.modifyRelationship(receiver.id, 8, `Gifted ${ITEMS[chosenItem].name}`);
    receiver.modifyRelationship(giver.id, 14, `Received ${ITEMS[chosenItem].name}`);

    giver.happiness = Math.min(100, giver.happiness + 10);
    receiver.happiness = Math.min(100, receiver.happiness + 15);

    receiver.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'GIFT',
      subjectId: giver.id,
      subjectName: giver.name,
      details: `${giver.name} warmly offered me ${ITEMS[chosenItem].name} without asking for anything in return.`,
      sentiment: 'positive',
      impact: 8
    });

    giver.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'GIFT',
      subjectId: receiver.id,
      subjectName: receiver.name,
      details: `Shared a ${ITEMS[chosenItem].name} with ${receiver.name} to brighten their day.`,
      sentiment: 'positive',
      impact: 6
    });

    window.villageApp?.addFeedEvent({
      type: 'social',
      category: 'Gift',
      text: `${giver.name} presented a thoughtful gift of ${ITEMS[chosenItem].name} to ${receiver.name}!`,
      villager1: giver.id,
      villager2: receiver.id
    });

    return true;
  }

  static conductTrade(v1, v2, time) {
    // Determine who has goods to sell
    const seller = (v1.primaryGood && v1.inventory[v1.primaryGood] > 0) ? v1 :
                   ((v2.primaryGood && v2.inventory[v2.primaryGood] > 0) ? v2 : null);
    if (!seller) return false;

    const buyer = seller === v1 ? v2 : v1;
    const goodId = seller.primaryGood;
    const itemDef = ITEMS[goodId];
    if (!itemDef) return false;

    let price = itemDef.basePrice;
    if (seller.personality === 'Greedy') price += 2;
    if (seller.personality === 'Generous') price = Math.max(1, price - 2);

    if (buyer.wealth < price) return false;

    // Execute trade
    seller.inventory[goodId]--;
    buyer.inventory[goodId] = (buyer.inventory[goodId] || 0) + 1;
    buyer.wealth -= price;
    seller.wealth += price;

    seller.setEmote('🤝');
    buyer.setEmote('🤝');

    seller.modifyRelationship(buyer.id, 5, 'Honest trade transaction');
    buyer.modifyRelationship(seller.id, 5, 'Fair exchange of goods');

    const desc = `${buyer.name} purchased ${itemDef.name} from ${seller.name} for ${price} gold.`;
    buyer.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'TRADE',
      subjectId: seller.id,
      subjectName: seller.name,
      details: `Bought ${itemDef.name} from ${seller.name} for ${price} gold.`,
      sentiment: 'positive',
      impact: 4
    });

    seller.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'TRADE',
      subjectId: buyer.id,
      subjectName: buyer.name,
      details: `Sold ${itemDef.name} to ${buyer.name} for ${price} gold.`,
      sentiment: 'positive',
      impact: 4
    });

    window.villageApp?.addFeedEvent({
      type: 'trade',
      category: 'Trade',
      text: desc,
      villager1: buyer.id,
      villager2: seller.id
    });

    return true;
  }

  static conductGossip(v1, v2, time, rumorSystem) {
    // Pick an existing rumor
    const rumor = rumorSystem.rumors[Math.floor(Math.random() * rumorSystem.rumors.length)];
    if (!rumor || rumor.subjectId === v1.id || rumor.subjectId === v2.id) return false;

    v1.setEmote('🗣️');
    v2.setEmote('❗');

    const result = rumorSystem.propagateRumor(rumor, v1, v2);
    if (!result) return false;

    const reactionText = result.believed
      ? `${v2.name} listened with wide eyes and took the rumor to heart.`
      : `${v2.name} frowned and defended ${rumor.subjectName}, refusing to believe the whisper.`;

    v2.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'RUMOR',
      subjectId: rumor.subjectId,
      subjectName: rumor.subjectName,
      details: `Heard from ${v1.name}: "${rumor.text}".`,
      sentiment: result.believed ? 'negative' : 'neutral',
      impact: 6
    });

    window.villageApp?.addFeedEvent({
      type: 'rumors',
      category: 'Rumor',
      text: `${v1.name} whispered gossip to ${v2.name} regarding ${rumor.subjectName}. ${reactionText}`,
      villager1: v1.id,
      villager2: v2.id
    });

    return true;
  }

  static conductArgument(v1, v2, time, rumorSystem) {
    v1.setEmote('⚡');
    v2.setEmote('⚡');

    v1.happiness = Math.max(0, v1.happiness - 12);
    v2.happiness = Math.max(0, v2.happiness - 12);

    v1.modifyRelationship(v2.id, -12, 'Bitter argument');
    v2.modifyRelationship(v1.id, -12, 'Bitter argument');

    const causes = [
      'disputed prices of forged tools',
      'unkept promises regarding fence repairs',
      'careless words about each other\'s craftsmanship',
      'cattle straying across pasture borders'
    ];
    const cause = causes[Math.floor(Math.random() * causes.length)];

    v1.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'ARGUMENT',
      subjectId: v2.id,
      subjectName: v2.name,
      details: `Had an angry disagreement with ${v2.name} over ${cause}.`,
      sentiment: 'negative',
      impact: 8
    });

    v2.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'ARGUMENT',
      subjectId: v1.id,
      subjectName: v1.name,
      details: `Exchanged bitter words with ${v1.name} concerning ${cause}.`,
      sentiment: 'negative',
      impact: 8
    });

    // Start a new village rumor from this dispute!
    rumorSystem.createRumorFromEvent({
      originalDay: time.day,
      eventType: 'conflict',
      sourceVillager: v1,
      subjectVillager: v2,
      baseText: `Word has it that ${v1.name} and ${v2.name} had a loud falling out over ${cause}!`
    });

    window.villageApp?.addFeedEvent({
      type: 'conflict',
      category: 'Conflict',
      text: `${v1.name} and ${v2.name} clashed in a heated dispute regarding ${cause}!`,
      villager1: v1.id,
      villager2: v2.id
    });
  }

  static conductApology(v1, v2, time) {
    const apologizer = v1.personality === 'Friendly' ? v1 : v2;
    const recipient = apologizer === v1 ? v2 : v1;

    apologizer.setEmote('🤝');
    recipient.setEmote('❤️');

    apologizer.modifyRelationship(recipient.id, 10, 'Offered heartfelt apology');
    recipient.modifyRelationship(apologizer.id, 14, 'Accepted apology');

    apologizer.happiness = Math.min(100, apologizer.happiness + 8);
    recipient.happiness = Math.min(100, recipient.happiness + 10);

    apologizer.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'APOLOGY',
      subjectId: recipient.id,
      subjectName: recipient.name,
      details: `Approached ${recipient.name} to apologize for past harshness and clear the air.`,
      sentiment: 'positive',
      impact: 7
    });

    recipient.addMemory({
      day: time.day,
      time: time.getTimeString(),
      type: 'APOLOGY',
      subjectId: apologizer.id,
      subjectName: apologizer.name,
      details: `${apologizer.name} humbly apologized for past tension. We shook hands in peace.`,
      sentiment: 'positive',
      impact: 7
    });

    window.villageApp?.addFeedEvent({
      type: 'social',
      category: 'Peace',
      text: `${apologizer.name} apologized to ${recipient.name}, gently mending their strained bond.`,
      villager1: apologizer.id,
      villager2: recipient.id
    });
  }
}

/* ============================================================================
   11. WORLD RENDERER (CANVAS MAP, SCENERY, LIGHTING & PARTICLES)
   ============================================================================ */

class WorldRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Camera Pan & Zoom
    this.camX = 900;
    this.camY = 650;
    this.zoom = 1.0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Particle Systems: Chimney Smoke, Pond Ripple, Windmill Angle
    this.particles = [];
    this.windmillAngle = 0;
    this.waterTime = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  screenToWorld(screenX, screenY) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    return {
      x: (screenX - cx) / this.zoom + this.camX,
      y: (screenY - cy) / this.zoom + this.camY
    };
  }

  worldToScreen(worldX, worldY) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    return {
      x: (worldX - this.camX) * this.zoom + cx,
      y: (worldY - this.camY) * this.zoom + cy
    };
  }

  render(simulation) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center camera
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Terrain & Grass Ground
    this.drawTerrain(ctx);

    // 2. Walking Paths & Roads
    this.drawPaths(ctx);

    // 3. Water Pond & Dock
    this.drawPond(ctx);

    // 4. Crop Fields & Farmland
    this.drawFarmland(ctx);

    // 5. Sheep Pasture & Animals
    this.drawPasture(ctx);

    // 6. Flower Gardens
    this.drawGardens(ctx);

    // 7. Forest & Trees (Behind or static)
    this.drawForest(ctx);

    // 8. Town Square & Market Stalls & Fountain
    this.drawMarket(ctx);

    // 9. Buildings & Houses
    this.drawBuildings(ctx, simulation.time);

    // 10. Smoke Particles
    this.updateAndDrawParticles(ctx);

    // 11. Villagers
    const selectedId = simulation.selectedVillager?.id;
    // Sort villagers by Y for isometric depth sorting!
    const sortedVillagers = [...simulation.villagers].sort((a, b) => a.y - b.y);
    sortedVillagers.forEach(v => {
      v.draw(ctx, v.id === selectedId);
    });

    // 12. Day/Night Lighting Filter
    this.drawLightingOverlay(ctx, simulation.time);

    ctx.restore();
  }

  drawTerrain(ctx) {
    // Rich Cozy Grass
    ctx.fillStyle = '#4c7a52';
    ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

    // Subtle grass texture patches
    ctx.fillStyle = '#45704a';
    for (let x = 40; x < CONFIG.WORLD_WIDTH; x += 180) {
      for (let y = 50; y < CONFIG.WORLD_HEIGHT; y += 170) {
        ctx.beginPath();
        ctx.arc(x + Math.sin(y) * 20, y, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Wildflowers dotted across grass
    ctx.fillStyle = '#fef08a';
    const flowerCoords = [
      [220, 150], [280, 190], [550, 220], [720, 180], [1250, 180],
      [820, 840], [920, 920], [1050, 860], [420, 780], [330, 720]
    ];
    flowerCoords.forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawPaths(ctx) {
    // Cobblestone / Dirt Path Network
    ctx.strokeStyle = '#c2a681';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Central North-South avenue
    ctx.moveTo(995, 290);
    ctx.lineTo(995, 780);
    ctx.lineTo(850, 880);
    ctx.lineTo(650, 985);

    // East-West central road
    ctx.moveTo(240, 355);
    ctx.lineTo(490, 445);
    ctx.lineTo(700, 440);
    ctx.lineTo(995, 530);
    ctx.lineTo(1280, 645);
    ctx.lineTo(1540, 450);
    ctx.lineTo(1660, 455);

    // Tavern & Farm branch
    ctx.moveTo(850, 645);
    ctx.lineTo(515, 710);
    ctx.lineTo(480, 820);
    ctx.lineTo(255, 965);
    ctx.lineTo(260, 1080);

    // South-East branch (Selah & Finn & Pond)
    ctx.moveTo(995, 770);
    ctx.lineTo(1150, 820);
    ctx.lineTo(1230, 975);
    ctx.lineTo(1395, 1080);
    ctx.stroke();

    // Subtle cobblestone stepping pattern overlay
    ctx.strokeStyle = '#b09470';
    ctx.lineWidth = 2;
    for (let py = 350; py < 800; py += 32) {
      ctx.beginPath();
      ctx.arc(995 + ((py % 64 === 0) ? -4 : 4), py, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawPond(ctx) {
    const { pond } = WORLD_DATA;
    this.waterTime += 0.02;

    // Pond shoreline border
    ctx.beginPath();
    ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2 + 10, pond.h / 2 + 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#52796f';
    ctx.fill();

    // Water base
    ctx.beginPath();
    ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      pond.x + pond.w / 2, pond.y + pond.h / 2, 20,
      pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2
    );
    grad.addColorStop(0, '#3a86a8');
    grad.addColorStop(1, '#1d3557');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#84a98c';
    ctx.stroke();

    // Animated gentle water waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const wy = pond.y + 40 + i * 40;
      const waveShift = Math.sin(this.waterTime + i) * 12;
      ctx.beginPath();
      ctx.moveTo(pond.x + 60 + waveShift, wy);
      ctx.quadraticCurveTo(pond.x + pond.w / 2, wy + 8, pond.x + pond.w - 60 + waveShift, wy);
      ctx.stroke();
    }

    // Lily pads
    const pads = [
      { x: pond.x + 80, y: pond.y + 70 },
      { x: pond.x + 190, y: pond.y + 130 },
      { x: pond.x + 260, y: pond.y + 80 }
    ];
    pads.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0.2, Math.PI * 1.8);
      ctx.fillStyle = '#2d6a4f';
      ctx.fill();
      // Pink blossom
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y - 2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff758f';
      ctx.fill();
    });

    // Fishing Wooden Pier / Dock
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(pond.dock.x, pond.dock.y, pond.dock.w, pond.dock.h);
    // Planks
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 1.5;
    for (let dy = pond.dock.y + 6; dy < pond.dock.y + pond.dock.h; dy += 8) {
      ctx.beginPath();
      ctx.moveTo(pond.dock.x, dy);
      ctx.lineTo(pond.dock.x + pond.dock.w, dy);
      ctx.stroke();
    }
  }

  drawFarmland(ctx) {
    WORLD_DATA.cropFields.forEach(field => {
      // Tilled brown soil
      ctx.fillStyle = '#5c3d28';
      ctx.fillRect(field.x, field.y, field.w, field.h);

      // Rows
      ctx.fillStyle = '#40291b';
      for (let fy = field.y + 12; fy < field.y + field.h; fy += 18) {
        ctx.fillRect(field.x + 6, fy, field.w - 12, 6);

        // Crop sprigs
        ctx.fillStyle = field.crop === 'wheat' ? '#e9c46a' : '#52b788';
        for (let fx = field.x + 16; fx < field.x + field.w - 12; fx += 16) {
          ctx.beginPath();
          ctx.arc(fx, fy + 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#40291b';
      }

      // Wooden border fence
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 3;
      ctx.strokeRect(field.x, field.y, field.w, field.h);
    });

    // Rotating Windmill
    const { windmill } = WORLD_DATA;
    this.windmillAngle += 0.015;

    // Windmill base
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(windmill.x + 15, windmill.y + windmill.h);
    ctx.lineTo(windmill.x + 25, windmill.y + 20);
    ctx.lineTo(windmill.x + windmill.w - 25, windmill.y + 20);
    ctx.lineTo(windmill.x + windmill.w - 15, windmill.y + windmill.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Windmill roof cone
    ctx.beginPath();
    ctx.moveTo(windmill.x + windmill.w / 2, windmill.y - 5);
    ctx.lineTo(windmill.x + 20, windmill.y + 20);
    ctx.lineTo(windmill.x + windmill.w - 20, windmill.y + 20);
    ctx.closePath();
    ctx.fillStyle = '#9c6644';
    ctx.fill();

    // Windmill Rotating Sails
    ctx.save();
    ctx.translate(windmill.x + windmill.w / 2, windmill.y + 20);
    ctx.rotate(this.windmillAngle);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 3;
    for (let a = 0; a < 4; a++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 42);
      ctx.stroke();
      // Canvas cloth blade
      ctx.fillStyle = 'rgba(243, 244, 246, 0.85)';
      ctx.fillRect(2, 10, 10, 28);
    }
    ctx.restore();
  }

  drawPasture(ctx) {
    const { sheepPen } = WORLD_DATA;
    // Wooden fence enclosure
    ctx.strokeStyle = '#9c6644';
    ctx.lineWidth = 3;
    ctx.strokeRect(sheepPen.x, sheepPen.y, sheepPen.w, sheepPen.h);

    // Sheep (3 fluffy cute sheep)
    const sheepPositions = [
      { x: sheepPen.x + 35, y: sheepPen.y + 40 },
      { x: sheepPen.x + 80, y: sheepPen.y + 55 },
      { x: sheepPen.x + 50, y: sheepPen.y + 90 }
    ];

    sheepPositions.forEach(s => {
      // White fluffy body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      // Black head
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(s.x + 7, s.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawGardens(ctx) {
    const { gardens } = WORLD_DATA;
    ctx.fillStyle = '#588157';
    ctx.fillRect(gardens.x, gardens.y, gardens.w, gardens.h);

    // Rose & Lavender rows
    const flowerColors = ['#ff4d6d', '#9d4edd', '#ffb703', '#ffffff'];
    flowerColors.forEach((color, i) => {
      ctx.fillStyle = color;
      for (let gx = gardens.x + 15; gx < gardens.x + gardens.w - 10; gx += 18) {
        ctx.beginPath();
        ctx.arc(gx, gardens.y + 25 + i * 24, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Stone Birdbath in center of gardens
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(gardens.x + gardens.w / 2, gardens.y + gardens.h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(gardens.x + gardens.w / 2, gardens.y + gardens.h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawForest(ctx) {
    // North-East / East Forest Grove
    const trees = [
      { x: 1620, y: 160, r: 24, type: 'pine' },
      { x: 1690, y: 190, r: 28, type: 'oak' },
      { x: 1750, y: 140, r: 26, type: 'pine' },
      { x: 1740, y: 250, r: 30, type: 'oak' },
      { x: 1670, y: 270, r: 25, type: 'pine' },
      { x: 1760, y: 380, r: 28, type: 'oak' },
      { x: 1710, y: 480, r: 26, type: 'pine' },
      { x: 1630, y: 560, r: 27, type: 'oak' },
      { x: 1690, y: 620, r: 25, type: 'pine' },
      // Other scattered trees
      { x: 380, y: 210, r: 22, type: 'oak' },
      { x: 740, y: 230, r: 25, type: 'oak' },
      { x: 1300, y: 180, r: 24, type: 'pine' },
      { x: 1220, y: 1120, r: 28, type: 'willow' }
    ];

    trees.forEach(t => {
      // Trunk shadow
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + t.r * 0.7, t.r * 0.6, t.r * 0.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Tree Trunk
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(t.x - 4, t.y, 8, t.r * 0.8);

      // Canopy
      if (t.type === 'pine') {
        ctx.fillStyle = '#2d6a4f';
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.r * 1.3);
        ctx.lineTo(t.x - t.r * 0.9, t.y + 4);
        ctx.lineTo(t.x + t.r * 0.9, t.y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1b4332';
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.r * 0.8);
        ctx.lineTo(t.x - t.r, t.y + 8);
        ctx.lineTo(t.x + t.r, t.y + 8);
        ctx.closePath();
        ctx.fill();
      } else if (t.type === 'willow') {
        ctx.fillStyle = '#52b788';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 6, t.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Oak lush round canopy
        ctx.fillStyle = '#40916c';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 6, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#52b788';
        ctx.beginPath();
        ctx.arc(t.x - 4, t.y - 10, t.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawMarket(ctx) {
    const { fountain, marketStalls } = WORLD_DATA;

    // Market Plaza Cobblestone Platform
    ctx.fillStyle = '#d4b996';
    ctx.fillRect(860, 540, 270, 220);
    ctx.strokeStyle = '#a68a68';
    ctx.lineWidth = 3;
    ctx.strokeRect(860, 540, 270, 220);

    // Stalls with striped awnings
    marketStalls.forEach(s => {
      // Table base
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(s.x, s.y + 16, s.w, s.h - 16);

      // Striped Awning
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, 16);
      ctx.fillStyle = '#ffffff';
      for (let sx = s.x + 8; sx < s.x + s.w; sx += 16) {
        ctx.fillRect(sx, s.y, 8, 16);
      }

      // Displayed good icon on table
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const goodDef = ITEMS[s.good];
      if (goodDef) {
        ctx.fillText(goodDef.icon, s.x + s.w / 2, s.y + 30);
      }
    });

    // Center Fountain
    ctx.beginPath();
    ctx.arc(fountain.x, fountain.y, fountain.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    // Fountain water
    ctx.beginPath();
    ctx.arc(fountain.x, fountain.y, fountain.radius - 5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Center fountain pillar & water plume
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(fountain.x - 3, fountain.y - 8, 6, 16);
    ctx.beginPath();
    ctx.arc(fountain.x, fountain.y - 10, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
  }

  drawBuildings(ctx, time) {
    const isNight = time.isNight();

    WORLD_DATA.buildings.forEach(b => {
      // House Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(b.x + 6, b.y + b.h - 4, b.w, 12);

      // Wall
      ctx.fillStyle = b.wallColor || '#c8a47e';
      ctx.fillRect(b.x, b.y + 30, b.w, b.h - 30);

      // Wall details: timber beams
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y + 30, b.w, b.h - 30);

      // Roof (gabled shingle roof)
      ctx.beginPath();
      ctx.moveTo(b.x - 8, b.y + 34);
      ctx.lineTo(b.x + b.w / 2, b.y - 6);
      ctx.lineTo(b.x + b.w + 8, b.y + 34);
      ctx.closePath();
      ctx.fillStyle = b.roofColor || '#9c6644';
      ctx.fill();
      ctx.strokeStyle = '#3d2514';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Door
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(b.door.x - 10, b.door.y - 25, 20, 25);
      // Door handle
      ctx.fillStyle = '#e6af2e';
      ctx.beginPath();
      ctx.arc(b.door.x + 5, b.door.y - 12, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Windows
      const winY = b.y + 44;
      const winLeft = b.x + 18;
      const winRight = b.x + b.w - 36;

      [winLeft, winRight].forEach(wx => {
        // Window frame
        ctx.fillStyle = '#3d2514';
        ctx.fillRect(wx - 1, winY - 1, 20, 18);

        // Window pane - Glows warm amber at night!
        if (isNight) {
          ctx.fillStyle = '#fde047';
        } else {
          ctx.fillStyle = '#bae6fd';
        }
        ctx.fillRect(wx, winY, 18, 16);

        // Window mullions
        ctx.strokeStyle = '#3d2514';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + 9, winY);
        ctx.lineTo(wx + 9, winY + 16);
        ctx.moveTo(wx, winY + 8);
        ctx.lineTo(wx + 18, winY + 8);
        ctx.stroke();
      });

      // Chimney
      if (b.chimney) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(b.chimney.x - 6, b.chimney.y - 14, 12, 16);
        ctx.fillStyle = '#334155';
        ctx.fillRect(b.chimney.x - 8, b.chimney.y - 16, 16, 4);

        // Spawn gentle smoke puffs periodically
        if (Math.random() < 0.08) {
          this.particles.push({
            x: b.chimney.x + (Math.random() * 4 - 2),
            y: b.chimney.y - 18,
            vx: (Math.random() - 0.3) * 6,
            vy: -14 - Math.random() * 8,
            radius: 3 + Math.random() * 2,
            alpha: 0.6,
            life: 1.0
          });
        }
      }

      // Building signboard icon
      if (b.sign) {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.sign, b.door.x, b.door.y - 32);
      }
    });
  }

  updateAndDrawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 0.04;
      p.y += p.vy * 0.04;
      p.radius += 0.08;
      p.life -= 0.015;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 225, 230, ${p.life * 0.5})`;
      ctx.fill();
    }
  }

  drawLightingOverlay(ctx, time) {
    const phase = time.getPhase();
    let ambientColor = null;

    if (phase.light === 'dawn') {
      ambientColor = 'rgba(251, 146, 60, 0.15)'; // warm orange/rose
    } else if (phase.light === 'sunset') {
      ambientColor = 'rgba(217, 119, 6, 0.25)'; // deep amber glow
    } else if (phase.light === 'night') {
      ambientColor = 'rgba(10, 18, 45, 0.68)'; // deep dark midnight blue
    }

    if (ambientColor) {
      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    }

    // Lantern Glow at night around market & porches
    if (phase.light === 'night') {
      const lanterns = [
        { x: 995, y: 645 },
        { x: 890, y: 570 },
        { x: 1050, y: 570 },
        { x: 515, y: 710 }, // Tavern
        { x: 490, y: 445 }, // Bakery
        { x: 1360, y: 400 }, // Forge
        { x: 1395, y: 1080 } // Dock
      ];

      lanterns.forEach(l => {
        const glow = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 65);
        glow.addColorStop(0, 'rgba(255, 220, 110, 0.65)');
        glow.addColorStop(1, 'rgba(255, 220, 110, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 65, 0, Math.PI * 2);
        ctx.fill();
      });

      // Floating Fireflies near trees and pond!
      ctx.fillStyle = '#bef264';
      for (let f = 0; f < 8; f++) {
        const fx = 1350 + Math.sin(this.waterTime * 2 + f) * 80;
        const fy = 1120 + Math.cos(this.waterTime * 1.5 + f) * 60;
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ============================================================================
   12. MAIN VILLAGE SIMULATION CONTROLLER
   ============================================================================ */

class VillageSimulation {
  constructor() {
    this.time = new TimeSystem();
    this.rumorSystem = new RumorSystem();
    this.villagers = [];
    this.eventsFeed = [];
    this.selectedVillager = null;
    this.trackingVillager = null;

    this.showNames = true;
    this.showEmotes = true;
    this.lastFrameTime = performance.now();

    this.initVillagers();
    this.initStartingRumor();
  }

  initVillagers() {
    this.villagers = VILLAGERS_DEF.map(def => new Villager(def));
  }

  initStartingRumor() {
    // Add one cozy starter event and rumor to get village society humming
    const bram = this.villagers.find(v => v.id === 'bram');
    const tomas = this.villagers.find(v => v.id === 'tomas');
    if (bram && tomas) {
      this.rumorSystem.createRumorFromEvent({
        originalDay: 1,
        eventType: 'conflict',
        sourceVillager: bram,
        subjectVillager: tomas,
        baseText: "Word has it Bram forged a shovel that Tomas broke in half on day one!"
      });
      this.addFeedEvent({
        type: 'rumors',
        category: 'Rumor',
        text: 'A playful rumor is circulating: Tomas supposedly snapped Bram\'s prized steel spade!',
        villager1: 'bram',
        villager2: 'tomas'
      });
    }
  }

  getVillager(id) {
    return this.villagers.find(v => v.id === id);
  }

  getVillagerName(id) {
    const v = this.getVillager(id);
    return v ? v.name : 'A neighbor';
  }

  addFeedEvent(eventObj) {
    eventObj.id = 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    eventObj.day = this.time.day;
    eventObj.timeStr = this.time.getTimeString();
    this.eventsFeed.unshift(eventObj);
    if (this.eventsFeed.length > CONFIG.MAX_FEED_EVENTS) this.eventsFeed.pop();
    window.villageApp?.uiController?.onFeedUpdated();
  }

  onNewDay(newDay) {
    // At end of day, generate each villager's personal dynamic diary entry!
    this.villagers.forEach(v => {
      const entry = DiarySystem.generateDailyEntry(v, newDay - 1);
      v.diaries.unshift(entry);
    });

    this.addFeedEvent({
      type: 'diary',
      category: 'New Day',
      text: `Dawn breaks over Day ${newDay}. All 12 villagers penned their personal evening journals.`,
      villager1: null,
      villager2: null
    });

    // Auto-save every in-game midnight
    window.villageApp?.saveState();
  }

  update(dt) {
    // 1. Time progression
    this.time.update(dt);

    // 2. Villagers updates & AI checks
    this.villagers.forEach(v => {
      v.evaluateNeedsAndGoals(this.time);
      v.update(dt, this.time);
    });

    // 3. Social Interaction resolver
    SocialEngine.checkAndTriggerInteractions(this.villagers, this.time, this.rumorSystem);

    // 4. Camera Tracking
    if (this.trackingVillager && window.villageApp?.renderer) {
      const target = this.getVillager(this.trackingVillager.id);
      if (target) {
        window.villageApp.renderer.camX += (target.x - window.villageApp.renderer.camX) * 0.08;
        window.villageApp.renderer.camY += (target.y - window.villageApp.renderer.camY) * 0.08;
      }
    }
  }
}

/* ============================================================================
   13. UI CONTROLLER & EVENT LISTENERS
   ============================================================================ */

class UIController {
  constructor(sim, renderer) {
    this.sim = sim;
    this.renderer = renderer;
    this.currentFeedFilter = 'all';

    this.cacheDOMElements();
    this.bindEvents();
    this.renderRosterBar();
  }

  cacheDOMElements() {
    this.clockDisplay = document.getElementById('clock-display');
    this.phaseBadge = document.getElementById('phase-badge');
    this.phaseIcon = document.getElementById('phase-icon');
    this.dayDisplay = document.getElementById('day-display');

    this.btnPause = document.getElementById('btn-pause');
    this.pauseIcon = document.getElementById('pause-icon');
    this.pauseText = document.getElementById('pause-text');
    this.speedBtns = document.querySelectorAll('.speed-btn');

    this.statVillagers = document.getElementById('stat-villagers');
    this.statEvents = document.getElementById('stat-events');
    this.statRumors = document.getElementById('stat-rumors');

    this.feedPanel = document.getElementById('feed-panel');
    this.feedList = document.getElementById('feed-list');
    this.btnToggleFeed = document.getElementById('btn-toggle-feed');
    this.btnCloseFeed = document.getElementById('btn-close-feed');
    this.btnClearFeed = document.getElementById('btn-clear-feed');
    this.filterChips = document.querySelectorAll('.filter-chip');

    this.rosterScroll = document.getElementById('roster-scroll-container');
    this.tooltip = document.getElementById('hover-tooltip');

    // Inspector Modal
    this.inspectorModal = document.getElementById('inspector-modal');
    this.btnCloseInspector = document.getElementById('btn-close-inspector');
    this.btnCloseInspectorFooter = document.getElementById('btn-close-inspector-footer');
    this.btnTrackVillager = document.getElementById('btn-track-villager');
    this.inspectorTabs = document.querySelectorAll('.inspector-tabs .tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Canvas floating controls
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnToggleNames = document.getElementById('btn-toggle-names');
    this.btnToggleEmotes = document.getElementById('btn-toggle-emotes');
    this.btnCenterCam = document.getElementById('btn-center-cam');
    this.btnSave = document.getElementById('btn-save');
    this.btnReset = document.getElementById('btn-reset');
  }

  bindEvents() {
    // Time controls
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sim.time.speedMultiplier = parseInt(btn.dataset.speed, 10);
      });
    });

    // Camera Floating buttons
    this.btnZoomIn.addEventListener('click', () => {
      this.renderer.zoom = Math.min(2.0, this.renderer.zoom + 0.2);
    });
    this.btnZoomOut.addEventListener('click', () => {
      this.renderer.zoom = Math.max(0.5, this.renderer.zoom - 0.2);
    });
    this.btnCenterCam.addEventListener('click', () => {
      this.sim.trackingVillager = null;
      this.renderer.camX = 995;
      this.renderer.camY = 645;
      this.renderer.zoom = 1.0;
    });

    this.btnToggleNames.addEventListener('click', () => {
      this.sim.showNames = !this.sim.showNames;
      this.btnToggleNames.classList.toggle('active', this.sim.showNames);
    });
    this.btnToggleEmotes.addEventListener('click', () => {
      this.sim.showEmotes = !this.sim.showEmotes;
      this.btnToggleEmotes.classList.toggle('active', this.sim.showEmotes);
    });

    // Save & Reset
    this.btnSave.addEventListener('click', () => {
      window.villageApp.saveState();
      alert('Village simulation state saved successfully!');
    });
    this.btnReset.addEventListener('click', () => {
      if (confirm('Reset village simulation to fresh start? All progress and memories will be reset.')) {
        window.villageApp.resetState();
      }
    });

    // Feed Drawer controls
    this.btnToggleFeed.addEventListener('click', () => {
      this.feedPanel.classList.toggle('open');
    });
    this.btnCloseFeed.addEventListener('click', () => {
      this.feedPanel.classList.remove('open');
    });
    this.btnClearFeed.addEventListener('click', () => {
      this.sim.eventsFeed = [];
      this.onFeedUpdated();
    });
    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFeedFilter = chip.dataset.filter;
        this.onFeedUpdated();
      });
    });

    // Inspector Close & Tabs
    this.btnCloseInspector.addEventListener('click', () => this.closeInspector());
    this.btnCloseInspectorFooter.addEventListener('click', () => this.closeInspector());
    this.btnTrackVillager.addEventListener('click', () => {
      if (this.sim.selectedVillager) {
        this.sim.trackingVillager = this.sim.selectedVillager;
        this.closeInspector();
      }
    });

    this.inspectorTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.inspectorTabs.forEach(t => t.classList.remove('active'));
        this.tabPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetPane = document.getElementById(tab.dataset.tab);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Canvas Click & Drag Navigation
    const canvas = this.renderer.canvas;

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.renderer.isDragging = true;
        this.renderer.dragStartX = e.clientX;
        this.renderer.dragStartY = e.clientY;
      }
    });

    window.addEventListener('mousemove', e => {
      if (this.renderer.isDragging) {
        const dx = (e.clientX - this.renderer.dragStartX) / this.renderer.zoom;
        const dy = (e.clientY - this.renderer.dragStartY) / this.renderer.zoom;
        this.renderer.camX -= dx;
        this.renderer.camY -= dy;
        this.renderer.dragStartX = e.clientX;
        this.renderer.dragStartY = e.clientY;
        this.sim.trackingVillager = null; // stop auto-tracking when user drags
      } else {
        this.handleCanvasHover(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.renderer.isDragging = false;
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.renderer.zoom = Math.max(0.4, Math.min(2.2, this.renderer.zoom * zoomFactor));
    });

    canvas.addEventListener('click', e => {
      this.handleCanvasClick(e);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.renderer.camY -= 30 / this.renderer.zoom;
        this.sim.trackingVillager = null;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.renderer.camY += 30 / this.renderer.zoom;
        this.sim.trackingVillager = null;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.renderer.camX -= 30 / this.renderer.zoom;
        this.sim.trackingVillager = null;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.renderer.camX += 30 / this.renderer.zoom;
        this.sim.trackingVillager = null;
      } else if (e.code === 'Escape') {
        this.closeInspector();
      }
    });
  }

  togglePause() {
    this.sim.time.isPaused = !this.sim.time.isPaused;
    this.pauseIcon.textContent = this.sim.time.isPaused ? '▶️' : '⏸️';
    this.pauseText.textContent = this.sim.time.isPaused ? 'Resume' : 'Pause';
  }

  handleCanvasClick(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const worldPos = this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    // Check if a villager was clicked
    let clickedVillager = null;
    for (const v of this.sim.villagers) {
      const d = Math.hypot(v.x - worldPos.x, v.y - worldPos.y);
      if (d <= 20) {
        clickedVillager = v;
        break;
      }
    }

    if (clickedVillager) {
      this.openInspector(clickedVillager);
      return;
    }

    // Check if a building was clicked
    for (const b of WORLD_DATA.buildings) {
      if (
        worldPos.x >= b.x && worldPos.x <= b.x + b.w &&
        worldPos.y >= b.y && worldPos.y <= b.y + b.h
      ) {
        const owner = this.sim.getVillager(b.ownerId);
        if (owner) {
          this.openInspector(owner);
          return;
        }
      }
    }
  }

  handleCanvasHover(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = this.renderer.screenToWorld(mouseX, mouseY);

    let hoverText = null;
    for (const v of this.sim.villagers) {
      if (Math.hypot(v.x - worldPos.x, v.y - worldPos.y) <= 20) {
        hoverText = `<strong>${v.name}</strong> (${v.occupation})<br><em>${v.currentActionText}</em>`;
        break;
      }
    }

    if (!hoverText) {
      for (const b of WORLD_DATA.buildings) {
        if (
          worldPos.x >= b.x && worldPos.x <= b.x + b.w &&
          worldPos.y >= b.y && worldPos.y <= b.y + b.h
        ) {
          hoverText = `<strong>${b.name}</strong><br>Click to inspect owner`;
          break;
        }
      }
    }

    if (hoverText) {
      this.tooltip.innerHTML = hoverText;
      this.tooltip.style.left = `${e.clientX}px`;
      this.tooltip.style.top = `${e.clientY}px`;
      this.tooltip.classList.remove('hidden');
    } else {
      this.tooltip.classList.add('hidden');
    }
  }

  renderRosterBar() {
    this.rosterScroll.innerHTML = '';
    this.sim.villagers.forEach(v => {
      const card = document.createElement('div');
      card.className = 'roster-card';
      card.id = `roster-${v.id}`;
      card.innerHTML = `
        <div class="roster-avatar" style="background:${v.clothesColor}"></div>
        <div class="roster-info">
          <div class="roster-name">${v.name}</div>
          <div class="roster-job">${v.occupation}</div>
        </div>
        <span class="roster-status-bubble">${v.emote ? v.emote.icon : '•'}</span>
      `;

      card.addEventListener('click', () => {
        this.openInspector(v);
        this.renderer.camX = v.x;
        this.renderer.camY = v.y;
      });

      this.rosterScroll.appendChild(card);
    });
  }

  updateHUD() {
    this.clockDisplay.textContent = this.sim.time.getTimeString();
    this.dayDisplay.textContent = this.sim.time.day;

    const phase = this.sim.time.getPhase();
    this.phaseBadge.textContent = phase.name;
    this.phaseIcon.textContent = phase.icon;

    this.statVillagers.textContent = this.sim.villagers.length;
    this.statEvents.textContent = this.sim.eventsFeed.length;
    this.statRumors.textContent = this.sim.rumorSystem.rumors.length;

    // Highlight active selected villager in roster
    this.sim.villagers.forEach(v => {
      const card = document.getElementById(`roster-${v.id}`);
      if (card) {
        card.classList.toggle('active-target', this.sim.selectedVillager?.id === v.id);
        const bubble = card.querySelector('.roster-status-bubble');
        if (bubble) bubble.textContent = v.emote ? v.emote.icon : '•';
      }
    });

    // Update open inspector values in real-time
    if (this.sim.selectedVillager && !this.inspectorModal.classList.contains('hidden')) {
      this.refreshInspectorValues(this.sim.selectedVillager);
    }
  }

  onFeedUpdated() {
    this.feedList.innerHTML = '';
    const filtered = this.sim.eventsFeed.filter(ev => {
      if (this.currentFeedFilter === 'all') return true;
      return ev.type === this.currentFeedFilter;
    });

    if (filtered.length === 0) {
      this.feedList.innerHTML = '<p class="empty-state">No events recorded yet in this category.</p>';
      return;
    }

    filtered.forEach(ev => {
      const item = document.createElement('div');
      item.className = `feed-item type-${ev.type}`;
      item.innerHTML = `
        <div class="feed-item-header">
          <span class="feed-category-tag">${ev.category || ev.type}</span>
          <span>Day ${ev.day}, ${ev.timeStr}</span>
        </div>
        <div class="feed-item-body">${ev.text}</div>
      `;

      // Click event in feed centers camera on villager
      item.addEventListener('click', () => {
        if (ev.villager1) {
          const v = this.sim.getVillager(ev.villager1);
          if (v) {
            this.renderer.camX = v.x;
            this.renderer.camY = v.y;
            this.openInspector(v);
          }
        }
      });

      this.feedList.appendChild(item);
    });
  }

  openInspector(v) {
    this.sim.selectedVillager = v;
    this.inspectorModal.classList.remove('hidden');

    // Header info
    document.getElementById('insp-name').textContent = v.name;
    document.getElementById('insp-personality').textContent = v.personality;
    document.getElementById('insp-mood-badge').textContent = v.moodBadge;
    document.getElementById('insp-age').textContent = `Age ${v.age}`;
    document.getElementById('insp-occupation').textContent = v.occupation;
    document.getElementById('insp-home').textContent = WORLD_DATA.buildings.find(b => b.id === v.homeBuildingId)?.name || 'Village Cottage';

    // Draw portrait avatar on canvas
    this.drawAvatarCanvas(v);

    this.refreshInspectorValues(v);
  }

  closeInspector() {
    this.inspectorModal.classList.add('hidden');
    this.sim.selectedVillager = null;
  }

  drawAvatarCanvas(v) {
    const avatarCanvas = document.getElementById('inspector-avatar-canvas');
    const actx = avatarCanvas.getContext('2d');
    actx.clearRect(0, 0, 64, 64);

    actx.save();
    actx.translate(32, 48);
    actx.scale(2.2, 2.2);

    // Draw villager directly onto avatar canvas
    const tempMoving = v.isMoving;
    v.isMoving = false;
    v.draw(actx, false);
    v.isMoving = tempMoving;

    actx.restore();
  }

  refreshInspectorValues(v) {
    // Current task & Monologue
    document.getElementById('insp-current-task').textContent = v.currentActionText;
    document.getElementById('insp-bio-text').textContent = v.bio;
    document.getElementById('insp-schedule-text').textContent =
      `Wake: 0${v.schedule.wake}:00 • Work: 0${v.schedule.workStart}:00 • Lunch: ${v.schedule.lunch}:00 • Market: ${v.schedule.market}:00 • Sleep: ${v.schedule.rest}:00`;
    document.getElementById('insp-traits-text').textContent =
      `${v.personality} nature. Values personal relationships and honest living.`;
    document.getElementById('insp-workplace-text').textContent =
      WORLD_DATA.buildings.find(b => b.id === v.homeBuildingId)?.name || 'Village Grounds';
    document.getElementById('insp-thought-bubble').textContent = `"${v.currentThought}"`;

    // Recent dialogues
    const dialogueList = document.getElementById('insp-recent-dialogue-list');
    dialogueList.innerHTML = '';
    if (v.recentDialogues.length === 0) {
      dialogueList.innerHTML = '<p class="empty-state">No recent conversations today.</p>';
    } else {
      v.recentDialogues.forEach(d => {
        const bubble = document.createElement('div');
        bubble.className = 'dialogue-bubble';
        bubble.innerHTML = `<span class="dialogue-speaker">${d.speaker} [${d.time}]:</span> ${d.text}`;
        dialogueList.appendChild(bubble);
      });
    }

    // Needs Dashboard
    this.updateNeedMeter('hunger', v.hunger);
    this.updateNeedMeter('energy', v.energy);
    this.updateNeedMeter('happiness', v.happiness);
    this.updateNeedMeter('social', v.social);

    // Relationships Tab
    this.renderRelationshipsTab(v);

    // Memories Tab
    this.renderMemoriesTab(v);

    // Diary Tab
    this.renderDiaryTab(v);

    // Inventory Tab
    this.renderInventoryTab(v);
  }

  updateNeedMeter(type, val) {
    const roundVal = Math.round(val);
    const valEl = document.getElementById(`meter-val-${type}`);
    const fillEl = document.getElementById(`meter-fill-${type}`);
    if (valEl) valEl.textContent = `${roundVal}%`;
    if (fillEl) fillEl.style.width = `${roundVal}%`;
  }

  renderRelationshipsTab(v) {
    const container = document.getElementById('insp-relationships-list');
    container.innerHTML = '';

    const otherVillagers = this.sim.villagers.filter(o => o.id !== v.id);
    document.getElementById('insp-rel-count').textContent = otherVillagers.length;

    otherVillagers.forEach(other => {
      const score = v.getRelationship(other.id);
      const tier = RelationshipSystem.getTier(score);
      const desc = RelationshipSystem.getPerspectiveDescription(score, other.name, v.personality);

      const card = document.createElement('div');
      card.className = 'relationship-card';
      // Fill width percentage for -100 to +100 range
      const pct = Math.max(0, Math.min(100, (score + 100) / 2));
      const fillGradient = score >= 0 ? '#2ecc71' : '#e74c3c';

      card.innerHTML = `
        <div class="rel-header">
          <span class="rel-name">${other.name}</span>
          <span class="rel-tier-badge ${tier.class}">${tier.badge}</span>
        </div>
        <div class="rel-score-bar">
          <div class="rel-track">
            <div class="rel-fill" style="width: ${pct}%; background: ${fillGradient};"></div>
          </div>
          <span class="rel-score-num" style="color: ${fillGradient}">${score > 0 ? '+' : ''}${score}</span>
        </div>
        <p class="rel-perspective-text">"${desc}"</p>
      `;

      container.appendChild(card);
    });
  }

  renderMemoriesTab(v) {
    const container = document.getElementById('insp-memories-timeline');
    container.innerHTML = '';
    document.getElementById('insp-mem-count').textContent = v.memories.length;
    document.getElementById('insp-memory-badge').textContent = `${v.memories.length} Memories`;

    if (v.memories.length === 0) {
      container.innerHTML = '<p class="empty-state">No recorded memories yet. As the villager lives their day, memories will form here.</p>';
      return;
    }

    v.memories.forEach(mem => {
      const card = document.createElement('div');
      card.className = `memory-card sentiment-${mem.sentiment}`;
      card.innerHTML = `
        <div class="memory-top-row">
          <strong>${mem.type}</strong>
          <span>Day ${mem.day}, ${mem.time}</span>
        </div>
        <p class="memory-desc">${mem.details}</p>
      `;
      container.appendChild(card);
    });
  }

  renderDiaryTab(v) {
    const container = document.getElementById('insp-diary-entries');
    container.innerHTML = '';
    document.getElementById('diary-book-title').textContent = `${v.name}'s Journal`;

    if (v.diaries.length === 0) {
      container.innerHTML = `
        <div class="diary-entry-card">
          <div class="diary-date">Day 1 – Morning Journal</div>
          <p class="diary-body">The ink is fresh on these crisp pages. Tonight at twilight, I will write my honest reflections on the day's encounters and events...</p>
        </div>
      `;
      return;
    }

    v.diaries.forEach(d => {
      const card = document.createElement('div');
      card.className = 'diary-entry-card';
      card.innerHTML = `
        <div class="diary-date">${d.dateText}</div>
        <p class="diary-body">${d.body}</p>
      `;
      container.appendChild(card);
    });
  }

  renderInventoryTab(v) {
    document.getElementById('insp-money-val').textContent = `${v.wealth} Gold`;
    const grid = document.getElementById('insp-inventory-grid');
    grid.innerHTML = '';

    const itemEntries = Object.entries(v.inventory).filter(([_, qty]) => qty > 0);
    if (itemEntries.length === 0) {
      grid.innerHTML = '<p class="empty-state">No items carried.</p>';
      return;
    }

    itemEntries.forEach(([itemId, qty]) => {
      const itemDef = ITEMS[itemId] || { name: itemId, icon: '📦' };
      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.innerHTML = `
        <span class="item-icon">${itemDef.icon}</span>
        <span class="item-name">${itemDef.name}</span>
        <span class="item-qty">Qty: ${qty}</span>
      `;
      grid.appendChild(slot);
    });
  }
}

/* ============================================================================
   14. SAVE & LOAD SYSTEM (LOCALSTORAGE)
   ============================================================================ */

class SaveSystem {
  static save(sim) {
    try {
      const data = {
        day: sim.time.day,
        hour: sim.time.hour,
        minute: sim.time.minute,
        villagers: sim.villagers.map(v => ({
          id: v.id,
          x: Math.round(v.x),
          y: Math.round(v.y),
          hunger: Math.round(v.hunger),
          energy: Math.round(v.energy),
          happiness: Math.round(v.happiness),
          social: Math.round(v.social),
          wealth: v.wealth,
          inventory: v.inventory,
          relationships: v.relationships,
          memories: v.memories.slice(0, 30),
          diaries: v.diaries.slice(0, 15)
        })),
        rumors: sim.rumorSystem.rumors.map(r => ({
          ...r,
          believers: Array.from(r.believers),
          rejecters: Array.from(r.rejecters)
        })),
        feed: sim.eventsFeed.slice(0, 40)
      };

      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Could not save simulation state to localStorage:', e);
      return false;
    }
  }

  static load(sim) {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      sim.time.day = data.day || 1;
      sim.time.hour = data.hour !== undefined ? data.hour : 8;
      sim.time.minute = data.minute || 0;

      if (data.villagers && Array.isArray(data.villagers)) {
        data.villagers.forEach(savedV => {
          const v = sim.getVillager(savedV.id);
          if (v) {
            v.x = savedV.x;
            v.y = savedV.y;
            v.hunger = savedV.hunger;
            v.energy = savedV.energy;
            v.happiness = savedV.happiness;
            v.social = savedV.social;
            v.wealth = savedV.wealth;
            v.inventory = savedV.inventory || v.inventory;
            v.relationships = savedV.relationships || v.relationships;
            v.memories = savedV.memories || [];
            v.diaries = savedV.diaries || [];
          }
        });
      }

      if (data.rumors && Array.isArray(data.rumors)) {
        sim.rumorSystem.rumors = data.rumors.map(r => ({
          ...r,
          believers: new Set(r.believers || []),
          rejecters: new Set(r.rejecters || [])
        }));
      }

      if (data.feed && Array.isArray(data.feed)) {
        sim.eventsFeed = data.feed;
      }

      return true;
    } catch (e) {
      console.warn('Could not load simulation state from localStorage:', e);
      return false;
    }
  }

  static reset() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    window.location.reload();
  }
}

/* ============================================================================
   15. APPLICATION BOOTSTRAP & MAIN LOOP
   ============================================================================ */

class VillageApp {
  constructor() {
    const canvas = document.getElementById('village-canvas');
    this.renderer = new WorldRenderer(canvas);
    this.sim = new VillageSimulation();
    this.uiController = new UIController(this.sim, this.renderer);

    this.showNames = true;
    this.showEmotes = true;

    // Load saved state if exists
    SaveSystem.load(this.sim);
    this.uiController.onFeedUpdated();

    this.lastTimestamp = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  get villagers() {
    return this.sim.villagers;
  }

  get time() {
    return this.sim.time;
  }

  getVillagerName(id) {
    return this.sim.getVillagerName(id);
  }

  addFeedEvent(evt) {
    this.sim.addFeedEvent(evt);
  }

  onNewDay(day) {
    this.sim.onNewDay(day);
  }

  saveState() {
    SaveSystem.save(this.sim);
  }

  resetState() {
    SaveSystem.reset();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    // Simulation Step
    this.sim.update(dt);

    // Render Canvas
    this.renderer.render(this.sim);

    // UI HUD refresh
    this.uiController.updateHUD();

    requestAnimationFrame(this.loop);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.villageApp = new VillageApp();
});
