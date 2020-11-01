import { ResourceScheduler } from "./scheduler/resource"

export const coreSpawn = "SourceOfAllEvil";
export const REPAIR_MARGIN = 500;
export const PICKUP_MARGIN = 100;
export const PICKUP_MARGIN_GROUND = 50;
export const UPGRADE_JOBS_PER_CONTROLLER = 5;
export const JOBS_REFILL_LIMIT = 4;
export const JOBS_BUILD_LIMIT = 2;
export const JOBS_REPAIR_LIMIT = 3;

export let rs: ResourceScheduler | undefined = undefined;


export class Job {
    constructor(public type: string,
        public target?: AnyStructure | ConstructionSite | Resource<ResourceConstant>) { }
}
