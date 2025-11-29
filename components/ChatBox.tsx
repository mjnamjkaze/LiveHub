'use client'

import { useEffect, useState, useRef } from 'react'
import { Socket } from 'socket.io-client'

interface Message {
    id: string
    content: string
    user: {
        username: string
    }
    createdAt: string
}

interface ChatBoxProps {
    streamId: string
    username: string
    socket: Socket | null
}

export default function ChatBox({ streamId, username, socket }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Fetch existing messages
        fetch(`/api/messages?streamId=${streamId}`)
            .then((res) => res.json())
            .then((data) => setMessages(data))
            .catch((err) => console.error('Error fetching messages:', err))
    }, [streamId])

    useEffect(() => {
        if (!socket) return

        socket.on('new-message', (message: Message) => {
            setMessages((prev) => [...prev, message])
        })

        return () => {
            socket.off('new-message')
        }
    }, [socket])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!inputValue.trim()) return

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    streamId,
                    userId: `user-${username}`,
                    username,
                    content: inputValue,
                }),
            })

            const message = await response.json()

            // Emit to socket for real-time update
            socket?.emit('send-message', { streamId, message })

            setInputValue('')
        } catch (error) {
            console.error('Error sending message:', error)
        }
    }

    return (
        <div className="bg-gray-900 rounded-lg shadow-2xl h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">Live Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p>No messages yet. Be the first to chat!</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className="bg-gray-800 rounded-lg p-3">
                            <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-purple-400 text-sm">
                                    {message.user.username}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(message.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-white mt-1">{message.content}</p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    )
}
