'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import SimplePeer from 'simple-peer'
import ChatBox from './ChatBox'
import HeartAnimation from './HeartAnimation'

interface ViewerViewProps {
    streamId: string
    username: string
    streamerId: string
}

export default function ViewerView({ streamId, username, streamerId }: ViewerViewProps) {
    const [isConnected, setIsConnected] = useState(false)
    const [viewerCount, setViewerCount] = useState(0)
    const [showHearts, setShowHearts] = useState<number[]>([])

    const videoRef = useRef<HTMLVideoElement>(null)
    const peerRef = useRef<SimplePeer.Instance | null>(null)
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
                role: 'viewer'
            })
        })

        // Handle offer from streamer
        socketRef.current.on('offer', ({ offer, from }: { offer: any; from: string }) => {
            console.log('📥 Received OFFER from streamer:', from)
            createPeerConnection(offer)
        })

        // Handle ICE candidates
        socketRef.current.on('ice-candidate', ({ candidate, from }: { candidate: any; from: string }) => {
            console.log('📥 Received ICE candidate from streamer:', from)
            if (peerRef.current && !peerRef.current.destroyed) {
                peerRef.current.signal(candidate)
            } else {
                console.warn('⚠️ Cannot signal ICE candidate - peer not ready or destroyed')
            }
        })

        // Handle viewer count updates
        socketRef.current.on('viewer-count-updated', (count: number) => {
            setViewerCount(count)
        })

        // Handle new likes
        socketRef.current.on('new-like', () => {
            setShowHearts((prev) => [...prev, Date.now()])
        })

        return () => {
            socketRef.current?.emit('leave-stream', streamId)
            socketRef.current?.disconnect()
            peerRef.current?.destroy()
        }
    }, [streamId])

    const createPeerConnection = (offer: any) => {
        // If peer already exists, just signal it (renegotiation)
        if (peerRef.current && !peerRef.current.destroyed) {
            console.log('🔄 Received renegotiation OFFER, signaling existing peer')
            peerRef.current.signal(offer)
            return
        }

        console.log('📥 Received initial OFFER from streamer, creating peer connection')

        const peer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        })

        peer.on('signal', (signal) => {
            if (signal.type === 'answer') {
                console.log('📤 Viewer sending ANSWER to streamer')
                console.log('📋 ANSWER SDP:', signal.sdp?.substring(0, 100) + '...')
                socketRef.current?.emit('answer', {
                    streamId,
                    answer: signal,
                    to: streamerId,
                })
            } else {
                // ICE candidate
                console.log('📤 Viewer sending ICE candidate to streamer')
                socketRef.current?.emit('ice-candidate', {
                    candidate: signal,
                    to: streamerId,
                })
            }
        })

        peer.on('stream', (stream) => {
            console.log('📺 Stream received from broadcaster!')
            console.log('🎬 Tracks:', stream.getTracks().map(t => ({
                kind: t.kind,
                id: t.id,
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
            })))

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsConnected(true)
                console.log('✅ Video element srcObject set')
            }
        })

        peer.on('connect', () => {
            console.log('✅ Peer connected to streamer!')
        })

        peer.on('close', () => {
            console.log('🔴 Peer connection closed')
            setIsConnected(false)
            peerRef.current = null
        })

        peer.on('error', (err) => {
            console.error('❌ Peer error:', err)
        })

        // Monitor ICE connection state
        const pc = (peer as any)._pc as RTCPeerConnection | undefined
        pc?.addEventListener('iceconnectionstatechange', () => {
            const state = pc.iceConnectionState
            console.log('🧊 ICE State:', state)
            if (state === 'failed') {
                console.error('❌ ICE connection failed - may need TURN server')
            } else if (state === 'connected') {
                console.log('✅ ICE connection established!')
            }
        })

        // Connection timeout warning
        const timeout = setTimeout(() => {
            if (!peerRef.current || pc?.iceConnectionState !== 'connected') {
                console.warn('⚠️ Connection timeout - still not connected after 10 seconds')
            }
        }, 10000)

        peer.on('connect', () => clearTimeout(timeout))

        console.log('🔗 Signaling offer to peer')
        peer.signal(offer)
        peerRef.current = peer
    }

    const handleSendLike = () => {
        socketRef.current?.emit('send-like', { streamId, userId: username })
        setShowHearts((prev) => [...prev, Date.now()])
    }

    const handleRemoveHeart = (id: number) => {
        setShowHearts((prev) => prev.filter((heartId) => heartId !== id))
    }

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Player */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                        <div className="relative aspect-video bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />

                            {!isConnected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4 animate-pulse">📡</div>
                                        <p className="text-gray-400">Connecting to stream...</p>
                                    </div>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 flex gap-2">
                                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    LIVE
                                </div>
                                <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                    👁️ {viewerCount} viewers
                                </div>
                            </div>

                            {/* Heart Button */}
                            <div className="absolute bottom-4 right-4">
                                <button
                                    onClick={handleSendLike}
                                    className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95"
                                >
                                    <span className="text-2xl">❤️</span>
                                </button>
                            </div>

                            {/* Heart Animations */}
                            {showHearts.map((id) => (
                                <HeartAnimation key={id} onComplete={() => handleRemoveHeart(id)} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat */}
                <div className="lg:col-span-1">
                    <ChatBox streamId={streamId} username={username} socket={socketRef.current} />
                </div>
            </div>
        </div>
    )
}
