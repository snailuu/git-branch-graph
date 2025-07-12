'use client';

import { useState, useEffect } from 'react';
import { githubService, RepositoryData } from '@/lib/github';
import BranchVisualization from '@/components/BranchVisualization';
import SettingsModal from '@/components/SettingsModal';
import { GitBranch, Search, AlertCircle, Loader2, AlertTriangle, Settings } from 'lucide-react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<RepositoryData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');

  // Load GitHub token from localStorage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setGithubToken(savedToken);
      githubService.setToken(savedToken);
    }
  }, []);

  // Save GitHub token to localStorage and update service
  const handleTokenSave = (token: string) => {
    setGithubToken(token);
    githubService.setToken(token || null);
    
    if (token) {
      localStorage.setItem('github_token', token);
    } else {
      localStorage.removeItem('github_token');
    }
    
    setShowSettings(false);
    
    // Clear any existing rate limit warnings since limits have changed
    if (warning?.includes('rate limit')) {
      setWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    setRepoData(null);

    try {
      const parsed = githubService.parseRepositoryUrl(repoUrl.trim());
      if (!parsed) {
        throw new Error('Invalid GitHub repository URL. Please use format: github.com/owner/repo or owner/repo');
      }

      const data = await githubService.getRepositoryData(parsed.owner, parsed.repo);
      setRepoData(data);
      
      // Show warning if data might be incomplete due to rate limiting
      const hasIncompleteData = data.commits.some(commit => !commit.stats);
      if (hasIncompleteData) {
        setWarning('Some commit details may be missing due to GitHub API rate limits. The visualization shows all commits, but detailed statistics are only available for the most recent commits.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GitBranch className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Git Branch Visualizer
              </h1>
              <button
                onClick={() => setShowSettings(true)}
                className="ml-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize git branches and commits from any public GitHub repository
            </p>
            {githubToken && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                ✓ GitHub Token 已配置 (5000 requests/hour)
              </p>
            )}
          </div>

          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <input
                    id="repo-url"
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository or owner/repository"
                    className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={loading}
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !repoUrl.trim()}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    Visualize Branches
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Warning Display */}
          {warning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-800 dark:text-yellow-200 text-sm">{warning}</span>
              </div>
            </div>
          )}

          {/* Repository Data Display */}
          {repoData && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{repoData.branches.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Branches</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{repoData.commits.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(repoData.commits.map(c => c.author.name)).size}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Contributors</div>
                  </div>
                </div>
              </div>

              <BranchVisualization 
                commits={repoData.commits} 
                branches={repoData.branches} 
                owner={repoData.owner}
                repo={repoData.repo}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        githubToken={githubToken}
        onTokenSave={handleTokenSave}
      />
    </div>
  );
}
