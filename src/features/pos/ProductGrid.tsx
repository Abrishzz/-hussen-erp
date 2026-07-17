import { useTranslation } from 'react-i18next'
import { useProducts } from '@/hooks/useData'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductGridProps {
  onSelect: (product: Product) => void
  /** When provided, POS is branch-scoped: qty per productId, out-of-stock is disabled. */
  stock?: Record<string, number> | null
  /** Quantity already in the cart per productId — shown on the tile. */
  cartQty?: Record<string, number>
}

export function ProductGrid({ onSelect, stock, cartQty = {} }: ProductGridProps) {
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
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + category chips stay put while the list scrolls, so switching
          category or searching never means scrolling back up. */}
      <div className="sticky top-16 z-10 space-y-2 bg-background/95 py-2 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('pos.searchProduct')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('common.reset')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={category === ''} onClick={() => setCategory('')}>{t('pos.allCategories')}</Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {filtered?.map((product) => {
          const tracked = stock != null
          const qty = tracked ? (stock[product.id] || 0) : null
          const outOfStock = tracked && (qty as number) <= 0
          const inCart = cartQty[product.id] || 0

          return (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              disabled={outOfStock}
              className={cn(
                'relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95',
                'hover:border-primary hover:shadow-md',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:shadow-none',
                inCart > 0 && 'border-primary bg-primary/5'
              )}
            >
              {/* How many are already in the cart — lets the seller keep tapping
                  without opening the cart to check. */}
              {inCart > 0 && (
                <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {inCart}
                </span>
              )}

              {tracked && (
                <span
                  className={cn(
                    'absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    outOfStock
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                  )}
                >
                  {outOfStock ? t('pos.outOfStock') : qty}
                </span>
              )}

              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name_en} className="mb-1.5 h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">🥖</div>
              )}
              <p className="line-clamp-2 text-xs font-medium leading-tight sm:text-sm">
                {i18n.language === 'am' ? product.name_am : product.name_en}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-primary">
                ETB {(product.price / 100).toFixed(2)}
              </p>
            </button>
          )
        })}
      </div>

      {filtered?.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('reports.noData')}</p>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary'
      )}
    >
      {children}
    </button>
  )
}
