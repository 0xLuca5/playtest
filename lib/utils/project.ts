/**
 * 项目相关的工具函数
 */

/**
 * 获取当前项目ID
 * 可以在任何地方调用，包括服务端和客户端
 * @returns 当前项目ID或null
 */
export function getCurrentProjectId(): string | null {
  // 在客户端从localStorage获取
  if (typeof window !== 'undefined') {
    return localStorage.getItem('currentProjectId');
  }
  
  // 在服务端不提供默认值，返回null
  return null;
}

/**
 * 设置当前项目ID
 * @param projectId 项目ID
 */
export function setCurrentProjectId(projectId: string | null): void {
  if (typeof window !== 'undefined') {
    if (projectId) {
      localStorage.setItem('currentProjectId', projectId);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  }
}

/**
 * 获取当前项目ID，如果没有则返回默认项目ID
 * @returns 项目ID
 */
export function getCurrentProjectIdOrDefault(): string | null {
  return getCurrentProjectId();
}

/**
 * 检查是否有当前项目
 * @returns 是否有当前项目
 */
export function hasCurrentProject(): boolean {
  return getCurrentProjectId() !== null;
}

/**
 * 项目状态信息
 */
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive', 
  ARCHIVED: 'archived'
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

/**
 * 获取项目状态信息
 * @param status 项目状态
 * @returns 状态信息（包含翻译键）
 */
export function getProjectStatusInfo(status: ProjectStatus) {
  switch (status) {
    case PROJECT_STATUS.ACTIVE:
      return {
        labelKey: 'project.projectStatus.active',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        descriptionKey: 'project.projectStatus.activeDesc'
      };
    case PROJECT_STATUS.INACTIVE:
      return {
        labelKey: 'project.projectStatus.inactive',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        descriptionKey: 'project.projectStatus.inactiveDesc'
      };
    case PROJECT_STATUS.ARCHIVED:
      return {
        labelKey: 'project.projectStatus.archived',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        descriptionKey: 'project.projectStatus.archivedDesc'
      };
    default:
      return {
        labelKey: 'project.projectStatus.unknown',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        descriptionKey: 'project.projectStatus.unknownDesc'
      };
  }
}
