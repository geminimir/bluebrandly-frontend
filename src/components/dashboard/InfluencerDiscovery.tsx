import { Search, Filter, Star, ChevronDown, X, Info, SearchX } from 'lucide-react'
import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useRouter } from 'next/navigation'
import { formatCount } from '@/lib/utils'
import Toast from '@/components/Toast'

// Update interface for Bluesky data
interface Influencer {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  followersCount?: number
  followsCount?: number
  postsCount?: number
  description?: string
  engagementRate?: number
  recentPosts?: {
    text: string
    likeCount: number
    replyCount: number
    repostCount: number
    indexedAt: string
  }[]
  topInterests?: string[]
  isActive?: boolean
}

interface Filter {
  id: string
  label: string
  type: 'followers' | 'posts' | 'engagement' | 'activity' | 'interests'
  value: number | string
  operator?: 'gt' | 'lt' | 'eq' | 'contains'
}

interface FilterButtonProps {
  filter: Filter
  isActive: boolean
  onClick: () => void
}

function FilterButton({ filter, isActive, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-[#0185FF] text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {filter.label}
    </button>
  )
}

export default function InfluencerDiscovery() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const ITEMS_PER_PAGE = 10
  const [cursor, setCursor] = useState<string | undefined>()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Available filters
  const filters: Filter[] = [
    { id: '1k', label: '1k+ followers', type: 'followers', value: 1000, operator: 'gt' },
    { id: '10k', label: '10k+ followers', type: 'followers', value: 10000, operator: 'gt' },
    { id: '100posts', label: '100+ posts', type: 'posts', value: 100, operator: 'gt' },
    { id: '1000posts', label: '1000+ posts', type: 'posts', value: 1000, operator: 'gt' },
    { id: 'high-engagement', label: 'High Engagement', type: 'engagement', value: 5, operator: 'gt' },
    { id: 'very-high-engagement', label: 'Very High Engagement', type: 'engagement', value: 10, operator: 'gt' },
    { id: 'active', label: 'Active Users', type: 'activity', value: 'active' },
    { id: 'tech', label: 'Tech', type: 'interests', value: 'tech' },
    { id: 'crypto', label: 'Crypto', type: 'interests', value: 'crypto' },
    { id: 'art', label: 'Art', type: 'interests', value: 'art' },
    { id: 'gaming', label: 'Gaming', type: 'interests', value: 'gaming' },
    { id: 'music', label: 'Music', type: 'interests', value: 'music' },
    { id: 'fashion', label: 'Fashion', type: 'interests', value: 'fashion' },
    { id: 'sports', label: 'Sports', type: 'interests', value: 'sports' },
    { id: 'finance', label: 'Finance', type: 'interests', value: 'finance' },
    { id: 'science', label: 'Science', type: 'interests', value: 'science' },
    { id: 'politics', label: 'Politics', type: 'interests', value: 'politics' },
    { id: 'books', label: 'Books', type: 'interests', value: 'books' },
    { id: 'food', label: 'Food & Cooking', type: 'interests', value: 'food' },
    { id: 'travel', label: 'Travel', type: 'interests', value: 'travel' },
    { id: 'fitness', label: 'Fitness', type: 'interests', value: 'fitness' },
    { id: 'business', label: 'Business', type: 'interests', value: 'business' }
  ]

  // Organize filters by category
  const filterCategories = {
    followers: filters.filter(f => f.type === 'followers'),
    posts: filters.filter(f => f.type === 'posts'),
    engagement: filters.filter(f => f.type === 'engagement'),
    activity: filters.filter(f => f.type === 'activity'),
    interests: filters.filter(f => f.type === 'interests'),
  }

  // Combine both search triggers into a single effect
  useEffect(() => {
    const searchInfluencers = async (loadMore = false) => {
      setIsLoading(true)
      
      try {
        const term = searchTerm.trim()
        const filterParams = activeFilters
          .map(f => `${f.type}:${f.value}`)
          .join(',')
        
        const params = new URLSearchParams({
          term: term,
          filters: filterParams,
          limit: '100'
        })
        
        if (loadMore && cursor) {
          params.append('cursor', cursor)
        }
        
        const response = await fetch(`/api/search?${params}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.message || 'Search failed')
        }

        // Update this section to handle the correct response structure
        const profiles = data.profiles || []
        
        // Store the cursor for next page if it exists
        if (data.cursor) {
          setCursor(data.cursor)
        }
        
        // Append new results to existing ones when loading more
        setInfluencers(prev => 
          loadMore ? [...prev, ...profiles] : profiles
        )
      } catch (error) {
        console.error('Search error:', error)
        if (typeof setToast === 'function') {
          setToast({
            message: error instanceof Error ? error.message : 'Search failed',
            type: 'error'
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(searchInfluencers, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, activeFilters])

  // Enhanced filter function with null checks
  const filteredInfluencers = (influencers || [])
    .filter(influencer => {
      if (!influencer) return false
      
      return activeFilters.every(filter => {
        if (!filter) return true
        
        switch (filter.type) {
          case 'followers':
            return filter.operator === 'gt' 
              ? (influencer.followersCount || 0) >= (filter.value as number)
              : (influencer.followersCount || 0) <= (filter.value as number)

          case 'posts':
            return filter.operator === 'gt'
              ? (influencer.postsCount || 0) >= (filter.value as number)
              : (influencer.postsCount || 0) <= (filter.value as number)

          case 'engagement':
            return filter.operator === 'gt'
              ? (influencer.engagementRate || 0) >= (filter.value as number)
              : (influencer.engagementRate || 0) <= (filter.value as number)

          case 'activity':
            return filter.value === 'active' ? influencer.isActive : !influencer.isActive 

          case 'interests':
            const interestFilters = activeFilters.filter(f => f?.type === 'interests')
            if (interestFilters.length === 0) return true
            
            return interestFilters.some(interestFilter => 
              influencer.topInterests?.includes(interestFilter?.value as string)
            )

          default:
            return true
        }
      })
    })
    .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))

  // Paginated results
  const paginatedInfluencers = filteredInfluencers.slice(0, page * ITEMS_PER_PAGE)

  // Load more function
  const loadMore = () => {
    if ((page + 1) * ITEMS_PER_PAGE >= filteredInfluencers.length) {
      setHasMore(false)
    }
    setPage(prev => prev + 1)
  }

  const toggleFilter = (filter: Filter) => {
    setActiveFilters(prev => {
      const isActive = prev.some(f => f.id === filter.id)
      
      if (isActive) {
        return prev.filter(f => f.id !== filter.id)
      } else {
        // Only remove existing filters of the same type if it's not an interest filter
        if (filter.type === 'interests') {
          return [...prev, filter]
        }
        // For other filter types, remove existing ones of the same type
        const filteredPrev = prev.filter(f => f.type !== filter.type)
        return [...filteredPrev, filter]
      }
    })
  }

  const handleInfluencerClick = (did: string) => {
    router.push(`/influencer/${did}`)
  }

  const closeToast = () => setToast(null)

  return (
    <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Bluesky users..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg pl-10 text-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            {isLoading && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-5 w-5 border-2 border-[#0185FF] border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          {/* Filter Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="px-4 py-2 bg-[#0185FF] text-white rounded-lg flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-lg shadow-lg border border-gray-100 p-4 w-[320px] mt-2">
                <div className="space-y-4">
                  {Object.entries(filterCategories).map(([category, categoryFilters]) => (
                    <div key={category}>
                      <h3 className="font-medium mb-2 text-gray-900 capitalize">{category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {categoryFilters.map((filter) => (
                          <FilterButton
                            key={filter.id}
                            filter={filter}
                            isActive={activeFilters.some(f => f.id === filter.id)}
                            onClick={() => toggleFilter(filter)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeFilters.map((filter) => (
              <span
                key={filter.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0185FF]/10 text-[#0185FF] rounded-full text-sm"
              >
                {filter.label}
                <button
                  onClick={() => toggleFilter(filter)}
                  className="hover:bg-[#0185FF]/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Disclaimer Banner */}
      <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-center gap-1.5 inline-flex">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <p className="leading-none">Results using filters may not be accurate. Use specific search terms for better accuracy.</p>
      </div>

      {/* Influencer Cards */}
      <div className="space-y-4">
        {filteredInfluencers.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <SearchX className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">Try adjusting your filters or search terms</p>
          </div>
        )}
        {paginatedInfluencers.map((creator) => (
          <div 
            key={creator.did} 
            className="p-4 border border-gray-100 rounded-xl hover:border-[#0185FF]/30 transition-colors cursor-pointer" 
            onClick={() => handleInfluencerClick(creator.did)}
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
                <img src={creator.avatar || '/default-avatar.png'} alt={creator.displayName || creator.handle} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{creator.displayName || creator.handle}</h4>
                    <p className="text-sm text-gray-600">@{creator.handle}</p>
                  </div>
                </div>
                {/* Stats */}
                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">{formatCount(creator.followersCount)}</span> Followers
                  </div>
                  <div>
                    <span className="font-medium">{formatCount(creator.followsCount)}</span> Following
                  </div>
                  <div>
                    <span className="font-medium">{formatCount(creator.postsCount)}</span> Posts
                  </div>
                </div>
                {/* Description */}
                {creator.description && (
                  <p className="mt-2 text-sm text-gray-600">{creator.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && filteredInfluencers.length > paginatedInfluencers.length && (
        <button 
          onClick={loadMore}
          className="w-full mt-4 py-2 text-[#0185FF] text-sm font-medium border border-[#0185FF]/20 rounded-lg hover:bg-[#0185FF]/5 transition-colors"
        >
          Load More
        </button>
      )}
      
      {/* Add Toast component at the end */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  )
}