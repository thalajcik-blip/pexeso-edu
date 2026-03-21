import { createAvatar } from '@dicebear/core'
import { funEmoji } from '@dicebear/collection'

export const AVATAR_COUNT = 24

export function getAvatarSvg(avatarId: number): string {
  return createAvatar(funEmoji, {
    seed: `pexedu-${avatarId}`,
    size: 128,
  }).toString()
}

export function getAvatarDataUri(avatarId: number): string {
  const svg = getAvatarSvg(avatarId)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
