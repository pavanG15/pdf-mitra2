
import React from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';

const Blog: React.FC = () => {
  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <section className="bg-white border-b border-slate-200 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Document <span className="text-teal-600 font-extrabold italic">Insights</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Expert tips, security guides, and productivity hacks for professional document management.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 gap-8">
          {BLOG_POSTS.map((post) => (
            <Link 
              to={`/blog/${post.id}`} 
              key={post.id}
              className="group bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 hover:border-teal-500 transition-all hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {post.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {post.date}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 group-hover:text-teal-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-inner">
                <i className="fas fa-arrow-right text-xl"></i>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
