import { useTranslation } from 'react-i18next'
import { useProducts } from '@/hooks/useData'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import type { Product } from '@/types'

interface ProductGridProps {
  onSelect: (product: Product) => void
}

export function ProductGrid({ onSelect }: ProductGridProps) {
  const { t, i18n } = useTranslation()
  const { data: products, isLoading } = useProducts()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const categories = products ? [...new Set(products.map((p) => p.category).filter(Boolean))] : []

  const filtered = products?.filter((p) => {
    const matchesSearch = search === '' ||
      p.name_en.toLowerCase().includes(search.toLowerCase()) ||
      p.name_am.includes(search)
    const matchesCat = category === '' || p.category === category
    return matchesSearch && matchesCat
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t('pos.searchProduct')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="rounded-md border bg-background px-3 py-1 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t('pos.allCategories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered?.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className="flex cursor-pointer flex-col items-center rounded-lg border p-3 transition-all hover:border-primary hover:shadow-md active:scale-95"
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name_en}
                className="mb-2 h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md bg-muted text-2xl">
                🥖
              </div>
            )}
            <p className="text-center text-sm font-medium leading-tight">
              {i18n.language === 'am' ? product.name_am : product.name_en}
            </p>
            <p className="text-xs text-muted-foreground">
              ETB {(product.price / 100).toFixed(2)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
