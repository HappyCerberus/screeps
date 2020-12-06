# Screeps AI

![screeps](https://socialify.git.ci/HappyCerberus/screeps/image?description=1&descriptionEditable=AI%20that%20cares%2C%20about%20profit%2C%20and%20creeps...%20sometimes.&font=KoHo&forks=1&language=1&owner=1&pattern=Signal&stargazers=1&theme=Light)

## Goals

- separate the code into smaller chunks (out of the massive main.ts)
- maybe document some of the things
- have a memory member on each of my classes
  - this will be a reference into the memory
- cleanup all the leftovers from old schedulers and stuff
- visual flare

```
class X {
    constructor(private memory: XMemory) {
        // inject methods onto memory
    }

}

let x : X;
x.memory.something
```

room
- resource available
- spawn1, spawn2

SpawnManager - per room

room_can_spawn() : boolean {
  !lock_down && !all_spawns_busy
}

if (!all_spawns_busy && resources < NEED) lock_down_room;
if (!spawn.busy) { unlock & spawn }

spawn_p0
spawn_p1
spawn_p2

## Notes

- I need to figure out a consistent way to have fast access to deserialized memory, without stringifying everything. Main problem where is going from XInterface to X, re-setting the methods on the object and dealing with the fact that typescript is generally not happy about doing that.
- Resource scheduler needs to be integrated into the new scheduler. Resource allocations for "smartworkers" need to be persisted across several ticks.
- All the work atoms need to be implemented, right now there is only repair.
