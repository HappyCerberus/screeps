import { ResourceScheduler } from "./scheduler/resource"

export const coreSpawn = "SourceOfAllEvil";
export const REPAIR_MARGIN = 500;
export const PICKUP_MARGIN = 100;
export const PICKUP_MARGIN_GROUND = 50;

export let rs: ResourceScheduler | undefined = undefined;

export const me = "HappyCerberus";

export class Job {
    constructor(public type: string,
        public target?: AnyStructure | ConstructionSite | Resource<ResourceConstant>) { }
}
