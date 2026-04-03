import React from 'react';
import { Award, ShieldCheck, Clock, Layers } from 'lucide-react';

export default function AboutSection() {
  const stats = [
    { value: '3000+', label: '企业服务经验', icon: <Award className="w-6 h-6 text-indigo-600" /> },
    { value: '500+', label: '复杂合规项目经验', icon: <ShieldCheck className="w-6 h-6 text-indigo-600" /> },
    { value: '20+', label: '年制造合规积淀', icon: <Clock className="w-6 h-6 text-indigo-600" /> },
    { value: '4', label: '大行业深耕', icon: <Layers className="w-6 h-6 text-indigo-600" /> },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">我们的成就</h2>
        <div className="w-12 h-1 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-4 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
              {stat.icon}
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</div>
            <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
