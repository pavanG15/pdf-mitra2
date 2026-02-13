
import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';

const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const post = BLOG_POSTS.find(p => p.id === id);

  if (!post) {
    return <Navigate to="/blog" />;
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Article Header */}
      <header className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <Link to="/blog" className="inline-flex items-center gap-2 text-teal-600 text-xs font-black uppercase tracking-widest mb-10 hover:gap-3 transition-all">
          <i className="fas fa-arrow-left"></i> Back to Insights
        </Link>
        <div className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4">
          {post.category} • {post.date}
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
          {post.title}
        </h1>
        <div className="w-20 h-1.5 bg-orange-500 mx-auto rounded-full"></div>
      </header>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-6">
        <div 
          className="prose prose-slate prose-lg lg:prose-xl mx-auto 
          prose-headings:font-black prose-headings:text-slate-900 
          prose-p:text-slate-600 prose-p:leading-relaxed 
          prose-strong:text-slate-900 
          prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-50/50 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:font-medium prose-blockquote:text-slate-800
          prose-img:rounded-[2rem] prose-img:shadow-2xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {/* Author Footer */}
        <div className="mt-20 pt-12 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white text-xl">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 uppercase tracking-widest">PDF Mitra Editorial</div>
              <div className="text-xs font-medium text-slate-400">Security & Privacy Expert</div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all flex items-center justify-center">
              <i className="fab fa-twitter"></i>
            </button>
            <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-all flex items-center justify-center">
              <i className="fab fa-linkedin-in"></i>
            </button>
          </div>
        </div>
      </article>

      {/* Footer CTA */}
      <section className="max-w-5xl mx-auto px-4 mt-24">
        <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl">
            <i className="fas fa-file-pdf"></i>
          </div>
          <h2 className="text-3xl font-black mb-4">Ready to start?</h2>
          <p className="text-slate-400 font-medium mb-10 max-w-xl mx-auto">
            Experience the future of secure, local PDF management today. No uploads, no risks.
          </p>
          <Link to="/" className="bg-teal-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-teal-500/20 hover:bg-teal-400 transition-all inline-block">
            Go to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;
