import * as globals from "../globals"
import * as common from "./common"
import { ResourceScheduler } from "../scheduler/resource"
import { JobScheduler } from "../scheduler/job"

export function run(creep: Creep) {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.working = false;
    }
    if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
        creep.memory.working = true;
    }

    if (creep.memory.working) {
        let js = JobScheduler.getJobScheduler(creep.room);
        if (js) {
            let job = js.claimJob(creep);
            common.doJob(creep, job);
        } else {
            console.log(`Failed to schedule job for creep ${creep.id}`);
        }
    } else {
        let rs = ResourceScheduler.getResourceScheduler(creep.room);
        if (rs) {
            common.scheduled_resources(creep, rs);
        } else {
            console.log(`Failed to schedule resource pickup for creep ${creep.id}`);
        }
    }
}
