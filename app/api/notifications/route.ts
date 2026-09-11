import { getNotifications } from '@/lib/notifications'
import { ErrorCodes, reportServerError } from '@/lib/observability/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(await getNotifications(5))
  } catch (error) {
    const eventId = await reportServerError(error, {
      code: ErrorCodes.notificationQueryFailed,
      event: 'notification.feed_query_failed',
    })
    return Response.json({ items: [], unreadCount: 0, code: ErrorCodes.notificationQueryFailed, eventId }, { status: 500 })
  }
}
