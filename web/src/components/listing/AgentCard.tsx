import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { Agent } from '@/types/agent'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''

interface AgentCardProps {
  agent: Agent
  listingRef?: string
}

export default function AgentCard({ agent, listingRef }: AgentCardProps) {
  const t = useTranslations('listing')

  const whatsappMsg = listingRef
    ? `Hello, I am interested in property ${listingRef}`
    : 'Hello, I am interested in one of your properties'

  const whatsappNumber = agent.whatsapp?.replace(/\D/g, '') ?? ''

  return (
    <div className="card p-6">
      <div className="flex items-center gap-4 mb-4">
        {agent.photo ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={`${DIRECTUS_URL}/assets/${agent.photo}`}
              alt={agent.display_name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-grey-light flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-grey-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <div>
          <h3 className="font-display text-lg">{agent.display_name}</h3>
          <p className="text-xs text-grey-medium tracking-wider uppercase">Real Estate Agent</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {agent.phone && (
          <a
            href={`tel:${agent.phone}`}
            className="btn btn-primary text-sm justify-center"
          >
            {t('callNow')}: {agent.phone}
          </a>
        )}
        {agent.whatsapp && whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm justify-center"
          >
            {t('whatsapp')}
          </a>
        )}
        {agent.email && (
          <a
            href={`mailto:${agent.email}?subject=Property Enquiry${listingRef ? ` - ${listingRef}` : ''}`}
            className="text-sm text-center text-blue hover:text-blue-dark transition-colors py-2"
          >
            {agent.email}
          </a>
        )}
      </div>
    </div>
  )
}
