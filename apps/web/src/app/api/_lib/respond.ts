import { NextResponse } from 'next/server'
import type { ApiError, IngestResult } from '@numierconta/shared'

const DEFAULT_ERROR_MESSAGE = 'Internal server error'

export function successResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init })
}

export function createdResponse<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function errorResponse(
  code: ApiError['error']['code'],
  message: string,
  status: number
) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function badRequest(message: string) {
  return errorResponse('BAD_REQUEST', message, 400)
}

export function unauthorized(message = 'Invalid or missing agent API key') {
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function forbidden(message: string) {
  return errorResponse('FORBIDDEN', message, 403)
}

export function notFound(message: string) {
  return errorResponse('NOT_FOUND', message, 404)
}

export function internalError(message = DEFAULT_ERROR_MESSAGE) {
  return errorResponse('INTERNAL_ERROR', message, 500)
}

export function ingestResultResponse(result: IngestResult) {
  return successResponse(result)
}
