import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

type Props = {
  imageSrc: string
  onCrop: (blob: Blob) => void
  onClose: () => void
}

async function getCroppedBlob(imageSrc: string, cropArea: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = 600 // výstupná veľkosť v px
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  ctx.drawImage(
    image,
    cropArea.x * scaleX,
    cropArea.y * scaleY,
    cropArea.width * scaleX,
    cropArea.height * scaleY,
    0, 0, size, size,
  )

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.88))
}

export default function CropModal({ imageSrc, onCrop, onClose }: Props) {
  const [crop, setCrop]       = useState({ x: 0, y: 0 })
  const [zoom, setZoom]       = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing]   = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedArea) return
    setProcessing(true)
    const blob = await getCroppedBlob(imageSrc, croppedArea)
    onCrop(blob)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/60 shrink-0">
        <div className="text-white font-semibold text-sm">Oříznout obrázek</div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
      </div>

      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#111' },
          }}
        />
      </div>

      {/* Footer — zoom + confirm */}
      <div className="shrink-0 bg-black/60 px-5 py-4 flex items-center gap-4">
        <span className="text-white/50 text-xs shrink-0">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="shrink-0 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {processing ? 'Zpracování…' : 'Potvrdit výřez'}
        </button>
      </div>
    </div>
  )
}
