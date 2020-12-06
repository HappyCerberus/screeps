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

interface RespawnManagerMemoryPerRoom {
  desiredOwnership?: DesiredOwnership;
  scout?: CreepInfo;
  claimer?: CreepInfo;
}

type JobType = "JOB_TYPE_PICKUP" | "JOB_TYPE_WITHDRAW" | "JOB_TYPE_BUILD" | "JOB_TYPE_REFILL" | "JOB_TYPE_REPAIR" | "JOB_TYPE_DISASSEMBLE" | "JOB_TYPE_UPGRADE";
type JobTargetID = Id<ConstructionSite> | Id<Structure> | Id<Resource>;

interface JobInterface {
  type: JobType;
  target: JobTargetID;
  creeps: Array<string>;
  needsDoing(): boolean;
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
  creepsUpgraders?: number;

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
  age: number;
  buildJobs: Array<JobInterface>;
  refillJobs: Array<JobInterface>;
  repairJobs: Array<JobInterface>;
  disassemblyJobs: Array<JobInterface>;
  upgradeJobs: Array<JobInterface>;
}

interface RoomMemory {
  sources?: string;
  drillMap?: string;
  limits?: RoomLimits;
  jobScheduler?: JobSchedulerData; // job scheduler memory
  respawnManager?: RespawnManagerMemoryPerRoom;
}

interface TestObj {
  x: number;
  y: string;
}

interface Memory {
  uuid: number;
  sources: number[];
  spawning: string;

  remoteMiners: string | undefined; // Map<Id<Source>>, number>
  remoteSources: string | undefined; // Set<Id<Source>>
  remoteUseSources: string | undefined;

  roomsToControl: string; // Set<string>
  claimerMap: string; // Map<string, Id<Creep>>

  // TODO: refactor, so this is called roomsToReserve
  remoteRooms: string; // Set<string>
  observerMap: string; // Map<string, Id<Creep>>

  roomSnapshots: string; // Map<string, RoomSnapshot>

  test: TestObj;

  respawnManager: RespawnManagerMemory;

  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
