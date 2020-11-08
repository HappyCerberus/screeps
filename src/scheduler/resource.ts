export type StructureResourceProvider = StructureContainer | StructureStorage;

export class ResourceScheduler {
    constructor(room: Room) {
        this.sources = room.find(FIND_STRUCTURES, {
            filter: (structure: AnyStructure) => {
                return structure.structureType === STRUCTURE_CONTAINER ||
                    structure.structureType === STRUCTURE_STORAGE;
            }
        }) as StructureResourceProvider[];

        this.drops = room.find(FIND_DROPPED_RESOURCES) as Resource<ResourceConstant>[];

        this.state = new Map<string, number>();
        for (const source of this.sources) {
            this.state.set(source.id, source.store.energy);
        }
        for (const drop of this.drops) {
            this.state.set(drop.id, drop.amount);
        }
    }

    claimResources(creep: Creep, amount: number): StructureResourceProvider | Resource<ResourceConstant> | undefined {
        let target: StructureResourceProvider | Resource<ResourceConstant> | null = creep.pos.findClosestByPath(this.drops, {
            filter: (drop: Resource<ResourceConstant>) => {
                if (drop.resourceType !== RESOURCE_ENERGY) return false;
                let v = this.state.get(drop.id);
                if (v === undefined) {
                    throw new Error(`Internal sanity failed mismatch between cached and real state. Source ID ${drop.id} not found in cache.`);
                }
                return v > 0; // TODO: check if the distance is not bigger than the cache, otherwise the creep can't get there before resources expire.
            },
            algorithm: "astar"
        });

        if (target === undefined || target === null) {
            console.log("Failed to allocate resources from drops.");
            target = creep.pos.findClosestByPath(this.sources, {
                filter: (src: StructureResourceProvider) => {
                    let v = this.state.get(src.id);
                    if (v === undefined) {
                        throw new Error(`Internal sanity failed mismatch between cached and real state. Source ID ${src.id} not found in cache.`);
                    }
                    return v >= amount;
                },
                algorithm: "astar"
            });
        }

        if (target === undefined || target === null) return undefined;

        let v = this.state.get(target.id);
        if (v === undefined) {
            throw new Error(`Internal sanity failed mismatch between cached and real state. Source ID ${target.id} not found in cache.`);
        }
        this.state.set(target.id, v - amount);
        console.log(`Successfully allocated ${amount} of energy from ${target.id} to creep ${creep.id}`);
        return target;
    }

    debugLog() {
        console.log(`Found ${this.sources.length} resource sources.`);
        for (const src of this.sources) {
            console.log(`Source ${src.id} has capacity ${this.state.get(src.id)}`);
        }
    }

    static initResourceScheduler(room: Room) {
        let rs = new ResourceScheduler(room);
        rs.debugLog();
        if (this.rs === undefined || this.rs === null) {
            this.rs = new Map<string, ResourceScheduler>();
        }
        this.rs.set(room.name, rs);
    }

    static getResourceScheduler(room: Room) : ResourceScheduler | undefined {
        return this.rs.get(room.name);
    }

    private sources: StructureResourceProvider[];
    private drops: Resource<ResourceConstant>[];
    private state: Map<string, number>;
    private static rs: Map<string, ResourceScheduler>;
}
