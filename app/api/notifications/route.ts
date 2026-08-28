import { getNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(await getNotifications(5))
  } catch {
    return Response.json({ items: [], unreadCount: 0 })
  }
}
