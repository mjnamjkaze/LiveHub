'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import SimplePeer from 'simple-peer'

interface StreamerViewProps {
    streamId: string
    username: string
}

export default function StreamerView({ streamId, username }: StreamerViewProps) {
    const [isStreaming, setIsStreaming] = useState(false)
    const [viewerCount, setViewerCount] = useState(0)
    const [peers, setPeers] = useState<Map<string, SimplePeer.Instance>>(new Map())

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        // Initialize socket
        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            path: '/api/socket/io',
        })

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server')
            socketRef.current?.emit('join-stream', {
                streamId,
                role: 'broadcaster'
            })
        })

        // Handle existing viewers (who joined before broadcaster)
        socketRef.current.on('existing-viewers', (viewerIds: string[]) => {
            console.log('📋 Existing viewers:', viewerIds)
            viewerIds.forEach((viewerId) => {
                console.log('⚠️ Creating peer for existing viewer (stream may not be ready yet):', viewerId)
                createPeerConnection(viewerId, true)
            })
        })

        // Handle new viewers
        socketRef.current.on('viewer-joined', (viewerId: string) => {
            console.log('👁️ Viewer joined:', viewerId)
            setViewerCount((prev) => prev + 1)

            console.log('🔗 Creating peer connection for new viewer:', viewerId)
            createPeerConnection(viewerId, true)
        })

        // Handle viewer leaving
        socketRef.current.on('viewer-left', (viewerId: string) => {
            console.log('Viewer left:', viewerId)
            setViewerCount((prev) => Math.max(0, prev - 1))

            const peer = peers.get(viewerId)
            if (peer) {
                peer.destroy()
                setPeers((prev) => {
                    const newPeers = new Map(prev)
                    newPeers.delete(viewerId)
                    return newPeers
                })
            }
        })

        // Handle WebRTC answer from viewer
        socketRef.current.on('answer', ({ answer, from }: { answer: any; from: string }) => {
            console.log('📥 Received ANSWER from viewer:', from)
            const peer = peers.get(from)
            if (peer && !peer.destroyed) {
                peer.signal(answer)
            } else {
                console.warn('⚠️ Cannot signal answer - peer not found or destroyed:', from)
            }
        })

        // Handle ICE candidates
        socketRef.current.on('ice-candidate', ({ candidate, from }: { candidate: any; from: string }) => {
            console.log('📥 Received ICE candidate from viewer:', from)
            const peer = peers.get(from)
            if (peer && !peer.destroyed) {
                peer.signal(candidate)
            } else {
                console.warn('⚠️ Cannot signal ICE candidate - peer not found or destroyed:', from)
            }
        })

        return () => {
            socketRef.current?.disconnect()
            stopStreaming()
        }
    }, [streamId])

    const createPeerConnection = (viewerId: string, initiator: boolean) => {
        console.log(`🔗 Creating peer connection for viewer: ${viewerId}`)
        console.log(`📹 Stream available: ${!!streamRef.current}`)

        const peerConfig: any = {
            initiator,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        }

        // Add stream if available
        if (streamRef.current) {
            peerConfig.stream = streamRef.current
        }

        const peer = new SimplePeer(peerConfig)

        peer.on('signal', (signal) => {
            if (signal.type === 'offer') {
                console.log(`📤 Streamer sending OFFER to ${viewerId}`)
                console.log('📋 OFFER SDP:', signal.sdp?.substring(0, 100) + '...')
                socketRef.current?.emit('offer', {
                    streamId,
                    offer: signal,
                    to: viewerId,
                })
            } else if (signal.type === 'answer') {
                console.log(`📤 Streamer sending ANSWER to ${viewerId}`)
                socketRef.current?.emit('answer', {
                    streamId,
                    answer: signal,
                    to: viewerId,
                })
            } else {
                // ICE candidate
                console.log(`📤 Streamer sending ICE candidate to ${viewerId}`)
                socketRef.current?.emit('ice-candidate', {
                    candidate: signal,
                    to: viewerId,
                })
            }
        })

        peer.on('connect', () => {
            console.log(`✅ Peer connected to viewer: ${viewerId}`)
        })

        peer.on('close', () => {
            console.log(`🔴 Peer closed for viewer: ${viewerId}`)
        })

        peer.on('error', (err) => {
            console.error(`❌ Peer error for viewer ${viewerId}:`, err)
        })

        // Monitor ICE connection state (if available)
        const pc = (peer as any)._pc as RTCPeerConnection | undefined
        pc?.addEventListener('iceconnectionstatechange', () => {
            const state = pc.iceConnectionState
            console.log(`🧊 ICE State for ${viewerId}:`, state)
            if (state === 'failed') {
                console.error('❌ ICE connection failed - may need TURN server')
            }
        })

        setPeers((prev) => new Map(prev).set(viewerId, peer))
    }

    const startStreaming = async () => {
        try {
            console.log('🎥 Requesting camera/microphone access...')
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: true,
            })

            console.log('✅ Camera access successful!')
            stream.getTracks().forEach((track) => {
                console.log(`🎬 Track added: ${track.kind} [${track.id}] enabled=${track.enabled}`)
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }

            // Add stream to existing peers
            console.log(`📡 Adding stream to ${peers.size} existing peer(s)`)
            peers.forEach((peer, viewerId) => {
                console.log(`➕ Adding stream to peer: ${viewerId}`)
                stream.getTracks().forEach(track => {
                    peer.addTrack(track, stream)
                })
            })

            setIsStreaming(true)
        } catch (error: any) {
            console.error('❌ Camera Error:', error.name, error.message)

            let errorMessage = 'Could not access camera/microphone. '

            if (error.name === 'NotAllowedError') {
                errorMessage += 'Permission denied. Please allow camera/microphone access in your browser settings.'
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No camera or microphone found. Please connect a device.'
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Camera is already in use by another application.'
            } else {
                errorMessage += error.message || 'Unknown error occurred.'
            }

            alert(errorMessage)
        }
    }

    const stopStreaming = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }

        peers.forEach((peer) => peer.destroy())
        setPeers(new Map())

        setIsStreaming(false)
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                <div className="relative aspect-video bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />

                    {!isStreaming && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📹</div>
                                <p className="text-gray-400">Camera preview will appear here</p>
                            </div>
                        </div>
                    )}

                    <div className="absolute top-4 left-4 flex gap-2">
                        {isStreaming && (
                            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                LIVE
                            </div>
                        )}
                        <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            👁️ {viewerCount} viewers
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Your Stream</h2>
                            <p className="text-gray-400 text-sm">Streaming as {username}</p>
                        </div>

                        <div className="flex gap-3">
                            {!isStreaming ? (
                                <button
                                    onClick={startStreaming}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                                >
                                    Start Streaming
                                </button>
                            ) : (
                                <button
                                    onClick={stopStreaming}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                                >
                                    Stop Streaming
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
