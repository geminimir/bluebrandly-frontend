import { NextResponse } from 'next/server'
import { BskyAgent, AppBskyFeedDefs } from '@atproto/api'

const agent = new BskyAgent({ service: 'https://bsky.social' })

export async function GET(
  request: Request,
  { params }: { params: { did: string } }
) {
  try {
    await agent.login({
      identifier: process.env.BLUESKY_USERNAME!,
      password: process.env.BLUESKY_PASSWORD!,
    })

    const { did } = params
    
    // Fetch profile and recent posts in parallel
    const [profile, feed] = await Promise.all([
      agent.getProfile({ actor: did }),
      agent.getAuthorFeed({ actor: did, limit: 20 })
    ])

    const recentPosts = feed.data.feed.map((post: AppBskyFeedDefs.FeedViewPost) => ({
      uri: post.post.uri,
      text: (post.post.record as AppBskyFeedDefs.PostView).text,
      likeCount: post.post.likeCount || 0,
      replyCount: post.post.replyCount || 0,
      repostCount: post.post.repostCount || 0,
      indexedAt: post.post.indexedAt,
    }))

    // Calculate engagement metrics
    const avgLikes = Math.round(
      recentPosts.reduce((sum, post) => sum + post.likeCount, 0) / recentPosts.length
    )
    const avgReposts = Math.round(
      recentPosts.reduce((sum, post) => sum + post.repostCount, 0) / recentPosts.length
    )
    const avgReplies = Math.round(
      recentPosts.reduce((sum, post) => sum + post.replyCount, 0) / recentPosts.length
    )

    const enrichedProfile = {
      ...profile.data,
      recentPosts,
      avgLikes,
      avgReposts,
      avgReplies,
      engagementRate: Number(((avgLikes + avgReposts + avgReplies) / (profile.data.followersCount ?? 1) * 100).toFixed(2)),
      topInterests: getTopInterests(recentPosts),
      postsPerWeek: getPostingFrequency(recentPosts),
      isActive: isActiveUser(recentPosts)
    }

    return NextResponse.json(enrichedProfile)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch influencer data' },
      { status: 500 }
    )
  }
}

// Helper functions from our previous implementation
function isActiveUser(posts: any[]) {
  if (posts.length === 0) return false
  const lastPostDate = new Date(posts[0].indexedAt)
  const daysSinceLastPost = (Date.now() - lastPostDate.getTime()) / (1000 * 3600 * 24)
  return daysSinceLastPost <= 7
}

function getPostingFrequency(posts: any[]) {
  if (posts.length < 2) return 0
  const firstPost = new Date(posts[0].indexedAt)
  const lastPost = new Date(posts[posts.length - 1].indexedAt)
  const weeksBetween = Math.max(0.1, (firstPost.getTime() - lastPost.getTime()) / (1000 * 3600 * 24 * 7))
  return Number((posts.length / weeksBetween).toFixed(1))
}

function getTopInterests(posts: any[]) {
  const topics = posts.reduce((acc: Record<string, number>, post: any) => {
    const text = (post.text || '').toLowerCase()
    
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
    .slice(0, 5)
    .map(([topic]) => topic)
}