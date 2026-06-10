import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { NextRequest } from 'next/server'
import { PUT } from '../../src/app/api/game/[id]/route'

describe('/api/game/[id] route', () => {
  it('returns 400 for malformed JSON save bodies', async () => {
    const req = new Request('http://localhost/api/game/save-1', {
      method: 'PUT',
      body: '',
    }) as NextRequest

    const res = await PUT(req, { params: Promise.resolve({ id: 'save-1' }) })
    const body = (await res.json()) as { error: string }

    assert.equal(res.status, 400)
    assert.equal(body.error, 'invalid state')
  })
})
