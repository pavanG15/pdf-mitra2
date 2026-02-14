
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS, BLOG_POSTS } from '../constants';
import { ToolCategory } from '../types';

const Home: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Convert', value: ToolCategory.CONVERT },
    { label: 'Organize', value: ToolCategory.ORGANIZE },
    { label: 'Security', value: ToolCategory.SECURITY },
    { label: 'Edit', value: ToolCategory.EDIT },
  ];

  const filteredTools = useMemo(() => {
    return TOOLS.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className="pb-20 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Sleek App Controller */}
      <section className="bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pt-8 pb-4 px-4 sticky top-16 z-40 backdrop-blur-xl shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="relative mb-6">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"></i>
            <input 
              type="text"
              placeholder="What do you need to do?"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-bold outline-none dark:text-white shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border ${
                  activeCategory === cat.value 
                  ? 'bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500 shadow-lg shadow-teal-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* App Drawer Grid */}
      <div className="max-w-5xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-10">
          {filteredTools.map((tool) => (
            <Link 
              to={tool.path} 
              key={tool.id}
              className="group flex flex-col items-center transition-all active:scale-90"
            >
              {/* Big "App Icon" */}
              <div 
                className="relative w-full aspect-square max-w-[90px] rounded-[24px] flex items-center justify-center text-3xl mb-3 transition-all shadow-md group-hover:shadow-xl group-hover:-translate-y-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <div 
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                >
                  <i className={`fas ${tool.icon}`}></i>
                </div>
                {(tool.isNew || tool.isPopular) && (
                  <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-4 border-slate-50 dark:border-slate-950 ${tool.isNew ? 'bg-teal-500' : 'bg-orange-500'}`}></div>
                )}
              </div>
              
              <div className="text-center">
                <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider leading-tight">
                  {tool.name}
                </h3>
                {/* Visual hint for popular tools */}
                {tool.isPopular && (
                  <span className="text-[7px] font-black uppercase text-orange-500 tracking-widest mt-1 block">Hot Tool</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Pro Tips / Blog Preview */}
        <section className="mt-24 pt-16 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-8 px-1">
            <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Pro Insights</h2>
            <Link to="/blog" className="text-[10px] font-black text-teal-600 uppercase tracking-widest">See All</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.slice(0, 3).map((post) => (
              <Link to={`/blog/${post.id}`} key={post.id} className="group flex flex-col p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-teal-500/50 transition-all shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{post.category}</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-teal-600 transition-colors">{post.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">{post.excerpt}</p>
                <div className="mt-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-teal-600">
                  Read <i className="fas fa-chevron-right text-[8px]"></i>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
