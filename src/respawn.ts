import { drop } from "lodash";
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
    "remote_miner": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "remote_builder": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "claimer": [MOVE, CLAIM],
    "observer": [MOVE],
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

        const maxPieces = Math.min(Math.floor((spawn.room.energyCapacityAvailable - 50)/100), 5);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        arrayOfBodyParts.push(MOVE);
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(WORK);
        }

        if (spawn.spawnCreep(arrayOfBodyParts, drillName, { memory: { role: "drill", room: spawn.room.name, working: true, sourceId: sourceId } }) !== OK) {
            console.log(`Failed to schedule spawn of drill ${drillName}.`);
        } else {
            // If we succeeded to schedule the spawn, prevent successive attempts.
            spawning.add(drillName);
            break;
        }
    }
}

export function ensureControllersAreOwned(spawn: StructureSpawn, rooms: Set<string>, controllerMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    // Can't do anything since the spawner is busy.
    if (spawn.spawning) {
        return;
    }

    /*
     * Check if each of the sources has a live drill assigned.
     * If not, spawn a new drill.
     */
    for (const room of rooms) {
        if (!Game.rooms[room]) continue;
        if (!Game.rooms[room].controller) continue;
        if (Game.rooms[room].controller?.my) continue;

        const creepId = controllerMap.get(room);
        if (creepId !== undefined) {
            const observer = Game.getObjectById(creepId);
            if (observer !== null) continue;
        }

        const claimerName = "Claimer_" + room;
        if (spawning.has(claimerName)) continue;

        if (spawn.spawnCreep(roles["claimer"], claimerName, { memory: { role: "claimer", room: room, working: true } }) !== OK) {
            console.log(`Failed to schedule spawn of drill ${claimerName}.`);
        } else {
            // If we succeeded to schedule the spawn, prevent successive attempts.
            spawning.add(claimerName);
            break;
        }
    }
}

export function ensureRoomsHaveObservers(spawn: StructureSpawn, rooms: Set<string>, observerMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    // Can't do anything since the spawner is busy.
    if (spawn.spawning) {
        return;
    }

    /*
     * Check if each of the sources has a live drill assigned.
     * If not, spawn a new drill.
     */
    for (const room of rooms) {
        const creepId = observerMap.get(room);
        if (creepId !== undefined) {
            const observer = Game.getObjectById(creepId);
            if (observer !== null) continue;
        }

        const observerName = "Observer_" + room;
        if (spawning.has(observerName)) continue;

        if (spawn.spawnCreep(roles["observer"], observerName, { memory: { role: "observer", room: room, working: true } }) !== OK) {
            console.log(`Failed to schedule spawn of drill ${observerName}.`);
        } else {
            // If we succeeded to schedule the spawn, prevent successive attempts.
            spawning.add(observerName);
            break;
        }
    }
}

export function remoteSourceHasMiners(spawn: StructureSpawn, minimum: number, source: Source, dropof: StructureContainer | StructureStorage) {
    const role = "remote_miner";

    let count = 0;
    for (const [key, value] of Object.entries(Memory.creeps)) {
        if (value.role !== role) continue;
        if (value.sourceId === source.id) {
            count++;
        }
    }

    if (count < minimum) {
        const newName = "Creep_RemoteMiner_" + Game.time;
        switch (spawn.spawnCreep(roles[role], newName, { memory: { role: role, room: spawn.room.name, working: false, sourceId: source.id, dropId: dropof.id } })) {
            case OK:
                console.log(`Spawning new creep with role ${role} named ${newName}`);
                break;
            default:
                break;
        }
    }
}

export function remoteSourceHasBuilders(spawn: StructureSpawn, minimum: number, source: Source) {
    const role = "remote_builder";

    let count = 0;
    for (const [key, value] of Object.entries(Memory.creeps)) {
        if (value.role !== role) continue;
        if (value.sourceId === source.id) {
            count++;
        }
    }

    if (count < minimum) {
        const newName = "Creep_RemoteBuilder_" + Game.time;
        switch (spawn.spawnCreep(roles[role], newName, { memory: { role: role, room: spawn.room.name, working: false, sourceId: source.id} })) {
            case OK:
                console.log(`Spawning new creep with role ${role} named ${newName}`);
                break;
            default:
                break;
        }
    }
}

export function respawnSizedWorkers(spawn: StructureSpawn, minimum: number) {
    if (spawn.spawning) {
        return;
    }

    const role = "worker";
    var roleCreep = _.filter(Game.creeps, (creep) => { return creep.memory.role == role && creep.room === spawn.room });
    console.log(`Found ${roleCreep.length} creeps with role ${role} in room ${spawn.room.name}`);

    if (roleCreep.length < minimum) {
        const newName = "Creep_" + role + "_" + Game.time;
        const maxPieces = Math.min(Math.floor(spawn.room.energyCapacityAvailable / 200), 5);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(MOVE);
            arrayOfBodyParts.push(WORK);
            arrayOfBodyParts.push(CARRY);
        }

        switch (spawn.spawnCreep(arrayOfBodyParts, newName, { memory: { role: role, room: spawn.room.name, working: true } })) {
            case OK:
                console.log(`Spawning new creep with role ${role} named ${newName}`);
                break;
            default:
                break;
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
