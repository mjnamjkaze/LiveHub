'use client'

import { useEffect, useState } from 'react'

interface HeartAnimationProps {
    onComplete: () => void
}

export default function HeartAnimation({ onComplete }: HeartAnimationProps) {
    const [position] = useState({
        left: Math.random() * 80 + 10, // Random position between 10% and 90%
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete()
        }, 3000)

        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div
            className="absolute bottom-20 text-4xl animate-float-up pointer-events-none"
            style={{ left: `${position.left}%` }}
        >
            ❤️
        </div>
    )
}
