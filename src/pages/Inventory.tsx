import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, Truck } from 'lucide-react'

export default function Inventory() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('inventory.title')}</h1>
        <div className="flex gap-2">
          <Button>
            <Package className="mr-2 h-4 w-4" />
            {t('inventory.addMaterial')}
          </Button>
          <Button variant="outline">
            <Truck className="mr-2 h-4 w-4" />
            {t('inventory.suppliers')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">{t('inventory.title')}</TabsTrigger>
          <TabsTrigger value="movements">{t('inventory.movementHistory')}</TabsTrigger>
        </TabsList>
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.currentStock')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.movementHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
