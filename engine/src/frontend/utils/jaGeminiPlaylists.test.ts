import { describe, expect, it } from "vitest"
import { jaNextIndex, jaPlaybackMode, jaShuffleOrder, jaYoutubeId } from "./jaGeminiPlaylists"

describe("JA playlist queue: no accidental replay or skip", () => {
    it("normal mode advances and stops at the end", () => {
        expect(jaNextIndex("normal",3,0)).toEqual({index:1,position:0})
        expect(jaNextIndex("normal",3,2)).toEqual({index:-1,position:0})
    })
    it("repeat-all wraps to the first entry", () => {
        expect(jaNextIndex("repeat-all",3,2)).toEqual({index:0,position:0})
    })
    it("repeat-one repeats only on automatic advance; manual Next advances", () => {
        expect(jaNextIndex("repeat-one",3,1,false)).toEqual({index:1,position:0})
        expect(jaNextIndex("repeat-one",3,1,true)).toEqual({index:2,position:0})
    })
    it("shuffle includes each item exactly once and does not replay on exhaustion", () => {
        const order=jaShuffleOrder(5,2,()=>0)
        expect(order[0]).toBe(2)
        expect([...order].sort((a,b)=>a-b)).toEqual([0,1,2,3,4])
        for(let pos=0;pos<order.length-1;pos++)
            expect(jaNextIndex("shuffle",5,order[pos],false,order,pos))
                .toEqual({index:order[pos+1],position:pos+1})
        expect(jaNextIndex("shuffle",5,order[4],false,order,4).index).toBe(-1)
    })
    it("legacy repeat preference is recognized without resetting an explicit mode", () => {
        expect(jaPlaybackMode(undefined,true)).toBe("repeat-all")
        expect(jaPlaybackMode("shuffle",true)).toBe("shuffle")
    })
    it("does not treat an empty list as playable", () => {
        expect(jaNextIndex("repeat-all",0,0).index).toBe(-1)
    })
    it("accepts YouTube links but rejects lookalike hosts", () => {
        expect(jaYoutubeId("https://youtu.be/123456789ab")).toBe("123456789ab")
        expect(jaYoutubeId("https://youtube.com.evil.example/watch?v=123456789ab")).toBe("")
    })
})
