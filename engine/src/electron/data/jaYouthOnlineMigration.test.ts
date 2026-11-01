import { describe, expect, it } from "vitest"
import { jaYouthPlayerVideos, legacyDemoPlayerVideos } from "./defaults"
import { getMigratedJAYouthPlayers } from "./jaYouthOnlineMigration"

describe("JA online youth video defaults", () => {
    it("replaces only untouched FreeShow demonstrations while keeping user videos", () => {
        const custom = { name: "Mi video", type: "youtube", id: "AAAAAAAAAAA", tags: ["youth"] }
        const input = { ...legacyDemoPlayerVideos, custom }
        const result = getMigratedJAYouthPlayers(input)!
        expect(result.custom).toEqual(custom)
        expect(Object.keys(jaYouthPlayerVideos)).toHaveLength(5)
        for (const key of Object.keys(legacyDemoPlayerVideos)) expect(result).not.toHaveProperty(key)
        for (const [key, song] of Object.entries(jaYouthPlayerVideos)) expect(result[key]).toEqual(song)
    })

    it("preserves edited samples and existing youth video IDs without duplicates", () => {
        const changed = { ...legacyDemoPlayerVideos.chosen, name: "Mi trailer", tags: ["mine"] }
        const existing = { name: "Mi Yo voy", type: "youtube", id: "pyot7PtanJ0" }
        const result = getMigratedJAYouthPlayers({ chosen: changed, story: legacyDemoPlayerVideos.story, myYouthSong: existing })!
        expect(result.chosen).toEqual(changed)
        expect(result).not.toHaveProperty("story")
        expect(result.myYouthSong).toEqual(existing)
        expect(result).not.toHaveProperty("jaYouthYoVoy")
    })

    it("does not re-add samples when the user has none left and is idempotent", () => {
        expect(getMigratedJAYouthPlayers({})).toBeNull()
        expect(getMigratedJAYouthPlayers({ custom: { name: "Solo mío", id: "123", type: "youtube" } })).toBeNull()
        const migrated = getMigratedJAYouthPlayers({ gospel: legacyDemoPlayerVideos.gospel })!
        expect(getMigratedJAYouthPlayers(migrated)).toBeNull()
    })
})
