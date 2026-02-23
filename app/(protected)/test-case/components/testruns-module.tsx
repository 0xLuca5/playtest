'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlayCircle, Play, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, User, Calendar, Timer, AlertCircle, Eye, FileText, Activity, Zap, Monitor, MapPin } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from 'sonner';

interface TestRun {
  id: string;
  runDate: string;
  status: 'passed' | 'failed' | 'running' | 'skipped';
  duration: number;
  environment: string;
  executor: string;
  logs: string;
  screenshots: string[];
  reportUrl?: string;
  results: any[];
}

interface TestRunsModuleProps {
  testCaseDetails: any;
}

// 测试运行详细信息组件
function TestRunDetails({ run, t }: { run: TestRun; t: (key: string) => string }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'failed': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      case 'running': return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'skipped': return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default: return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const { icon: StatusIcon, color, bg } = getStatusIcon(run.status);
  const runDate = new Date(run.runDate);

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${bg} border border-slate-200`}>
            <StatusIcon className={`w-6 h-6 ${color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={run.status === 'passed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-sm"
              >
                {t(`testCase.testRuns.status.${run.status}`)}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('testCase.testRuns.executionDetails')}
            </h3>
          </div>
        </div>

        {/* 执行信息网格 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{t('testCase.testRuns.executionDate')}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {runDate.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Timer className="w-4 h-4" />
              <span>{t('testCase.testRuns.duration')}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {run.duration}s
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <User className="w-4 h-4" />
              <span>{t('testCase.testRuns.executor')}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {run.executor}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Monitor className="w-4 h-4" />
              <span>{t('testCase.testRuns.environment')}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {run.environment}
            </p>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {run.results && run.results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('testCase.testRuns.stepResults')}
          </h4>
          <div className="space-y-2">
            {run.results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded ${
                    result.status === 'passed' ? 'bg-green-100 text-green-600' :
                    result.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {result.status === 'passed' ? <CheckCircle className="w-3 h-3" /> :
                     result.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                     <AlertCircle className="w-3 h-3" />}
                  </div>
                  <span className="text-sm font-medium">Step {index + 1}</span>
                  {result.error && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {result.error}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{result.duration}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日志信息 */}
      {run.logs && (
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t('testCase.testRuns.logs')}
          </h4>
          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {run.logs}
            </pre>
          </div>
        </div>
      )}

      {/* 截图 */}
      {run.screenshots && run.screenshots.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {t('testCase.testRuns.screenshots')} ({run.screenshots.length})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {run.screenshots.map((screenshot, index) => (
              <div key={index} className="relative group">
                <img
                  src={screenshot}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => window.open(screenshot, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 报告链接 */}
      {run.reportUrl && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={() => window.open('/api' + run.reportUrl, '_blank')}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('testCase.testRuns.viewFullReport')}
          </Button>
        </div>
      )}
    </div>
  );
}

// 测试运行卡片组件
function TestRunCard({ run, t }: { run: TestRun; t: (key: string) => string }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'failed': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      case 'running': return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'skipped': return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default: return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const { icon: StatusIcon, color, bg } = getStatusIcon(run.status);
  const runDate = new Date(run.runDate);
  const isRecent = Date.now() - runDate.getTime() < 24 * 60 * 60 * 1000; // 24小时内

  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg} border border-slate-200`}>
            <StatusIcon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant={run.status === 'passed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {t(`testCase.testRuns.status.${run.status}`)}
              </Badge>
              {isRecent && (
                <Badge variant="outline" className="text-xs text-blue-600">
                  {t('testCase.testRuns.recent')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{runDate.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                <span>{run.duration}s</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{run.executor}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {run.reportUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/api' + run.reportUrl, '_blank')}
              title={t('testCase.testRuns.viewReport')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                title={t('testCase.testRuns.viewDetails')}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-[30vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {t('testCase.testRuns.executionDetails')}
                </DialogTitle>
              </DialogHeader>
              <TestRunDetails run={run} t={t} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {/* Environment */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400 min-w-[60px]">{t('testCase.testRuns.environment')}:</span>
          <Badge variant="outline" className="text-xs">
            {run.environment}
          </Badge>
        </div>

        {/* Logs Preview */}
        {run.logs && (
          <div className="space-y-1">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('testCase.testRuns.logs')}:</span>
            <div className="bg-slate-900 dark:bg-slate-800 rounded-md p-2 max-h-16 overflow-y-auto">
              <div className="text-green-400 font-mono text-xs">
                {run.logs.length > 100 ? `${run.logs.substring(0, 100)}...` : run.logs}
              </div>
            </div>
          </div>
        )}

        {/* Screenshots */}
        {run.screenshots && run.screenshots.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('testCase.testRuns.screenshots')}:</span>
            <Badge variant="outline" className="text-xs">
              {run.screenshots.length} {t('testCase.testRuns.files')}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestRunsModule({ testCaseDetails }: TestRunsModuleProps) {
  const { t } = useI18n();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载测试运行数据
  const loadTestRuns = async () => {
    if (!testCaseDetails?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-runs?testCaseId=${testCaseDetails.id}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to load test runs');
      }

      const data = await response.json();
      setTestRuns(data || []);
    } catch (err) {
      console.error('Failed to load test runs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 当测试用例变化时加载数据
  useEffect(() => {
    loadTestRuns();
  }, [testCaseDetails?.id]);

  // 计算统计信息
  const getStats = () => {
    const total = testRuns.length;
    const passed = testRuns.filter(run => run.status === 'passed').length;
    const failed = testRuns.filter(run => run.status === 'failed').length;
    const avgDuration = total > 0
      ? Math.round(testRuns.reduce((sum, run) => sum + run.duration, 0) / total)
      : 0;

    return { total, passed, failed, avgDuration };
  };

  const stats = getStats();

  // 确保组件在 testCaseDetails 更新时重新渲染
  if (!testCaseDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">
          {t('testCase.noTestCaseSelected')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <PlayCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.testRuns')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.testRunsDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTestRuns}
            disabled={loading}
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          {/* <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              if (testCaseDetails?.id) {
                window.open(`/test-case/${testCaseDetails.id}?tab=automation`, '_blank');
              }
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            {t('testCase.runTest')}
          </Button> */}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-600 dark:text-slate-400">{t('testCase.testRuns.loading')}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">
            {t('testCase.testRuns.error')}: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTestRuns}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('testCase.testRuns.retry')}
          </Button>
        </div>
      )}

      {/* Execution Statistics */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.totalRuns')}</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.passed')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.failed')}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.avgDuration')}</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{stats.avgDuration}s</p>
          </div>
        </div>
      )}

      {/* Recent Executions */}
      {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {t('testCase.recentExecutions')}
            </h3>
            {testRuns.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {testRuns.length} {t('testCase.testRuns.total')}
              </Badge>
            )}
          </div>

          {testRuns.length === 0 ? (
            <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-8 border border-slate-200 dark:border-slate-700 text-center">
              <PlayCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-md font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('testCase.noExecutionsYet')}
              </h4>
              <p className="text-slate-500 dark:text-slate-500 mb-4 text-sm">
                {t('testCase.noExecutionsDescription')}
              </p>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  if (testCaseDetails?.id) {
                    window.open(`/test-case/${testCaseDetails.id}?tab=automation`, '_blank');
                  }
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                {t('testCase.executeTestCase')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {testRuns.map((run) => (
                <TestRunCard key={run.id} run={run} t={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
