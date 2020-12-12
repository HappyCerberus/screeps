// memory extension samples


interface RemoteEnergyOperation {
  id: Id<Source>;
  limit: number;
}

interface RaidOperation {
  room: string;
  limit: number;
}

interface ScoutOperation {
  room: string;
}

interface CreepInfo {
  name: string;
}

interface RespawnManagerMemory {
  remoteMiningOperations: Array<RemoteEnergyOperation>;
  remoteBuildingOperations: Array<RemoteEnergyOperation>;
  remoteRaidOperations: Array<RaidOperation>;
  scoutOperations: Array<ScoutOperation>;
}

type DesiredOwnership = "RESERVED" | "OWNED";

interface DrillMapping {
  [key: string]: CreepInfo;
}

interface RespawnManagerMemoryPerRoom {
  desiredOwnership?: DesiredOwnership;
  scout?: CreepInfo;
  claimer?: CreepInfo;
  drills?: DrillMapping;
}

type JobType = "JOB_TYPE_PICKUP" | "JOB_TYPE_WITHDRAW" | "JOB_TYPE_BUILD" | "JOB_TYPE_REFILL" | "JOB_TYPE_REPAIR" | "JOB_TYPE_DISASSEMBLE" | "JOB_TYPE_UPGRADE";
type JobTargetID = Id<ConstructionSite> | Id<Structure> | Id<Resource>;

interface JobData {
  type: JobType;
  target: JobTargetID;
  creeps: string[];
}

interface WorkflowStep {
  type: JobType;
  target: JobTargetID;
}

interface CreepMemory {
  role: string;
  room: string;
  working: boolean;
  sourceId?: Id<Source>;
  enemyTarget?: Id<StructureSpawn> | Id<StructureInvaderCore>;
  dropId?: Id<StructureStorage> | Id<StructureContainer>;
  currentWorkflow?: WorkflowStep[];
}

interface RoomLimits {
  creepsWorkers?: number;
  creepsBuilders?: number;

  jobsUpgrade?: number;
  jobsRepair?: number;
  jobsBuild?: number;
  jobsRefill?: number;
}

interface JobSchedulerState {
  age: number;
  buildEntities: string;
  refillEntities: string;
  repairEntities: string;
  disassemblyEntities: string;
  upgradeEntities: string;
}

interface JobSchedulerData {
  cacheAge: number;
  buildJobs?: JobData[];
  refillJobs?: JobData[];
  repairJobs?: JobData[];
  disassemblyJobs?: JobData[];
  upgradeJobs?: JobData[];
}

interface RoomMemory {
  sources?: Array<Id<Source>>;
  limits?: RoomLimits;
  respawnManager?: RespawnManagerMemoryPerRoom;

}

interface ChunkData {
  rooms: string[];
  jobs?: JobSchedulerData;
}

interface Chunks {
  [key: string]: ChunkData;
}

interface Memory {
  uuid: number;
  roomSnapshots: string; // Map<string, RoomSnapshot>
  respawnManager: RespawnManagerMemory;
  chunks: Chunks;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
