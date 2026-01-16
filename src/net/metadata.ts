import { Buffer } from 'buffer'
import * as log from 'lambda-log'
import { Track } from '../types/components'

export async function getTrackFromMetadataStream(streamUrl?: string): Promise<Track | undefined> {
  if (!streamUrl) {
    log.warn('Stream URL is not set')
    return undefined
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(streamUrl, {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const icyMetaInt = parseInt(response.headers.get('icy-metaint') || '0', 10)

    if (icyMetaInt === 0) {
      throw new Error('Stream does not support metadata')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Unable to read stream')
    }

    let buffer = Buffer.alloc(0)
    let bytesNeeded = icyMetaInt + 1

    while (buffer.length < bytesNeeded) {
      const { done, value } = await reader.read()

      if (done) {
        throw new Error('Stream ended before metadata')
      }

      buffer = Buffer.concat([buffer, Buffer.from(value)])
    }

    const metaLength = (buffer[icyMetaInt] ?? 0) * 16
    bytesNeeded = icyMetaInt + 1 + metaLength

    while (buffer.length < bytesNeeded) {
      const { done, value } = await reader.read()

      if (done) {
        throw new Error('Stream ended before metadata')
      }

      buffer = Buffer.concat([buffer, Buffer.from(value)])
    }

    const metaData = buffer.subarray(icyMetaInt + 1, icyMetaInt + 1 + metaLength)
    const metaString = metaData.toString('utf-8').replace(/\0+$/, '')

    reader.cancel()
    clearTimeout(timeoutId)

    return parseMetadata(metaString)
  } catch (error) {
    clearTimeout(timeoutId)
    log.error(`Error getting track from metadata ${JSON.stringify(error)}`)
    return undefined
  }
}

function parseMetadata(metaString: string): Track | undefined {
  const result: Track = {
    name: '',
    artist: '',
  }

  const streamTitleMatch = metaString.match(/StreamTitle='([^']*)'/)

  if (streamTitleMatch && streamTitleMatch[1]) {
    const streamTitle = streamTitleMatch[1]

    const separators = [' - ', ' – ', ' — ', ' | ']

    const separator = separators.find(sep => streamTitle.includes(sep))

    if (separator) {
      const parts = streamTitle.split(separator)
      result.artist = parts[0]?.trim() ?? ''
      result.name = parts.slice(1).join(separator).trim()
    } else {
      result.name = streamTitle
    }
  }

  return result.artist && result.name ? result : undefined
}
