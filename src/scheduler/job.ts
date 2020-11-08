import * as globals from "../globals"

function isRefillJobStructure(structure: AnyStructure): boolean {
    if (structure.structureType !== STRUCTURE_TOWER &&
        structure.structureType !== STRUCTURE_SPAWN &&
        structure.structureType !== STRUCTURE_EXTENSION)
        return false;
    return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
}

// TODO: not good enough
function isRepairJobStructure(structure: AnyStructure): boolean {
    if (structure.structureType === STRUCTURE_WALL) return false;
    return structure.hitsMax - structure.hits > globals.REPAIR_MARGIN;
}

function isController(structure: AnyStructure): boolean {
    return structure.structureType === STRUCTURE_CONTROLLER;
}

function isSweeperJobResource(resource: Resource<ResourceConstant>) : boolean {
    if (resource.resourceType !== RESOURCE_ENERGY) return false;
    return resource.amount >= 50;
}

function defaultDropResourceJob(room: Room): globals.Job {
    const storage = room.find(FIND_MY_STRUCTURES, {
        filter: (structure: AnyStructure) => {
            return structure.structureType === STRUCTURE_STORAGE;
        }
    });
    if (storage.length === 1) {
        return new globals.Job("deposit", storage[0]);
    } else {
        return new globals.Job("noop");
    }
}

export class JobScheduler {
    constructor(room: Room) {
        this.refillJobs = new Array<globals.Job>();
        this.buildJobs = new Array<globals.Job>();
        this.repairJobs = new Array<globals.Job>();
        this.upgradeJobs = new Array<globals.Job>();
        this.sweeperJobs = new Array<globals.Job>();

        let structures = room.find(FIND_STRUCTURES);
        for (const structure of structures) {
            if (isRefillJobStructure(structure) && this.refillJobs.length < (room.memory.limits.jobsRefill as number)) {
                this.refillJobs.push(new globals.Job("refill", structure));
            }
            if (isRepairJobStructure(structure) && this.repairJobs.length < (room.memory.limits.jobsRepair as number)) {
                this.repairJobs.push(new globals.Job("repair", structure));
            }
            if (isController(structure)) {
                for (let i = 0; i < (room.memory.limits.jobsUpgrade as number); i++) {
                    this.upgradeJobs.push(new globals.Job("upgrade", structure));
                }
            }
        }

        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of constructionSites) {
            if (this.buildJobs.length < (room.memory.limits.jobsBuild as number))
                this.buildJobs.push(new globals.Job("build", site));
        }

        let droppedResources = room.find(FIND_DROPPED_RESOURCES);
        for (const drop of droppedResources) {
            if (isSweeperJobResource(drop)) {
                this.sweeperJobs.push(new globals.Job("sweep", drop));
            }
        }
    }

    claimJob(creep: Creep): globals.Job {
        let job: globals.Job | undefined = undefined;

        /*
        if (this.sweeperJobs.length > 0) {
            job = this.sweeperJobs.pop();
            console.log(`Assigning sweeper job to creep ${creep.id}`);
        }
        */
        if (this.refillJobs.length > 0) {
            job = this.refillJobs.pop();
            console.log(`Assigning refill job to creep ${creep.id}`);
        } else if (this.buildJobs.length > 0) {
            job = this.buildJobs.pop();
            console.log(`Assigning build job to creep ${creep.id}`);
        } else if (this.repairJobs.length > 0) {
            job = this.repairJobs.pop();
            console.log(`Assigning repair job to creep ${creep.id}`);
        } else if (this.upgradeJobs.length > 0) {
            job = this.upgradeJobs.pop();
            console.log(`Assigning upgrade job to creep ${creep.id}`);
        }

        if (job === undefined) {
            job = defaultDropResourceJob(creep.room);
            console.log(`Assigning idle job to creep ${creep.id}`);
        }
        return job;
    }

    debugLog() {
        console.log(`Found ${this.refillJobs.length} refill jobs.`);
        console.log(`Found ${this.buildJobs.length} build jobs.`);
        console.log(`Found ${this.repairJobs.length} repair jobs.`);
        console.log(`Found ${this.upgradeJobs.length} upgrade jobs.`);
        console.log(`Found ${this.sweeperJobs.length} sweep jobs.`);
    }

    static initJobScheduler(room: Room) {
        let js = new JobScheduler(room);
        js.debugLog();
        if (this.js === undefined || this.js === null) {
            this.js = new Map<string, JobScheduler>();
        }
        this.js.set(room.name, js);
    }

    static getJobScheduler(room: Room): JobScheduler | undefined {
        return this.js.get(room.name);
    }

    private refillJobs: globals.Job[];
    private buildJobs: globals.Job[];
    private repairJobs: globals.Job[];
    private upgradeJobs: globals.Job[];
    private sweeperJobs: globals.Job[];
    private static js: Map<string, JobScheduler>;
}
