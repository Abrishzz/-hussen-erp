import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus } from 'lucide-react'

export default function HR() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('hr.title')}</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('hr.addEmployee')}
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">{t('hr.employees')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('hr.attendance')}</TabsTrigger>
          <TabsTrigger value="payroll">{t('hr.payroll')}</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>{t('hr.employees')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>{t('hr.attendance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>{t('hr.payroll')}</CardTitle>
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
