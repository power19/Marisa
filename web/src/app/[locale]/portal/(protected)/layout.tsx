import { redirect } from 'next/navigation'
import { getToken } from '@/lib/auth/session'
import PortalNav from '@/components/portal/PortalNav'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export default function ProtectedPortalLayout({ children, params: { locale } }: Props) {
  const token = getToken()
  if (!token) {
    redirect(`/${locale}/portal/login`)
  }

  return (
    <div className="container-site py-8">
      <div className="flex gap-8 min-h-[60vh]">
        <aside className="hidden md:block w-52 shrink-0">
          <PortalNav locale={locale} />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
