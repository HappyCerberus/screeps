import * as mem from "./lib"

export class RoomData {
    constructor(public room: Room) {
        this.sources = mem.deserializeSet<Id<Source>>(room.memory.sources);
        if (this.sources.size === 0) {
            for (const src of room.find(FIND_SOURCES)) {
                this.sources.add(src.id);
            }
        }
        this.drillMap = mem.deserializeMap<string, Id<Creep>>(room.memory.drillMap);

        if (!this.room.memory.limits) {
            this.room.memory.limits = new Object();
        }

        if (this.room.memory.limits.creepsBuilders === undefined ||
            this.room.memory.limits.creepsBuilders === null) {
            this.room.memory.limits.creepsBuilders = 1;
        }
        if (this.room.memory.limits.creepsUpgraders === undefined ||
            this.room.memory.limits.creepsUpgraders === null) {
            this.room.memory.limits.creepsUpgraders = 1;
        }
        if (this.room.memory.limits.creepsWorkers === undefined ||
            this.room.memory.limits.creepsWorkers === null) {
            this.room.memory.limits.creepsWorkers = 4;
        }

        if (this.room.memory.limits.jobsUpgrade === undefined ||
            this.room.memory.limits.jobsUpgrade === null) {
            this.room.memory.limits.jobsUpgrade = 4;
        }
        if (this.room.memory.limits.jobsRepair === undefined ||
            this.room.memory.limits.jobsRepair === null) {
            this.room.memory.limits.jobsRepair = 2;
        }
        if (this.room.memory.limits.jobsBuild === undefined ||
            this.room.memory.limits.jobsBuild === null) {
            this.room.memory.limits.jobsBuild = 2;
        }
        if (this.room.memory.limits.jobsRefill === undefined ||
            this.room.memory.limits.jobsRefill === null) {
            this.room.memory.limits.jobsRefill = 2;
        }
    }

    Serialize() {
        this.room.memory.sources = mem.serializeSet(this.sources);
        this.room.memory.drillMap = mem.serializeMap(this.drillMap);
    }

    public sources: Set<Id<Source>>;
    public drillMap: Map<string, Id<Creep>>;
}
