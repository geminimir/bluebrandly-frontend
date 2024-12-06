import { NextResponse } from 'next/server'
import { BskyAgent, AppBskyFeedDefs } from '@atproto/api'

const agent = new BskyAgent({ service: 'https://bsky.social' })

// Add input validation helper
function validateSearchParams(searchParams: URLSearchParams) {
  const term = searchParams.get('term')?.trim() || ''
  const filters = searchParams.get('filters')?.split(',').filter(Boolean) || []
  const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 50), 100) // Clamp between 1-100

  // Validate term length
  if (term && (term.length < 2 || term.length > 100)) {
    throw new Error('Search term must be between 2 and 100 characters')
  }

  // Validate filters format
  const validFilterTypes = ['followers:', 'posts:', 'engagement:', 'activity:', 'interests:']
  const invalidFilters = filters.filter(f => !validFilterTypes.some(type => f.startsWith(type)))
  if (invalidFilters.length > 0) {
    throw new Error(`Invalid filter format: ${invalidFilters.join(', ')}`)
  }

  return { term, filters, limit }
}

export async function GET(request: Request) {
  try {
    console.log('[Search] Starting request')
    const { searchParams } = new URL(request.url)
    const { term, filters, limit } = validateSearchParams(searchParams)
    const cursor = searchParams.get('cursor')
    
    console.log('[Search] Parameters:', { term, filters, limit, cursor })

    await agent.login({
      identifier: process.env.BLUESKY_USERNAME!,
      password: process.env.BLUESKY_PASSWORD!,
    })
    console.log('[Auth] Bluesky login successful')

    // Construct search term more carefully
    let searchTerm = term || 'type:'

    // Initial search with cursor support
    const searchResults = await agent.searchActors({ 
      term: searchTerm,
      limit: limit,
      cursor: cursor || undefined
    })
    console.log(`[Search] Found ${searchResults.data.actors.length} initial results`)

    // Fetch detailed profile information for each user
    console.log('[Profiles] Starting detailed profile fetch')
    const detailedProfiles = await Promise.all(
      searchResults.data.actors.map(async (actor) => {
        try {
          console.log(`[Profile] Processing ${actor.handle}`)
          const profile = await agent.getProfile({ actor: actor.did })
            .catch(() => null)

          if (!profile) return null

          const feed = await agent.getAuthorFeed({ actor: actor.did, limit: 20 })
            .catch(() => ({ data: { feed: [] } }))

          const recentPosts = feed.data.feed || []
          
          // Enhanced engagement rate calculation
          const engagementRate = (() => {
            if (recentPosts.length === 0) return 0
            const totalEngagement = recentPosts.reduce((sum, post) => {
              const likes = post.post.likeCount || 0
              const replies = post.post.replyCount || 0
              const reposts = post.post.repostCount || 0
              // Weighted engagement: likes=1x, replies=2x, reposts=1.5x
              return sum + likes + (replies * 2) + (reposts * 1.5)
            }, 0)
            // Calculate average engagement per post as percentage
            return Number((totalEngagement / recentPosts.length / (profile.data.followersCount ?? 1) * 100).toFixed(2))
          })()

          // Calculate posting frequency (posts per week)
          const postsPerWeek = (() => {
            if (recentPosts.length < 2) return 0
            const firstPost = new Date(recentPosts[0].post.indexedAt)
            const lastPost = new Date(recentPosts[recentPosts.length - 1].post.indexedAt)
            const weeksBetween = Math.max(0.1, (firstPost.getTime() - lastPost.getTime()) / (1000 * 3600 * 24 * 7))
            return Number((recentPosts.length / weeksBetween).toFixed(1))
          })()

          return {
            ...actor,
            followersCount: profile.data.followersCount,
            followsCount: profile.data.followsCount,
            postsCount: profile.data.postsCount,
            description: profile.data.description,
            engagementRate,
            postsPerWeek,
            recentPosts: recentPosts.map(post => ({
              text: (post.post.record as AppBskyFeedDefs.PostView).text,
              likeCount: post.post.likeCount || 0,
              replyCount: post.post.replyCount || 0,
              repostCount: post.post.repostCount || 0,
              indexedAt: post.post.indexedAt,
            })),
            topInterests: getTopInterests(recentPosts),
            isActive: isActiveUser(recentPosts),
          }
        } catch (error) {
          console.error(`[Profile] Failed to fetch ${actor.handle}:`, error)
          return null
        }
      })
    )

    // Filter nulls and sort by followers
    const validProfiles = detailedProfiles
      .filter((profile): profile is NonNullable<typeof profile> => profile !== null)
      .sort((a, b) => {
        const followerDiff = (b.followersCount || 0) - (a.followersCount || 0)
        if (followerDiff !== 0) return followerDiff
        return (b.engagementRate || 0) - (a.engagementRate || 0)
      })

    console.log(`[Search] Returning ${validProfiles.length} valid profiles`)

    // Return both the profiles and the cursor
    return NextResponse.json({
      profiles: validProfiles,
      cursor: searchResults.data.cursor
    })
  } catch (error) {
    console.error('[Error] Search failed:', error)
    
    // More specific error handling
    if (error instanceof Error) {
      const status = 
        error.message.includes('rate limit') ? 429 :
        error.message.includes('Search term') ? 400 :
        error.message.includes('Invalid filter') ? 400 :
        500

      return NextResponse.json(
        { message: error.message },
        { status }
      )
    }

    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Helper function to determine user activity level
function isActiveUser(posts: any[]) {
  if (posts.length === 0) return false
  const lastPostDate = new Date(posts[0].post.indexedAt)
  const daysSinceLastPost = (Date.now() - lastPostDate.getTime()) / (1000 * 3600 * 24)
  return daysSinceLastPost <= 7 // Consider active if posted within last week
}

// Helper function to analyze post content and extract common topics
function getTopInterests(posts: any[]) {
  const topics = posts.reduce((acc: Record<string, number>, post: any) => {
    const text = (post.post.record.text + ' ' + (post.post.author.description || '')).toLowerCase()
    
    const commonTopics = [
      'tech', 'crypto', 'art', 'gaming', 'music',
      'fashion', 'sports', 'finance', 'science', 'politics',
      'books', 'food', 'travel', 'fitness', 'business'
    ]

    // Look for topic keywords and their variations
    const topicKeywords: Record<string, string[]> = {
      'tech': ['tech', 'technology', 'coding', 'programming', 'software', 'ai'],
      'crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3'],
      'art': ['art', 'artist', 'design', 'creative', 'nft'],
      'gaming': ['gaming', 'games', 'gamer', 'esports'],
      'music': ['music', 'musician', 'artist', 'band', 'song'],
      'fashion': ['fashion', 'style', 'clothing', 'outfit'],
      'sports': ['sports', 'athlete', 'fitness', 'basketball', 'football', 'soccer'],
      'finance': ['finance', 'investing', 'stocks', 'trading'],
      'science': ['science', 'research', 'physics', 'biology', 'chemistry'],
      'politics': ['politics', 'policy', 'government'],
      'books': ['books', 'reading', 'literature', 'author'],
      'food': ['food', 'cooking', 'recipe', 'chef', 'restaurant'],
      'travel': ['travel', 'traveling', 'wanderlust', 'adventure'],
      'fitness': ['fitness', 'workout', 'gym', 'health', 'wellness'],
      'business': ['business', 'entrepreneur', 'startup', 'marketing']
    }

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        acc[topic] = (acc[topic] || 0) + 1
      }
    })

    return acc
  }, {})

  return Object.entries(topics)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)  // Increased from 3 to 5 top interests
    .map(([topic]) => topic)
}
