import { getAvatarDataUri, AVATAR_COUNT } from '../../utils/avatar'

interface AvatarPickerProps {
  selected: number
  onChange: (id: number) => void
  accentColor: string
}

export function AvatarPicker({ selected, onChange, accentColor }: AvatarPickerProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map(id => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: 3,
            borderRadius: 8,
            border: selected === id ? `2px solid ${accentColor}` : '2px solid transparent',
            background: selected === id ? `${accentColor}26` : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <img
            src={getAvatarDataUri(id)}
            alt={`Avatar ${id}`}
            width={44}
            height={44}
            style={{ borderRadius: '50%', display: 'block' }}
          />
        </button>
      ))}
    </div>
  )
}
