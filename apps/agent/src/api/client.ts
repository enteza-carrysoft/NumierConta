import http from 'http'
import https from 'https'
import { URL } from 'url'

export interface ApiResponse<T = unknown> {
  status: number
  body: T
}

export interface HttpClient {
  get<T>(path: string): Promise<ApiResponse<T>>
  post<T>(path: string, body: unknown): Promise<ApiResponse<T>>
}

function requestJson<T>(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const url = new URL(path, baseUrl)
  const payload = body !== undefined ? JSON.stringify(body) : undefined

  const options: http.RequestOptions = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search}`,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Key': apiKey,
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  }

  const transport = url.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        let parsed: unknown = null
        if (data.trim()) {
          try {
            parsed = JSON.parse(data)
          } catch {
            parsed = data
          }
        }
        resolve({ status: res.statusCode ?? 0, body: parsed as T })
      })
    })

    req.on('error', reject)

    if (payload) {
      req.write(payload)
    }
    req.end()
  })
}

export function createHttpClient(baseUrl: string, apiKey: string): HttpClient {
  return {
    get<T>(path: string): Promise<ApiResponse<T>> {
      return requestJson<T>(baseUrl, apiKey, 'GET', path)
    },
    post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
      return requestJson<T>(baseUrl, apiKey, 'POST', path, body)
    },
  }
}
