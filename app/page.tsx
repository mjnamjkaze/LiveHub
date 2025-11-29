'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StreamList from '@/components/StreamList'

export default function Home() {
    const [username, setUsername] = useState('')
    const [streamTitle, setStreamTitle] = useState('')
    const [showCreateStream, setShowCreateStream] = useState(false)
    const router = useRouter()

    const handleCreateStream = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!username.trim() || !streamTitle.trim()) {
            alert('Please enter both username and stream title')
            return
        }

        try {
            const response = await fetch('/api/streams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: `user-${username}`,
                    username,
                    title: streamTitle,
                }),
            })

            const stream = await response.json()

            // Redirect to broadcast page
            router.push(`/broadcast/${stream.id}?username=${username}`)
        } catch (error) {
            console.error('Error creating stream:', error)
            alert('Failed to create stream')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        LiveHub
                    </h1>
                    <p className="text-xl text-gray-300">
                        Stream live, chat, and connect with your audience
                    </p>
                </div>

                {/* Create Stream Button */}
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => setShowCreateStream(!showCreateStream)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-2xl"
                    >
                        {showCreateStream ? '✕ Cancel' : '🎥 Start Streaming'}
                    </button>
                </div>

                {/* Create Stream Form */}
                {showCreateStream && (
                    <div className="max-w-md mx-auto mb-12 bg-gray-800 rounded-lg p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Create Your Stream</h2>
                        <form onSubmit={handleCreateStream} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Your Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Stream Title
                                </label>
                                <input
                                    type="text"
                                    value={streamTitle}
                                    onChange={(e) => setStreamTitle(e.target.value)}
                                    placeholder="What are you streaming?"
                                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                            >
                                Go Live 🚀
                            </button>
                        </form>
                    </div>
                )}

                {/* Live Streams */}
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-6">🔴 Live Now</h2>
                    <StreamList />
                </div>
            </div>
        </div>
    )
}
