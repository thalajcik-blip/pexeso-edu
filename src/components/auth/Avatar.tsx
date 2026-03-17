import { getAvatarDataUri } from '../../utils/avatar'

interface AvatarProps {
  avatarId: number
  size?: number
  className?: string
}

export function Avatar({ avatarId, size = 40, className }: AvatarProps) {
  return (
    <img
      src={getAvatarDataUri(avatarId)}
      alt={`Avatar ${avatarId}`}
      width={size}
      height={size}
      style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
      className={className}
    />
  )
}
