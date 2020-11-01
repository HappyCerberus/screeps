import { memoryUsage } from "process";

class RoleDict{
    [role: string]: BodyPartConstant[];
}

const roles: RoleDict = {
    "harvester": [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
//    "upgrader": [WORK, CARRY, MOVE],
//    "builder": [WORK, CARRY, MOVE],
    "upgrader": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "builder": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "drill": [WORK, WORK, WORK, WORK, WORK, MOVE],
    "sweeper": [WORK, CARRY, MOVE],
    "worker": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
};

export function ensureSourcesHaveDrills(spawn: StructureSpawn,  sources: Set<Id<Source>>, drillMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    // Can't do anything since the spawner is busy.
    if (spawn.spawning) {
        return;
    }

    /*
     * Check if each of the sources has a live drill assigned.
     * If not, spawn a new drill.
     */
    for (const sourceId of sources) {
        const creepId = drillMap.get(sourceId.toString());
        if (creepId !== undefined) {
            const drill = Game.getObjectById(creepId);
            if (drill !== null) continue;
        }

        const drillName = "Drill_" + sourceId.toString();
        if (spawning.has(drillName)) continue;

        if (spawn.spawnCreep(roles["drill"], drillName, { memory: { role: "drill", room: spawn.room.name, working: true, sourceId: sourceId } }) !== OK) {
            console.log(`Failed to schedule spawn of drill ${drillName}.`);
        } else {
            // If we succeeded to schedule the spawn, prevent successive attempts.
            spawning.add(drillName);
        }
    }
}


export function respawn(spawn: StructureSpawn, role: string, minimum: number) {
    if (spawn.spawning) {
        return;
    }

    var roleCreep = _.filter(Game.creeps, (creep) => creep.memory.role == role);
    console.log(`Found ${roleCreep.length} creeps with role ${role}`);

    if (roleCreep.length < minimum) {
        const newName = "Creep_" + role + "_" + Game.time;
        switch (spawn.spawnCreep(roles[role], newName, { memory: { role: role, room: spawn.room.name, working: true } })) {
            case OK:
                console.log(`Spawning new creep with role ${role} named ${newName}`);
                break;
            default:
                break;
        }
    }
}
