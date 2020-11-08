import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep) {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.working = false;
    }
    if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
        creep.memory.working = true;
    }

    if (creep.memory.working) {
        common.sweep_resources_logic(creep);
    } else {
        common.energy_deposit_logic(creep);
    }
}
