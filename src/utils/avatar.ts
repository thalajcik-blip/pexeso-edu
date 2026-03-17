import { createAvatar } from '@dicebear/core'
import { micah } from '@dicebear/collection'

export const AVATAR_COUNT = 24

export function getAvatarSvg(avatarId: number): string {
  return createAvatar(micah, {
    seed: `pexedu-${avatarId}`,
    size: 128,
    backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1f4d1', 'fae9c8'],
  }).toString()
}

export function getAvatarDataUri(avatarId: number): string {
  const svg = getAvatarSvg(avatarId)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
