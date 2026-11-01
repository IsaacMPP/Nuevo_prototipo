// H1-02a: directory boundaries for the standalone video hymnal.
// Do not compare by startsWith(root) alone: "Himnario Adventista 2" is NOT inside "Himnario Adventista".
export function normalizeJAContentPath(path: string): string {
    return (path || "").replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "").toLocaleLowerCase()
}

export function isPathInJACollection(filePath: string, rootPath: string): boolean {
    const file = normalizeJAContentPath(filePath)
    const root = normalizeJAContentPath(rootPath)
    return !!file && !!root && (file === root || file.startsWith(root + "/"))
}

export function isJAExclusiveHymnPath(path: string, hymnFolderPaths: string[]): boolean {
    return hymnFolderPaths.some((root) => isPathInJACollection(path, root))
}

// Treat an ancestor registered as Multimedia as overlapping; the media browser must
// explicitly exclude hymn descendant items instead of relying on folder registration alone.
export function isJAOverlappingFolder(path: string, otherPath: string): boolean {
    return isPathInJACollection(path, otherPath) || isPathInJACollection(otherPath, path)
}
