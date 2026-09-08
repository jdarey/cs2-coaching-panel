import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getYouTubeId, getVideoEmbedUrl } from './utils'

describe('getYouTubeId', () => {
  it('extracts ids from standard watch URLs', () => {
    assert.equal(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  })

  it('extracts ids from short links', () => {
    assert.equal(getYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=abc123'), 'dQw4w9WgXcQ')
  })

  it('extracts ids from embed, shorts and live URLs', () => {
    assert.equal(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(getYouTubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  })

  it('handles extra query params and timestamps', () => {
    assert.equal(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'), 'dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube sources', () => {
    assert.equal(getYouTubeId('https://vimeo.com/76979871'), null)
    assert.equal(getYouTubeId('https://drive.google.com/file/d/abc/view'), null)
    assert.equal(getYouTubeId('https://example.com/video'), null)
  })
})

describe('getVideoEmbedUrl', () => {
  it('builds embed URLs for YouTube links', () => {
    assert.equal(
      getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
    assert.equal(
      getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?si=abc'),
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
    assert.equal(
      getVideoEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ'),
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
  })

  it('builds embed URLs for Vimeo links', () => {
    assert.equal(
      getVideoEmbedUrl('https://vimeo.com/76979871'),
      'https://player.vimeo.com/video/76979871'
    )
  })

  it('returns null for unsupported sources', () => {
    assert.equal(getVideoEmbedUrl('https://drive.google.com/file/d/abc/view'), null)
  })
})
