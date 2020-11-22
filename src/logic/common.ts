import { ControllerStateInfo } from "data/global";
import * as globals from "../globals"
import { ResourceScheduler } from "../scheduler/resource"
import { StructureResourceProvider } from "../scheduler/resource"

export function harvest_logic(creep: Creep) {
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
}

export function drill_logic(creep: Creep, target: Id<Source>) {
    const source = Game.getObjectById(target);
    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' }, swampCost: 1 });
        }
    }
}

export function energy_deposit_logic(creep: Creep) : boolean {
    var targets = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });
    if (targets.length > 0) {
        if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return true;
    }
    return false;
}

export function build_logic(creep: Creep) : boolean {
    const targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    if (targets.length) {
        if (creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return true;
    }
    return false;
}

export function disassemble_logic(creep: Creep): boolean {
    let target: Structure | undefined;
    if (creep.memory.enemyTarget) {
        const b = Game.getObjectById(creep.memory.enemyTarget);
        if (b) {
            target = b;
        }
    } else {
        const targets = creep.room.find(FIND_HOSTILE_SPAWNS);
        if (targets.length) {
            target = targets[0];
        }
    }

    if (target) {
        if (creep.dismantle(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
        return true;
    }
    return false;
}

export function repair_logic(creep: Creep) {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: Structure<StructureConstant>) => {
            if (structure.structureType === STRUCTURE_WALL) return false;
            // NOTE: probably makes sense to have percentage based repair margin
            return (structure.hitsMax - structure.hits > globals.REPAIR_MARGIN);
        }
    });
    if (target) {
        if (creep.repair(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
}

export function pickup_resources_logic(creep: Creep) {
    const drop = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
        filter: (res: Resource<ResourceConstant>) => {
            return res.resourceType === RESOURCE_ENERGY && res.amount > globals.PICKUP_MARGIN_GROUND;
        }
    });
    if (drop) {
        if (creep.pickup(drop) === ERR_NOT_IN_RANGE) {
            creep.moveTo(drop, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    } else {
        // After sweeping, pickup from containers.
        const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (str: AnyStructure) => {
                if (str instanceof StructureContainer) {
                    return str.store.energy > globals.PICKUP_MARGIN;
                }
                return false;
            }
        }) as StructureContainer;

        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
}

export function scheduled_resources(creep: Creep, rs: ResourceScheduler) {
    const source = rs.claimResources(creep, creep.store.getFreeCapacity());
    if (source) {
        if ("resourceType" in source) {
            if (creep.pickup(source as Resource<ResourceConstant>) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source as Resource<ResourceConstant>, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            if (creep.withdraw(source as StructureResourceProvider, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source as StructureResourceProvider, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    } else {
        console.log(`Creep ${creep.id} failed to claim resource for work.`);
    }
}

export function sweep_resources_logic(creep: Creep) : boolean {
    const drop = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
        filter: (res: Resource<ResourceConstant>) => {
            return res.resourceType === RESOURCE_ENERGY;
        }
    });
    if (drop) {
        if (creep.pickup(drop) === ERR_NOT_IN_RANGE) {
            creep.moveTo(drop, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return true;
    }
    return false;
}

export function store_resources_logic(creep: Creep) {
    const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (str: AnyStructure) => {
            if (str instanceof StructureContainer) {
                return str.store.getCapacity(RESOURCE_ENERGY) - str.store.energy > creep.store[RESOURCE_ENERGY];
            }
            return false;
        }
    }) as StructureContainer;

    if (container) {
        if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
}

export function store_resources_by_id_logic(creep: Creep, structure: Id<StructureStorage> | Id<StructureContainer>) {
    let deposit = Game.getObjectById(structure) as Structure<STRUCTURE_CONTAINER> | Structure<STRUCTURE_STORAGE>;
    if (deposit) {
        if (creep.transfer(deposit, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(deposit, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
}

export function upgrade_controller_logic(creep: Creep) {
    if (creep.room.controller) {
        if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
}

function sweep_job_logic(creep: Creep, resource: Resource<ResourceConstant>) {
    if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
        creep.moveTo(resource, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
}

function build_job_logic(creep: Creep, site: ConstructionSite) {
    if (creep.build(site) == ERR_NOT_IN_RANGE) {
        creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}

function upgrade_job_logic(creep: Creep, controller: StructureController) {
    if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}

function refill_job_logic(creep: Creep, structure: AnyStructure) {
    if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}

function repair_job_logic(creep: Creep, structure: AnyStructure) {
    if (creep.repair(structure) == ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}

function deposit_job_logic(creep: Creep, structure: StructureStorage) {
    if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}

export function doJob(creep: Creep, job: globals.Job) {
    switch (job.type) {
        case "sweep":
            sweep_job_logic(creep, job.target as Resource<ResourceConstant>);
            break;
        case "build":
            build_job_logic(creep, job.target as ConstructionSite);
            break;
        case "upgrade":
            upgrade_job_logic(creep, job.target as StructureController);
            break;
        case "repair":
            repair_job_logic(creep, job.target as AnyStructure);
            break;
        case "refill":
            refill_job_logic(creep, job.target as AnyStructure);
            break;
        case "deposit":
            deposit_job_logic(creep, job.target as StructureStorage);
            break;
        case "noop":
            break;
    }
}
