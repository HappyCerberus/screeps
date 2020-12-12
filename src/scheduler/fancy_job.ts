/*

import * as globals from "../globals"
import * as mem from "../data/lib"
import { ControllerStateInfo } from "data/global";
import { runInThisContext } from "vm";
import { debounce, mapValues } from "lodash";
import { doesNotMatch } from "assert";
//import { remoteSourceHasMiners } from "respawn";

type RefillEntityID = Id<StructureExtension> | Id<StructureTower> | Id<StructureSpawn>;
type RepairEntityID = Id<Structure>;
type DisassemblyEntityID = Id<StructureSpawn>;
type UpgradeEntityID = Id<StructureController>;
type BuildEntityID = Id<ConstructionSite>;
type EnergyEntityID = Id<StructureContainer> | Id<StructureStorage>;

export enum WorkflowState {
    WORKFLOW_DONE,
    WORKFLOW_FAILED,
    WORKFLOW_RETRY,
    WORKFLOW_WORKING
}

export enum WorkflowStepState {
    WORKFLOW_STEP_DONE,
    WORKFLOW_STEP_FAILED,
    WORKFLOW_STEP_WORKING
}

function doWithdraw(creep: Creep, target: JobTargetID): WorkflowStepState {
    const container = Game.getObjectById(target) as StructureStorage | StructureContainer;
    if (!container) {
        console.log(`🔥 Inconsistent state, creep ${creep.name}, unable to find target ${target}.`);
        return WorkflowStepState.WORKFLOW_STEP_FAILED;
    }
    if (creep.store.getFreeCapacity() === 0) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    if (container.store.energy === 0) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    const res = creep.withdraw(container, RESOURCE_ENERGY);
    if (res === OK) {
        creep.say(`🏧`);
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    } if (res === ERR_NOT_IN_RANGE) {
        creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    } else if (res === ERR_NOT_ENOUGH_RESOURCES || res === ERR_FULL) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    return WorkflowStepState.WORKFLOW_STEP_FAILED;
}

// Notes:
// When scheduling, we might want to give this creep additional sources
// of energy as backup.
// We might want to also store energy_required on the job on the creep.
function doPickup(creep: Creep, target: JobTargetID): WorkflowStepState {
    let drop = Game.getObjectById(target) as Resource;
    if (!drop) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    if (creep.store.getFreeCapacity() === 0) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    let res = creep.pickup(drop);
    if (res === OK) {
        creep.say(`🧹`);
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    } else if (res === ERR_NOT_IN_RANGE) {
        creep.moveTo(drop, { visualizePathStyle: { stroke: '#ffaa00' } });
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    }

    return WorkflowStepState.WORKFLOW_STEP_FAILED;
}

function doRepair(creep: Creep, target: JobTargetID): WorkflowStepState {
    const structure = Game.getObjectById(target) as Structure;
    if (!structure) {
        console.log(`🔥 Inconsistent state, creep ${creep.name}, unable to find target ${target}.`);
        return WorkflowStepState.WORKFLOW_STEP_FAILED;
    }
    if (creep.store.energy === 0) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    const res = creep.repair(structure);
    if (res === OK) {
        creep.say(`🛠`);
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    } else if (res === ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, { visualizePathStyle: { stroke: '#ffffff' } });
        return WorkflowStepState.WORKFLOW_STEP_WORKING;
    } else if (res === ERR_NOT_ENOUGH_RESOURCES) {
        return WorkflowStepState.WORKFLOW_STEP_DONE;
    }
    return WorkflowStepState.WORKFLOW_STEP_FAILED;
}

function doDisassemble(creep: Creep, target: JobTargetID): WorkflowStepState {
    return WorkflowStepState.WORKFLOW_STEP_DONE;
}

function doBuild(creep: Creep, target: JobTargetID): WorkflowStepState {
    return WorkflowStepState.WORKFLOW_STEP_DONE;
}

function doRefill(creep: Creep, target: JobTargetID): WorkflowStepState {
    return WorkflowStepState.WORKFLOW_STEP_DONE;
}

function doUpgrade(creep: Creep, target: JobTargetID): WorkflowStepState {
    return WorkflowStepState.WORKFLOW_STEP_DONE;
}

export class Job implements JobInterface {
    constructor(public type: JobType,
        public target: JobTargetID,
        public creeps: Array<string> = []){

    }

    needsDoing(): boolean {
        switch (this.type) {
            case "JOB_TYPE_REPAIR":
                let s = Game.getObjectById(this.target) as Structure;
                if (s) {
                    return s.hitsMax - s.hits > 500;
                }
                return false;
        }
        return false;
    }

    static getStepByType(type: JobType): (creep: Creep, target: JobTargetID) => WorkflowStepState {
        switch (type) {
            case "JOB_TYPE_PICKUP":
                return doPickup;
            case "JOB_TYPE_WITHDRAW":
                return doWithdraw;
            case "JOB_TYPE_BUILD":
                return doBuild;
            case "JOB_TYPE_REFILL":
                return doRefill;
            case "JOB_TYPE_REPAIR":
                return doRepair;
            case "JOB_TYPE_DISASSEMBLE":
                return doDisassemble;
            case "JOB_TYPE_UPGRADE":
                return doUpgrade;
        }
    }

    static doWorkflowStep(creep: Creep): WorkflowState {
        if ((!creep.memory.currentWorkflow) ||
            creep.memory.currentWorkflow.length === 0)
            return WorkflowState.WORKFLOW_DONE;
        const state = this.getStepByType(creep.memory.currentWorkflow[0].type)(creep, creep.memory.currentWorkflow[0].target);
        if (state === WorkflowStepState.WORKFLOW_STEP_FAILED) {
            creep.memory.currentWorkflow = undefined;
            return WorkflowState.WORKFLOW_FAILED;
        }
        if (state === WorkflowStepState.WORKFLOW_STEP_DONE) {
            creep.memory.currentWorkflow.splice(0, 1);
            if (creep.memory.currentWorkflow.length === 0) {
                return WorkflowState.WORKFLOW_DONE;
            } else {
                return WorkflowState.WORKFLOW_RETRY;
            }
        }
        // state === WORKFLOW_STEP_WORKING
        return WorkflowState.WORKFLOW_WORKING;
    }
}

class JobSchedulerDataImpl implements JobSchedulerData {
    constructor(public age: number,
        public buildJobs: Array<Job>,
        public disassemblyJobs: Array<Job>,
        public refillJobs: Array<Job>,
        public repairJobs: Array<Job>,
        public upgradeJobs: Array<Job>) {
        this.buildJobs = buildJobs.map((job: Job) => {
            return new Job(job.type, job.target, job.creeps);
        });
        this.disassemblyJobs = disassemblyJobs.map((job: Job) => {
            return new Job(job.type, job.target, job.creeps);
        });
        this.refillJobs = refillJobs.map((job: Job) => {
            return new Job(job.type, job.target, job.creeps);
        });
        this.repairJobs = repairJobs.map((job: Job) => {
            return new Job(job.type, job.target, job.creeps);
        });
        this.upgradeJobs = upgradeJobs.map((job: Job) => {
            return new Job(job.type, job.target, job.creeps);
        });
        }
}

export class JobScheduler extends JobSchedulerDataImpl {
    onCreepAvailable(creep: Creep) {
        if (!creep.room.storage)
            return;
        const pickupTarget = creep.room.storage.id;
        for (let repair of this.repairJobs) {
            if (repair.needsDoing() && repair.creeps.length === 0) {
                creep.memory.currentWorkflow = [
                    { type: "JOB_TYPE_WITHDRAW", target: pickupTarget },
                    repair
                ];
                break;
            }
        }
    }

    onCreepDeath(creepName: string, creepMemory: CreepMemory) {
        if (creepMemory.currentWorkflow) {
            for (let step of creepMemory.currentWorkflow) {
                let jobs: Array<Job> | undefined;
                switch (step.type) {
                    case "JOB_TYPE_BUILD":
                        jobs = this.buildJobs;
                        break;
                    case "JOB_TYPE_DISASSEMBLE":
                        jobs = this.disassemblyJobs;
                        break;
                    case "JOB_TYPE_REFILL":
                        jobs = this.refillJobs;
                        break;
                    case "JOB_TYPE_REPAIR":
                        jobs = this.repairJobs;
                        break;
                    case "JOB_TYPE_UPGRADE":
                        jobs = this.upgradeJobs;
                        break;
                }
                if (!jobs) {
                    continue;
                }
                for (let job of jobs) {
                    if (job.target === step.target) {
                        const index = job.creeps.findIndex((v: string) => {
                            return creepName === v;
                        });
                        if (index !== -1) {
                            job.creeps.splice(index, 1);
                        } else {
                            console.log(`🔥 Inconsistent state, creep ${creepName} not found in list of creeps for job target ${job.target}.`)
                        }
                        break;
                    }
                }
            }
        }
    }
}
*/
