import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t('errors.pageNotFound')}</h1>
      <p className="text-muted-foreground">{t('errors.pageNotFoundDesc')}</p>
      <Button onClick={() => navigate('/dashboard')}>{t('common.back')}</Button>
    </div>
  )
}
