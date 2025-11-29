'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ViewerView from '@/components/ViewerView'

export default function StreamPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const streamId = params.id as string
    const [username, setUsername] = useState('')
    const [streamerId, setStreamerId] = useState('')
    const [hasUsername, setHasUsername] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check if username is in URL
        const urlUsername = searchParams.get('username')
        if (urlUsername) {
            setUsername(urlUsername)
            setHasUsername(true)
        }

        // Fetch stream details
        fetch(`/api/streams/${streamId}`)
            .then((res) => res.json())
            .then((data) => {
                setStreamerId(data.userId)
                setLoading(false)
            })
            .catch((err) => {
                console.error('Error fetching stream:', err)
                setLoading(false)
            })
    }, [streamId, searchParams])

    const handleJoinStream = (e: React.FormEvent) => {
        e.preventDefault()
        if (username.trim()) {
            setHasUsername(true)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">📡</div>
                    <p className="text-gray-400 text-xl">Loading stream...</p>
                </div>
            </div>
        )
    }

    if (!hasUsername) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl">
                    <h2 className="text-3xl font-bold text-white mb-6 text-center">Join Stream</h2>
                    <form onSubmit={handleJoinStream} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Enter Your Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Your username"
                                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                        >
                            Join Stream
                        </button>
                    </form>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full mt-4 text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        )
    }

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

                <ViewerView streamId={streamId} username={username} streamerId={streamerId} />
            </div>
        </div>
    )
}
