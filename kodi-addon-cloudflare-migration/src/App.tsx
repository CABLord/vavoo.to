import React, { useEffect, useState, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  Search, 
  Settings, 
  ChevronRight, 
  LayoutGrid,
  Heart,
  PlayCircle
} from 'lucide-react';
import { VavooAPI, MovieItem } from './services/api';
import VideoPlayer from './components/VideoPlayer';
import { cn } from './utils/cn';

type ContentType = 'live' | 'movie' | 'series' | 'favorites';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('live');
  const [items, setItems] = useState<MovieItem[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState<{ url: string; title: string } | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from local storage
  useEffect(() => {
    const stored = localStorage.getItem('vavoo_favorites');
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('vavoo_favorites', JSON.stringify(updated));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'live') {
        const liveGroups = await VavooAPI.getLiveGroups();
        setGroups(liveGroups);
        if (activeGroup || liveGroups.length > 0) {
          const data = await VavooAPI.getCatalog('live', activeGroup || liveGroups[0]);
          setItems(data);
        }
      } else if (activeTab === 'movie' || activeTab === 'series') {
        const data = await VavooAPI.getCatalog(activeTab);
        setItems(data);
        setGroups([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, activeGroup]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab === 'favorites') {
      result = items.filter(item => favorites.includes(item.id));
    }
    if (searchQuery) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [items, searchQuery, activeTab, favorites]);

  const handlePlay = async (item: MovieItem) => {
    if (!item.url) return;
    try {
      const resolvedUrl = await VavooAPI.resolve(item.url);
      if (resolvedUrl) {
        setSelectedStream({ url: resolvedUrl, title: item.name });
      } else {
        alert("Could not resolve stream URL.");
      }
    } catch (error) {
      console.error(error);
      alert("Error playing stream.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-400 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
              <PlayCircle size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">VAVOO WEB</span>
          </div>

          <nav className="space-y-1">
            <NavItem 
              icon={<Tv size={20} />} 
              label="Live TV" 
              active={activeTab === 'live'} 
              onClick={() => { setActiveTab('live'); setActiveGroup(null); }}
            />
            <NavItem 
              icon={<Film size={20} />} 
              label="Movies" 
              active={activeTab === 'movie'} 
              onClick={() => setActiveTab('movie')}
            />
            <NavItem 
              icon={<Clapperboard size={20} />} 
              label="TV Series" 
              active={activeTab === 'series'} 
              onClick={() => setActiveTab('series')}
            />
            <NavItem 
              icon={<Heart size={20} />} 
              label="Favorites" 
              active={activeTab === 'favorites'} 
              onClick={() => setActiveTab('favorites')}
            />
          </nav>
        </div>

        {/* Groups for Live TV */}
        {activeTab === 'live' && groups.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <LayoutGrid size={12} /> Categories
            </p>
            <div className="space-y-1 pb-6">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    activeGroup === group 
                      ? "bg-indigo-600/10 text-indigo-400 font-medium border border-indigo-500/20 shadow-sm shadow-indigo-500/5" 
                      : "hover:bg-white/5 hover:text-zinc-200"
                  )}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t border-white/5">
          <NavItem icon={<Settings size={20} />} label="Settings" onClick={() => {}} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center flex-1 max-w-md relative group">
            <Search className="absolute left-3 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search content..."
              className="w-full bg-white/5 border border-transparent focus:border-indigo-500/50 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none transition-all placeholder:text-zinc-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 ml-8">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-zinc-300">User</span>
              <span className="text-[10px] text-zinc-500">Premium Account</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 border-2 border-white/10" />
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  {activeTab === 'live' ? `Live TV: ${activeGroup || 'Loading...'}` : 
                   activeTab === 'movie' ? 'All Movies' : 
                   activeTab === 'series' ? 'TV Series' : 'My Favorites'}
                </h1>
                <p className="text-zinc-500 mt-1">
                  Discover over {filteredItems.length} streams available right now
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredItems.map(item => (
                  <ContentCard 
                    key={item.id} 
                    item={item} 
                    onPlay={() => handlePlay(item)}
                    isFavorite={favorites.includes(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-zinc-600">
                <div className="bg-white/5 p-4 rounded-full mb-4">
                  <Tv size={48} className="opacity-20" />
                </div>
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Video Player */}
      {selectedStream && (
        <VideoPlayer 
          url={selectedStream.url} 
          title={selectedStream.title} 
          onClose={() => setSelectedStream(null)} 
        />
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-medium" 
        : "text-zinc-500 hover:bg-white/5 hover:text-white"
    )}
  >
    <span className={cn(active ? "text-white" : "group-hover:text-indigo-400 transition-colors")}>{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

const ContentCard = ({ item, onPlay, isFavorite, onToggleFavorite }: { item: MovieItem, onPlay: () => void, isFavorite: boolean, onToggleFavorite: () => void }) => (
  <div className="group relative bg-[#18181b] rounded-2xl overflow-hidden border border-white/5 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
    <div className="aspect-[2/3] relative overflow-hidden bg-zinc-900">
      {item.poster ? (
        <img src={item.poster} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
          <Tv size={48} className="text-indigo-500/20" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="absolute inset-0 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
          <button 
            onClick={onPlay}
            className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 transition-colors"
          >
            <PlayCircle size={32} fill="white" />
          </button>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn(
          "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200",
          isFavorite ? "bg-red-500 text-white" : "bg-black/40 text-white/60 hover:text-white hover:bg-black/60"
        )}
      >
        <Heart size={16} fill={isFavorite ? "white" : "none"} />
      </button>
    </div>
    <div className="p-4" onClick={onPlay}>
      <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1 group-hover:text-indigo-400 transition-colors">
        {item.name}
      </h3>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
        <span>{item.group || 'Live Stream'}</span>
        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  </div>
);

export default App;
