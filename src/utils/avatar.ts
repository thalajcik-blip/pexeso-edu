import { createAvatar } from '@dicebear/core'
import { funEmoji } from '@dicebear/collection'

const EYES_DEFAULT = ['closed','closed2','cute','glasses','love','pissed','plain','shades','stars','wink','wink2'] as const
const MOUTH_A = ['cute','kissHeart','lilSmile','plain','shout','smileLol','smileTeeth','tongueOut','wideSmile'] as const
const MOUTH_B = ['cute','kissHeart','lilSmile','shout','smileLol','smileTeeth','tongueOut','wideSmile'] as const

type AvatarDef = {
  seed: string
  backgroundColor?: string
  eyes?: readonly string[]
  mouth?: readonly string[]
}

const AVATARS: AvatarDef[] = [
  { seed: 'Amaya' },
  { seed: 'Liam' },
  { seed: 'Riley',     mouth: MOUTH_A },
  { seed: 'Wyatt',     mouth: MOUTH_A },
  { seed: 'Liliana',   mouth: MOUTH_A },
  { seed: 'Alexander', mouth: MOUTH_A },
  { seed: 'Leah',      backgroundColor: 'fcbc34', mouth: MOUTH_A },
  { seed: 'Adrian',    backgroundColor: 'fcbc34', mouth: MOUTH_A },
  { seed: 'Alexander', backgroundColor: '71cf62', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Adrian',    backgroundColor: '71cf62', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Liliana',   backgroundColor: '71cf62', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Kimberly',  backgroundColor: '71cf62', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Christian', backgroundColor: 'd84be5', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Vivian',    backgroundColor: 'd84be5', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Alexander', backgroundColor: 'd84be5', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Eden',      backgroundColor: 'd84be5', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'George',    backgroundColor: 'b6e3f4', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Mason',     backgroundColor: 'b6e3f4', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Sawyer',    backgroundColor: 'b6e3f4', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Christian', backgroundColor: 'b6e3f4', eyes: EYES_DEFAULT, mouth: MOUTH_A },
  { seed: 'Sawyer',    backgroundColor: 'd9915b', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Kingston',  backgroundColor: 'd9915b', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Sara',      backgroundColor: 'd9915b', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Felix',     backgroundColor: 'd9915b', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'George',    backgroundColor: 'c0aede', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Leah',      backgroundColor: 'c0aede', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Robert',    backgroundColor: 'c0aede', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Jack',      backgroundColor: 'c0aede', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Nolan',     backgroundColor: 'f6d594', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Caleb',     backgroundColor: 'f6d594', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Amaya',     backgroundColor: 'f6d594', eyes: EYES_DEFAULT, mouth: MOUTH_B },
  { seed: 'Wyatt',     backgroundColor: 'f6d594', eyes: EYES_DEFAULT, mouth: MOUTH_B },
]

export const AVATAR_COUNT = AVATARS.length

// One representative per color group — used as defaults for players 1-6
export const DEFAULT_AVATAR_IDS = [1, 7, 9, 13, 17, 21]

export function getAvatarSvg(avatarId: number): string {
  const def = AVATARS[avatarId % AVATAR_COUNT]!
  return createAvatar(funEmoji, {
    seed: def.seed,
    size: 128,
    rotate: 10,
    scale: 90,
    radius: 20,
    ...(def.backgroundColor ? { backgroundColor: [def.backgroundColor] } : {}),
    ...(def.eyes ? { eyes: [...def.eyes] as any } : {}),
    ...(def.mouth ? { mouth: [...def.mouth] as any } : {}),
  }).toString()
}

export function getAvatarDataUri(avatarId: number): string {
  const svg = getAvatarSvg(avatarId)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
