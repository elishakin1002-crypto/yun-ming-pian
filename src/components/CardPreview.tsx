import React, { useState } from 'react';
import { Enterprise } from '../types';
import { Download, Share2, QrCode, Phone, MessageCircle, Building2 } from 'lucide-react';

export default function CardPreview({ enterprise }: { enterprise: Enterprise }) {
  const [template, setTemplate] = useState<1 | 2 | 3>(1);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">选择模板</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t as 1|2|3)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${template === t ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="font-medium text-slate-800">模板 {t}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {t === 1 ? '极简商务风' : t === 2 ? '现代科技风' : '优雅高端风'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
              <Download className="w-5 h-5" />
              <span className="text-xs font-medium">保存相册</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
              <Share2 className="w-5 h-5" />
              <span className="text-xs font-medium">转发好友</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 col-span-2">
              <QrCode className="w-5 h-5" />
              <span className="text-xs font-medium">生成小程序码</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex items-center justify-center bg-slate-200/50 rounded-3xl p-8 border border-slate-200 border-dashed">
        {/* Card Templates */}
        <div className="w-full max-w-sm aspect-[4/7] bg-white rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-500">
          {template === 1 && (
            <div className="h-full flex flex-col">
              <div className="h-32 bg-slate-900"></div>
              <div className="px-8 flex-1 flex flex-col relative">
                <div className="absolute -top-10 left-8 p-1 bg-white rounded-2xl">
                  <img src={enterprise.logoUrl} alt="logo" className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="mt-14">
                  <h2 className="text-2xl font-bold text-slate-900">{enterprise.contactName}</h2>
                  <p className="text-indigo-600 font-medium mt-1">{enterprise.companyName}</p>
                  <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded mt-2">{enterprise.industry}</span>
                </div>
                <div className="mt-auto mb-10 space-y-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{enterprise.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">{enterprise.wechat}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {template === 2 && (
            <div className="h-full flex flex-col bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-8">
              <div className="flex justify-between items-start">
                <img src={enterprise.logoUrl} alt="logo" className="w-16 h-16 rounded-full border-2 border-white/20 object-cover" referrerPolicy="no-referrer" />
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs backdrop-blur-sm">{enterprise.industry}</span>
              </div>
              <div className="mt-12">
                <h2 className="text-3xl font-bold tracking-tight">{enterprise.contactName}</h2>
                <div className="h-1 w-12 bg-blue-400 mt-4 mb-4"></div>
                <p className="text-blue-100 text-lg">{enterprise.companyName}</p>
              </div>
              <div className="mt-auto space-y-4 bg-white/10 p-5 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium tracking-wider">{enterprise.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium tracking-wider">{enterprise.wechat}</span>
                </div>
              </div>
            </div>
          )}

          {template === 3 && (
            <div className="h-full flex flex-col bg-[#f5f2ed] text-[#1a1a1a] p-8 border-8 border-white">
              <div className="text-center mt-8">
                <img src={enterprise.logoUrl} alt="logo" className="w-20 h-20 mx-auto rounded-full object-cover shadow-md mb-6" referrerPolicy="no-referrer" />
                <h2 className="text-2xl font-serif font-bold">{enterprise.contactName}</h2>
                <p className="text-sm uppercase tracking-widest text-[#5A5A40] mt-2">{enterprise.industry}</p>
              </div>
              
              <div className="my-8 flex justify-center">
                <div className="w-16 h-px bg-[#1a1a1a]/20"></div>
              </div>

              <div className="text-center px-4">
                <p className="font-serif text-lg font-medium leading-snug">{enterprise.companyName}</p>
              </div>

              <div className="mt-auto space-y-5 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                  <p className="font-mono text-sm">{enterprise.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">WeChat</p>
                  <p className="font-mono text-sm">{enterprise.wechat}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
