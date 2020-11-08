import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep) {
    if (creep.memory.sourceId === undefined) {
        console.log(`Fatal error, a remote builder with undefined sourceId : ${creep.name}.`);
        return;
    }

    if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.working = false;
    }
    if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
        creep.memory.working = true;
    }

    if (!creep.memory.working) {
        common.drill_logic(creep, creep.memory.sourceId);
    } else {
        common.build_logic(creep);
    }
}
