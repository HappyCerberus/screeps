import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"
import * as globalData from "../data/global"

export function run(creep: Creep, empire : globalData.Global) {
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
        const controller = creep.room.controller;
        let username = undefined;
        let safeModeRemaining = 0;
        let state = globalData.ControllerStateInfo.NONE;
        if (controller) {
            if (controller.owner) {
                username = controller.owner.username;
                state = globalData.ControllerStateInfo.OWNED;
            } else if (controller.reservation) {
                username = controller.reservation.username;
                state = globalData.ControllerStateInfo.RESERVED;
            } else {
                state = globalData.ControllerStateInfo.NEUTRAL;
            }

            if (controller.safeMode) {
                safeModeRemaining = controller.safeMode;
            }
        }

        let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: (structure: AnyStructure) => {
                return structure.structureType === STRUCTURE_TOWER;
            }
        }) as StructureTower[];
        let towersInfo = new Set<globalData.TowerInfo>();
        for (const tower of towers) {
            towersInfo.add(new globalData.TowerInfo(
                tower.store[RESOURCE_ENERGY], Math.sqrt((tower.pos.x - creep.pos.x) * (tower.pos.x - creep.pos.x) +
                    (tower.pos.y - creep.pos.y) * (tower.pos.y - creep.pos.y))
            ));
        }

        let creeps = creep.room.find(FIND_HOSTILE_CREEPS, {
            filter: (creep: Creep) => {
                for (const part of creep.body) {
                    if (part.type === ATTACK || part.type === RANGED_ATTACK) return true;
                }
                return false;
            }
        });

        empire.cachedRoomInfo.set(creep.room.name, new globalData.RoomSnapshot(
            Game.time,
            new globalData.ControllerInfo(state, safeModeRemaining, username),
            new globalData.StaticDefenseInfo(towersInfo),
            creeps.length !== 0
        ));

        const parkingFlag = Game.flags[creep.memory.room];
        if (parkingFlag) {
            console.log(`Scout ${creep.name} moving to flag ${creep.memory.room}`);
            const result = creep.moveTo(parkingFlag.pos, { swampCost: 1 });
            console.log(`Result of move function for ${creep.name} is ${result}.`);
        } else {
            console.log(`Scout ${creep.name} couldn't find flag ${creep.memory.room}`);
        }
    }
}
