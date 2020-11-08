import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep, claimerMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    const room = creep.memory.room;
    const creepId = claimerMap.get(room);
    if (creepId !== creep.id) {
        claimerMap.set(room, creep.id);
        spawning.delete(creep.name);
    }

    const route = Game.map.findRoute(creep.room, creep.memory.room);
    if (route === -2) {
        console.log(`Failed to send observer ${creep.id} to room ${creep.memory.room}`);
        return;
    }

    if (route.length > 0) {
        const exit = creep.pos.findClosestByRange(route[0].exit);
        if (exit === null) {
            console.log(`Failed to send observer ${creep.id} to room ${creep.memory.room}`);
            return;
        }
        creep.moveTo(exit);
    } else {
        if (!creep.room.controller) {
            console.log(`Claimer creep ${creep.id} ended up in a room without a controller ${creep.room.name}`);
            return;
        }

        if (creep.claimController(creep.room.controller) === ERR_NOT_IN_RANGE) {
            const result = creep.moveTo(creep.room.controller, {swampCost: 1});
            console.log(`Result of move function for ${creep.name} is ${result}.`);
        }
    }
}
