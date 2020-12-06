import { EOVERFLOW, PRIORITY_BELOW_NORMAL } from "constants";
import { ErrorMapper } from "utils/ErrorMapper";

import * as disassembler from "./logic/disassembler"

import * as drill from "./logic/drill"
import * as worker from "./logic/worker"
import * as remote_miner from "./logic/remote_miner"
import * as scout from "./logic/scout"
import * as claimer from "./logic/claimer"
import * as remote_builder from "./logic/remote_builder"
import * as fighter from "./logic/fighter"

import { ensureSourcesHaveDrills, RespawnManager} from "./respawn"
import { memoryUsage } from "process";
import { ResourceScheduler } from "./scheduler/resource"
import { JobScheduler } from "./scheduler/job"
import * as fancyScheduler from "./scheduler/fancy_job"
//import *  as globals from "./globals"

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
    this["fighter"] = 0;
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

  const evil = Game.spawns["Evil"];

  //fancyScheduler.JobScheduler.initSchedulerMemory(evil.room.memory);
  //const fancyJobScheduler = new fancyScheduler.JobScheduler(evil.room.memory.jobScheduler, evil.room) ;
  //console.log(`>>> DEBUG <<< current tick ${evil.room.memory.jobScheduler.age}`);

  const rooms = new Map<string, roomData.RoomData>();
  for (let spawn of Object.values(Game.spawns)) {
    // This does not allow for multiple spawns in a room.
    rooms.set(spawn.room.name, new roomData.RoomData(spawn.room));
  }
  const empire = new globalData.Global();

  const respawnManager = RespawnManager.create();

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

  for (let spawn of Object.values(Game.spawns)) {
    ResourceScheduler.initResourceScheduler(spawn.room);
    JobScheduler.initJobScheduler(spawn.room);
  }

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on schedulers initialization ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  for (let spawn of Object.values(Game.spawns)) {
    const spawnRoom = rooms.get(spawn.room.name) as roomData.RoomData;
    ensureSourcesHaveDrills(spawn, spawnRoom.sources, spawnRoom.drillMap, empire.spawning);

    respawnManager.ensureRoomHasWorkers(spawn.room);
  }

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on respawning logic ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  const sourceSpawn = Object.values(Game.spawns)[0];
  respawnManager.ensureRoomsHaveScouts();
  respawnManager.ensureControllersAreMine();

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on room control logic ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  respawnManager.ensureRemoteRoomsHaveBuilders();
  respawnManager.ensureRemoteRoomsHaveMiners();
  respawnManager.ensureRemoteRoomsHaveFighters();

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on remote operations ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  for (let spawn of Object.values(Game.spawns)) {
    defendRoom(spawn.room.name);
  }

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent room defense ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  let timing = new TimingData();
  let intermediateCPU = currentCPU;

  for (const name in Game.creeps) {
    var creep = Game.creeps[name];
    switch (creep.memory.role) {
      /*
      case "smartworker":
        let state: fancyScheduler.WorkflowState;
        while ((state = fancyScheduler.Job.doWorkflowStep(creep)) === fancyScheduler.WorkflowState.WORKFLOW_RETRY);
        if (state === fancyScheduler.WorkflowState.WORKFLOW_DONE || state === fancyScheduler.WorkflowState.WORKFLOW_FAILED) {
          creep.memory.currentWorkflow = [];
          fancyJobScheduler.onCreepAvailable(creep);
        }
        break;
        */
      case "drill":
        intermediateCPU = Game.cpu.getUsed();
        const room = rooms.get(creep.room.name) as roomData.RoomData;
        drill.run(creep, empire, room.drillMap);
        timing["drill"] += Game.cpu.getUsed() - intermediateCPU;
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
      case "fighter":
        intermediateCPU = Game.cpu.getUsed();
        fighter.run(creep);
        timing["fighter"] += Game.cpu.getUsed() - intermediateCPU;
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
      //fancyJobScheduler.onCreepDeath(name, Memory.creeps[name]);
      delete Memory.creeps[name];
    }
  }

  Memory.observerMap = JSON.stringify([...scoutMap]);
  Memory.claimerMap = JSON.stringify([...claimerMap]);

  empire.Serialize();

  for (let spawn of Object.values(Game.spawns)) {
    const spawnRoom = rooms.get(spawn.room.name) as roomData.RoomData;
    spawnRoom.Serialize();
  }
  //fancyJobScheduler.Serialize();

  currentCPU = Game.cpu.getUsed();
  console.log(`[PERFORMANCE] Cpu spent on serialization ${currentCPU - lastCPUmeasurement}`);
  lastCPUmeasurement = currentCPU;

  if (Game.shard.name !== "shardSeason" && Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
});
