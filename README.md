# Screeps AI

![screeps](https://socialify.git.ci/HappyCerberus/screeps/image?description=1&descriptionEditable=AI%20that%20cares%2C%20about%20profit%2C%20and%20creeps...%20sometimes.&font=KoHo&forks=1&language=1&owner=1&pattern=Signal&stargazers=1&theme=Light)

## Goals

Switch over to the workflow style workers.

1. smarter integration with resource scheduler, where the creep does not switch targets ever tick, but instead generates a two step workflow to go to a place and takes resources from there (dropped resource, or storage/container/link)
2. make it still work with the old worker logic, where if not full of energy and not working -> go take more resources, otherwise go do job
3. after this is working, switch over the actual job logic to the new FancyJobScheduler

Finally extend the object prototypes / interfaces with custom stuff.

1. worker isFull(), isEmpty()...

## Notes

- I need to figure out a consistent way to have fast access to deserialized memory, without stringifying everything. Main problem where is going from XInterface to X, re-setting the methods on the object and dealing with the fact that typescript is generally not happy about doing that.
- Resource scheduler needs to be integrated into the new scheduler. Resource allocations for "smartworkers" need to be persisted across several ticks.
- All the work atoms need to be implemented, right now there is only repair.
