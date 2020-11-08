export function deserializeSet<Type>(rawData: string): Set<Type> {
    try {
        return new Set<Type>(JSON.parse(rawData));
    } catch (err) {
        return new Set<Type>();
    }
}

export function serializeSet<Type>(data: Set<Type>): string {
    return JSON.stringify([...data]);
}

export function deserializeMap<Key, Value>(rawData: string): Map<Key, Value> {
    try {
        return new Map<Key, Value>(JSON.parse(rawData));
    } catch (err) {
        return new Map<Key, Value>();
    }
}

export function serializeMap<Key, Value>(data: Map<Key, Value>): string {
    return JSON.stringify([...data]);
}
