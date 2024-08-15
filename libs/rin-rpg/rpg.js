const { readFileSync, writeFileSync } = require("fs");
const fs = require("fs-extra");

const itemData = require("./items.json");
const playerPath = "./libs/rin-rpg/player.json";
const backpackPath = "./libs/rin-rpg/backpack.json";
const entityData = require("./entity.json");

// Ensure the backpack and player files exist
function initializeFiles() {
  try {
    fs.ensureFileSync(playerPath);
    fs.ensureFileSync(backpackPath);

    // Optionally validate existing data
    const playerData = fs.readJsonSync(playerPath);
    if (!playerData.players || !Array.isArray(playerData.players)) {
      throw new Error("Invalid player data format.");
    }

    const backpackData = fs.readJsonSync(backpackPath);
    if (!backpackData.playerBackpack || !Array.isArray(backpackData.playerBackpack)) {
      throw new Error("Invalid backpack data format.");
    }
  } catch (error) {
    console.error("Error initializing files:", error);
    // Create or overwrite files with default values if needed
    fs.writeJsonSync(playerPath, { players: [] }, { spaces: 2 });
    fs.writeJsonSync(backpackPath, { playerBackpack: [] }, { spaces: 2 });
  }
}

// Find player by ID
function findPlayerById(id) {
  const data = JSON.parse(readFileSync(playerPath, "utf-8"));
  return data.players.find(player => player.id.toString() === id.toString());
}
// Dind backpack by ID
function getBackpackById(id) {
  const backpackData = JSON.parse(readFileSync(backpackPath, "utf-8"));
  return backpackData.playerBackpack.find(bp => bp.id === id.toString());
}

// Check and format backpack items
function checkBackpackItems(playerId) {
  const backpack = getBackpackById(playerId);

  if (!backpack) {
    return "Backpack not found for this player.";
  }

  const items = backpack.items;
  if (Object.keys(items).length === 0) {
    return "Backpack is empty.";
  }

  // Format the output
  let result = "Items in your backpack:\n";
  for (const [itemName, quantity] of Object.entries(items)) {
    result += `- ${itemName}: ${quantity}\n`;
  }

  return result.trim();  // Trim trailing newline
}
// Get player information
function infoPlayer(id) {
  const player = findPlayerById(id);
  if (!player) return "Please register to guild!";

  return `Name: ${player.name || "Unknown"}\n` +
    `Level: ${player.level || 0}\n` +
    `Current Exp: ${player.currentExp || 0}\n` +
    `Exp to level up: ${player.maxLevelUp}\n` +
    `Gold: ${player.gold || 0}\n` +
    `Strength: ${player.attack || 0}\n` +
    `Health Point: ${player.health || 0}\n`;
}

// Create or update backpack for player
function addOrUpdateBackpack(id, newItems) {
  initializeFiles();
  const data = JSON.parse(readFileSync(backpackPath, "utf-8"));
  const index = data.playerBackpack.findIndex(bp => bp.id === id.toString());

  if (index >= 0) {
    // Update existing backpack
    const backpack = data.playerBackpack[index];

    // Add or update items in the backpack
    Object.keys(newItems).forEach(itemName => {
      if (backpack.items[itemName]) {
        // If item already exists, increment its quantity
        backpack.items[itemName] += newItems[itemName];
      } else {
        // If item doesn't exist, add it to the backpack
        backpack.items[itemName] = newItems[itemName];
      }
    });

  } else {
    // Create a new backpack if none exists for the player
    data.playerBackpack.push({
      id: id.toString(),
      items: newItems
    });
  }

  writeFileSync(backpackPath, JSON.stringify(data, null, 2), "utf-8");
}


// Register new player and initialize their backpack
function registerToGuild(id, name) {
  initializeFiles();
  const data = JSON.parse(readFileSync(playerPath, "utf-8"));
  const existingPlayer = findPlayerById(id);

  if (existingPlayer) {
    return "You are already registered!";
  }

  data.players.push({
    id: id.toString(),
    name,
    gold: 0,
    currentExp: 0,
    maxLevelUp: 200,
    level: 1,
    attack: 1,
    health: 10
  });

  writeFileSync(playerPath, JSON.stringify(data, null, 2), "utf-8");
  addOrUpdateBackpack(id, { [itemData.stone.name]: 1 });

  return "Successfully registered to guild!\n\n" + infoPlayer(id);
}
// entering dungeon function

function enterDungeon(id, floor) {
  initializeFiles();
  const player = findPlayerById(id)
  if (!player) return "Please register to guild first before entering dungeon";
  const enemy = getRandomEnemy(floor);
  if (!enemy) return `No enemies found on floor ${floor}.`;
  const battleResult = dungeonBattle(id, enemy);
  return battleResult;
}
// get random enemy by floor
function getRandomEnemy(floor) {
  const enemies = entityData.entity.filter(enemy =>
    floor >= enemy.startFloor && floor <= enemy.maxFloor
  );

  if (enemies.length === 0) return null;  // If no enemies match the floor, return null

  const randomIndex = Math.floor(Math.random() * enemies.length);
  const selectedEnemy = { ...enemies[randomIndex] }; // Clone the enemy object to avoid mutating the original

  // Calculate the number of floors above startFloor
  const floorDifference = floor - selectedEnemy.startFloor;

  if (floorDifference > 0) {
    // Apply buff based on how many floors above startFloor the player is
    const floorMultiplier = Math.pow(2.5, floorDifference);
    selectedEnemy.health *= floorMultiplier;
    selectedEnemy.attack *= floorMultiplier;
  }
  return selectedEnemy;
}

function dungeonBattle(id, enemy) {
  const player = findPlayerById(id);
  if (!player) return "Player not found. Please register first.";

  let playerHealth = player.health;
  let enemyHealth = enemy.health;

  while (playerHealth > 0 && enemyHealth > 0) {
    enemyHealth -= player.attack;

    if (enemyHealth <= 0) {
      break;
    }

    playerHealth -= enemy.attack;
  }

  if (playerHealth > 0) {
    let expGained = enemy.expDrop;
    const item = Object.values(itemData).find(item => item.itemId === enemy.itemId);
    const itemReward = { [item.name]: 1 }; // Reward player with item

    player.currentExp += expGained;
    if (player.currentExp >= player.maxLevelUp) {
      player.currentExp -= player.maxLevelUp;
      player.level++;
      player.attack *= 1.2;
      player.health *= 1.5;
      player.maxLevelUp *= 1.5;
    }

    writeFileSync(playerPath, JSON.stringify({ players: [player] }, null, 2), "utf-8");
    addOrUpdateBackpack(id, itemReward);

    return `You won the battle against a ${enemy.enemy}!\n` +
      `You received: ${item.name}\n\n${infoPlayer(id)}`;
  } else {
    return `You lost the battle against a ${enemy.enemy}. Try again later.\n\n${infoPlayer(id)}`;
  }
}

module.exports = { infoPlayer, registerToGuild, enterDungeon, checkBackpackItems };
