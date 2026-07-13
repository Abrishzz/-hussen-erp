import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileBarChart, FileText, BarChart3 } from 'lucide-react'

export default function Reports() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          {t('reports.exportPdf')}
        </Button>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">{t('reports.salesReport')}</TabsTrigger>
          <TabsTrigger value="inventory">{t('reports.inventoryReport')}</TabsTrigger>
          <TabsTrigger value="production">{t('reports.productionReport')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('reports.expenseReport')}</TabsTrigger>
          <TabsTrigger value="profit">{t('reports.profitLoss')}</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('reports.salesReport')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.noData')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.inventoryReport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.noData')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.productionReport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.noData')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.expenseReport')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.noData')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profit">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.profitLoss')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('reports.noData')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
