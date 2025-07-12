import { Octokit } from '@octokit/rest';

export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    date: string;
  };
  parents: { sha: string }[];
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  htmlUrl: string;
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

export interface GitBranch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface RepositoryData {
  commits: GitCommit[];
  branches: GitBranch[];
  owner: string;
  repo: string;
}

class GitHubService {
  private octokit: Octokit;
  private currentToken: string | null = null;

  constructor() {
    this.octokit = new Octokit({
      // Using unauthenticated requests for public repos by default
      // Rate limit is 60 requests per hour for unauthenticated requests
    });
  }

  // Update the token and reinitialize Octokit
  setToken(token: string | null) {
    this.currentToken = token;
    this.octokit = new Octokit({
      auth: token || undefined,
    });
  }

  // Get current rate limit info
  async getRateLimit() {
    try {
      const response = await this.octokit.rateLimit.get();
      return response.data.rate;
    } catch (error) {
      console.warn('Failed to get rate limit info:', error);
      return null;
    }
  }

  async getRepositoryData(owner: string, repo: string): Promise<RepositoryData> {
    try {
      // Fetch branches
      const branchesResponse = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      const branches = branchesResponse.data;

      // Fetch commits from all branches with basic info first
      const commitPromises = branches.map(async (branch) => {
        try {
          const commitsResponse = await this.octokit.repos.listCommits({
            owner,
            repo,
            sha: branch.name,
            per_page: 50,
          });
          return commitsResponse.data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author?.name || 'Unknown',
              date: commit.commit.author?.date || new Date().toISOString(),
            },
            parents: commit.parents.map(parent => ({ sha: parent.sha })),
            htmlUrl: commit.html_url,
            branch: branch.name,
          }));
        } catch (error) {
          console.warn(`Failed to fetch commits for branch ${branch.name}:`, error);
          return [];
        }
      });

      const commitArrays = await Promise.all(commitPromises);
      const allCommits = commitArrays.flat();

      // Remove duplicates based on SHA
      const uniqueCommits = allCommits.filter((commit, index, self) => 
        index === self.findIndex(c => c.sha === commit.sha)
      );

      // Fetch detailed commit information for a subset (to avoid rate limiting)
      // Reduce the number to avoid hitting rate limits too quickly
      const detailedCommits = await Promise.all(
        uniqueCommits.slice(0, 30).map(async (commit) => {
          try {
            const detailedResponse = await this.octokit.repos.getCommit({
              owner,
              repo,
              ref: commit.sha,
            });
            
            const detailed = detailedResponse.data;
            return {
              ...commit,
              stats: detailed.stats ? {
                total: detailed.stats.total || 0,
                additions: detailed.stats.additions || 0,
                deletions: detailed.stats.deletions || 0,
              } : undefined,
              files: detailed.files?.map(file => ({
                filename: file.filename,
                additions: file.additions || 0,
                deletions: file.deletions || 0,
                changes: file.changes || 0,
              })) || [],
            };
          } catch (error: any) {
            // Handle rate limiting and other API errors gracefully
            if (error.status === 403) {
              console.warn(`Rate limited for commit ${commit.sha}, using basic info only`);
            } else if (error.status === 404) {
              console.warn(`Commit ${commit.sha} not found, using basic info only`);
            } else {
              console.warn(`Failed to fetch detailed info for commit ${commit.sha}:`, error.message);
            }
            // Return the basic commit info without detailed stats
            return commit;
          }
        })
      );

      // For commits beyond the first 30, keep them without detailed stats
      const remainingCommits = uniqueCommits.slice(30);

      return {
        commits: [...detailedCommits, ...remainingCommits],
        branches: branches.map(branch => ({
          name: branch.name,
          commit: {
            sha: branch.commit.sha,
          },
        })),
        owner,
        repo,
      };
    } catch (error: any) {
      // Enhanced error handling for different types of API errors
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or use a personal access token for higher limits.');
      } else if (error.status === 404) {
        throw new Error('Repository not found. Please check the repository URL and ensure it is public.');
      } else if (error.status === 401) {
        throw new Error('Authentication failed. The repository may be private.');
      } else {
        throw new Error(`Failed to fetch repository data: ${error.message || 'Unknown error'}`);
      }
    }
  }

  parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }
}

export const githubService = new GitHubService();