import * as mem from "./lib"

export enum ControllerStateInfo {
    NONE,
    OWNED,
    RESERVED,
    NEUTRAL
}

export class ControllerInfo {
    constructor(public state: ControllerStateInfo, public safeModeRemaining: number, public owner?: string) { }
}

export class TowerInfo {
    constructor(public energy: number, public distance: number) { }
}

export class StaticDefenseInfo {
    constructor(public towers: Set<TowerInfo>) { }

    // TODO - maybe floodfill from both sides to find intersection on walls / ramparts
    // pathing / walls / ramparts info (don't have deal with this right now)
}

export class RoomSnapshot {
    constructor(public tick: number, public controller: ControllerInfo, public staticDefense: StaticDefenseInfo, public hasMilitary: boolean) { }
}

export class Global {
    constructor() {
        this.roomsToControl = mem.deserializeSet<string>(Memory.roomsToControl);
        this.roomsToReserve = mem.deserializeSet<string>(Memory.remoteRooms);
        this.cachedRoomInfo = mem.deserializeMap<string, RoomSnapshot>(Memory.roomSnapshots);
        this.spawning = mem.deserializeSet<string>(Memory.spawning);
    }

    Serialize() {
        Memory.roomsToControl = mem.serializeSet(this.roomsToControl);
        Memory.roomSnapshots = mem.serializeMap(this.cachedRoomInfo);
        Memory.remoteRooms = mem.serializeSet(this.roomsToReserve);
        Memory.spawning = mem.serializeSet(this.spawning);
    }

    public roomsToReserve: Set<string>;
    // roomsToControl is a subset of roomsToReserve
    public roomsToControl: Set<string>;
    public cachedRoomInfo: Map<string, RoomSnapshot>;
    public spawning: Set<string>;
}
