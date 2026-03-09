import React, { useState, useRef } from 'react';
import { Upload, Building, User, Phone, MessageCircle, Briefcase } from 'lucide-react';
import { Enterprise } from '../types';

const INDUSTRIES = ['互联网/IT', '金融/投资', '教育/培训', '医疗/健康', '制造/工业', '房地产/建筑', '零售/批发', '服务业', '其他'];

export default function RegistrationForm({ onRegister }: { onRegister: (data: any) => void }) {
  const [formData, setFormData] = useState({
    companyName: '',
    industry: INDUSTRIES[0],
    contactName: '',
    phone: '',
    wechat: '',
    logoUrl: 'https://picsum.photos/seed/logo/200/200'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-indigo-600 px-6 py-8 text-white text-center">
        <h1 className="text-2xl font-bold mb-2">企业入驻申请</h1>
        <p className="text-indigo-100 text-sm">填写企业信息，一键生成专属商务名片</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">企业LOGO</label>
            <div className="flex items-center gap-4">
              <img src={formData.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/jpeg, image/png" 
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传新LOGO
              </button>
              <span className="text-xs text-slate-500">支持 JPG, PNG 格式</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">企业名称</label>
              <div className="relative">
                <Building className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="text" 
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="请输入完整企业名称"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">所属行业</label>
              <div className="relative">
                <Briefcase className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select 
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                >
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">联系人姓名</label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="text" 
                  value={formData.contactName}
                  onChange={e => setFormData({...formData, contactName: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="如：张三"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">手机号码</label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="11位手机号"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">微信号</label>
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="text" 
                  value={formData.wechat}
                  onChange={e => setFormData({...formData, wechat: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="请输入微信号"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            免费生成名片
          </button>
          <p className="text-center text-xs text-slate-500 mt-3">
            提交即代表您同意《隐私保护政策》，我们将严格保密您的信息
          </p>
        </div>
      </form>
    </div>
  );
}
