// memory extension samples
interface CreepMemory {
  role: string;
  room: string;
  working: boolean;
  sourceId?: Id<Source>;
  dropId?: Id<StructureStorage> | Id<StructureContainer>;
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

interface RoomMemory {
  sources: string;
  drillMap: string;
  limits: RoomLimits;
}

interface Memory {
  uuid: number;
  sources: number[];
  spawning: string;

  remoteMiners: string; // Map<Id<Source>>, number>
  remoteSources: string; // Set<Id<Source>>
  remoteUseSources: string;

  roomsToControl: string; // Set<string>
  claimerMap: string; // Map<string, Id<Creep>>

  remoteRooms: string; // Set<string>
  observerMap: string; // Map<string, Id<Creep>>

  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
