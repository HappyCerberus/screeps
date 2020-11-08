import { EOVERFLOW, PRIORITY_BELOW_NORMAL } from "constants";
import { ErrorMapper } from "utils/ErrorMapper";

import * as harvester from "./logic/deprecated_harvester"
import * as upgrader from "./logic/deprecated_upgrader"
import * as builder from "./logic/deprecated_builder"

import * as drill from "./logic/drill"
import * as worker from "./logic/worker"
import * as remote_miner from "./logic/remote_miner"
import * as observer from "./logic/observer"
import * as claimer from "./logic/claimer"
import * as remote_builder from "./logic/remote_builder"

import { respawn, ensureSourcesHaveDrills, remoteSourceHasMiners, ensureRoomsHaveObservers, respawnSizedWorkers, remoteSourceHasBuilders, ensureControllersAreOwned} from "./respawn"
import { memoryUsage } from "process";
import { ResourceScheduler } from "./scheduler/resource"
import { JobScheduler } from "./scheduler/job"
import *  as global from "./globals"

import * as roomData from "./data/room"

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

class SpawnData {
  constructor(public spawn: StructureSpawn) { }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  const spawns = new Array<SpawnData>();
  spawns.push(new SpawnData(Game.spawns["SourceOfAllEvil"]));
  const evil = Game.spawns["SourceOfAllEvil"];
  const charge = Game.spawns["Charge"];

  // Parse in-memory values
  let spawning: Set<string>;
  try {
    spawning = new Set<string>(JSON.parse(Memory.spawning));
  } catch (err) {
    spawning = new Set<string>();
  }

  const rooms = new Map<string, roomData.RoomData>();
  rooms.set(evil.room.name, new roomData.RoomData(evil.room));
  rooms.set(charge.room.name, new roomData.RoomData(charge.room));

  let remoteMinersMap: Map<string, number>;
  try {
    remoteMinersMap = new Map<string, number>(JSON.parse(Memory.remoteMiners));
  } catch (err) {
    remoteMinersMap = new Map<string, number>();
  }

  let remotelyMinedSources: Set<Id<Source>>;
  try {
    remotelyMinedSources = new Set<Id<Source>>(JSON.parse(Memory.remoteSources));
  } catch (err) {
    remotelyMinedSources = new Set<Id<Source>>();
  }

  let remotelyUsedSources: Set<Id<Source>>;
  try {
    remotelyUsedSources = new Set<Id<Source>>(JSON.parse(Memory.remoteUseSources));
  } catch (err) {
    remotelyUsedSources = new Set<Id<Source>>();
  }

  let roomsToControl: Set<string>;
  try {
    roomsToControl = new Set<string>(JSON.parse(Memory.roomsToControl));
  } catch (err) {
    roomsToControl = new Set<string>();
  }

  let claimerMap: Map<string, Id<Creep>>;
  try {
    claimerMap = new Map<string, Id<Creep>>(JSON.parse(Memory.claimerMap));
  } catch (err) {
    claimerMap = new Map<string, Id<Creep>>();
  }

  let remoteRooms: Set<string>;
  try {
    remoteRooms = new Set<string>(JSON.parse(Memory.remoteRooms));
  } catch (err) {
    remoteRooms = new Set<string>();
  }

  let observerMap: Map<string, Id<Creep>>;
  try {
    observerMap = new Map<string, Id<Creep>>(JSON.parse(Memory.observerMap));
  } catch (err) {
    observerMap = new Map<string, Id<Creep>>();
  }

  ResourceScheduler.initResourceScheduler(evil.room);
  JobScheduler.initJobScheduler(evil.room);

  ResourceScheduler.initResourceScheduler(charge.room);
  JobScheduler.initJobScheduler(charge.room);

  const evilRoom = rooms.get(evil.room.name) as roomData.RoomData;
  const chargeRoom = rooms.get(charge.room.name) as roomData.RoomData;

  ensureSourcesHaveDrills(evil, evilRoom.sources, evilRoom.drillMap, spawning);
  ensureSourcesHaveDrills(charge, chargeRoom.sources, chargeRoom.drillMap, spawning);

  respawnSizedWorkers(evil, evil.room.memory.limits.creepsWorkers as number);
  respawnSizedWorkers(charge, charge.room.memory.limits.creepsWorkers as number);

  ensureRoomsHaveObservers(evil, remoteRooms, observerMap, spawning);
  ensureControllersAreOwned(evil, roomsToControl, claimerMap, spawning);

  for (const sourceId of remotelyMinedSources) {
    if (!evil.room.storage) {
      console.log(`Remote miner not spawned storage not found in ${evil.room.name}`);
      continue;
    }
    const limit = remoteMinersMap.get(sourceId);
    if (!limit) {
      console.log(`Remote miner not spawned, limit for ${sourceId} not found.`);
      continue;
    }
    const source = Game.getObjectById(sourceId);
    if (!source) {
      console.log(`Remote miner not spawned, source ${sourceId} not found.`);
      continue;
    }
    remoteSourceHasMiners(evil, limit, source, evil.room.storage);
  }

  for (const sourceId of remotelyUsedSources) {
    const limit = remoteMinersMap.get(sourceId);
    if (!limit) {
      console.log(`Remote miner not spawned, limit for ${sourceId} not found.`);
      continue;
    }
    const source = Game.getObjectById(sourceId) as Source;
    if (!source) {
      console.log(`Remote miner not spawned, source ${sourceId} not found.`);
      continue;
    }
    remoteSourceHasBuilders(evil, limit, source);
  }

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
        const room = rooms.get(creep.room.name) as roomData.RoomData;
        drill.run(creep, room.drillMap, spawning);
        break;
      case "worker":
        worker.run(creep);
        break;
      case "remote_miner":
        remote_miner.run(creep);
        break;
      case "observer":
        observer.run(creep, observerMap, spawning);
        break;
      case "remote_builder":
        remote_builder.run(creep);
        break;
      case "claimer":
        claimer.run(creep, claimerMap, spawning);
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
  Memory.remoteMiners = JSON.stringify([...remoteMinersMap]);
  Memory.remoteSources = JSON.stringify([...remotelyMinedSources]);
  Memory.observerMap = JSON.stringify([...observerMap]);
  Memory.remoteRooms = JSON.stringify([...remoteRooms]);
  Memory.remoteUseSources = JSON.stringify([...remotelyUsedSources]);
  Memory.roomsToControl = JSON.stringify([...roomsToControl]);
  Memory.claimerMap = JSON.stringify([...claimerMap]);

  evilRoom.Serialize();
  chargeRoom.Serialize();

  if (Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
});
