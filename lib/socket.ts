import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: SocketIOServer
        }
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
}

let io: SocketIOServer | null = null

export function getIO(res: NextApiResponseServerIO): SocketIOServer {
    if (!res.socket.server.io) {
        console.log('Initializing Socket.io server...')

        const httpServer: NetServer = res.socket.server as any
        io = new SocketIOServer(httpServer, {
            path: '/api/socket/io',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        })

        res.socket.server.io = io

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id)

            // Store user role per stream
            const userRoles = new Map<string, 'broadcaster' | 'viewer'>()

            // Join stream room with role
            socket.on('join-stream', (data: { streamId: string; role?: 'broadcaster' | 'viewer' } | string) => {
                const streamId = typeof data === 'string' ? data : data.streamId
                const role: 'broadcaster' | 'viewer' = typeof data === 'object' && data.role ? data.role : 'viewer'

                console.log(`Socket ${socket.id} joining stream ${streamId} as ${role}`)
                socket.join(streamId)
                userRoles.set(socket.id, role)

                if (role === 'viewer') {
                    // Notify ONLY the broadcaster about new viewer
                    const roomSockets = io?.sockets.adapter.rooms.get(streamId)
                    if (roomSockets && io) {
                        roomSockets.forEach((socketId) => {
                            const targetSocket = io.sockets.sockets.get(socketId)
                            if (targetSocket && userRoles.get(socketId) === 'broadcaster') {
                                console.log(`📢 Notifying broadcaster ${socketId} about viewer ${socket.id}`)
                                targetSocket.emit('viewer-joined', socket.id)
                            }
                        })
                    }
                } else if (role === 'broadcaster') {
                    // When broadcaster joins, get list of existing viewers
                    const roomSockets = io?.sockets.adapter.rooms.get(streamId)
                    const viewers: string[] = []
                    if (roomSockets) {
                        roomSockets.forEach((socketId) => {
                            if (socketId !== socket.id && userRoles.get(socketId) === 'viewer') {
                                viewers.push(socketId)
                            }
                        })
                    }
                    if (viewers.length > 0) {
                        console.log(`📢 Broadcaster joined, existing viewers:`, viewers)
                        socket.emit('existing-viewers', viewers)
                    }
                }
            })

            // Leave stream room
            socket.on('leave-stream', (streamId: string) => {
                console.log(`Socket ${socket.id} leaving stream ${streamId}`)
                socket.leave(streamId)
                socket.to(streamId).emit('viewer-left', socket.id)
                userRoles.delete(socket.id)
            })

            // WebRTC signaling
            socket.on('offer', (data: { streamId: string; offer: any; to: string }) => {
                const timestamp = new Date().toISOString()
                console.log(`[${timestamp}] 📤 OFFER: ${socket.id} → ${data.to} (stream: ${data.streamId})`)

                if (!data.to) {
                    console.error('❌ Offer missing "to" field')
                    return
                }

                io?.to(data.to).emit('offer', {
                    offer: data.offer,
                    from: socket.id,
                })
            })

            socket.on('answer', (data: { streamId: string; answer: any; to: string }) => {
                const timestamp = new Date().toISOString()
                console.log(`[${timestamp}] 📤 ANSWER: ${socket.id} → ${data.to} (stream: ${data.streamId})`)

                if (!data.to) {
                    console.error('❌ Answer missing "to" field')
                    return
                }

                io?.to(data.to).emit('answer', {
                    answer: data.answer,
                    from: socket.id,
                })
            })

            socket.on('ice-candidate', (data: { candidate: any; to: string }) => {
                const timestamp = new Date().toISOString()
                console.log(`[${timestamp}] 📤 ICE: ${socket.id} → ${data.to}`)

                if (!data.to) {
                    console.error('❌ ICE candidate missing "to" field')
                    return
                }

                io?.to(data.to).emit('ice-candidate', {
                    candidate: data.candidate,
                    from: socket.id,
                })
            })

            // Chat messages
            socket.on('send-message', (data: { streamId: string; message: any }) => {
                console.log(`Message in stream ${data.streamId}:`, data.message)
                io?.to(data.streamId).emit('new-message', data.message)
            })

            // Likes
            socket.on('send-like', (data: { streamId: string; userId: string }) => {
                console.log(`Like in stream ${data.streamId} from ${data.userId}`)
                io?.to(data.streamId).emit('new-like', { userId: data.userId })
            })

            // Viewer count updates
            socket.on('update-viewer-count', (data: { streamId: string; count: number }) => {
                io?.to(data.streamId).emit('viewer-count-updated', data.count)
            })

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id)
            })
        })
    }

    return res.socket.server.io
}
