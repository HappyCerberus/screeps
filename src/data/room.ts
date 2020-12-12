import * as mem from "./lib"

export class RoomData {
    constructor(public room: Room) {
        if (!room.memory.sources) {
            room.memory.sources = new Array<Id<Source>>();
            for (const src of room.find(FIND_SOURCES)) {
                room.memory.sources.push(src.id);
            }
        }

        RoomData.InitLimits(this.room);
    }

    static InitLimits(room: Room) {
        room.memory.limits = {
            creepsWorkers: 4, jobsUpgrade: 4, jobsRepair: 2,
            jobsBuild: 2, jobsRefill : 2, ...room.memory.limits
        };
    }
}
