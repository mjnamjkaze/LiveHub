'use client'

import { useParams, useSearchParams } from 'next/navigation'
import StreamerView from '@/components/StreamerView'
import ChatBox from '@/components/ChatBox'
import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function BroadcastPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const streamId = params.id as string
    const username = searchParams.get('username') || 'Streamer'
    const socketRef = useRef<any>(null)

    useEffect(() => {
        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            path: '/api/socket/io',
        })

        return () => {
            socketRef.current?.disconnect()
        }
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <a
                        href="/"
                        className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-2"
                    >
                        ← Back to Home
                    </a>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <StreamerView streamId={streamId} username={username} />
                    </div>
                    <div className="lg:col-span-1">
                        <ChatBox streamId={streamId} username={username} socket={socketRef.current} />
                    </div>
                </div>
            </div>
        </div>
    )
}
