import { ResourceScheduler } from "./scheduler/resource"

export const coreSpawn = "SourceOfAllEvil";
export const REPAIR_MARGIN = 500;
export const PICKUP_MARGIN = 100;
export const PICKUP_MARGIN_GROUND = 50;

export let rs: ResourceScheduler | undefined = undefined;

export const me = "HappyCerberus";

export class Job {
    constructor(public type: string,
        public target?: AnyStructure | ConstructionSite | Resource<ResourceConstant>) { }
}

declare const global: any;
global.updateRemoteMining = (source: Id<Source>, limit: number) => {
    for (let op of Memory.respawnManager.remoteMiningOperations) {
        if (op.id === source) {
            op.limit = limit;
            return;
        }
    }

    Memory.respawnManager.remoteMiningOperations.push({ id: source, limit: limit });
};

global.updateRemoteBuilding = (source: Id<Source>, limit: number) => {
    for (let op of Memory.respawnManager.remoteBuildingOperations) {
        if (op.id === source) {
            op.limit = limit;
            return;
        }
    }

    Memory.respawnManager.remoteBuildingOperations.push({ id: source, limit: limit });
};

global.updateRaids = (room: string, limit: number) => {
    for (let op of Memory.respawnManager.remoteRaidOperations) {
        if (op.room === room) {
            op.limit = limit;
            return;
        }
    }

    Memory.respawnManager.remoteRaidOperations.push({ room: room, limit: limit });
};

global.addScoutRoom = (room: string) => {
    for (let op of Memory.respawnManager.scoutOperations) {
        if (op.room === room) {
            return;
        }
    }

    Memory.respawnManager.scoutOperations.push({ room: room });
}

global.removeScoutRoom = (room: string) => {
    for (let i = 0; i < Memory.respawnManager.scoutOperations.length; i++) {
        if (Memory.respawnManager.scoutOperations[i].room === room) {
            Memory.respawnManager.scoutOperations.splice(i, 1);
            return;
        }
    }
}

global.changeRoomOwnership = (room: string, ownership: DesiredOwnership) => {
    if (!Memory.rooms[room]) {
        Memory.rooms[room] = {};
    }
    Memory.rooms[room].respawnManager = { desiredOwnership: ownership, ...Memory.rooms[room].respawnManager };
}
