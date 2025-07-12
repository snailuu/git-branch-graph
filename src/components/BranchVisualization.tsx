import { GitCommit, GitBranch } from '@/lib/github';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef, useMemo, useCallback, memo } from 'react';
import { ExternalLink, GitMerge, Eye, EyeOff, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';

interface BranchVisualizationProps {
  commits: GitCommit[];
  branches: GitBranch[];
  owner: string;
  repo: string;
}

interface TooltipData {
  commit: GitCommit;
  x: number;
  y: number;
  owner: string;
  repo: string;
}

interface CommitNode {
  commit: GitCommit;
  x: number;
  y: number;
  branchIndex: number;
  children: string[];
  isMerge: boolean;
  branchName?: string;
}

// Memoized tooltip component
const CommitTooltip = memo(function CommitTooltip({ commit, x, y, owner, repo }: TooltipData) {
  return (
    <div 
      className="fixed z-50 bg-gray-800 text-white text-sm rounded-lg shadow-lg border border-gray-600 p-3 min-w-64 max-w-80 pointer-events-none"
      style={{
        left: Math.min(x + 20, window.innerWidth - 320),
        top: Math.max(y - 50, 10),
      }}
    >
      <div className="space-y-2">
        <div className="font-medium text-white border-b border-gray-600 pb-2">
          {commit.message.split('\n')[0]}
        </div>
        
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center justify-between">
            <span>{commit.author.name}</span>
            <span>{formatDistanceToNow(new Date(commit.author.date), { addSuffix: true })}</span>
          </div>
          
          {commit.stats && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">
                {commit.stats.total === 1 ? '1 file' : `${commit.stats.total} files`}
              </span>
              {commit.stats.additions > 0 && (
                <span className="text-green-400">+{commit.stats.additions}</span>
              )}
              {commit.stats.deletions > 0 && (
                <span className="text-red-400">-{commit.stats.deletions}</span>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <span className="font-mono text-xs text-gray-400">
              {commit.sha.substring(0, 7)}
            </span>
            <a
              href={commit.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs pointer-events-auto"
            >
              <ExternalLink className="w-3 h-3" />
              在 GitHub 上打开
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

// Function to create curved path between two points
function createCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 === x2) {
    // Same branch, straight line
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  
  // Different branches, use more pronounced curved line
  const deltaY = Math.abs(y2 - y1);
  const curvature = Math.min(deltaY * 0.6, 40); // More pronounced curve
  
  // Control points for more dramatic curve
  const cp1x = x1;
  const cp1y = y1 + curvature;
  const cp2x = x2;
  const cp2y = y2 - curvature;
  
  return `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`;
}

// Memoized commit row component
const CommitRow = memo(function CommitRow({ 
  node, 
  onHover, 
  onLeave, 
  onClick 
}: {
  node: CommitNode;
  onHover: (commit: GitCommit, event: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (url: string) => void;
}) {
  const handleClick = useCallback(() => {
    onClick(node.commit.htmlUrl);
  }, [node.commit.htmlUrl, onClick]);

  const handleHover = useCallback((e: React.MouseEvent) => {
    onHover(node.commit, e);
  }, [node.commit, onHover]);

  return (
    <div
      className="absolute w-full group cursor-pointer hover:bg-gray-800/20 transition-colors py-2 px-3"
      style={{
        top: `${node.y - 12}px`,
        zIndex: 2,
      }}
      onMouseEnter={handleHover}
      onMouseLeave={onLeave}
      onClick={handleClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-white text-sm truncate flex-1 group-hover:text-blue-300">
            {node.commit.message.split('\n')[0]}
          </div>
          {node.isMerge && (
            <GitMerge className="w-3 h-3 text-purple-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
});

export default function BranchVisualization({ commits, branches, owner, repo }: BranchVisualizationProps) {
  const [hoveredCommit, setHoveredCommit] = useState<TooltipData | null>(null);
  const [visibleBranches, setVisibleBranches] = useState<Set<string>>(
    new Set(branches.map(b => b.name))
  );
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(100); // Limit initial display
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Toggle branch visibility
  const toggleBranch = useCallback((branchName: string) => {
    setVisibleBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchName)) {
        newSet.delete(branchName);
      } else {
        newSet.add(branchName);
      }
      return newSet;
    });
  }, []);

  // Memoize expensive calculations
  const { commitNodes, visibleNodes, maxY, graphWidth } = useMemo(() => {
    // Sort commits by date (newest first)
    const sortedCommits = [...commits].sort(
      (a, b) => new Date(b.author.date).getTime() - new Date(a.author.date).getTime()
    );

    // Build the commit graph
    const commitNodes: CommitNode[] = [];
    const branchColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
      '#EF4444', '#EC4899', '#6366F1', '#6B7280',
    ];

    // Constants for layout
    const BRANCH_SPACING = 20;
    const COMMIT_SPACING = 32;
    const LEFT_MARGIN = 30;
    const COMMIT_INFO_LEFT_MARGIN = 120;

    // Track branch assignments
    const branchMap = new Map<string, number>();
    const branchCommits = new Map<number, Set<string>>();
    let currentBranchIndex = 0;

    // Initialize main branch
    const mainBranch = branches.find(b => b.name === 'main' || b.name === 'master') || branches[0];
    if (mainBranch) {
      branchMap.set(mainBranch.name, 0);
      branchCommits.set(0, new Set());
      currentBranchIndex = 1;
    }

    // Process commits to create nodes
    sortedCommits.forEach((commit, index) => {
      let branchIndex = 0;
      let branchName = mainBranch?.name || 'main';
      const isMerge = commit.parents.length > 1;
      
      const branchHead = branches.find(b => b.commit.sha === commit.sha);
      if (branchHead && !branchMap.has(branchHead.name)) {
        branchMap.set(branchHead.name, currentBranchIndex);
        branchCommits.set(currentBranchIndex, new Set());
        branchIndex = currentBranchIndex;
        branchName = branchHead.name;
        currentBranchIndex++;
      } else if (branchHead) {
        branchIndex = branchMap.get(branchHead.name)!;
        branchName = branchHead.name;
      }

      if (branchIndex === 0 && commit.parents.length > 0) {
        const parentNode = commitNodes.find(node => 
          commit.parents.some(parent => parent.sha === node.commit.sha)
        );
        if (parentNode) {
          branchIndex = parentNode.branchIndex;
          branchName = parentNode.branchName || branchName;
        }
      }

      if (isMerge) {
        branchIndex = 0;
        branchName = mainBranch?.name || 'main';
      }

      if (!branchCommits.has(branchIndex)) {
        branchCommits.set(branchIndex, new Set());
      }
      branchCommits.get(branchIndex)!.add(commit.sha);

      const centerX = LEFT_MARGIN + branchIndex * BRANCH_SPACING;
      const centerY = 30 + index * COMMIT_SPACING;

      commitNodes.push({
        commit,
        x: centerX,
        y: centerY,
        branchIndex,
        children: commit.parents.map(parent => parent.sha),
        isMerge,
        branchName,
      });
    });

    // Filter nodes based on visible branches and display limit
    const visibleNodes = commitNodes
      .filter(node => node.branchName && visibleBranches.has(node.branchName))
      .slice(0, displayLimit);

    const maxY = Math.max(...(visibleNodes.length > 0 ? visibleNodes.map(node => node.y) : [100])) + 40;
    const graphWidth = COMMIT_INFO_LEFT_MARGIN;

    return { commitNodes, visibleNodes, maxY, graphWidth };
  }, [commits, branches, visibleBranches, displayLimit]);

  // Debounced hover handlers
  const handleCommitHover = useCallback((commit: GitCommit, event: React.MouseEvent) => {
    if (containerRef.current) {
      setHoveredCommit({
        commit,
        x: event.clientX,
        y: event.clientY,
        owner,
        repo,
      });
    }
  }, [owner, repo]);

  const handleCommitLeave = useCallback(() => {
    setHoveredCommit(null);
  }, []);

  const handleCommitClick = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const loadMore = useCallback(() => {
    setDisplayLimit(prev => prev + 100);
  }, []);

  const hasMoreCommits = commitNodes.filter(node => 
    node.branchName && visibleBranches.has(node.branchName)
  ).length > displayLimit;

  if (!commits.length || !branches.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No commits or branches found in this repository.
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 rounded-lg relative" ref={containerRef}>
      {/* Header with branch info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Git Graph</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{owner}/{repo}</span>
            <span className="text-xs text-gray-500">
              显示 {visibleNodes.length} / {commitNodes.filter(node => 
                node.branchName && visibleBranches.has(node.branchName)
              ).length} 个提交
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(showAllBranches ? branches : branches.slice(0, 6)).map((branch, index) => {
            const isVisible = visibleBranches.has(branch.name);
            return (
              <button
                key={branch.name}
                onClick={() => toggleBranch(branch.name)}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all hover:bg-gray-700 ${
                  isVisible 
                    ? 'bg-gray-800 text-gray-300' 
                    : 'bg-gray-800/50 text-gray-500'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 transition-opacity ${
                    isVisible ? 'opacity-100' : 'opacity-30'
                  }`}
                  style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#6366F1', '#6B7280'][index % 8] }}
                />
                {branch.name.replace('origin/', '')}
                {isVisible ? (
                  <Eye className="w-3 h-3 ml-1 opacity-60" />
                ) : (
                  <EyeOff className="w-3 h-3 ml-1 opacity-40" />
                )}
              </button>
            );
          })}
          {branches.length > 6 && (
            <button
              onClick={() => setShowAllBranches(!showAllBranches)}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-all"
            >
              {showAllBranches ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  +{branches.length - 6} 更多
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Visualization area */}
      <div className="relative overflow-auto" style={{ maxHeight: '70vh' }}>
        <div className="flex">
          {/* Graph area - fixed width */}
          <div className="relative" style={{ width: `${graphWidth}px`, minHeight: `${maxY}px` }}>
            <svg
              width={graphWidth}
              height={maxY}
              className="absolute top-0 left-0"
              style={{ zIndex: 1 }}
            >
              {/* Draw connection lines only for visible range */}
              {visibleNodes.map((node) =>
                node.children.map((childSha) => {
                  const childNode = visibleNodes.find(n => n.commit.sha === childSha);
                  if (!childNode) return null;

                  const color = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#6366F1', '#6B7280'][node.branchIndex % 8];
                  const pathData = createCurvedPath(node.x, node.y, childNode.x, childNode.y);
                  
                  return (
                    <path
                      key={`${node.commit.sha}-${childSha}`}
                      d={pathData}
                      stroke={color}
                      strokeWidth="2"
                      fill="none"
                      opacity="0.8"
                    />
                  );
                })
              )}

              {/* Draw commit nodes */}
              {visibleNodes.map((node) => (
                <g key={`node-${node.commit.sha}`}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={6}
                    fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#6366F1', '#6B7280'][node.branchIndex % 8]}
                    stroke="#1f2937"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-8 transition-all"
                    onMouseEnter={(e) => handleCommitHover(node.commit, e as any)}
                    onMouseLeave={handleCommitLeave}
                    onClick={() => handleCommitClick(node.commit.htmlUrl)}
                  />
                  {node.isMerge && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={4}
                      fill="#1f2937"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Commit information area - flexible width */}
          <div className="flex-1 relative" style={{ minHeight: `${maxY}px` }}>
            {visibleNodes.map((node) => (
              <CommitRow
                key={`info-${node.commit.sha}`}
                node={node}
                onHover={handleCommitHover}
                onLeave={handleCommitLeave}
                onClick={handleCommitClick}
              />
            ))}
            
            {/* Load more button */}
            {hasMoreCommits && (
              <div 
                className="absolute w-full flex justify-center py-4"
                style={{ top: `${maxY - 20}px` }}
              >
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  加载更多提交 ({commitNodes.filter(node => 
                    node.branchName && visibleBranches.has(node.branchName)
                  ).length - displayLimit} 个)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {hoveredCommit && (
        <CommitTooltip {...hoveredCommit} />
      )}
    </div>
  );
}