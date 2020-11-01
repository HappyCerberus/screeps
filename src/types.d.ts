// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  role: string;
  room: string;
  working: boolean;
  sourceId?: Id<Source>;
}

interface RoomMemory {
  sources: string;
  drillMap: string;
}

interface Memory {
  uuid: number;
  sources: number[];
  spawning: string;
  log: any;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
