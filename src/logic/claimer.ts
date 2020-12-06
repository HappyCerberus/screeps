import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"
import * as globalData from "../data/global"

export function run(creep: Creep, empire: globalData.Global, claimerMap: Map<string, Id<Creep>>) {
    const room = creep.memory.room;
    const route = Game.map.findRoute(creep.room, creep.memory.room);
    if (route === -2) {
        console.log(`Failed to send claimer ${creep.id} to room ${creep.memory.room}`);
        return;
    }

    if (route.length > 0) {
        const exit = creep.pos.findClosestByRange(route[0].exit);
        if (exit === null) {
            console.log(`Failed to send claimer ${creep.id} to room ${creep.memory.room}`);
            return;
        }
        creep.moveTo(exit);
    } else {
        if (!creep.room.controller) {
            console.log(`Claimer creep ${creep.id} ended up in a room without a controller ${creep.room.name}`);
            return;
        }

        if (Memory.rooms[creep.room.name].respawnManager?.desiredOwnership === "OWNED") {
            if (creep.claimController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                const result = creep.moveTo(creep.room.controller, { swampCost: 1 });
                console.log(`Result of move function for ${creep.name} is ${result}.`);
            }
        } else if (Memory.rooms[creep.room.name].respawnManager?.desiredOwnership === "RESERVED") {
            if ((creep.room.controller.reservation &&
                creep.room.controller.reservation.username !== creep.owner.username) ||
                (creep.room.controller.owner && creep.room.controller.owner.username !== creep.owner.username)) {
                if (creep.attackController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    const result = creep.moveTo(creep.room.controller);
                    console.log(`Result of move function for ${creep.name} is ${result}.`);
                }
            } else if (!creep.room.controller.owner) {
                if (creep.reserveController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    const result = creep.moveTo(creep.room.controller);
                    console.log(`Result of move function for ${creep.name} is ${result}.`);
                }
            } else {
                console.log(`Claimer ended up in a room with controller with a strange state.`);
            }
        } else {
            console.log(`Claimer ended up in a room that is not supposed to be controlled or reserved.`);
        }
    }
}
