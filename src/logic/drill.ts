import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep, drillMap: Map<string, Id<Creep>>, spawning: Set<string>) {
    if (creep.memory.sourceId === undefined) {
        console.log(`Fatal error, a drill with undefined sourceId : ${creep.name}.`);
        return;
    }

    const sourceId = creep.memory.sourceId;
    const creepId = drillMap.get(sourceId.toString());
    if (creepId !== creep.id) {
        drillMap.set(sourceId.toString(), creep.id);
        spawning.delete(creep.name);
    }

    common.drill_logic(creep, sourceId);
}
