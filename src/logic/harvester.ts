import * as globals from "../globals"
import * as common from "./common"

export function run(creep: Creep) {
    common.harvest_logic(creep);
}
