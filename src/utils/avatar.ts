import { createAvatar } from '@dicebear/core'
import { funEmoji } from '@dicebear/collection'

// Seed indices pre-verified to produce 24 visually unique avatars
const UNIQUE_SEEDS = [0,1,2,3,4,5,6,7,8,9,10,11,12,14,15,18,19,20,21,22,24,25,28,30]

export const AVATAR_COUNT = UNIQUE_SEEDS.length

export function getAvatarSvg(avatarId: number): string {
  const seed = UNIQUE_SEEDS[avatarId % AVATAR_COUNT] ?? avatarId
  return createAvatar(funEmoji, {
    seed: `pexedu-${seed}`,
    size: 128,
  }).toString()
}

export function getAvatarDataUri(avatarId: number): string {
  const svg = getAvatarSvg(avatarId)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
