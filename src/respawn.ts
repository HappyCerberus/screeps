import { drop } from "lodash";
import { memoryUsage } from "process";
import { runInThisContext } from "vm";
import * as globalData from "./data/global"
import { initRoomMemory } from "./data/lib"

export class RespawnManager {
    constructor(private memory: RespawnManagerMemory,
        private roomsMemory: { [name: string]: RoomMemory; }) {
        if (!memory.remoteBuildingOperations) {
            memory.remoteBuildingOperations = new Array<RemoteEnergyOperation>();
        }

        if (!memory.remoteMiningOperations) {
            memory.remoteMiningOperations = new Array<RemoteEnergyOperation>();
        }

        if (!memory.remoteRaidOperations) {
            memory.remoteRaidOperations = new Array<RaidOperation>();
        }

        if (!memory.scoutOperations) {
            memory.scoutOperations = new Array<ScoutOperation>();
        }

        this.lockedDownRooms = new Set<string>();
        this.busySpawns = new Set<string>();
    }

    static create(): RespawnManager {
        Memory.respawnManager = Memory.respawnManager || {} as RespawnManagerMemory;
        for (let room of Object.values(Memory.rooms)) {
            if (!room.respawnManager) {
                room.respawnManager = {};
            }
        }
        return new RespawnManager(Memory.respawnManager, Memory.rooms);
    }

    run() {
        for (let room of Object.values(Game.rooms)) {
            this.ensureSourcesHaveDrills(room);
            this.ensureRoomHasWorkers(room);
        }

        this.ensureRoomsHaveScouts();
        this.ensureControllersAreMine();

        this.ensureRemoteRoomsHaveBuilders();
        this.ensureRemoteRoomsHaveMiners();
        this.ensureRemoteRoomsHaveFighters();
    }

    private ensureRemoteRoomsHaveBuilders() {
        for (const target of this.memory.remoteBuildingOperations) {
            const source = Game.getObjectById(target.id) as Source;
            if (!source) {
                console.log(`🧠 User input error, destination source ${target.id} for remote building operation is invalid.`);
                continue;
            }
            const spawn = this.closestSpawn(source.room.name);
            if (!spawn) {
                continue;
            }

            const role = "remote_builder";
            if (!this.hasEnoughCreepsOnSource(source, role, target.limit)) {
                try {
                    this.spawnSingleCreep(spawn, role, { role: role, room: spawn.room.name, working: false, sourceId: source.id } as CreepMemory);
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    private ensureRemoteRoomsHaveMiners() {
        for (const target of this.memory.remoteMiningOperations) {
            const source = Game.getObjectById(target.id);
            if (!source) {
                console.log(`🧠 User input error, destination source ${target.id} for remote building operation is invalid.`);
                continue;
            }

            const spawn = this.closestSpawn(source.room.name);
            if ((!spawn) || (!spawn.room.storage)) {
                continue;
            }

            const role = "remote_miner";
            if (!this.hasEnoughCreepsOnSource(source, role, target.limit)) {
                try {
                    this.spawnSingleCreep(spawn, role, { role: role, room: spawn.room.name, working: false, sourceId: source.id, dropId: spawn.room.storage.id } as CreepMemory);
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    private ensureRemoteRoomsHaveFighters() {
        for (const target of this.memory.remoteRaidOperations) {
            const spawn = this.closestSpawn(target.room);
            if (!spawn) {
                continue;
            }
            const role = "fighter";

            if (!this.hasEnoughCreepsTargetingRoom(target.room, role, target.limit)) {
                try {
                    this.spawnSingleCreep(spawn, role, { role: role, room: target.room, working: false } as CreepMemory,
                        this.makeDynamicallySizedFighter(spawn.room.energyCapacityAvailable));
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    private ensureRoomHasWorkers(room: Room) {
        if (this.lockedDownRooms.has(room.name))
            return;

        const limit = room.memory.limits?.creepsWorkers ?? 0;
        const role = "worker";
        if (!this.hasEnoughCreepsTargetingRoom(room.name, role, limit)) {
            let spawns = room.find(FIND_MY_SPAWNS, {
                filter: (spawn: StructureSpawn) => {
                    return !this.isSpawnBusy(spawn);
                }
            });

            if ((!spawns) || (spawns.length === 0)) {
                return;
            }

            try {
                this.spawnSingleCreep(spawns[0], role, { role: role, room: room.name, working: true } as CreepMemory,
                    this.makeDynamicallySizedWorker(room.energyCapacityAvailable));

            } catch (err) {
                console.log(err);
            }
        }
    }

    private ensureRoomsHaveScouts() {
        for (const target of this.memory.scoutOperations) {
            const spawn = this.closestSpawn(target.room);
            if (!spawn) {
                continue;
            }
            const role = "scout";

            if (!this.hasScoutForRoom(target.room)) {
                try {
                    const name = this.spawnSingleCreep(spawn, role, { role: role, room: target.room, working: false } as CreepMemory, [MOVE]);
                    if (!name) continue;

                    let room = Memory.rooms[target.room];
                    if (!room.respawnManager) {
                        room.respawnManager = {};
                    }
                    room.respawnManager.scout = { name: name };
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    private ensureControllersAreMine() {
        for (let roomName of Object.keys(this.roomsMemory)) {
            const rm = this.roomsMemory[roomName].respawnManager;
            if (rm?.desiredOwnership !== "RESERVED" && rm?.desiredOwnership !== "OWNED") continue;
            if (!Game.rooms[roomName]) continue;
            if (!Game.rooms[roomName].controller) continue;
            if (Game.rooms[roomName].controller?.my) continue;

            const spawn = this.closestSpawn(roomName);
            if (!spawn) {
                continue;
            }
            const role = "claimer";

            if (!this.hasClaimerForRoom(roomName)) {
                try {
                    const name = this.spawnSingleCreep(spawn, role, { role: role, room: roomName, working: false } as CreepMemory,
                        this.makeDynamicallySizedClaimer(spawn.room.energyCapacityAvailable, rm.desiredOwnership));
                    if (!name) continue;

                    let room = Memory.rooms[roomName];
                    if (!room.respawnManager) {
                        room.respawnManager = {};
                    }
                    room.respawnManager.claimer = { name: name };
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    private ensureSourcesHaveDrills(room: Room) {
        if (this.lockedDownRooms.has(room.name) ||
            !room.memory.sources)
            return;

        const role = "drill";
        for (let source of room.memory.sources) {
            if (this.hasDrillForSource(room, source)) continue;
            let spawns = room.find(FIND_MY_SPAWNS, {
                filter: (spawn: StructureSpawn) => {
                    return !this.isSpawnBusy(spawn);
                }
            });
            if ((!spawns) || (spawns.length === 0)) {
                return;
            }

            try {
                const name = this.spawnSingleCreep(spawns[0], role, { role: role, room: room.name, working: true, sourceId: source } as CreepMemory,
                    this.makeDynamicallySizedDrill(room.energyCapacityAvailable));
                if (!name) continue;

                let roomMemory = Memory.rooms[room.name];
                if (!roomMemory.respawnManager) {
                    roomMemory.respawnManager = {};
                }
                if (!roomMemory.respawnManager.drills) {
                    roomMemory.respawnManager.drills = {} as DrillMapping;
                }
                roomMemory.respawnManager.drills[source] = { name: name };
            } catch (err) {
                console.log(err);
            }
        }
    }

    private closestSpawn(room: string): StructureSpawn | undefined {
        const spawns = Object.values(Game.spawns);
        let distance = Infinity;
        let closestSpawn: StructureSpawn | undefined;

        for (let spawn of spawns) {
            if (spawn.room.name === room) continue;
            if (this.isSpawnBusy(spawn)) continue;
            if (!spawn.room.controller) continue;
            if (!spawn.room.storage) continue
            //if (spawn.room.controller.level < 5) continue;

            const route = Game.map.findRoute(spawn.room, room);
            if (route === -2) {
                continue;
            }
            if (route.length < distance) {
                distance = route.length;
                closestSpawn = spawn;
            }
        }

        if (distance > 5)
            return undefined;

        return closestSpawn;
    }

    private hasEnoughCreepsOnSource(source: Source, role: string, minimum: number): boolean {
        let count = 0;
        for (const value of Object.values(Memory.creeps)) {
            if (value.role !== role) continue;
            if (value.sourceId === source.id) {
                count++;
            }
        }
        return count >= minimum;
}

    private hasDrillForSource(room: Room, sourceId: Id<Source>): boolean {
        const rm = this.roomsMemory[room.name].respawnManager;
        if (!rm) return false;
        if (!rm.drills) return false;
        return this.creepIsAlive(rm.drills[sourceId]);
    }

    private hasEnoughCreepsTargetingRoom(room: string, role: string, minimum: number): boolean {
        initRoomMemory(room);

        let count = 0;
        for (const value of Object.values(Memory.creeps)) {
            if (value.role !== role) continue;
            if (value.room === room) {
                count++;
            }
        }
        return count >= minimum;
    }

    private creepIsAlive(creepInfo?: CreepInfo): boolean {
        if (!creepInfo) return false;
        const creep = Game.creeps[creepInfo.name];
        if (!creep) return false;
        if (creep.spawning) return true;
        if (!creep.ticksToLive) return false;
        if (creep.ticksToLive > 50) return true;
        return false;
    }

    private hasScoutForRoom(room: string): boolean {
        initRoomMemory(room);
        const roomMemory = this.roomsMemory[room];
        if (!roomMemory.respawnManager) {
            return false;
        }
        const scout = roomMemory.respawnManager.scout;
        if (scout) {
            return this.creepIsAlive(scout);
        } else {
            return false;
        }
    }

    private hasClaimerForRoom(room: string): boolean {
        initRoomMemory(room);
        const roomMemory = this.roomsMemory[room];
        if (!roomMemory.respawnManager) {
            return false;
        }
        const claimer = roomMemory.respawnManager.claimer;
        if (claimer) {
            return this.creepIsAlive(claimer);
        } else {
            return false;
        }
    }

    private makeDynamicallySizedFighter(energyCap: number): Array<BodyPartConstant> {
        const maxPieces = Math.min(Math.floor(energyCap / 190), 8);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(TOUGH);
        }
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(MOVE);
            arrayOfBodyParts.push(MOVE);
            arrayOfBodyParts.push(ATTACK);
        }
        return arrayOfBodyParts;
    }

    private makeDynamicallySizedClaimer(energyCap: number, ownership: DesiredOwnership): Array<BodyPartConstant> {
        let maxPieces = Math.min(Math.floor(energyCap / 650), ownership === "OWNED" ? 1 : 3);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(MOVE);
            arrayOfBodyParts.push(CLAIM);
        }
        return arrayOfBodyParts;
    }

    private makeDynamicallySizedWorker(energyCap: number): Array<BodyPartConstant> {
        const maxPieces = Math.min(Math.floor(energyCap / 200), 5);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(MOVE);
            arrayOfBodyParts.push(WORK);
            arrayOfBodyParts.push(CARRY);
        }
        return arrayOfBodyParts;
    }

    private makeDynamicallySizedDrill(energyCap: number): Array<BodyPartConstant> {
        const maxPieces = Math.min(Math.floor((energyCap - 50) / 100), 5);
        let arrayOfBodyParts = new Array<BodyPartConstant>();
        arrayOfBodyParts.push(MOVE);
        for (let i = 0; i < maxPieces; i++) {
            arrayOfBodyParts.push(WORK);
        }
        return arrayOfBodyParts;
    }

    private isSpawnBusy(spawn: StructureSpawn) {
        return this.lockedDownRooms.has(spawn.room.name) ||
            this.busySpawns.has(spawn.name) || spawn.spawning;
    }

    private spawnSingleCreep(spawn: StructureSpawn, role: string, memory: CreepMemory, bodyParts: Array<BodyPartConstant> = roles[role], name: string = `creep_${role}_${Game.time}`): string | undefined {
        const ret = spawn.spawnCreep(bodyParts, name, { memory: memory });
        switch (ret) {
            case ERR_NOT_OWNER:
            case ERR_BUSY:
            case ERR_INVALID_ARGS:
            case ERR_RCL_NOT_ENOUGH:
                throw new Error(`💣Internal logic error when spawning creep ${role} from ${spawn.name}`);
            case ERR_NAME_EXISTS:
            case ERR_NOT_ENOUGH_ENERGY:
                this.lockedDownRooms.add(spawn.room.name);
                return;
            default:
                this.busySpawns.add(spawn.name);
                return name;
        }
    }

    private lockedDownRooms: Set<string>;
    private busySpawns: Set<string>;
}

class RoleDict {
    [role: string]: BodyPartConstant[];
}

const roles: RoleDict = {
    "builder": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "drill": [WORK, WORK, WORK, WORK, WORK, MOVE],
    "sweeper": [WORK, CARRY, MOVE],
    "worker": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "remote_miner": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "remote_builder": [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    "claimer": [MOVE, CLAIM],
    "scout": [MOVE],
};


