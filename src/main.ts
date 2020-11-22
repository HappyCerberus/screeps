import { EOVERFLOW, PRIORITY_BELOW_NORMAL } from "constants";
import { ErrorMapper } from "utils/ErrorMapper";

import * as harvester from "./logic/deprecated_harvester"
import * as upgrader from "./logic/deprecated_upgrader"
import * as builder from "./logic/deprecated_builder"
import * as disassembler from "./logic/disassembler"

import * as drill from "./logic/drill"
import * as worker from "./logic/worker"
import * as remote_miner from "./logic/remote_miner"
import * as scout from "./logic/scout"
import * as claimer from "./logic/claimer"
import * as remote_builder from "./logic/remote_builder"

import { respawn, ensureSourcesHaveDrills, remoteSourceHasMiners, ensureRoomsHaveScouts, respawnSizedWorkers, remoteSourceHasBuilders, ensureControllersAreOwned, ensureControllersAreReserved} from "./respawn"
import { memoryUsage } from "process";
import { ResourceScheduler } from "./scheduler/resource"
import { JobScheduler } from "./scheduler/job"
import * as fancyScheduler from "./scheduler/fancy_job"
import *  as global from "./globals"

import * as roomData from "./data/room"
import * as globalData from "./data/global"
import { close } from "fs";

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

class TimingData {
  constructor() {
    this["harvester"] = 0;
    this["builder"] = 0;
    this["worker"] = 0;
    this["scout"] = 0;
    this["drill"] = 0;
    this["remote_miner"] = 0;
    this["remote_builder"] = 0;
    this["claimer"] = 0;
  }
  [key: string]: number;
}

class ActualTest implements TestObj {
  constructor(public x: number, public y: string, public z: string[]) {

  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  if (Memory.test) {
    console.log(`We have Memory.test : ${JSON.stringify(Memory.test)}`);
  }

  try {
    console.log(`Memory.test.x === ${Memory.test.x}`);
    console.log(`Memory.test as TestObj === ${JSON.stringify(Memory.test as TestObj)}`);
  } catch (err) {
    console.log(`Failed to look at memory ${err}`);
  }

  let lastCPUmeasurement = 0;
  let currentCPU = 0;

  const evil = Game.spawns["SourceOfAllEvil"];
  const charge = Game.spawns["Charge"];

  fancyScheduler.JobScheduler.initSchedulerMemory(evil.room.memory);
  const fancyJobScheduler = new fancyScheduler.JobScheduler(evil.room.memory.jobScheduler, evil.room) ;
  console.log(`>>> DEBUG <<< current tick ${evil.room.memory.jobScheduler.age}`);

  const rooms = new Map<string, roomData.RoomData>();
  rooms.set(evil.room.name, new roomData.RoomData(evil.room));
  rooms.set(charge.room.name, new roomData.RoomData(charge.room));
  const empire = new globalData.Global();

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

  let claimerMap: Map<string, Id<Creep>>;
  try {
    claimerMap = new Map<string, Id<Creep>>(JSON.parse(Memory.claimerMap));
  } catch (err) {
    claimerMap = new Map<string, Id<Creep>>();
  }

  let scoutMap: Map<string, Id<Creep>>;
  try {
    scoutMap = new Map<string, Id<Creep>>(JSON.parse(Memory.observerMap));
  } catch (err) {
    scoutMap = new Map<string, Id<Creep>>();
  }

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on de-serialization ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  ResourceScheduler.initResourceScheduler(evil.room);
  JobScheduler.initJobScheduler(evil.room);

  ResourceScheduler.initResourceScheduler(charge.room);
  JobScheduler.initJobScheduler(charge.room);

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on schedulers initialization ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;



  const evilRoom = rooms.get(evil.room.name) as roomData.RoomData;
  const chargeRoom = rooms.get(charge.room.name) as roomData.RoomData;

  ensureSourcesHaveDrills(evil, evilRoom.sources, evilRoom.drillMap, empire.spawning);
  ensureSourcesHaveDrills(charge, chargeRoom.sources, chargeRoom.drillMap, empire.spawning);

  respawnSizedWorkers(evil, evil.room.memory.limits.creepsWorkers as number);
  respawnSizedWorkers(charge, charge.room.memory.limits.creepsWorkers as number);

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on respawning logic ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  ensureRoomsHaveScouts(charge, empire, empire.roomsToReserve, scoutMap);
  ensureControllersAreReserved(charge, empire, claimerMap);
  ensureControllersAreOwned(charge, empire, claimerMap);

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on room control logic ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;


  const spawns = Object.values(Game.spawns);

  for (const sourceId of remotelyMinedSources) {
    console.log(`Trying to find appropriate spawn for remote miner for ${sourceId}`);
    const source = Game.getObjectById(sourceId);
    if (!source) {
      console.log(`Remote miner not spawned, source ${sourceId} not found.`);
      continue;
    }

    let closestSpawn: StructureSpawn | undefined;
    let distance = Infinity;
    for (let spawn of spawns) {
      const route = Game.map.findRoute(spawn.room, source.room);
      if (route === -2) {
        console.log(`Did not find path between ${spawn.name} and ${sourceId}`);
        continue;
      }
      if (route.length < distance) {
        distance = route.length;
        closestSpawn = spawn;
      }
    }
    if (!closestSpawn) {
      console.log(`Unable to spawn remote miner, because no spawn has path to target.`);
      continue;
    }

    if (!closestSpawn.room.storage) {
      console.log(`Remote miner not spawned storage not found in ${closestSpawn.room.name}`);
      continue;
    }
    const limit = remoteMinersMap.get(sourceId);
    if (!limit) {
      console.log(`Remote miner not spawned, limit for ${sourceId} not found.`);
      continue;
    }
    remoteSourceHasMiners(closestSpawn, limit, source, closestSpawn.room.storage);
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

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on remote operations ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  defendRoom(evil.room.name);
  defendRoom(charge.room.name);

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent room defense ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  let timing = new TimingData();
  let intermediateCPU = currentCPU;

  for (const name in Game.creeps) {
    var creep = Game.creeps[name];
    switch (creep.memory.role) {
      case "smartworker":
        let state: fancyScheduler.WorkflowState;
        while ((state = fancyScheduler.Job.doWorkflowStep(creep)) === fancyScheduler.WorkflowState.WORKFLOW_RETRY);
        if (state === fancyScheduler.WorkflowState.WORKFLOW_DONE || state === fancyScheduler.WorkflowState.WORKFLOW_FAILED) {
          creep.memory.currentWorkflow = [];
          fancyJobScheduler.onCreepAvailable(creep);
        }
        break;
      case "harvester":
        intermediateCPU = Game.cpu.getUsed();
        harvester.run(creep);
        timing["harvester"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "upgrader":
        intermediateCPU = Game.cpu.getUsed();
        upgrader.run(creep);
        timing["upgrader"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "builder":
        intermediateCPU = Game.cpu.getUsed();
        builder.run(creep);
        timing["builder"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "drill":
        intermediateCPU = Game.cpu.getUsed();
        const room = rooms.get(creep.room.name) as roomData.RoomData;
        drill.run(creep, empire, room.drillMap);
        timing["drill"] += Game.cpu.getUsed() - intermediateCPU - 0.2;
        break;
      case "worker":
        intermediateCPU = Game.cpu.getUsed();
        worker.run(creep);
        timing["worker"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "remote_miner":
        intermediateCPU = Game.cpu.getUsed();
        remote_miner.run(creep);
        timing["remote_miner"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "observer":
      case "scout":
        intermediateCPU = Game.cpu.getUsed();
        scout.run(creep, empire, scoutMap);
        timing["scout"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "remote_builder":
        intermediateCPU = Game.cpu.getUsed();
        remote_builder.run(creep);
        timing["remote_builder"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "claimer":
        intermediateCPU = Game.cpu.getUsed();
        claimer.run(creep, empire, claimerMap);
        timing["claimer"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "disassembler":
        intermediateCPU = Game.cpu.getUsed();
        disassembler.run(creep);
        timing["disassembler"] += Game.cpu.getUsed() - intermediateCPU;
        break;
    }
  }

  for (let key of Object.keys(timing)) {
    console.log(`By role CPU spending for ${key} is ${timing[key]}`);
  }

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] CPU spent on creep logic ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;


  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      fancyJobScheduler.onCreepDeath(name, Memory.creeps[name]);
      delete Memory.creeps[name];
    }
  }

  Memory.remoteMiners = JSON.stringify([...remoteMinersMap]);
  Memory.remoteSources = JSON.stringify([...remotelyMinedSources]);
  Memory.observerMap = JSON.stringify([...scoutMap]);
  Memory.remoteUseSources = JSON.stringify([...remotelyUsedSources]);
  Memory.claimerMap = JSON.stringify([...claimerMap]);

  /*
  let x = new Array<ActualTest>();
  x.push(new ActualTest(1, "abc", ["123", "345"]));
  x.push(new ActualTest(2, "xyz", ["abc", "zyx"]));
  Memory.test = x;
  */

  empire.Serialize();
  evilRoom.Serialize();
  chargeRoom.Serialize();
  fancyJobScheduler.Serialize();

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on serialization ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;


  if (Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
});
