import * as globals from "../globals"
import * as common from "./common"
import { ResourceScheduler } from "../scheduler/resource"

export function run(creep: Creep) {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.working = false;
    }
    // TODO: this might need a change,
    // we might need to be less aggressive about picking up resources.
    if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
        creep.memory.working = true;
    }

    if (creep.memory.working) {
        // getJob() -> doJob();
        if (!common.energy_deposit_logic(creep)) {
            common.upgrade_controller_logic(creep);
        }
    } else {
        let rs = ResourceScheduler.getResourceScheduler(creep.room);
        if (rs) {
            common.scheduled_resources(creep,rs);
        } else {
            common.pickup_resources_logic(creep);
        }
    }
}
