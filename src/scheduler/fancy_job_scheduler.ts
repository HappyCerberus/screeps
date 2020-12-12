import { chunk } from "lodash";
import {me} from "../globals"

function jobNeedsDoing(job: JobData): boolean {
    return false;
}

// onCreepDeath -> called from the same place as memory cleanup for a creep

export class FancyJobScheduler {
    constructor(private chunkName: string, private memory: ChunkData) {
        // logic, when to refresh (either not initialized, or out of date)
        this.refreshBuildJobs();
        this.refreshStructureJobs();
    }

    static createScheduler(chunkName: string): FancyJobScheduler {
        if (!Memory.chunks || !Memory.chunks[chunkName]) {
            throw new Error(`💣Internal logic error when creating a new JobScheduler for chunk ${chunkName}, the chunk does not exist.`);
        }
        if (!Memory.chunks[chunkName].jobs) {
            Memory.chunks[chunkName].jobs = { cacheAge: 0 };
        }
        return new FancyJobScheduler(chunkName, Memory.chunks[chunkName]);
    }

    private cleanOldJobs<T extends JobTargetID>(jobs: JobData[] | undefined, doneEntities: Set<JobTargetID>): JobData[] {
        if (!jobs) return [];
        const newJobs = new Array<JobData>();
        for (let job of jobs) {
            if (Game.getObjectById(job.target as T) !== null) {
                newJobs.push(job);
                doneEntities.add(job.target);
            } else {
                for (let creepName of job.creeps) {
                    if (Memory.creeps[creepName]) {
                        Memory.creeps[creepName].currentWorkflow = undefined;
                    } else {
                        console.log(`🔥Inconsistent state, creep ${creepName} should have a workflow set.`)
                    }
                }
            }
        }
        return newJobs;
    }

    refreshBuildJobs() {
        const jobs = this.memory.jobs;
        if (!jobs) throw new Error(`💣Internal logic error when refreshing jobs for chunk ${this.chunkName} jobs field is not initialized.`);

        const doneEntities = new Set<JobTargetID>();
        const newJobs = this.cleanOldJobs<Id<ConstructionSite>>(jobs.buildJobs, doneEntities);

        for (const room of this.memory.rooms) {
            const sites = Game.rooms[room].find(FIND_MY_CONSTRUCTION_SITES, {
                filter: (site: ConstructionSite) => {
                    return !doneEntities.has(site.id);
                }
            });
            for (let site of sites) {
                newJobs.push({ type: "JOB_TYPE_BUILD", target: site.id, creeps: [] });
            }
        }
        jobs.buildJobs = newJobs;
    }

    refreshStructureJobs() {
        const jobs = this.memory.jobs;
        if (!jobs) throw new Error(`💣Internal logic error when refreshing jobs for chunk ${this.chunkName} jobs field is not initialized.`);

        const doneEntities = new Set<JobTargetID>();
        const newRefillJobs = this.cleanOldJobs<Id<Structure>>(jobs.refillJobs, doneEntities);
        const newRepairJobs = this.cleanOldJobs<Id<Structure>>(jobs.repairJobs, doneEntities);
        const newDisassemblyJobs = this.cleanOldJobs<Id<Structure>>(jobs.disassemblyJobs, doneEntities);
        const newUpgradeJobs = this.cleanOldJobs<Id<StructureController>>(jobs.upgradeJobs, doneEntities);

        for (const roomName of this.memory.rooms) {
            const room = Game.rooms[roomName];
            room.find(FIND_STRUCTURES, {
                filter: (building: Structure) => {
                    if (doneEntities.has(building.id)) return;

                    switch (building.structureType) {
                        case STRUCTURE_EXTENSION:
                        case STRUCTURE_SPAWN:
                        case STRUCTURE_TOWER:
                            // refill & repair structures / disassembly for enemies
                            const refillBuilding = building as StructureExtension | StructureTower | StructureSpawn;
                            if (refillBuilding.owner && refillBuilding.owner.username === me) {
                                newRefillJobs.push({ type: "JOB_TYPE_REFILL", target: refillBuilding.id, creeps: [] });
                                newRepairJobs.push({ type: "JOB_TYPE_REPAIR", target: refillBuilding.id, creeps: [] });
                            } else if (building.structureType === STRUCTURE_SPAWN) {
                                newDisassemblyJobs.push({ type: "JOB_TYPE_DISASSEMBLE", target: (building as StructureSpawn).id, creeps: [] });
                            }
                            break;
                        case STRUCTURE_WALL:
                        case STRUCTURE_CONTAINER:
                        case STRUCTURE_ROAD:
                            // neutral structures that we actually want to repair
                            if (room.controller && // TODO: Do we want to repair rooms that have no controllers?
                                ((room.controller.owner?.username === me) ||
                                    (room.controller.reservation && room.controller.reservation?.username === me))) {
                                newRepairJobs.push({ type: "JOB_TYPE_REPAIR", target: building.id, creeps: [] });
                            }
                            break;
                        case STRUCTURE_CONTROLLER:
                            if (room.controller && (room.controller.owner?.username === me)) {
                                newUpgradeJobs.push({ type: "JOB_TYPE_UPGRADE", target: room.controller.id, creeps: [] });
                            }
                            break;
                        case STRUCTURE_RAMPART:
                        case STRUCTURE_LINK:
                        case STRUCTURE_STORAGE:
                        case STRUCTURE_OBSERVER:
                        case STRUCTURE_POWER_SPAWN:
                        case STRUCTURE_EXTRACTOR:
                        case STRUCTURE_LAB:
                        case STRUCTURE_TERMINAL:
                        case STRUCTURE_NUKER:
                        case STRUCTURE_FACTORY:
                            const ownedBuilding = building as OwnedStructure;
                            if (ownedBuilding.my) {
                                newRepairJobs.push({ type: "JOB_TYPE_REPAIR", target: ownedBuilding.id, creeps: [] });
                            }
                            break;
                        case STRUCTURE_KEEPER_LAIR:
                        case STRUCTURE_PORTAL:
                        case STRUCTURE_INVADER_CORE:
                        case STRUCTURE_POWER_BANK:
                            /* noop */
                            break;
                        default:
                            console.log(`[ERROR] Unexpected structure type found: "${building.structureType}".`);
                            break;
                    }
                }
            });
        }
        jobs.repairJobs = newRepairJobs;
        jobs.refillJobs = newRefillJobs;
        jobs.upgradeJobs = newUpgradeJobs;
        jobs.disassemblyJobs = newDisassemblyJobs;
    }
}
