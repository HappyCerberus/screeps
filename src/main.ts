import { PRIORITY_BELOW_NORMAL } from "constants";
import { ErrorMapper } from "utils/ErrorMapper";
import * as harvester from "./logic/harvester"
import * as upgrader from "./logic/upgrader"
import * as builder from "./logic/builder"
import * as drill from "./logic/drill"
import * as worker from "./logic/worker"
import { respawn, ensureSourcesHaveDrills} from "./respawn"
import { memoryUsage } from "process";
import { ResourceScheduler } from "./scheduler/resource"
import { JobScheduler } from "./scheduler/job"
import *  as global from "./globals"

function defendRoom(roomName : string) {
  const hostiles = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
  if (hostiles.length > 0) {
    var username = hostiles[0].owner.username;
    Game.notify(`User ${username} spotted in room ${roomName}`);
    var towers = Game.rooms[roomName].find(
      FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } }) as StructureTower[];
    towers.forEach((tower: StructureTower) => { tower.attack(hostiles[0]); });
  }
}


// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  const evil = Game.spawns["SourceOfAllEvil"];

  // Parse in-memory values
  let spawning: Set<string>;
  try {
    spawning = new Set<string>(JSON.parse(Memory.spawning));
  } catch (err) {
    spawning = new Set<string>();
  }

  if (spawning.has("hello world")) {
    spawning = new Set<string>();
  }

  let sources: Set<Id<Source>>;
  try {
    sources = new Set<Id<Source>>(JSON.parse(evil.room.memory.sources));
  } catch (err) {
    sources = new Set<Id<Source>>();
  }

  if (sources.size === 0) {
    const srcs = evil.room.find(FIND_SOURCES);
    for (const src of srcs) {
      sources.add(src.id);
    }
  }

  let drillMap: Map<string, Id<Creep>>;
  try {
    drillMap = new Map<string, Id<Creep>>(JSON.parse(evil.room.memory.drillMap));
  } catch (err) {
    drillMap = new Map<string, Id<Creep>>();
  }

  ResourceScheduler.initResourceScheduler(evil.room);
  JobScheduler.initJobScheduler(evil.room);

  ensureSourcesHaveDrills(evil, sources, drillMap, spawning);
  respawn(evil, "upgrader", 2);
  respawn(evil, "builder", 2);
  respawn(evil, "worker", 1);

  defendRoom(evil.room.name);

  for (const name in Game.creeps) {
    var creep = Game.creeps[name];
    switch (creep.memory.role) {
      case "harvester":
        harvester.run(creep);
        break;
      case "upgrader":
        upgrader.run(creep);
        break;
      case "builder":
        builder.run(creep);
        break;
      case "drill":
        drill.run(creep, drillMap, spawning);
        break;
      case "worker":
        worker.run(creep);
        break;
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  Memory.spawning = JSON.stringify([...spawning]);
  evil.room.memory.sources = JSON.stringify([...sources]);
  evil.room.memory.drillMap = JSON.stringify([...drillMap]);

  if (Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
});
