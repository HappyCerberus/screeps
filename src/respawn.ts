class RoleDict{
    [role: string]: BodyPartConstant[];
}

const roles: RoleDict = {
    "harvester": [WORK, WORK, MOVE],
    "upgrader": [WORK, CARRY, MOVE],
    "builder": [WORK, CARRY, MOVE],
};

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
