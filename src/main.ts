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

import { RespawnManager } from "./respawn"
import { memoryUsage } from "process";
import { ResourceScheduler } from "./scheduler/resource"
import { JobScheduler } from "./scheduler/job"
import * as fancy from "./scheduler/fancy_job_scheduler"

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

class CPUMeasurement {
  constructor() {
    this.last = Game.cpu.getUsed();
  }

  measure(label: string) {
    const now = Game.cpu.getUsed();
    console.log(`⚡ CPU spent on ${label} ${now - this.last}`);
    this.last = now;
  }

  private last: number;
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  const cpuLogger = new CPUMeasurement();
  let currentCPU = 0;

  const fancySchedulers = new Array<fancy.FancyJobScheduler>();
  if (Memory.chunks)
  for (let chunkName of Object.keys(Memory.chunks)) {
    fancySchedulers.push(fancy.FancyJobScheduler.createScheduler(chunkName));
  }
  cpuLogger.measure("Fancy Scheduler initialization.");

  const rooms = new Map<string, roomData.RoomData>();
  for (let room of Object.values(Game.rooms)) {
    rooms.set(room.name, new roomData.RoomData(room));
  }

  const empire = new globalData.Global();
  cpuLogger.measure("de-serialization");

  const respawnManager = RespawnManager.create();
  respawnManager.run();
  cpuLogger.measure("respawn logic");

  for (let spawn of Object.values(Game.spawns)) {
    ResourceScheduler.initResourceScheduler(spawn.room);
    JobScheduler.initJobScheduler(spawn.room);
  }
  cpuLogger.measure("initializing schedulers");

  for (let spawn of Object.values(Game.spawns)) {
    defendRoom(spawn.room.name);
  }
  cpuLogger.measure("room defense");

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
        drill.run(creep, empire);
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
        scout.run(creep, empire);
        timing["scout"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "remote_builder":
        intermediateCPU = Game.cpu.getUsed();
        remote_builder.run(creep);
        timing["remote_builder"] += Game.cpu.getUsed() - intermediateCPU;
        break;
      case "claimer":
        intermediateCPU = Game.cpu.getUsed();
        claimer.run(creep, empire);
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
  cpuLogger.measure("creep logic");


  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      //fancyJobScheduler.onCreepDeath(name, Memory.creeps[name]);
      delete Memory.creeps[name];
    }
  }

  empire.Serialize();
  //fancyJobScheduler.Serialize();
  cpuLogger.measure("serialization");

  if (Game.shard.name !== "shardSeason" && Game.cpu.bucket > 9000) {
    Game.cpu.generatePixel();
  }
});
