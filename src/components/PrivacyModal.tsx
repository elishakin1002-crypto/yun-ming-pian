import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 text-indigo-600 mb-4">
          <ShieldCheck className="w-8 h-8" />
          <h2 className="text-xl font-semibold text-slate-900">用户隐私保护提示</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3 mb-6 h-48 overflow-y-auto pr-2">
          <p>欢迎使用「汇智云联名片」。在您使用本服务前，请仔细阅读以下隐私保护说明：</p>
          <p className="font-medium text-slate-800">1. 数据采集目的</p>
          <p>我们仅收集为您生成和展示企业名片所必需的信息，包括：企业名称、所属行业、联系人姓名、手机号、微信号及企业LOGO。</p>
          <p className="font-medium text-slate-800">2. 权限说明</p>
          <p>为实现名片分享和保存功能，我们可能会申请相册写入权限。我们会记录名片的查看、保存和转发次数，以及访问用户的匿名标识（OpenID）用于统计分析。</p>
          <p className="font-medium text-slate-800">3. 信息保护</p>
          <p>我们承诺严格保护您的信息安全，绝不采集任何敏感个人信息，且不会将您的信息用于除名片展示及统计外的其他商业用途。</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.href = 'about:blank'}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            不同意并退出
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            同意并继续
          </button>
        </div>
      </div>
    </div>
  );
}
