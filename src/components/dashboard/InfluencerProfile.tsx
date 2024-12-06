import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Users, MessageSquare, Repeat2, Heart, Calendar, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCount } from '@/lib/utils'

interface Influencer {
  handle: string
  displayName: string
  description: string
  avatar: string
  followersCount: number
  engagementRate?: number
}

interface Post {
  uri: string
  text: string
  likeCount: number
  replyCount: number
  repostCount: number
  indexedAt: string
}

interface InfluencerDetails extends Influencer {
  recentPosts: Post[]
  avgLikes?: number
  avgReposts?: number
  avgReplies?: number
  postingFrequency?: string
  topHashtags?: string[]
  mostActiveHours?: string[]
}

interface InfluencerProfileProps {
  did: string
}

export default function InfluencerProfile({ did }: InfluencerProfileProps) {
  const router = useRouter()
  const [influencer, setInfluencer] = useState<InfluencerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllPosts, setShowAllPosts] = useState(false)

  useEffect(() => {
    const fetchInfluencerData = async () => {
      if (!did) return
      
      try {
        const response = await fetch(`/api/influencer/${did}`)
        const data = await response.json()
        setInfluencer(data)
      } catch (error) {
        console.error('Error fetching influencer:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInfluencerData()
  }, [did])

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin h-8 w-8 border-2 border-[#0185FF] border-t-transparent rounded-full" />
    </div>
  }

  if (!influencer) {
    return <div>User not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8 my-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Influencer Profile</h1>
      </div>

      {/* Profile Header */}
      <div className="flex gap-6 mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden">
          <img 
            src={influencer.avatar || '/default-avatar.png'} 
            alt={influencer.displayName || influencer.handle}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{influencer.displayName}</h2>
              <p className="text-gray-600">@{influencer.handle}</p>
            </div>
            <a 
              href={`https://bsky.app/profile/${influencer.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#0185FF] hover:underline"
            >
              View on Bluesky <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          
          <p className="mt-3 text-gray-700">{influencer.description}</p>
          
          <div className="mt-4 flex gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{formatCount(influencer.followersCount)}</span> Followers
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{influencer.engagementRate?.toFixed(2)}%</span> Engagement
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { label: 'Avg. Likes', value: influencer.avgLikes, icon: Heart },
          { label: 'Avg. Reposts', value: influencer.avgReposts, icon: Repeat2 },
          { label: 'Avg. Replies', value: influencer.avgReplies, icon: MessageSquare },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <stat.icon className="w-4 h-4" />
              {stat.label}
            </div>
            <div className="text-xl font-semibold text-gray-900">{formatCount(stat.value || 0)}</div>
          </div>
        ))}
      </div>

      {/* Recent Posts */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Posts</h3>
        <div className="space-y-4 mb-6">
          {influencer.recentPosts
            ?.slice(0, showAllPosts ? undefined : 5)
            .map((post) => (
              <div key={post.uri} className="border border-gray-100 rounded-xl p-4 hover:border-[#0185FF]/30 transition-colors">
                <p className="text-gray-800 mb-3">{post.text}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" /> {post.likeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="w-4 h-4" /> {post.repostCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> {post.replyCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> 
                    {new Date(post.indexedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
          ))}
        </div>
        
        {/* View More Button - only show if there are more than 5 posts */}
        {influencer.recentPosts && influencer.recentPosts.length > 5 && (
          <button 
            onClick={() => setShowAllPosts(!showAllPosts)}
            className="w-full py-2 text-[#0185FF] text-sm font-medium border border-[#0185FF]/20 rounded-lg hover:bg-[#0185FF]/5 transition-colors"
          >
            {showAllPosts ? 'Show Less' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  )
}