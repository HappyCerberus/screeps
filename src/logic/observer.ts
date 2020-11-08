import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep, observerMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    const room = creep.memory.room;
    const creepId = observerMap.get(room);
    if (creepId !== creep.id) {
        observerMap.set(room, creep.id);
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
        const parkingFlag = Game.flags[creep.memory.room];
        if (parkingFlag) {
            console.log(`Observer ${creep.name} moving to flag ${creep.memory.room}`);
            const result = creep.moveTo(parkingFlag.pos, { swampCost: 1 });
            console.log(`Result of move function for ${creep.name} is ${result}.`);
        } else {
            console.log(`Observer ${creep.name} couldn't find flag ${creep.memory.room}`);
        }
    }
}
