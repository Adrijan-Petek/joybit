import { NextResponse } from 'next/server'

const IMGBB_URL = 'https://api.imgbb.com/1/upload'

export async function POST(request: Request) {
  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'IMGBB_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const imageInput = typeof body?.image === 'string' ? body.image : ''
    if (!imageInput) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 })
    }

    const image = imageInput.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
    const formData = new FormData()
    formData.set('image', image)
    if (typeof body?.name === 'string' && body.name.trim()) {
      formData.set('name', body.name.trim())
    }
    if (typeof body?.expiration === 'number') {
      formData.set('expiration', String(body.expiration))
    }

    const response = await fetch(`${IMGBB_URL}?key=${apiKey}`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json({
      url: result?.data?.url,
      display_url: result?.data?.display_url,
      delete_url: result?.data?.delete_url,
      id: result?.data?.id
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
