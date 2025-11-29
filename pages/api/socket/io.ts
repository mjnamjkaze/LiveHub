import { NextApiRequest } from 'next'
import { NextApiResponseServerIO, getIO } from '@/lib/socket'

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (req.method === 'GET' || req.method === 'POST') {
        getIO(res)
        res.status(200).json({ success: true })
    } else {
        res.status(405).json({ error: 'Method not allowed' })
    }
}
