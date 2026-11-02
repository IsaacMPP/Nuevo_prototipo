import { describe, expect, it } from "vitest"
import { geminiCounts, geminiFileType, geminiLocalFiles, geminiSearch } from "./jaGeminiLibrary"
describe("bibliotecas Gemini con archivos reales", () => {
 it("clasifica extensiones de vídeo, imagen y audio sin inventar archivos", () => {
    expect(geminiFileType("D:\\Videos\\01.mp4")).toBe("video")
    expect(geminiFileType("D:\\Fotos\\02.JPG")).toBe("image")
    expect(geminiFileType("D:\\Audio\\03.mp3")).toBe("audio")
    expect(geminiFileType("D:\\Videos\\readme.txt")).toBeNull()
    expect(geminiFileType("https://ejemplo.org/video.mp4")).toBeNull()
 })
 it("excluye Himnario y Juveniles incluso dentro de Multimedia ancestral", () => {
    const files=geminiLocalFiles([
      {path:"D:\\Contenido\\Himnario Adventista\\001.mp4",name:"001.mp4"},
      {path:"D:\\Contenido\\Himnario Adventista 2\\001.mp4",name:"001.mp4"},
      {path:"D:\\Contenido\\Juveniles\\002.webm",name:"002.webm"},
      {path:"D:\\Contenido\\Imagenes\\foto.png",name:"foto.png"},
      {path:"D:\\Contenido\\Imagenes\\FOTO.png",name:"FOTO.png"},
      {path:"D:\\Contenido\\Vacío",name:"Vacío",isFolder:true}
    ],["D:\\Contenido\\Himnario Adventista","D:\\Contenido\\Juveniles"])
    expect(files.map(x=>x.path)).toEqual(["D:\\Contenido\\Himnario Adventista 2\\001.mp4","D:\\Contenido\\Imagenes\\foto.png"])
    expect(geminiCounts(files)).toEqual({video:1,image:1,audio:0,all:2})
 })
 it("navega por nombre con búsqueda insensible a tildes y por tipo", () => {
    const source=geminiLocalFiles([
      {path:"C:\\media\\Canción.mp4",name:"Canción.mp4"},
      {path:"C:\\media\\Foto.jpg",name:"Foto.jpg"}
    ])
    expect(geminiSearch(source,"cancion","video").map(x=>x.name)).toEqual(["Canción.mp4"])
    expect(geminiSearch(source,"foto","video")).toEqual([])
    expect(geminiSearch(source,"","all")).toHaveLength(2)
 })
 it("la lista vacía tiene conteos reales cero", () => {
    expect(geminiCounts(geminiLocalFiles([]))).toEqual({video:0,image:0,audio:0,all:0})
 })

 it("lee nombres de archivos creados físicamente por la prueba (no cifras del prototipo)", async () => {
    const fs=await import("node:fs")
    const os=await import("node:os")
    const path=await import("node:path")
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ja-gemini-"))
    try {
        const mediaDir=path.join(dir,"Multimedia")
        const hymnDir=path.join(dir,"Himnario Adventista")
        fs.mkdirSync(mediaDir);fs.mkdirSync(hymnDir)
        fs.writeFileSync(path.join(mediaDir,"video real.mp4"),"")
        fs.writeFileSync(path.join(mediaDir,"foto real.png"),"")
        fs.writeFileSync(path.join(hymnDir,"001.mp4"),"")
        const actual=[mediaDir,hymnDir].flatMap(folder =>
          fs.readdirSync(folder,{withFileTypes:true}).map(file=>({path:path.join(folder,file.name),name:file.name,isFolder:file.isDirectory()}))
        )
        const catalog=geminiLocalFiles(actual,[hymnDir])
        expect(catalog.map(x=>x.name).sort()).toEqual(["foto real.png","video real.mp4"])
        expect(geminiCounts(catalog)).toEqual({video:1,image:1,audio:0,all:2})
    } finally {fs.rmSync(dir,{recursive:true,force:true})}
 })
})
