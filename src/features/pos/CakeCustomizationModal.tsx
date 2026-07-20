import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cake, Heart, Gem, Star, Gift, Baby, Sparkles } from 'lucide-react'
import type { CakeCustomization } from '@/types'

const C = {
  cream: '#F7F1E8',
  creamDark: '#EFE4D4',
  brown: '#3E2515',
  brownMid: '#5C3A21',
  caramel: '#C98A4B',
  caramelSoft: '#E8C79A',
}

const CAKE_TYPES = [
  { id: 'birthday', label: 'Birthday', icon: Cake, emoji: '🎂' },
  { id: 'wedding', label: 'Wedding', icon: Heart, emoji: '💒' },
  { id: 'anniversary', label: 'Anniversary', icon: Sparkles, emoji: '✨' },
  { id: 'engagement', label: 'Engagement', icon: Gem, emoji: '💍' },
  { id: 'graduation', label: 'Graduation', icon: Star, emoji: '🎓' },
  { id: 'baby-shower', label: 'Baby Shower', icon: Baby, emoji: '👶' },
  { id: 'custom', label: 'Custom', icon: Gift, emoji: '🎁' },
] as const

type CakeTypeId = typeof CAKE_TYPES[number]['id']

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (customization: CakeCustomization) => void
  isCakeProduct: boolean
}

export function CakeCustomizationModal({ isOpen, onClose, onConfirm, isCakeProduct }: Props) {
  const [selectedType, setSelectedType] = useState<CakeTypeId | null>(null)
  const [design, setDesign] = useState('')
  const [textOnCake, setTextOnCake] = useState('')

  const handleConfirm = () => {
    if (!selectedType && !design && !textOnCake) {
      onClose()
      return
    }

    onConfirm({
      type: selectedType || undefined,
      design: design.trim() || undefined,
      textOnCake: textOnCake.trim() || undefined,
    })
    setSelectedType(null)
    setDesign('')
    setTextOnCake('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl sm:p-8"
            style={{ backgroundColor: C.cream }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">{isCakeProduct ? 'Customize Your Cake' : 'Add Cake Details'}</h2>
                <p className="mt-1 text-sm opacity-70">Make your order extra special</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Cake Type Selection */}
              <div>
                <label className="mb-3 block text-sm font-semibold">What's the occasion? 🎉</label>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {CAKE_TYPES.map((type) => (
                    <motion.button
                      key={type.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedType(type.id)}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center transition-all ${
                        selectedType === type.id
                          ? 'ring-2 shadow-lg'
                          : 'hover:shadow-md'
                      }`}
                      style={{
                        backgroundColor: selectedType === type.id ? C.caramelSoft : C.creamDark,
                        color: selectedType === type.id ? C.brown : 'inherit',
                        borderColor: selectedType === type.id ? C.brown : undefined,
                      }}
                    >
                      <span className="text-2xl">{type.emoji}</span>
                      <span className="text-xs font-bold">{type.label}</span>
                      {selectedType === type.id && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: C.brown }}
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Design Description */}
              <div>
                <label className="mb-3 block text-sm font-semibold">Design & Decorations 🎨</label>
                <p className="mb-2 text-xs opacity-60">Describe the design you'd like (colors, patterns, decorations)</p>
                <textarea
                  value={design}
                  onChange={(e) => setDesign(e.target.value)}
                  placeholder="e.g., White fondant with gold accents, fresh flowers on top, rose decorations..."
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 resize-none"
                />
                <p className="mt-1 text-xs opacity-50">{design.length}/200 characters</p>
              </div>

              {/* Text on Cake */}
              <div>
                <label className="mb-3 block text-sm font-semibold">Text on Cake ✍️</label>
                <p className="mb-2 text-xs opacity-60">What should we write on your cake?</p>
                <input
                  type="text"
                  value={textOnCake}
                  onChange={(e) => setTextOnCake(e.target.value)}
                  placeholder="e.g., 'Happy Birthday Sarah' or 'Just Married'"
                  maxLength={100}
                  className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2"
                />
                <p className="mt-1 text-xs opacity-50">{textOnCake.length}/100 characters</p>
              </div>

              {/* Preview Card */}
              {(selectedType || design || textOnCake) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: C.creamDark }}
                >
                  <p className="text-xs font-semibold opacity-70 mb-2">Your Customization</p>
                  <div className="space-y-1.5 text-sm">
                    {selectedType && (
                      <p><span className="font-semibold">Occasion:</span> {CAKE_TYPES.find(t => t.id === selectedType)?.label}</p>
                    )}
                    {design && (
                      <p><span className="font-semibold">Design:</span> {design}</p>
                    )}
                    {textOnCake && (
                      <p><span className="font-semibold">Text:</span> "{textOnCake}"</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-full px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: C.brownMid }}
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-full px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: C.brown }}
                >
                  {selectedType || design || textOnCake ? 'Add to Cart' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
