import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useProducts, useCreateOrder } from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import { nextLanguage, LANGUAGE_LABELS, type AppLanguage } from '@/lib/i18n'
import {
  ShoppingBag, X, Plus, Minus, Send, Search, MapPin, Phone, Clock,
  Truck, BadgeCheck, ChefHat, Star, ArrowRight, CakeSlice, Menu as MenuIcon, Languages,
} from 'lucide-react'
import type { Product, OrderItem } from '@/types'

// ─── Warm bakery palette ───
const C = {
  cream: '#F7F1E8',
  creamDark: '#EFE4D4',
  brown: '#3E2515',
  brownMid: '#5C3A21',
  caramel: '#C98A4B',
  caramelSoft: '#E8C79A',
}

// ─── Real photography (Unsplash) ───
const u = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`

const HERO_IMG = u('photo-1578985545062-69928b1d9587', 1000) // rich chocolate cake
const ABOUT_IMG = u('photo-1509440159596-0249088772ff', 900) // artisan bread

const CATEGORY_IMAGES: Record<string, string[]> = {
  cake: [
    u('photo-1578985545062-69928b1d9587'), // chocolate layer cake
    u('photo-1571115177098-24ec42ed204d'), // birthday cake sparkler
    u('photo-1486427944299-d1955d23e34d'), // cupcakes with candles
    u('photo-1565958011703-44f9829ba187'), // strawberry dessert
  ],
  bread: [
    u('photo-1509440159596-0249088772ff'), // sourdough loaves
    u('photo-1517433670267-08bbd4be890f'), // bread rolls basket
  ],
  pastry: [
    u('photo-1555507036-ab1f4038808a'),    // croissants
    u('photo-1499636136210-6f4ee915583e'), // chocolate chip cookies
    u('photo-1551024601-bec78aea704b'),    // sprinkle donut
  ],
  drink: [
    u('photo-1495474472287-4d71bcdd2085'), // latte art
    u('photo-1461023058943-07fcbe16d735'), // coffee cup
  ],
  drinks: [
    u('photo-1495474472287-4d71bcdd2085'),
    u('photo-1461023058943-07fcbe16d735'),
  ],
  cookie: [u('photo-1499636136210-6f4ee915583e')],
}
const DEFAULT_IMAGES = [
  u('photo-1565958011703-44f9829ba187'),
  u('photo-1555507036-ab1f4038808a'),
]

/** Deterministic per-product photo so each card looks distinct but stable. */
function photoFor(p: Product): string {
  if (p.imageUrl) return p.imageUrl
  const pool = CATEGORY_IMAGES[p.category?.toLowerCase()] ?? DEFAULT_IMAGES
  const hash = [...p.id].reduce((n, ch) => n + ch.charCodeAt(0), 0)
  return pool[hash % pool.length]
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// Where customers send payment. Update these when the shop's accounts change
// (Settings → Payment Accounts is local-only for now). Labels are brand names
// and stay untranslated; the hints come from the locale files.
const PAYMENT_ACCOUNTS = {
  telebirr: { label: 'Telebirr', account: '+251 911 000 000' },
  bank: { label: 'CBE Bank', account: '1000 1234 5678 — Nafsi Bakery' },
}

type Testimonial = { name: string; text: string; stars: number }

type CheckoutForm = {
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryAddress: string
  deliveryDate: string
  deliveryTime: string
  paymentMethod: 'cash' | 'telebirr' | 'bank'
  transactionRef: string
  notes: string
}

const emptyForm: CheckoutForm = {
  customerName: '', customerEmail: '', customerPhone: '',
  deliveryAddress: '', deliveryDate: '', deliveryTime: '',
  paymentMethod: 'cash', transactionRef: '', notes: '',
}

export default function CustomerOrders() {
  const { t, i18n } = useTranslation()
  const { data: products } = useProducts()
  const createOrder = useCreateOrder()
  const [cart, setCart] = useState<OrderItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [form, setForm] = useState<CheckoutForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const isAm = i18n.language?.startsWith('am')
  /** Primary/secondary product names by UI language (Oromo falls back to English). */
  const nameOf = (x: { name_en: string; name_am: string }) => (isAm ? x.name_am || x.name_en : x.name_en)
  const subNameOf = (x: { name_en: string; name_am: string }) => (isAm ? x.name_en : x.name_am)

  const marquee = t('storefront.marquee', { returnObjects: true }) as string[]
  const testimonials = t('storefront.testimonials', { returnObjects: true }) as Testimonial[]

  const NAV_LINKS: Array<[string, string]> = [
    [t('storefront.navHome'), 'home'],
    [t('storefront.navAbout'), 'about'],
    [t('storefront.navMenu'), 'menu'],
    [t('storefront.navReviews'), 'reviews'],
    [t('storefront.navContact'), 'contact'],
  ]

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive),
    [products],
  )

  const categories = useMemo(
    () => ['all', ...new Set(activeProducts.map((p) => p.category))],
    [activeProducts],
  )

  const visibleProducts = useMemo(
    () => activeProducts.filter((p) => {
      const matchCat = category === 'all' || p.category === category
      const q = searchTerm.toLowerCase()
      const matchSearch = !q || p.name_en.toLowerCase().includes(q) || p.name_am.includes(searchTerm)
      return matchCat && matchSearch
    }),
    [activeProducts, category, searchTerm],
  )

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0)
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === p.id)
      if (found) {
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: p.id, name_en: p.name_en, name_am: p.name_am,
        price: p.price, quantity: 1, imageUrl: photoFor(p),
      }]
    })
  }

  const setQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId))
      return
    }
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity } : i))
  }

  const placeOrder = async () => {
    if (!form.customerName || !form.customerPhone || !form.deliveryAddress || cart.length === 0) {
      alert(t('storefront.fillRequired'))
      return
    }
    if (form.paymentMethod !== 'cash' && !form.transactionRef.trim()) {
      alert(t('storefront.needTxn', { method: PAYMENT_ACCOUNTS[form.paymentMethod].label }))
      return
    }
    setSubmitting(true)
    try {
      await createOrder.mutateAsync({
        items: cart,
        subtotal,
        discount: 0,
        total: subtotal,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        paymentMethod: form.paymentMethod,
        transactionRef: form.transactionRef.trim(),
        notes: form.notes.trim(),
        status: 'pending',
      })
      setOrderPlaced(true)
      setCart([])
      setForm(emptyForm)
    } catch (err) {
      console.error('Order failed:', err)
      alert(t('storefront.orderFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const goTo = (id: string) => {
    setShowMobileNav(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const cycleLanguage = () => i18n.changeLanguage(nextLanguage(i18n.language))

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: C.cream, color: C.brown }}>

      {/* ───────────────── Navbar ───────────────── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(247,241,232,0.92)', borderBottom: `1px solid ${C.creamDark}` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
          <button onClick={() => goTo('home')} className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-11 sm:w-11"
              style={{ backgroundColor: C.brown }}
            >
              <CakeSlice className="h-5 w-5" />
            </span>
            <span className="text-left">
              <span className="block text-base font-extrabold leading-tight tracking-tight sm:text-lg">{t('storefront.brand')}</span>
              <span className="block text-[10px] tracking-widest sm:text-[11px]" style={{ color: C.caramel }}>{t('storefront.taglineSmall')}</span>
            </span>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            {NAV_LINKS.map(([label, id]) => (
              <button key={id} onClick={() => goTo(id)} className="transition-opacity hover:opacity-70">{label}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* language switcher — customers pick English / አማርኛ / Afaan Oromoo */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={cycleLanguage}
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold sm:h-11"
              style={{ backgroundColor: C.creamDark }}
              title={LANGUAGE_LABELS[i18n.language as AppLanguage] ?? i18n.language}
            >
              <Languages className="h-4 w-4" />
              <span className="uppercase">{(i18n.language || 'en').slice(0, 2)}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowCart(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md sm:h-11 sm:w-11"
              style={{ backgroundColor: C.brownMid }}
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: C.caramel }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <button
              onClick={() => goTo('menu')}
              className="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 md:block"
              style={{ backgroundColor: C.brown }}
            >
              {t('storefront.orderNow')}
            </button>
            <button
              onClick={() => setShowMobileNav((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full md:hidden"
              style={{ backgroundColor: C.creamDark }}
              aria-label="Menu"
            >
              {showMobileNav ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile nav dropdown */}
        <AnimatePresence>
          {showMobileNav && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden md:hidden"
              style={{ borderTop: `1px solid ${C.creamDark}` }}
            >
              <div className="space-y-1 px-4 py-3">
                {NAV_LINKS.map(([label, id]) => (
                  <button
                    key={id}
                    onClick={() => goTo(id)}
                    className="block w-full rounded-xl px-4 py-3 text-left font-semibold transition-colors active:bg-black/5"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ───────────────── Hero ───────────────── */}
      <section id="home" className="relative overflow-hidden">
        <div
          className="absolute inset-y-0 right-0 hidden w-[44%] lg:block"
          style={{ backgroundColor: C.brownMid, clipPath: 'polygon(24% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:py-24">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl">
            <motion.p variants={fadeUp} className="mb-3 text-base font-medium sm:text-lg" style={{ color: C.caramel }}>
              {t('storefront.heroKicker')}
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t('storefront.heroTitle1')}<br />{t('storefront.heroTitle2')}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-sm leading-relaxed opacity-80 sm:text-base">
              {t('storefront.heroText')}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                onClick={() => goTo('menu')}
                className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 sm:px-7 sm:py-3.5"
                style={{ backgroundColor: C.brown }}
              >
                {t('storefront.orderNow')} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goTo('about')}
                className="rounded-full border-2 px-6 py-2.5 font-semibold transition-colors hover:bg-white/60 sm:px-7 sm:py-3"
                style={{ borderColor: C.brown }}
              >
                {t('storefront.learnMore')}
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex items-center gap-5 text-sm sm:mt-10 sm:gap-6">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current" style={{ color: C.caramel }} />
                <span className="font-semibold">4.9</span>
                <span className="opacity-60">{t('storefront.rating')}</span>
              </div>
              <div className="h-4 w-px" style={{ backgroundColor: C.creamDark }} />
              <span className="opacity-60">{t('storefront.freshDaily', { count: activeProducts.length || 20 })}</span>
            </motion.div>
          </motion.div>

          {/* hero photo — arch card with floating badges */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="relative mx-auto w-full max-w-sm lg:max-w-md"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="overflow-hidden rounded-t-[10rem] rounded-b-[2.5rem] shadow-2xl"
            >
              <img
                src={HERO_IMG}
                alt={t('storefront.heroTitle2')}
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
            </motion.div>

            {/* floating badge — fresh daily */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.7 }, x: { delay: 0.7 }, y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
              className="absolute -left-3 top-10 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl sm:-left-8"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: C.creamDark }}>
                <ChefHat className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold">{t('storefront.bakedFresh')}</span>
                <span className="block text-[10px] opacity-60">{t('storefront.everyMorning')}</span>
              </span>
            </motion.div>

            {/* floating badge — rating */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.9 }, x: { delay: 0.9 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
              className="absolute -right-3 bottom-14 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl sm:-right-8"
            >
              <span className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: C.caramel }} />
                ))}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold opacity-70">{t('storefront.happyCustomers')}</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────── Marquee strip ───────────────── */}
      <div className="overflow-hidden py-3.5" style={{ backgroundColor: C.brown }}>
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="flex w-max whitespace-nowrap text-sm font-bold tracking-[0.2em] text-white/90"
        >
          {[0, 1].map((copy) => (
            <span key={copy} className="flex items-center">
              {marquee.map((w) => (
                <span key={w} className="flex items-center">
                  <span className="px-6">{w}</span>
                  <span style={{ color: C.caramelSoft }}>✦</span>
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ───────────────── About / features ───────────────── */}
      <section id="about" className="py-14 sm:py-16" style={{ backgroundColor: C.creamDark }}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="relative order-2 lg:order-1"
            >
              <div className="overflow-hidden rounded-[2.5rem] shadow-xl">
                <img src={ABOUT_IMG} alt={t('storefront.feature1Title')} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </div>
              <motion.div
                animate={{ rotate: [0, 3, 0, -3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-5 -right-2 flex h-24 w-24 flex-col items-center justify-center rounded-full text-center text-white shadow-xl sm:-right-5 sm:h-28 sm:w-28"
                style={{ backgroundColor: C.caramel }}
              >
                <span className="text-xl font-extrabold sm:text-2xl">10+</span>
                <span className="px-2 text-[9px] font-semibold leading-tight sm:text-[10px]">{t('storefront.yearsBaking')}</span>
              </motion.div>
            </motion.div>

            <motion.div
              variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
              className="order-1 lg:order-2"
            >
              <motion.p variants={fadeUp} className="text-sm font-semibold tracking-widest" style={{ color: C.caramel }}>{t('storefront.whyKicker')}</motion.p>
              <motion.h2 variants={fadeUp} className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t('storefront.whyTitle1')}<br />{t('storefront.whyTitle2')}
              </motion.h2>
              <div className="mt-7 space-y-5">
                {[
                  { icon: ChefHat, title: t('storefront.feature1Title'), text: t('storefront.feature1Text') },
                  { icon: Truck, title: t('storefront.feature2Title'), text: t('storefront.feature2Text') },
                  { icon: BadgeCheck, title: t('storefront.feature3Title'), text: t('storefront.feature3Text') },
                ].map((f) => (
                  <motion.div key={f.title} variants={fadeUp} className="flex items-start gap-4">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: C.brownMid }}
                    >
                      <f.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-bold">{f.title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed opacity-70">{f.text}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────────── Menu ───────────────── */}
      <section id="menu" className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-8 text-center">
            <p className="text-sm font-semibold tracking-widest" style={{ color: C.caramel }}>{t('storefront.menuKicker')}</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('storefront.menuTitle')}</h2>
          </motion.div>

          {/* search + categories */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 opacity-40" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('storefront.searchPlaceholder')}
                className="w-full rounded-full border-none bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2"
              />
            </div>
            <div className="-mx-4 w-screen overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
              <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all"
                    style={category === c
                      ? { backgroundColor: C.brown, color: 'white' }
                      : { backgroundColor: C.creamDark, color: C.brown }}
                  >
                    {c === 'all' ? t('storefront.all') : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* product grid */}
          <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((p) => (
                <motion.div
                  layout
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -8 }}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="relative h-36 overflow-hidden sm:h-48" style={{ backgroundColor: C.creamDark }}>
                    <img
                      src={photoFor(p)}
                      alt={nameOf(p)}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <span
                      className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:left-3 sm:top-3 sm:px-3 sm:text-[11px]"
                      style={{ backgroundColor: C.caramel }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-5">
                    <h3 className={`truncate text-sm font-bold sm:text-base ${isAm ? 'font-ethiopic' : ''}`}>{nameOf(p)}</h3>
                    <p className={`truncate text-xs opacity-60 sm:text-sm ${isAm ? '' : 'font-ethiopic'}`}>{subNameOf(p)}</p>
                    <div className="mt-3 flex flex-col gap-2.5 sm:mt-4">
                      <span className="text-lg font-extrabold sm:text-xl">{formatCurrency(p.price)}</span>
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => addToCart(p)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.03]"
                        style={{ backgroundColor: C.brown }}
                      >
                        <Plus className="h-4 w-4" /> {t('storefront.addToCart')}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {visibleProducts.length === 0 && (
            <p className="py-16 text-center opacity-60">
              {activeProducts.length === 0 ? t('storefront.menuLoading') : t('storefront.noMatch')}
            </p>
          )}
        </div>
      </section>

      {/* ───────────────── Testimonials ───────────────── */}
      <section id="reviews" className="py-14 sm:py-16" style={{ backgroundColor: C.creamDark }}>
        <div className="mx-auto max-w-6xl px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-10 text-center">
            <p className="text-sm font-semibold tracking-widest" style={{ color: C.caramel }}>{t('storefront.reviewsKicker')}</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('storefront.reviewsTitle')}</h2>
          </motion.div>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            className="grid gap-5 sm:grid-cols-3"
          >
            {testimonials.map((tm) => (
              <motion.figure
                key={tm.name}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="rounded-3xl bg-white p-6 shadow-sm"
              >
                <span className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < tm.stars ? 'fill-current' : ''}`}
                      style={{ color: i < tm.stars ? C.caramel : '#D8CCBA' }}
                    />
                  ))}
                </span>
                <blockquote className="mt-3 text-sm leading-relaxed opacity-80">"{tm.text}"</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ backgroundColor: C.brownMid }}
                  >
                    {tm.name[0]}
                  </span>
                  <span className="text-sm font-bold">{tm.name}</span>
                </figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────────────── Contact / footer ───────────────── */}
      <footer id="contact" className="text-white" style={{ backgroundColor: C.brown }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:py-14">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CakeSlice className="h-6 w-6" style={{ color: C.caramelSoft }} />
              <span className="text-lg font-extrabold">{t('storefront.brand')}</span>
            </div>
            <p className="text-sm leading-relaxed opacity-70">
              {t('storefront.footerText')}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold" style={{ color: C.caramelSoft }}>{t('storefront.visitUs')}</p>
            <p className="flex items-center gap-2 opacity-80"><MapPin className="h-4 w-4 shrink-0" /> {t('storefront.location')}</p>
            <p className="flex items-center gap-2 opacity-80"><Phone className="h-4 w-4 shrink-0" /> +251 911 000 000</p>
            <p className="flex items-center gap-2 opacity-80"><Clock className="h-4 w-4 shrink-0" /> {t('storefront.openHours')}</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold" style={{ color: C.caramelSoft }}>{t('storefront.orderCol')}</p>
            <button onClick={() => goTo('menu')} className="block opacity-80 transition-opacity hover:opacity-100">{t('storefront.browseMenu')}</button>
            <button onClick={() => setShowCart(true)} className="block opacity-80 transition-opacity hover:opacity-100">{t('storefront.viewCartN', { count: cartCount })}</button>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 pb-24 text-center text-xs opacity-50 sm:pb-5">
          © {new Date().getFullYear()} {t('storefront.brand')}. {t('storefront.rights')}
        </div>
      </footer>

      {/* ───────────────── Sticky mobile cart bar ───────────────── */}
      <AnimatePresence>
        {cartCount > 0 && !showCart && !showCheckout && (
          <motion.button
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={() => setShowCart(true)}
            className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full py-3.5 pl-5 pr-2 text-white shadow-2xl sm:hidden"
            style={{ backgroundColor: C.brown }}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag className="h-4 w-4" />
              {t('storefront.itemsInCart', { count: cartCount })} · {formatCurrency(subtotal)}
            </span>
            <span
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold"
              style={{ backgroundColor: C.caramel }}
            >
              {t('storefront.viewCart')} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ───────────────── Cart drawer ───────────────── */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCart(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          >
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col shadow-2xl"
              style={{ backgroundColor: C.cream }}
            >
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5" style={{ borderBottom: `1px solid ${C.creamDark}` }}>
                <h2 className="text-lg font-extrabold">{t('storefront.yourCart')}</h2>
                <button onClick={() => setShowCart(false)} className="rounded-full p-2 transition-colors hover:bg-black/5">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
                {cart.length === 0 ? (
                  <div className="py-16 text-center">
                    <span className="text-5xl">🧺</span>
                    <p className="mt-3 opacity-60">{t('storefront.cartEmpty')}</p>
                  </div>
                ) : cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${isAm ? 'font-ethiopic' : ''}`}>{nameOf(item)}</p>
                      <p className="text-xs opacity-60">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(item.productId, item.quantity - 1)} className="rounded-full p-2 hover:bg-black/5"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => setQty(item.productId, item.quantity + 1)} className="rounded-full p-2 hover:bg-black/5"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="space-y-3 px-5 py-4 sm:px-6 sm:py-5" style={{ borderTop: `1px solid ${C.creamDark}` }}>
                  <div className="flex justify-between font-bold">
                    <span>{t('storefront.subtotal')}</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowCart(false); setShowCheckout(true) }}
                    className="w-full rounded-full py-3.5 font-bold text-white shadow-lg"
                    style={{ backgroundColor: C.brown }}
                  >
                    {t('storefront.checkout')}
                  </motion.button>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────── Checkout modal ───────────────── */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !submitting && setShowCheckout(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl sm:p-7"
              style={{ backgroundColor: C.cream }}
            >
              {orderPlaced ? (
                <div className="py-10 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="text-7xl">🎉</motion.div>
                  <h2 className="mt-4 text-2xl font-extrabold">{t('storefront.orderPlaced')}</h2>
                  <p className="mt-2 text-sm opacity-70">{t('storefront.orderThanks')}</p>
                  <button
                    onClick={() => { setOrderPlaced(false); setShowCheckout(false) }}
                    className="mt-6 rounded-full px-8 py-3 font-bold text-white"
                    style={{ backgroundColor: C.brown }}
                  >
                    {t('storefront.done')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-extrabold">{t('storefront.deliveryDetails')}</h2>
                    <button onClick={() => setShowCheckout(false)} className="rounded-full p-2 hover:bg-black/5"><X className="h-5 w-5" /></button>
                  </div>

                  <div className="space-y-3">
                    {([
                      ['customerName', t('storefront.fullName'), 'text'],
                      ['customerPhone', t('storefront.phoneField'), 'tel'],
                      ['customerEmail', t('storefront.emailOptional'), 'email'],
                      ['deliveryAddress', t('storefront.deliveryAddress'), 'text'],
                    ] as const).map(([key, label, type]) => (
                      <input
                        key={key}
                        type={type}
                        placeholder={label}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2"
                      />
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                        className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5" />
                      <input type="time" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                        className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5" />
                    </div>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as CheckoutForm['paymentMethod'] })}
                      className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5"
                    >
                      <option value="cash">{t('storefront.payCash')}</option>
                      <option value="telebirr">{t('storefront.payTelebirr')}</option>
                      <option value="bank">{t('storefront.payBank')}</option>
                    </select>

                    {/* Payment instructions + transaction confirmation */}
                    <AnimatePresence>
                      {form.paymentMethod !== 'cash' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 rounded-2xl border-2 border-dashed p-4" style={{ borderColor: C.caramel, backgroundColor: C.creamDark }}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.caramel }}>
                                  {t('storefront.payTo')} · {PAYMENT_ACCOUNTS[form.paymentMethod].label}
                                </p>
                                <p className="mt-1 select-all font-mono text-sm font-extrabold">
                                  {PAYMENT_ACCOUNTS[form.paymentMethod].account}
                                </p>
                              </div>
                              <span className="text-lg font-extrabold">{formatCurrency(subtotal)}</span>
                            </div>
                            <p className="text-xs leading-relaxed opacity-70">
                              {form.paymentMethod === 'telebirr' ? t('storefront.telebirrHint') : t('storefront.bankHint')}
                            </p>
                            <input
                              type="text"
                              placeholder={t('storefront.txnPlaceholder')}
                              value={form.transactionRef}
                              onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                              className="w-full rounded-xl border-none bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none ring-1 ring-black/5 focus:ring-2"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <textarea
                      rows={2}
                      placeholder={t('storefront.notesPlaceholder')}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-black/5"
                    />
                  </div>

                  <div className="mt-5 space-y-1.5 rounded-2xl p-4" style={{ backgroundColor: C.creamDark }}>
                    {cart.map((i) => (
                      <div key={i.productId} className="flex justify-between text-sm">
                        <span className={`truncate pr-3 ${isAm ? 'font-ethiopic' : ''}`}>{nameOf(i)} × {i.quantity}</span>
                        <span className="shrink-0 font-semibold">{formatCurrency(i.price * i.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-black/10 pt-2 font-extrabold">
                      <span>{t('storefront.total')}</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    disabled={submitting}
                    onClick={placeOrder}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-bold text-white shadow-lg disabled:opacity-60"
                    style={{ backgroundColor: C.brown }}
                  >
                    {submitting
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> {t('storefront.placing')}</>
                      : <><Send className="h-4 w-4" /> {t('storefront.placeOrder')} · {formatCurrency(subtotal)}</>}
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
