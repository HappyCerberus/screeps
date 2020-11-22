import { memoryUsage } from "process";
import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep) {
    common.disassemble_logic(creep);
}
