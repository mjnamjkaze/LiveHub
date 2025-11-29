import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET messages for a stream
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const streamId = searchParams.get('streamId')

        if (!streamId) {
            return NextResponse.json({ error: 'Stream ID required' }, { status: 400 })
        }

        const messages = await prisma.message.findMany({
            where: {
                streamId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        })

        return NextResponse.json(messages)
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

// POST create new message
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { streamId, userId, username, content } = body

        // Create or get user
        let user = await prisma.user.findUnique({
            where: { username },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: userId,
                    username,
                },
            })
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                streamId,
                userId: user.id,
                content,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        })

        return NextResponse.json(message)
    } catch (error) {
        console.error('Error creating message:', error)
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }
}
