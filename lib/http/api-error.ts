export function apiError(code: string, message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message, code }, { status, headers })
}
