export type StructureResourceProvider = StructureContainer | StructureStorage;

export class ResourceScheduler {
    constructor(room: Room) {
        this.sources = room.find(FIND_STRUCTURES, {
            filter: (structure: AnyStructure) => {
                return structure.structureType === STRUCTURE_CONTAINER ||
                    structure.structureType === STRUCTURE_STORAGE;
            }
        }) as StructureResourceProvider[];

        this.state = new Map<string, number>();
        for (const source of this.sources) {
            this.state.set(source.id, source.store.energy);
        }
    }

    claimResources(creep: Creep, amount: number): StructureResourceProvider | undefined {
        const target = creep.pos.findClosestByPath(this.sources, {
            filter: (src: StructureResourceProvider) => {
                let v = this.state.get(src.id);
                if (v === undefined) {
                    throw new Error(`Internal sanity failed mismatch between cached and real state. Source ID ${src.id} not found in cache.`);
                }
                return v >= amount;
            },
            algorithm: "astar"
        });

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
    private state: Map<string, number>;
    private static rs: Map<string, ResourceScheduler>;
}
