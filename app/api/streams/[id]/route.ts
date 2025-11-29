import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET stream by ID
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stream = await prisma.stream.findUnique({
            where: {
                id: params.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                messages: {
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
                },
            },
        })

        if (!stream) {
            return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
        }

        return NextResponse.json(stream)
    } catch (error) {
        console.error('Error fetching stream:', error)
        return NextResponse.json({ error: 'Failed to fetch stream' }, { status: 500 })
    }
}

// PATCH update stream
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { isLive, viewerCount } = body

        const stream = await prisma.stream.update({
            where: {
                id: params.id,
            },
            data: {
                ...(typeof isLive !== 'undefined' && { isLive }),
                ...(typeof viewerCount !== 'undefined' && { viewerCount }),
                ...(isLive === false && { endedAt: new Date() }),
            },
        })

        return NextResponse.json(stream)
    } catch (error) {
        console.error('Error updating stream:', error)
        return NextResponse.json({ error: 'Failed to update stream' }, { status: 500 })
    }
}

// DELETE stream
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.stream.delete({
            where: {
                id: params.id,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting stream:', error)
        return NextResponse.json({ error: 'Failed to delete stream' }, { status: 500 })
    }
}
