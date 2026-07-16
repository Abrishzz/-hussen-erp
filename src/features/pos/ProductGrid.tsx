import { useTranslation } from 'react-i18next'
import { useProducts } from '@/hooks/useData'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import type { Product } from '@/types'

interface ProductGridProps {
  onSelect: (product: Product) => void
  /** When provided, POS is branch-scoped: qty per productId, out-of-stock is disabled. */
  stock?: Record<string, number> | null
}

export function ProductGrid({ onSelect, stock }: ProductGridProps) {
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
        {filtered?.map((product) => {
          const tracked = stock != null
          const qty = tracked ? (stock[product.id] || 0) : null
          const outOfStock = tracked && (qty as number) <= 0
          return (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              disabled={outOfStock}
              className="relative flex cursor-pointer flex-col items-center rounded-lg border p-3 transition-all hover:border-primary hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:shadow-none"
            >
              {tracked && (
                <span
                  className={
                    'absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                    (outOfStock ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100')
                  }
                >
                  {outOfStock ? t('pos.outOfStock') : qty}
                </span>
              )}
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
          )
        })}
      </div>
    </div>
  )
}
