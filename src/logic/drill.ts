import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"
import * as globalData from "../data/global"

export function run(creep: Creep, empire: globalData.Global) {
    if (creep.memory.sourceId === undefined) {
        console.log(`Fatal error, a drill with undefined sourceId : ${creep.name}.`);
        return;
    }

    common.drill_logic(creep, creep.memory.sourceId);
}
