import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlaskConical, Factory } from 'lucide-react'

export default function Production() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('production.title')}</h1>
        <div className="flex gap-2">
          <Button>
            <FlaskConical className="mr-2 h-4 w-4" />
            {t('production.addRecipe')}
          </Button>
          <Button variant="outline">
            <Factory className="mr-2 h-4 w-4" />
            {t('production.newBatch')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">{t('production.productionBatches')}</TabsTrigger>
          <TabsTrigger value="recipes">{t('production.recipes')}</TabsTrigger>
          <TabsTrigger value="finished">{t('production.finishedGoods')}</TabsTrigger>
        </TabsList>
        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.productionBatches')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.recipes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finished">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.finishedGoods')}</CardTitle>
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
