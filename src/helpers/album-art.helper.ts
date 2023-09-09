import axios from 'axios'
import * as log from 'lambda-log'

export async function albumArtUrlToBuffer(url: string): Promise<Buffer | undefined> {
  try {
    const imgData = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(imgData.data as ArrayBuffer)
  } catch (err: any) {
    log.error(`Error downloading image: ${url}`)
    return undefined
  }
}
