'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/lib/db/schema';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  refreshProjects: () => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  getCurrentProjectId: () => string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从localStorage获取当前项目ID
  const getCurrentProjectId = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentProjectId');
    }
    return null;
  };

  // 保存当前项目ID到localStorage和cookie
  const saveCurrentProjectId = (projectId: string | null) => {
    if (typeof window !== 'undefined') {
      if (projectId) {
        localStorage.setItem('currentProjectId', projectId);
        // 同时保存到cookie，以便服务器端访问
        document.cookie = `current-project=${projectId}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30天过期
        console.log('🔍 保存项目到 cookie:', projectId);
      } else {
        localStorage.removeItem('currentProjectId');
        document.cookie = 'current-project=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; // 删除cookie
        console.log('🔍 删除项目 cookie');
      }
    }
  };

  // 获取所有项目
  const fetchProjects = async (): Promise<Project[]> => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  };

  // 根据ID获取项目
  const fetchProjectById = async (projectId: string): Promise<Project | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      return data.project || null;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  };

  // 刷新项目列表
  const refreshProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 ProjectProvider - 开始刷新项目列表');

      const projectList = await fetchProjects();
      console.log('🔍 ProjectProvider - 获取到项目列表:', projectList);
      setProjects(projectList);

      // 如果没有当前项目，尝试从localStorage恢复
      const savedProjectId = getCurrentProjectId();
      console.log('🔍 ProjectProvider - 从localStorage获取的项目ID:', savedProjectId);

      if (savedProjectId) {
        const savedProject = projectList.find(p => p.id === savedProjectId);
        console.log('🔍 ProjectProvider - 找到保存的项目:', savedProject);

        if (savedProject && (!currentProject || currentProject.id !== savedProject.id)) {
          console.log('🔍 ProjectProvider - 设置当前项目为保存的项目:', savedProject.name);
          setCurrentProject(savedProject);
          // 确保也保存到 cookie
          saveCurrentProjectId(savedProject.id);
        } else if (!savedProject) {
          // 如果保存的项目不存在，清除localStorage
          console.log('🔍 ProjectProvider - 保存的项目不存在，清除localStorage');
          saveCurrentProjectId(null);
          if (projectList.length > 0 && !currentProject) {
            console.log('🔍 ProjectProvider - 设置当前项目为第一个项目:', projectList[0].name);
            setCurrentProject(projectList[0]);
            saveCurrentProjectId(projectList[0].id);
          }
        }
      } else if (projectList.length > 0 && !currentProject) {
        // 如果没有保存的项目且没有当前项目，选择第一个
        console.log('🔍 ProjectProvider - 没有保存的项目，设置当前项目为第一个:', projectList[0].name);
        setCurrentProject(projectList[0]);
        saveCurrentProjectId(projectList[0].id);
      }
    } catch (error) {
      console.error('Failed to refresh projects:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换项目
  const switchProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const project = await fetchProjectById(projectId);
      if (project) {
        setCurrentProject(project);
        saveCurrentProjectId(project.id);
        
        // 触发自定义事件，通知其他组件项目已切换
        console.log('🚀 Dispatching projectChanged event for:', project.name);
        window.dispatchEvent(new CustomEvent('projectChanged', {
          detail: { project }
        }));
      } else {
        throw new Error('Project not found');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    refreshProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听项目变化事件
  useEffect(() => {
    const handleProjectChanged = (event: CustomEvent) => {
      // 可以在这里添加额外的逻辑，比如清除缓存等
      console.log('Project changed:', event.detail.project);
    };

    window.addEventListener('projectChanged', handleProjectChanged as EventListener);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChanged as EventListener);
    };
  }, []);

  const value: ProjectContextType = {
    currentProject,
    projects,
    isLoading,
    error,
    setCurrentProject,
    refreshProjects,
    switchProject,
    getCurrentProjectId,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Hook for getting current project ID
export function useCurrentProjectId(): string | null {
  const { currentProject } = useProject();
  return currentProject?.id || null;
}

// Hook for project-aware data fetching
export function useProjectData<T>(
  fetchFn: (projectId: string) => Promise<T>,
  deps: any[] = []
) {
  const { currentProject } = useProject();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn(currentProject.id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject?.id, ...deps]);

  // 监听项目切换事件
  useEffect(() => {
    const handleProjectChanged = () => {
      fetchData();
    };

    window.addEventListener('projectChanged', handleProjectChanged);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChanged);
    };
  }, []);

  return { data, loading, error, refetch: fetchData };
}
