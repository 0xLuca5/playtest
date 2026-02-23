'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Plus,
  Trash2,
  GitBranch,
  Server,
  Key,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIntl } from 'react-intl';
import { useSession } from 'next-auth/react';
import { useProject } from '@/lib/contexts/project-context';

interface Repository {
  id: string;
  name: string;
  url: string;
  syncType: 'code' | 'testcase';
  type: 'gitlab' | 'github' | 'gitea' | 'jira' | 'squash';
  accessToken: string;
  branch?: string; // Optional for non-code repositories
  syncEnabled: boolean;
  lastSyncTime?: string;
  // Additional fields for test management systems
  settings?: {
    jiraEmail?: string; // For Jira user email
    jiraProjectKey?: string; // For Jira project key
    [key: string]: any;
  };
}

interface RepositorySettingsProps {
  folderId: string;
  folderName: string;
}

export function RepositorySettings({ folderId, folderName }: RepositorySettingsProps) {
  const intl = useIntl();
  const t = (key: string, params?: any) => intl.formatMessage({ id: key }, params);
  const { currentProject } = useProject();
  const { data: session } = useSession();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null); // 正在同步的仓库ID
  const [loadingProjects, setLoadingProjects] = useState(false); // 正在加载项目列表
  const [gitlabProjects, setGitlabProjects] = useState<Array<{
    id: number;
    name: string;
    path: string;
    web_url: string;
    default_branch: string;
  }>>([]);
  const [jiraProjects, setJiraProjects] = useState<Array<{
    id: string;
    key: string;
    name: string;
    description: string;
  }>>([]);

  // 新增仓库的表单状态
  const [newRepo, setNewRepo] = useState<{
    name: string;
    url: string;
    syncType: 'code' | 'testcase';
    type: 'gitlab' | 'github' | 'gitea' | 'jira' | 'squash';
    accessToken: string;
    branch: string;
    syncEnabled: boolean;
    jiraProjectKey?: string;
    jiraEmail?: string; // Jira 项目 Key
    gitlabBaseUrl?: string; // GitLab 基础 URL
  }>({
    name: '',
    url: '',
    syncType: 'code',
    type: 'gitlab',
    accessToken: '',
    branch: 'main',
    syncEnabled: true,
    jiraProjectKey: '',
    jiraEmail: '',
    gitlabBaseUrl: '',
  });

  // 从数据库加载仓库设置
  const loadRepositories = async () => {
    if (!currentProject?.id) return;

    try {
      setIsLoading(true);
      const url = `/api/repository-settings?projectId=${currentProject.id}&folderId=${folderId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load repository settings');
      }
      const data = await response.json();

      // 将数据库格式转换为组件格式
      const mappedRepos: Repository[] = data.map((setting: any) => {
        // 解析 settings JSON 字段
        let parsedSettings: any = {};
        try {
          if (typeof setting.settings === 'string') {
            parsedSettings = JSON.parse(setting.settings);
          } else if (typeof setting.settings === 'object') {
            parsedSettings = setting.settings;
          }
        } catch (e) {
          console.error('Failed to parse settings:', e);
        }

        // 从 settings 中读取 syncType，如果没有则根据 provider 推断
        let syncType: 'code' | 'testcase' = parsedSettings.syncType || 'code';
        if (!parsedSettings.syncType) {
          // 如果没有 syncType，根据 provider 推断
          if (setting.provider === 'jira' || setting.provider === 'squash') {
            syncType = 'testcase';
          }
        }

        return {
          id: setting.id,
          name: setting.provider ? `${setting.provider} Repository` : 'Repository',
          url: setting.repoUrl || setting.repo_url || '', // 兼容 snake_case 和 camelCase
          syncType: syncType,
          type: setting.provider || 'gitlab',
          accessToken: setting.encryptedAccessToken || setting.encrypted_access_token || '***',
          branch: setting.defaultBranch || setting.default_branch || 'main',
          syncEnabled: Boolean(setting.isActive !== undefined ? setting.isActive : (setting.is_active !== undefined ? setting.is_active : true)),
          lastSyncTime: setting.updatedAt ? new Date(setting.updatedAt).toISOString() : (setting.updated_at ? new Date(setting.updated_at).toISOString() : new Date().toISOString()),
          settings: parsedSettings,
        };
      });

      setRepositories(mappedRepos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      toast.error(t('repository.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 从 Jira 加载项目列表
  const loadJiraProjects = async () => {
    if (!newRepo.url || !newRepo.accessToken) {
      toast.error(t('repository.jiraConfigRequired'));
      return;
    }

    // 确保有 email
    const email = newRepo.jiraEmail || session?.user?.email;
    if (!email) {
      toast.error(t('repository.jiraEmailRequired'));
      return;
    }

    try {
      setLoadingProjects(true);
      const response = await fetch('/api/jira/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: newRepo.url,
          email: email,
          apiToken: newRepo.accessToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load Jira projects');
      }

      const data = await response.json();
      setJiraProjects(data.projects || []);
      toast.success(t('repository.jiraProjectsLoaded', { count: data.projects?.length || 0 }));
    } catch (error) {
      console.error('Failed to load Jira projects:', error);
      toast.error(
        error instanceof Error ? error.message : t('repository.jiraProjectsLoadFailed')
      );
    } finally {
      setLoadingProjects(false);
    }
  };

  // 从 GitLab 加载项目列表
  const loadGitLabProjects = async () => {
    if (!newRepo.gitlabBaseUrl || !newRepo.accessToken) {
      toast.error(t('repository.gitlabConfigRequired'));
      return;
    }

    try {
      setLoadingProjects(true);

      // 提取基础 URL（去除路径部分）
      let baseUrl = newRepo.gitlabBaseUrl.trim();
      try {
        const url = new URL(baseUrl);
        baseUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        // 如果不是有效的 URL，尝试添加 https://
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
          baseUrl = `https://${baseUrl}`;
        }
        try {
          const url = new URL(baseUrl);
          baseUrl = `${url.protocol}//${url.host}`;
        } catch (e2) {
          toast.error(t('repository.invalidGitlabUrl'));
          setLoadingProjects(false);
          return;
        }
      }

      const params = new URLSearchParams({
        baseUrl,
        accessToken: newRepo.accessToken,
        perPage: '50'
      });

      const response = await fetch(`/api/gitlab/projects?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to load GitLab projects';

        // 根据错误类型显示不同的提示
        if (response.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('Token')) {
          toast.error(t('repository.gitlabAuthFailed'));
        } else if (response.status === 403) {
          toast.error(t('repository.gitlabAccessDenied'));
        } else {
          toast.error(errorMessage);
        }

        setGitlabProjects([]);
        setLoadingProjects(false);
        return;
      }

      const data = await response.json();
      setGitlabProjects(data.projects || []);

      if (data.projects && data.projects.length > 0) {
        toast.success(t('repository.projectsLoaded', { count: data.projects.length }));
      } else {
        toast.info(t('repository.noProjectsFound'));
      }
    } catch (error) {
      console.error('Failed to load GitLab projects:', error);
      toast.error(
        error instanceof Error ? error.message : t('repository.loadProjectsFailed')
      );
      setGitlabProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // 初始加载和切换文件夹时重新加载
  useEffect(() => {
    loadRepositories();
  }, [currentProject?.id, folderId]);

  const handleAddRepository = async () => {
    if (!newRepo.name || !newRepo.url || !newRepo.accessToken) {
      toast.error(t('repository.fillAllFields'));
      return;
    }

    if (!currentProject?.id) {
      toast.error(t('repository.noProject'));
      return;
    }

    // Jira 类型需要验证 Project Key
    if (newRepo.type === 'jira' && !newRepo.jiraProjectKey) {
      toast.error(t('repository.jiraProjectKeyRequired'));
      return;
    }

    try {
      // 规范化 URL（确保有协议前缀）
      let repoUrl = newRepo.url.trim();
      if (newRepo.type === 'jira' && !repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
        repoUrl = `https://${repoUrl}`;
      }

      // 构建 settings 对象
      const settings: any = {
        syncType: newRepo.syncType, // 保存 syncType
      };

      if (newRepo.type === 'jira') {
        if (newRepo.jiraProjectKey) {
          settings.jiraProjectKey = newRepo.jiraProjectKey;
        }
        if (newRepo.jiraEmail) {
          settings.jiraEmail = newRepo.jiraEmail;
        }
      }

      const response = await fetch('/api/repository-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          folderId: folderId,
          provider: newRepo.type,
          repoUrl: repoUrl,
          defaultBranch: newRepo.branch,
          authType: 'token',
          encryptedAccessToken: newRepo.accessToken,
          ciProvider: newRepo.type === 'gitlab' ? 'gitlab-ci' : newRepo.type === 'github' ? 'github-actions' : 'none',
          settings: settings,
          isActive: newRepo.syncEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create repository setting');
      }

      await loadRepositories();
      setNewRepo({
        name: '',
        url: '',
        syncType: 'code',
        type: 'gitlab',
        accessToken: '',
        branch: 'main',
        syncEnabled: true,
        jiraProjectKey: '',
        gitlabBaseUrl: '',
      });
      setGitlabProjects([]);
      setJiraProjects([]);
      setShowAddDialog(false);
      toast.success(t('repository.addSuccess', { name: newRepo.name }));
    } catch (error) {
      console.error('Failed to add repository:', error);
      toast.error(t('repository.addFailed'));
    }
  };

  const handleDeleteRepository = async (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo || !confirm(t('repository.confirmDelete', { name: repo.name }))) {
      return;
    }

    try {
      const response = await fetch(`/api/repository-settings?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete repository setting');
      }

      await loadRepositories();
      toast.success(t('repository.deleteSuccess', { name: repo.name }));
    } catch (error) {
      console.error('Failed to delete repository:', error);
      toast.error(t('repository.deleteFailed'));
    }
  };

  const handleToggleSync = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/repository-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isActive: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update repository setting');
      }

      await loadRepositories();
      const repo = repositories.find(r => r.id === id);
      const message = enabled ? 'repository.syncEnabled' : 'repository.syncDisabled';
      toast.success(t(message, { name: repo?.name }));
    } catch (error) {
      console.error('Failed to toggle sync:', error);
      toast.error(t('repository.updateFailed'));
    }
  };

  // 处理同步按钮点击
  const handleSyncRepository = async (repo: Repository) => {
    if (!currentProject?.id) {
      toast.error(t('repository.noProject'));
      return;
    }

    try {
      setSyncingRepoId(repo.id);
      toast.info(t('repository.syncStarting'));

      let response;

      // GitLab 同步
      if (repo.type === 'gitlab') {
        response = await fetch('/api/gitlab/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId,
            projectId: currentProject.id,
            repositoryUrl: repo.url,
            sourceBranch: repo.branch || 'main',
            gitlabConfig: {
              baseUrl: new URL(repo.url).origin,
              accessToken: repo.accessToken,
            },
          }),
        });
      }
      // Jira 同步
      else if (repo.type === 'jira') {
        // 从 settings 中读取 Jira Project Key 和 Email
        const jiraProjectKey = repo.settings?.jiraProjectKey || '';
        const jiraEmail = repo.settings?.jiraEmail || '';

        if (!jiraProjectKey) {
          toast.error(t('repository.jiraProjectKeyRequired'));
          setSyncingRepoId(null);
          return;
        }

        response = await fetch('/api/jira/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId,
            projectId: currentProject.id,
            jiraConfig: {
              baseUrl: repo.url,
              email: jiraEmail, // 使用保存的 email，如果为空后端会使用 session 中的
              apiToken: repo.accessToken,
              projectKey: jiraProjectKey,
            },
            issueType: 'Task', // 使用 Task 作为默认类型，大多数项目都有这个类型
            // priority: 'Medium', // 移除 priority，某些 Jira 项目不支持此字段
          }),
        });
      }
      // 其他类型暂不支持
      else {
        toast.info(t('repository.syncNotSupported', { type: repo.type }));
        setSyncingRepoId(null);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to sync');
      }

      // 显示同步结果
      if (result.results && result.results.length > 0) {
        // 批量同步结果
        const successCount = result.successCount || 0;
        const totalCount = result.totalCount || 0;
        const failedCount = result.failedCount || 0;

        // 显示总体结果
        if (failedCount === 0) {
          toast.success(
            t('repository.syncFolderSuccess', {
              success: successCount,
              total: totalCount,
            })
          );
        } else {
          toast.warning(
            t('repository.syncFolderPartial', {
              success: successCount,
              failed: failedCount,
              total: totalCount,
            })
          );
        }

        // 显示详细结果和链接
        console.log('\n📊 Sync Results:');
        console.log('─────────────────────────────────────────────────────');
        result.results.forEach((item: any, index: number) => {
          if (item.success) {
            const url = item.branchUrl || item.issueUrl || '';
            console.log(`✅ ${index + 1}. ${item.testCaseName}`);
            if (url) {
              console.log(`   🔗 ${url}`);
            }
            if (item.issueKey) {
              console.log(`   🎫 Issue: ${item.issueKey}`);
            }
            if (item.branchName) {
              console.log(`   🌿 Branch: ${item.branchName}`);
            }
          } else {
            console.log(`❌ ${index + 1}. ${item.testCaseName}`);
            console.log(`   ⚠️  ${item.error || item.message}`);
          }
        });
        console.log('─────────────────────────────────────────────────────\n');

        // 显示链接提示（GitLab 或 Jira）
        if (successCount > 0) {
          const successfulItems = result.results.filter((item: any) => item.success);
          if (successfulItems.length > 0) {
            const firstItem = successfulItems[0];
            const firstUrl = firstItem.branchUrl || firstItem.issueUrl;

            if (firstUrl) {
              setTimeout(() => {
                if (repo.type === 'jira') {
                  // Jira 同步成功提示
                  const firstKey = firstItem.issueKey;
                  toast.info(
                    `✅ ${t('repository.jiraSyncSuccess')} ${firstKey || ''}\n🔗 ${firstUrl}`,
                    { duration: 10000 }
                  );
                } else if (repo.type === 'gitlab') {
                  // GitLab 同步成功提示
                  const branchName = firstItem.branchName;
                  toast.info(
                    `✅ ${t('repository.gitlabSyncSuccess')} ${branchName || ''}\n🔗 ${firstUrl}`,
                    { duration: 10000 }
                  );
                }
              }, 500);
            }
          }
        }
      } else {
        // 单个测试用例同步结果
        toast.success(result.message);

        // 显示链接（GitLab 或 Jira）
        const url = result.branchUrl || result.issueUrl;
        if (url) {
          if (repo.type === 'jira' && result.issueUrl) {
            console.log(`🔗 Jira Issue created: ${result.issueUrl}`);
            setTimeout(() => {
              toast.info(
                `🔗 ${result.issueKey || 'Issue'}: ${result.issueUrl}`,
                { duration: 10000 }
              );
            }, 500);
          } else if (repo.type === 'gitlab' && result.branchUrl) {
            console.log(`🔗 GitLab Branch created: ${result.branchUrl}`);
            setTimeout(() => {
              toast.info(
                `🔗 ${result.branchName || 'Branch'}: ${result.branchUrl}`,
                { duration: 10000 }
              );
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync repository:', error);
      toast.error(
        error instanceof Error ? error.message : t('repository.syncFailed')
      );
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleEditRepository = (repo: Repository) => {
    setEditingRepo(repo);

    // 如果是 GitLab 仓库，从 URL 中提取基础 URL
    let gitlabBaseUrl = '';
    if (repo.type === 'gitlab' && repo.url) {
      try {
        const url = new URL(repo.url);
        gitlabBaseUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        console.error('Failed to parse GitLab URL:', e);
      }
    }

    setNewRepo({
      name: repo.name,
      url: repo.url,
      syncType: repo.syncType,
      type: repo.type,
      accessToken: repo.accessToken,
      branch: repo.branch || 'main',
      syncEnabled: repo.syncEnabled,
      jiraProjectKey: repo.settings?.jiraProjectKey || '',
      jiraEmail: repo.settings?.jiraEmail || session?.user?.email || '',
      gitlabBaseUrl,
    });
    setShowAddDialog(true);
  };

  const handleUpdateRepository = async () => {
    if (!editingRepo || !newRepo.name || !newRepo.url || !newRepo.accessToken) {
      toast.error(t('repository.fillAllFields'));
      return;
    }

    // Jira 类型需要验证 Project Key
    if (newRepo.type === 'jira' && !newRepo.jiraProjectKey) {
      toast.error(t('repository.jiraProjectKeyRequired'));
      return;
    }

    try {
      // 规范化 URL（确保有协议前缀）
      let repoUrl = newRepo.url.trim();
      if (newRepo.type === 'jira' && !repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
        repoUrl = `https://${repoUrl}`;
      }

      // 构建 settings 对象
      const settings: any = {
        syncType: newRepo.syncType, // 保存 syncType
      };

      if (newRepo.type === 'jira') {
        if (newRepo.jiraProjectKey) {
          settings.jiraProjectKey = newRepo.jiraProjectKey;
        }
        if (newRepo.jiraEmail) {
          settings.jiraEmail = newRepo.jiraEmail;
        }
      }

      const response = await fetch('/api/repository-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRepo.id,
          provider: newRepo.type,
          repoUrl: repoUrl,
          defaultBranch: newRepo.branch,
          authType: 'token',
          encryptedAccessToken: newRepo.accessToken,
          ciProvider: newRepo.type === 'gitlab' ? 'gitlab-ci' : newRepo.type === 'github' ? 'github-actions' : 'none',
          settings: settings,
          isActive: newRepo.syncEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update repository setting');
      }

      await loadRepositories();
      setNewRepo({
        name: '',
        url: '',
        syncType: 'code',
        type: 'gitlab',
        accessToken: '',
        branch: 'main',
        syncEnabled: true,
        jiraProjectKey: '',
        gitlabBaseUrl: '',
      });
      setGitlabProjects([]);
      setJiraProjects([]);
      setEditingRepo(null);
      setShowAddDialog(false);
      toast.success(t('repository.updateSuccess', { name: newRepo.name }));
    } catch (error) {
      console.error('Failed to update repository:', error);
      toast.error(t('repository.updateFailed'));
    }
  };



  const getRepositoryTypeIcon = (type: string) => {
    switch (type) {
      case 'gitlab':
        return <img src="/GitLab.png" alt="GitLab" className="w-6 h-6 dark:brightness-110 dark:contrast-90" />;
      case 'github':
        return <img src="/GitHub.svg" alt="GitHub" className="w-6 h-6 dark:invert dark:brightness-0 dark:contrast-100" />;
      case 'gitea':
        return '🍃'; // TODO: 需要添加 Gitea.png 图标
      case 'jira':
        return <img src="/Jira.png" alt="Jira" className="w-6 h-6 dark:brightness-110 dark:contrast-90" />;
      case 'squash':
        return <img src="/squash.jpg" alt="Squash TM" className="w-6 h-6 dark:brightness-110 dark:contrast-90" />;
      default:
        return '📁';
    }
  };

  return (
    <>
      {/* Repository Settings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('repository.settings')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                // 设置默认的 jiraEmail 为当前用户邮箱
                setNewRepo(prev => ({
                  ...prev,
                  jiraEmail: session?.user?.email || '',
                }));
                setShowAddDialog(true);
              }}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('repository.addRepository')}
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
              className="p-2"
              title={isExpanded ? t('repository.collapse') : t('repository.expand')}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {t('repository.description')}
        </p>

        {/* 展开的仓库列表 */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">{t('repository.configuredRepositories')}</h4>

            {repositories.length === 0 ? (
              <div className="text-center py-8">
                <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">{t('repository.noRepositories')}</h4>
                <p className="text-muted-foreground mb-4">
                  {t('repository.noRepositoriesDesc')}
                </p>
                <Button onClick={() => {
                  // 设置默认的 jiraEmail 为当前用户邮箱
                  setNewRepo(prev => ({
                    ...prev,
                    jiraEmail: session?.user?.email || '',
                  }));
                  setShowAddDialog(true);
                }} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('repository.addFirstRepository')}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {repositories.map((repo) => (
                  <Card key={repo.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8">{getRepositoryTypeIcon(repo.type)}</div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {repo.name}
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                {repo.syncType === 'code' ? t('repository.codeSync') : t('repository.testCaseSync')}
                              </span>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              {(repo.type === 'gitlab' || repo.type === 'github' || repo.type === 'gitea') && (
                                <>
                                  <GitBranch className="w-3 h-3" />
                                  {repo.branch}
                                </>
                              )}
                              {repo.type === 'jira' && repo.settings?.jiraProjectKey && (
                                <>
                                  <Key className="w-3 h-3" />
                                  Project: {repo.settings.jiraProjectKey}
                                </>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`sync-${repo.id}`} className="text-sm">
                              {t('repository.sync')}
                            </Label>
                            <Switch
                              id={`sync-${repo.id}`}
                              checked={repo.syncEnabled}
                              onCheckedChange={(checked) => handleToggleSync(repo.id, checked)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncRepository(repo)}
                            disabled={syncingRepoId === repo.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            title={syncingRepoId === repo.id ? t('repository.syncing') : t('repository.sync')}
                          >
                            <RotateCcw className={`w-4 h-4 ${syncingRepoId === repo.id ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRepository(repo)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            title={t('common.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRepository(repo.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm">
                        <Label className="text-muted-foreground">{t('repository.repositoryAddress')}</Label>
                        <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                          {repo.url || <span className="text-muted-foreground italic">No URL configured</span>}
                        </p>
                      </div>
                      {repo.lastSyncTime && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {t('repository.lastSync')}: {new Date(repo.lastSyncTime).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 添加仓库对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRepo ? t('repository.editRepository') : t('repository.addNewRepository')}
            </DialogTitle>
            <DialogDescription>
              {editingRepo ? t('repository.editRepositoryDesc') : t('repository.addNewRepositoryDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 同步类型选择 */}
            <div className="space-y-2">
              <Label htmlFor="sync-type">{t('repository.syncType')} *</Label>
              <Select
                value={newRepo.syncType}
                onValueChange={(value: 'code' | 'testcase') => {
                  // 根据同步类型重置仓库类型
                  const defaultType = value === 'code' ? 'gitlab' : 'jira';
                  setNewRepo({
                    ...newRepo,
                    syncType: value,
                    type: defaultType,
                    // 重置相关字段
                    branch: value === 'code' ? 'main' : '',
                    jiraProjectKey: value === 'testcase' ? '' : undefined,
                  });
                }}
              >
                <SelectTrigger id="sync-type">
                  <SelectValue placeholder={t('repository.selectSyncType')}>
                    {newRepo.syncType === 'code' ? `💻 ${t('repository.codeSync')}` : `🧪 ${t('repository.testCaseSync')}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">💻 {t('repository.codeSync')}</SelectItem>
                  <SelectItem value="testcase">🧪 {t('repository.testCaseSync')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">{t('repository.repositoryName')} *</Label>
                <Input
                  id="repo-name"
                  placeholder={t('repository.repositoryNamePlaceholder')}
                  value={newRepo.name}
                  onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repo-type">{t('repository.repositoryType')}</Label>
                <Select
                  value={newRepo.type}
                  onValueChange={(value: 'gitlab' | 'github' | 'gitea' | 'jira' | 'squash') =>
                    setNewRepo({ ...newRepo, type: value })
                  }
                >
                  <SelectTrigger id="repo-type">
                    <SelectValue>
                      {newRepo.type === 'gitlab' && (
                        <div className="flex items-center gap-2">
                          <img src="/GitLab.png" alt="GitLab" className="w-4 h-4" />
                          GitLab
                        </div>
                      )}
                      {newRepo.type === 'github' && (
                        <div className="flex items-center gap-2">
                          <img src="/GitHub.svg" alt="GitHub" className="w-4 h-4" />
                          GitHub
                        </div>
                      )}
                      {newRepo.type === 'gitea' && '🍃 Gitea'}
                      {newRepo.type === 'jira' && (
                        <div className="flex items-center gap-2">
                          <img src="/Jira.png" alt="Jira" className="w-4 h-4" />
                          Jira
                        </div>
                      )}
                      {newRepo.type === 'squash' && (
                        <div className="flex items-center gap-2">
                          <img src="/squash.jpg" alt="Squash TM" className="w-4 h-4" />
                          Squash TM
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {newRepo.syncType === 'code' ? (
                      <>
                        <SelectItem value="gitlab">
                          <div className="flex items-center gap-2">
                            <img src="/GitLab.png" alt="GitLab" className="w-4 h-4 dark:brightness-110 dark:contrast-90" />
                            GitLab
                          </div>
                        </SelectItem>
                        <SelectItem value="github">
                          <div className="flex items-center gap-2">
                            <img src="/GitHub.svg" alt="GitHub" className="w-4 h-4 dark:invert dark:brightness-0 dark:contrast-100" />
                            GitHub
                          </div>
                        </SelectItem>
                        <SelectItem value="gitea">🍃 Gitea</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="jira">
                          <div className="flex items-center gap-2">
                            <img src="/Jira.png" alt="Jira" className="w-4 h-4 dark:brightness-110 dark:contrast-90" />
                            Jira
                          </div>
                        </SelectItem>
                        <SelectItem value="squash">
                          <div className="flex items-center gap-2">
                            <img src="/squash.jpg" alt="Squash TM" className="w-4 h-4 dark:brightness-110 dark:contrast-90" />
                            Squash TM
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GitLab 项目选择器 */}
            {newRepo.type === 'gitlab' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gitlab-base-url">{t('repository.gitlabBaseUrl')} *</Label>
                  <Input
                    id="gitlab-base-url"
                    placeholder="https://git.epam.com or https://gitlab.com"
                    value={newRepo.gitlabBaseUrl}
                    onChange={(e) => setNewRepo({ ...newRepo, gitlabBaseUrl: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('repository.gitlabBaseUrlHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gitlab-token">{t('repository.accessToken')} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gitlab-token"
                      type="password"
                      placeholder={t('repository.accessTokenPlaceholder')}
                      value={newRepo.accessToken}
                      onChange={(e) => setNewRepo({ ...newRepo, accessToken: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadGitLabProjects}
                      disabled={loadingProjects || !newRepo.gitlabBaseUrl || !newRepo.accessToken}
                    >
                      {loadingProjects ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('repository.loading')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('repository.loadProjects')}
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>{t('repository.accessTokenHint')}</p>
                    <p>
                      {t('repository.accessTokenScopesRequired')}:{' '}
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        api
                      </code>
                      {' '}{t('common.or')}{' '}
                      <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        read_api
                      </code>
                    </p>
                  </div>
                </div>

                {gitlabProjects.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="gitlab-project">{t('repository.selectProject')}</Label>
                    <Select
                      value={newRepo.url}
                      onValueChange={(value) => {
                        const selectedProject = gitlabProjects.find(p => p.web_url === value);
                        if (selectedProject) {
                          setNewRepo({
                            ...newRepo,
                            url: value,
                            name: selectedProject.name,
                            branch: selectedProject.default_branch || 'main'
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('repository.selectProjectPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {gitlabProjects.map((project) => (
                          <SelectItem
                            key={project.id}
                            value={project.web_url}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1 py-1">
                              <span className="font-medium text-sm">{project.name}</span>
                              <span className="text-xs text-muted-foreground">{project.path}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('repository.projectsLoaded', { count: gitlabProjects.length })}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="repo-url">{t('repository.repositoryUrl')} *</Label>
              <Input
                id="repo-url"
                placeholder={t('repository.repositoryUrlPlaceholder')}
                value={newRepo.url}
                onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
                disabled={newRepo.type === 'gitlab' && gitlabProjects.length > 0}
              />
              {newRepo.type === 'gitlab' && (
                <p className="text-xs text-gray-500">{t('repository.gitlabUrlHint')}</p>
              )}
              {newRepo.type === 'jira' && (
                <p className="text-xs text-muted-foreground">{t('repository.jiraUrlHint')}</p>
              )}
            </div>

            {/* Jira 特殊布局：API Token 和 Load Projects 按钮在一起 */}
            {newRepo.type === 'jira' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="repo-token">{t('repository.apiToken')} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="repo-token"
                      type="password"
                      placeholder={t('repository.apiTokenPlaceholder')}
                      value={newRepo.accessToken}
                      onChange={(e) => setNewRepo({ ...newRepo, accessToken: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadJiraProjects}
                      disabled={loadingProjects || !newRepo.url || !newRepo.accessToken}
                    >
                      {loadingProjects ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('repository.loading')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('repository.loadProjects')}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('repository.jiraTokenHint')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repo-jira-email">{t('repository.jiraEmail')} *</Label>
                    <Input
                      id="repo-jira-email"
                      type="email"
                      placeholder={t('repository.jiraEmailPlaceholder')}
                      value={newRepo.jiraEmail}
                      onChange={(e) => setNewRepo({ ...newRepo, jiraEmail: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('repository.jiraEmailHint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repo-jira-project-key">{t('repository.jiraProjectKey')} *</Label>

                    {jiraProjects.length > 0 ? (
                      <Select
                        value={newRepo.jiraProjectKey}
                        onValueChange={(value) => {
                          const selectedProject = jiraProjects.find(p => p.key === value);
                          if (selectedProject) {
                            setNewRepo({
                              ...newRepo,
                              jiraProjectKey: value,
                              name: `${selectedProject.name} (Jira)`,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('repository.selectJiraProject')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {jiraProjects.map((project) => (
                            <SelectItem
                              key={project.id}
                              value={project.key}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col gap-1 py-1">
                                <span className="font-medium text-sm">{project.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Key: {project.key}
                                  {project.description && ` • ${project.description.substring(0, 50)}${project.description.length > 50 ? '...' : ''}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="repo-jira-project-key"
                        placeholder={t('repository.jiraProjectKeyPlaceholder')}
                        value={newRepo.jiraProjectKey}
                        onChange={(e) => setNewRepo({ ...newRepo, jiraProjectKey: e.target.value })}
                      />
                    )}

                    <p className="text-xs text-muted-foreground">
                      {t('repository.jiraProjectKeyHint')}
                    </p>
                    {jiraProjects.length > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {t('repository.jiraProjectsLoaded', { count: jiraProjects.length })}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 非 Jira 类型的 API Token 输入框 */}
            {newRepo.type !== 'gitlab' && newRepo.type !== 'jira' && (
              <div className="space-y-2">
                <Label htmlFor="repo-token">{t('repository.accessToken')} *</Label>
                <Input
                  id="repo-token"
                  type="password"
                  placeholder={
                    newRepo.type === 'squash'
                      ? t('repository.squashTokenPlaceholder')
                      : t('repository.accessTokenPlaceholder')
                  }
                  value={newRepo.accessToken}
                  onChange={(e) => setNewRepo({ ...newRepo, accessToken: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="repo-sync"
                checked={newRepo.syncEnabled}
                onCheckedChange={(checked) => setNewRepo({ ...newRepo, syncEnabled: checked })}
              />
              <Label htmlFor="repo-sync">{t('repository.enableAutoSync')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingRepo(null);
              setGitlabProjects([]);
              setJiraProjects([]);
              setNewRepo({
                name: '',
                url: '',
                syncType: 'code',
                type: 'gitlab',
                accessToken: '',
                branch: 'main',
                syncEnabled: true,
                jiraProjectKey: '',
                gitlabBaseUrl: '',
              });
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={editingRepo ? handleUpdateRepository : handleAddRepository}>
              {editingRepo ? t('common.update') : t('repository.addRepository')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
