import React, { useState, useMemo } from 'react';
import { Enterprise } from '../types';
import { Download, Filter, Eye, Save, Share2, Search } from 'lucide-react';

export default function AdminDashboard({ enterprises }: { enterprises: Enterprise[] }) {
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // useMemo：行业列表只在 enterprises 变化时重新计算
  const industries = useMemo(
    () => ['all', ...Array.from(new Set(enterprises.map(e => e.industry)))],
    [enterprises]
  );

  // useMemo：过滤结果只在依赖项变化时重新计算；搜索改为不区分大小写
  const filtered = useMemo(
    () => enterprises.filter(e => {
      const matchIndustry = filterIndustry === 'all' || e.industry === filterIndustry;
      const term = searchTerm.toLowerCase();
      const matchSearch = e.companyName.toLowerCase().includes(term) || e.contactName.toLowerCase().includes(term);
      return matchIndustry && matchSearch;
    }),
    [enterprises, filterIndustry, searchTerm]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">企业数据管理</h2>
          <p className="text-sm text-slate-500 mt-1">共 {filtered.length} 家企业注册</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
          <Download className="w-4 h-4" />
          导出 Excel
        </button>
      </div>

      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="搜索企业名称或联系人..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="relative min-w-[160px]">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select 
            value={filterIndustry}
            onChange={e => setFilterIndustry(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">所有行业</option>
            {industries.filter(i => i !== 'all').map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">企业信息</th>
              <th className="px-6 py-4 font-medium">联系人</th>
              <th className="px-6 py-4 font-medium">数据统计</th>
              <th className="px-6 py-4 font-medium">注册时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  暂无匹配的企业数据
                </td>
              </tr>
            ) : (
              filtered.map(ent => (
                <tr key={ent.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={ent.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" referrerPolicy="no-referrer" />
                      <div>
                        <div className="font-medium text-slate-900">{ent.companyName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{ent.industry}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{ent.contactName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{ent.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1" title="查看次数">
                        <Eye className="w-3.5 h-3.5 text-slate-400" /> {ent.views}
                      </div>
                      <div className="flex items-center gap-1" title="保存次数">
                        <Save className="w-3.5 h-3.5 text-slate-400" /> {ent.saves}
                      </div>
                      <div className="flex items-center gap-1" title="转发次数">
                        <Share2 className="w-3.5 h-3.5 text-slate-400" /> {ent.forwards}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(ent.createTime).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
