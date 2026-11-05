import { Main } from "../../types/IPC/Main"
import { ToMain } from "../../types/IPC/ToMain"
import { destroyMain, receiveToMain, sendMain } from "../IPC/main"

// Same-machine, one-source WebRTC relay. The operator owns the only Windows
// desktop capture; physical output BrowserWindows receive its video track.
// Signaling stays inside the Electron app (no network server or STUN service).
type Signal={
    sourceId:string
    peerId:string
    action:"request"|"offer"|"answer"|"ice"|"close"
    description?:{type:"offer"|"answer";sdp?:string}
    candidate?:any
    to?:"publisher"|"viewer"
}
const emit=(msg:Signal)=>sendMain(Main.JA_CAPTURE_SIGNAL,msg)
const peerConfig:RTCConfiguration={iceServers:[]}

export function shareJACapture(sourceId:string,stream:MediaStream):()=>void{
    if(!sourceId||!stream.getVideoTracks().length)return ()=>{}
    const peers=new Map<string,RTCPeerConnection>()
    let destroyed=false
    const listener=receiveToMain(ToMain.JA_CAPTURE_SIGNAL,(msg:Signal)=>{
        if(destroyed||msg.sourceId!==sourceId)return
        if(msg.action==="request"){
            const existing=peers.get(msg.peerId)
            existing?.close()
            const pc=new RTCPeerConnection(peerConfig)
            peers.set(msg.peerId,pc)
            for(const track of stream.getVideoTracks())pc.addTrack(track,stream)
            pc.onicecandidate=e=>{
                if(e.candidate&&!destroyed)emit({sourceId,peerId:msg.peerId,action:"ice",candidate:e.candidate.toJSON(),to:"viewer"})
            }
            pc.onconnectionstatechange=()=>{
                if(["failed","closed"].includes(pc.connectionState)){
                    if(peers.get(msg.peerId)===pc){peers.delete(msg.peerId);pc.close()}
                }
            }
            void (async()=>{
                try{
                    const offer=await pc.createOffer()
                    await pc.setLocalDescription(offer)
                    if(!destroyed && peers.get(msg.peerId)===pc)
                        emit({sourceId,peerId:msg.peerId,action:"offer",description:{type:"offer",sdp:pc.localDescription?.sdp}})
                }catch(error){console.warn("JA capture relay offer:",error)}
            })()
        }else if(msg.action==="answer"){
            const pc=peers.get(msg.peerId)
            if(pc && msg.description?.sdp && pc.signalingState==="have-local-offer")
                void pc.setRemoteDescription({type:"answer",sdp:msg.description.sdp}).catch(e=>console.warn("JA capture relay answer:",e))
        }else if(msg.action==="ice" && msg.to==="publisher"){
            const pc=peers.get(msg.peerId)
            if(pc && msg.candidate)void pc.addIceCandidate(msg.candidate).catch(()=>{})
        }else if(msg.action==="close"){
            const pc=peers.get(msg.peerId)
            pc?.close()
            peers.delete(msg.peerId)
        }
    })
    return ()=>{
        destroyed=true
        destroyMain(listener)
        for(const pc of peers.values())pc.close()
        peers.clear()
    }
}

export function receiveJACapture(sourceId:string,onStream:(stream:MediaStream)=>void,onError:(message:string)=>void):()=>void{
    if(!sourceId)return ()=>{}
    const peerId="ja-view-"+Math.random().toString(36).slice(2)+"-"+Date.now().toString(36)
    const pc=new RTCPeerConnection(peerConfig)
    let destroyed=false
    let received=false
    let remoteReady=false
    const iceQueue:RTCIceCandidateInit[]=[]
    pc.ontrack=e=>{
        if(destroyed)return
        received=true
        const stream=e.streams[0] || new MediaStream([e.track])
        onStream(stream)
    }
    pc.onicecandidate=e=>{
        if(e.candidate&&!destroyed)emit({sourceId,peerId,action:"ice",candidate:e.candidate.toJSON(),to:"publisher"})
    }
    pc.onconnectionstatechange=()=>{
        if(pc.connectionState==="failed"&&!destroyed)onError("Falló el enlace de video entre JA y la pantalla.")
    }
    const listener=receiveToMain(ToMain.JA_CAPTURE_SIGNAL,(msg:Signal)=>{
        if(destroyed||msg.sourceId!==sourceId||msg.peerId!==peerId)return
        if(msg.action==="offer" && msg.description?.sdp){
            void (async()=>{
                try{
                    await pc.setRemoteDescription({type:"offer",sdp:msg.description!.sdp})
                    remoteReady=true
                    for(const candidate of iceQueue)await pc.addIceCandidate(candidate).catch(()=>{})
                    iceQueue.length=0
                    const answer=await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    emit({sourceId,peerId,action:"answer",description:{type:"answer",sdp:pc.localDescription?.sdp}})
                }catch(error){if(!destroyed)onError("Error al establecer video de salida: "+String(error))}
            })()
        }else if(msg.action==="ice" && msg.to==="viewer" && msg.candidate){
            if(!remoteReady)iceQueue.push(msg.candidate)
            else void pc.addIceCandidate(msg.candidate).catch(()=>{})
        }
    })
    // Outputs can mount before or after the operator starts capture.
    emit({sourceId,peerId,action:"request"})
    const retry=setInterval(()=>{
        if(destroyed||received){clearInterval(retry);return}
        emit({sourceId,peerId,action:"request"})
    },2200)
    return ()=>{
        destroyed=true
        clearInterval(retry)
        emit({sourceId,peerId,action:"close"})
        destroyMain(listener)
        pc.close()
    }
}
