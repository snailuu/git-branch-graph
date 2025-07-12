import { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, ExternalLink, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
  onTokenSave: (token: string) => void;
}

export default function SettingsModal({ isOpen, onClose, githubToken, onTokenSave }: SettingsModalProps) {
  const [token, setToken] = useState(githubToken);
  const [showToken, setShowToken] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setToken(githubToken);
    setHasChanges(false);
  }, [githubToken, isOpen]);

  useEffect(() => {
    setHasChanges(token !== githubToken);
  }, [token, githubToken]);

  const handleSave = () => {
    onTokenSave(token);
    setHasChanges(false);
  };

  const handleReset = () => {
    setToken('');
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* GitHub Token Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">GitHub Token</h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                  提升 API 请求限制
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">为什么需要 GitHub Token？</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>未认证：每小时 60 次请求</li>
                    <li>使用 Token：每小时 5000 次请求</li>
                    <li>Token 仅存储在浏览器本地，不会上传到服务器</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  id="github-token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Token 只需要 public_repo 权限，仅用于读取公开仓库信息
              </p>
            </div>

            {/* How to get token */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">如何获取 GitHub Token？</h4>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>访问 GitHub Settings → Developer settings</li>
                <li>点击 Personal access tokens → Tokens (classic)</li>
                <li>Generate new token，选择 public_repo 权限</li>
                <li>复制生成的 token 并粘贴到上方输入框</li>
              </ol>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                打开 GitHub Token 设置页面
              </a>
            </div>

            {/* Current status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">当前状态:</span>
              <span className={`font-medium ${
                githubToken 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {githubToken ? '已配置 Token' : '未配置 (限制 60/小时)'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            disabled={!githubToken}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            清除 Token
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}