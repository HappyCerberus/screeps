# Screeps AI

![screeps](https://socialify.git.ci/HappyCerberus/screeps/image?description=1&descriptionEditable=AI%20that%20cares%2C%20about%20profit%2C%20and%20creeps...%20sometimes.&font=KoHo&forks=1&language=1&owner=1&pattern=Signal&stargazers=1&theme=Light)


## Notes

- I need to figure out a consistent way to have fast access to deserialized memory, without stringifying everything. Main problem where is going from XInterface to X, re-setting the methods on the object and dealing with the fact that typescript is generally not happy about doing that.
- Resource scheduler needs to be integrated into the new scheduler. Resource allocations for "smartworkers" need to be persisted across several ticks.
- All the work atoms need to be implemented, right now there is only repair.
