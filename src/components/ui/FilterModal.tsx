import { Dialog } from '@headlessui/react'
import { X } from 'lucide-react'

// Import the Filter type
interface Filter {
  id: string
  label: string
  type: 'followers' | 'posts' | 'engagement' | 'activity' | 'interests'
  value: number | string
  operator?: 'gt' | 'lt' | 'eq' | 'contains'
}

// Add FilterButton component
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

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: Filter[]
  activeFilters: Filter[]
  onFilterChange: (filters: Filter[]) => void
}

export function FilterModal({
  isOpen,
  onClose,
  filters,
  activeFilters,
  onFilterChange,
}: FilterModalProps) {
  const filterCategories = {
    followers: filters.filter(f => f.type === 'followers'),
    posts: filters.filter(f => f.type === 'posts'),
    engagement: filters.filter(f => f.type === 'engagement'),
    activity: filters.filter(f => f.type === 'activity'),
    interests: filters.filter(f => f.type === 'interests'),
  }

  const toggleFilter = (filter: Filter) => {
    if (activeFilters.some(f => f.id === filter.id)) {
      onFilterChange(activeFilters.filter(f => f.id !== filter.id))
    } else {
      onFilterChange([...activeFilters, filter])
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold text-gray-900">Filters</Dialog.Title>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Follower Filters */}
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Followers</h3>
              <div className="flex flex-wrap gap-2">
                {filterCategories.followers.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilters.some(f => f.id === filter.id)}
                    onClick={() => toggleFilter(filter)}
                  />
                ))}
              </div>
            </div>

            {/* Post Count Filters */}
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Posts</h3>
              <div className="flex flex-wrap gap-2">
                {filterCategories.posts.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilters.some(f => f.id === filter.id)}
                    onClick={() => toggleFilter(filter)}
                  />
                ))}
              </div>
            </div>

            {/* Engagement Filters */}
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Engagement</h3>
              <div className="flex flex-wrap gap-2">
                {filterCategories.engagement.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilters.some(f => f.id === filter.id)}
                    onClick={() => toggleFilter(filter)}
                  />
                ))}
              </div>
            </div>

            {/* Activity Filters */}
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Activity</h3>
              <div className="flex flex-wrap gap-2">
                {filterCategories.activity.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilters.some(f => f.id === filter.id)}
                    onClick={() => toggleFilter(filter)}
                  />
                ))}
              </div>
            </div>

            {/* Interest Filters */}
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {filterCategories.interests.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilters.some(f => f.id === filter.id)}
                    onClick={() => toggleFilter(filter)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => onFilterChange([])}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0185FF] text-white rounded-lg hover:bg-[#0185FF]/90"
            >
              Apply Filters
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
