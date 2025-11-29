import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all active streams
export async function GET() {
    try {
        const streams = await prisma.stream.findMany({
            where: {
                isLive: true,
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
                startedAt: 'desc',
            },
        })

        return NextResponse.json(streams)
    } catch (error) {
        console.error('Error fetching streams:', error)
        return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 })
    }
}

// POST create new stream
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, username, title } = body

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

        // Create stream
        const stream = await prisma.stream.create({
            data: {
                userId: user.id,
                title,
                isLive: true,
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

        return NextResponse.json(stream)
    } catch (error) {
        console.error('Error creating stream:', error)
        return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 })
    }
}
