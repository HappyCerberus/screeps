import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"
import * as globalData from "../data/global"

export function run(creep: Creep) {
    const room = creep.memory.room;

    const route = Game.map.findRoute(creep.room, creep.memory.room);
    if (route === -2) {
        console.log(`Failed to send scout ${creep.id} to room ${creep.memory.room}`);
        return;
    }

    if (route.length > 0) {
        const exit = creep.pos.findClosestByRange(route[0].exit);
        if (exit === null) {
            console.log(`Failed to send scout ${creep.id} to room ${creep.memory.room}`);
            return;
        }
        creep.moveTo(exit);
    } else {
        let creeps = creep.room.find(FIND_HOSTILE_CREEPS, {
            filter: (creep: Creep) => {
                for (const part of creep.body) {
                    if (part.type === ATTACK || part.type === RANGED_ATTACK) return true;
                }
                return false;
            }
        });

        if (creeps && creeps[0]) {
            if (creep.attack(creeps[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creeps[0].pos);
            }
            return;
        }

        let cores = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: (structure: OwnedStructure) => {
                return structure.owner?.username === "Invader";
            }
        });

        if (cores && cores[0]) {
            if (creep.attack(cores[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(cores[0].pos);
            }
            return;
        }

        let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: (structure: AnyStructure) => {
                return structure.structureType === STRUCTURE_TOWER;
            }
        }) as StructureTower[];

        if (towers && towers[0]) {
            if (creep.attack(towers[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(towers[0].pos);
            }
            return;
        }

        const parkingFlag = Game.flags[creep.memory.room+"_Camp"];
        if (parkingFlag) {
            console.log(`Scout ${creep.name} moving to flag ${creep.memory.room}`);
            const result = creep.moveTo(parkingFlag.pos, { swampCost: 1 });
            console.log(`Result of move function for ${creep.name} is ${result}.`);
        } else {
            console.log(`Scout ${creep.name} couldn't find flag ${creep.memory.room}`);
        }
    }
}
