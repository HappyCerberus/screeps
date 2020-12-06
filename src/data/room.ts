import * as mem from "./lib"

export class RoomData {
    constructor(public room: Room) {
        if (room.memory.sources) {
            this.sources = mem.deserializeSet<Id<Source>>(room.memory.sources);
        } else {
            this.sources = new Set<Id<Source>>();
            console.log(`>>>>> ${room.name} has no serialized sources`);
            for (const src of room.find(FIND_SOURCES)) {
                this.sources.add(src.id);
            }
            console.log(`>>>>> ${room.name} found ${this.sources.size} sources`);
        }

        this.drillMap = mem.deserializeMap<string, Id<Creep>>(room.memory.drillMap || "[]");
        RoomData.InitLimits(this.room);
    }

    static InitLimits(room: Room) {
        room.memory.limits = {
            creepsWorkers: 4, jobsUpgrade: 4, jobsRepair: 2,
            jobsBuild: 2, jobsRefill : 2, ...room.memory.limits
        };
    }

    Serialize() {
        this.room.memory.sources = mem.serializeSet(this.sources);
        this.room.memory.drillMap = mem.serializeMap(this.drillMap);
    }

    public sources: Set<Id<Source>>;
    public drillMap: Map<string, Id<Creep>>;
}
