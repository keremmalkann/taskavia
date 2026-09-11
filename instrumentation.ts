import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./lib/observability/server')
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { ErrorCodes, reportServerError } = await import('./lib/observability/server')
  await reportServerError(error, {
    code: ErrorCodes.unhandledServer,
    event: 'next.unhandled_request_error',
    severity: 'fatal',
    context: {
      method: request.method,
      path: request.path.split('?')[0],
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      renderSource: context.renderSource,
    },
  })
}
