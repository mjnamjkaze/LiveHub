'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stream {
    id: string
    title: string
    viewerCount: number
    user: {
        username: string
    }
    startedAt: string
}

export default function StreamList() {
    const [streams, setStreams] = useState<Stream[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStreams()

        // Refresh stream list every 5 seconds
        const interval = setInterval(fetchStreams, 5000)
        return () => clearInterval(interval)
    }, [])

    const fetchStreams = async () => {
        try {
            const response = await fetch('/api/streams')
            const data = await response.json()
            setStreams(data)
        } catch (error) {
            console.error('Error fetching streams:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-4 animate-pulse">📡</div>
                <p className="text-gray-400">Loading streams...</p>
            </div>
        )
    }

    if (streams.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-bold text-white mb-2">No Live Streams</h3>
                <p className="text-gray-400">Be the first to start streaming!</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
                <Link
                    key={stream.id}
                    href={`/stream/${stream.id}`}
                    className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all transform hover:scale-105"
                >
                    <div className="aspect-video bg-gradient-to-br from-purple-900 to-pink-900 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-6xl opacity-50">📹</div>
                        </div>

                        <div className="absolute top-3 left-3">
                            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                LIVE
                            </div>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                                👁️ {stream.viewerCount}
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <h3 className="font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                            {stream.title}
                        </h3>
                        <p className="text-sm text-gray-400">{stream.user.username}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Started {new Date(stream.startedAt).toLocaleTimeString()}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    )
}
