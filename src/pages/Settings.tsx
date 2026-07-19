import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { LANGUAGES, LANGUAGE_LABELS } from '@/lib/i18n'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()
  const { role, user } = useAuthStore()
  const isOwner = role === 'owner'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.shopName')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.shopName')}</Label>
              <Input value={settings.shopName} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.shopNameAm')}</Label>
              <Input value={settings.shopName_am} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.taxRate')}</Label>
              <Input type="number" value={settings.taxRate} readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('settings.darkMode')}</Label>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => {
                  updateSettings({ darkMode: checked })
                  document.documentElement.classList.toggle('dark', checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('settings.language')}</Label>
              <div className="flex gap-1">
                {LANGUAGES.map((lng) => (
                  <Button
                    key={lng}
                    variant={i18n.language === lng ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => i18n.changeLanguage(lng)}
                  >
                    {LANGUAGE_LABELS[lng]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.paymentAccounts')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.telebirrNumber')}</Label>
                <Input
                  value={settings.telebirrNumber || ''}
                  onChange={(e) => updateSettings({ telebirrNumber: e.target.value })}
                  placeholder="+2519XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.bankAccount')}</Label>
                <Input
                  value={settings.bankAccount || ''}
                  onChange={(e) => updateSettings({ bankAccount: e.target.value })}
                  placeholder="Bank name - Account number"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
