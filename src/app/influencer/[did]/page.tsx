'use client'

import { useParams } from 'next/navigation'
import InfluencerProfile from '@/components/dashboard/InfluencerProfile'

export default function InfluencerProfilePage() {
  const params = useParams()
  
  return <InfluencerProfile did={params.did as string} />
}
