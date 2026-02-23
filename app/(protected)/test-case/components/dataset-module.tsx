'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Plus, FileText, Activity, RefreshCw, Eye, Edit, Trash2, Save, X, Upload, Download } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useProject } from '@/lib/contexts/project-context';
import { SpreadsheetEditor } from '@/components/chat/sheet-editor';
import { unparse, parse } from 'papaparse';
import { toast } from 'sonner';

interface DatasetModuleProps {
  testCaseDetails: any;
}

interface Dataset {
  id: string;
  name: string;
  description?: string;
  type?: string;
  columns: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  data: Array<Record<string, any>>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DatasetModule({ testCaseDetails }: DatasetModuleProps) {
  const { t } = useI18n();
  const { currentProject } = useProject();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'csv' as 'csv' | 'api' | 'json' | 'database',
    // For CSV/JSON
    file: null as File | null,
    // For API
    apiUrl: '',
    apiHeaders: '',
    apiParams: '',
    // For Database
    jdbcUri: '',
  });
  
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // 获取数据集的函数
  const fetchDatasets = async () => {
    if (!testCaseDetails?.id || !currentProject?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/test-case/dataset?projectId=${currentProject.id}&testCaseId=${testCaseDetails.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }

      const data = await response.json();
      setDatasets(data.datasets || []);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  };

  // 当测试用例或项目变化时获取数据
  useEffect(() => {
    fetchDatasets();
  }, [testCaseDetails?.id, currentProject?.id]);

  // Calculate statistics
  const totalRecords = datasets.reduce((sum, ds) => sum + (ds.data?.length || 0), 0);
  const lastUpdated = datasets.length > 0
    ? datasets.reduce((latest, ds) => {
        const dsDate = new Date(ds.updatedAt);
        return dsDate > latest ? dsDate : latest;
      }, new Date(datasets[0].updatedAt))
    : null;

  // 处理预览数据集
  const handlePreviewDataset = (dataset: Dataset) => {
    setPreviewDataset(dataset);
    setIsPreviewOpen(true);
  };

  // Open add dialog
  const handleOpenDialog = () => {
    setEditingDataset(null);
    setFormData({
      name: '',
      description: '',
      type: 'csv',
      file: null,
      apiUrl: '',
      apiHeaders: '',
      apiParams: '',
      jdbcUri: '',
    });
    setUploadedFileName('');
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (dataset: Dataset) => {
    setEditingDataset(dataset);
    setFormData({
      name: dataset.name,
      description: dataset.description || '',
      type: (dataset.type as 'csv' | 'api' | 'json' | 'database') || 'csv',
      file: null,
      apiUrl: '',
      apiHeaders: '',
      apiParams: '',
      jdbcUri: '',
    });
    setUploadedFileName('');
    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDataset(null);
    setFormData({
      name: '',
      description: '',
      type: 'csv',
      file: null,
      apiUrl: '',
      apiHeaders: '',
      apiParams: '',
      jdbcUri: '',
    });
    setUploadedFileName('');
  };

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      
      // Validate file type based on selected type
      if (formData.type === 'csv' && fileType !== 'csv') {
        toast.error('Please upload a CSV file');
        return;
      }
      if (formData.type === 'json' && fileType !== 'json') {
        toast.error('Please upload a JSON file');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        file: file
      }));
      setUploadedFileName(file.name);
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  // Export dataset to file
  const handleExportDataset = (dataset: Dataset, format: 'csv' | 'json') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        // Convert to CSV using papaparse
        content = unparse(dataset.data);
        filename = `${dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        // Export as JSON
        content = JSON.stringify(dataset.data, null, 2);
        filename = `${dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        mimeType = 'application/json;charset=utf-8;';
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('testCase.dataset.exportSuccess', { format: format.toUpperCase() }));
    } catch (error) {
      console.error('Error exporting dataset:', error);
      toast.error(t('testCase.dataset.exportError'));
    }
  };

  // Parse JSON data into columns and data
  const parseJsonData = (jsonData: any) => {
    // Expect JSON to be an array of objects
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('Data must be an array of objects with at least one item');
    }

    // Extract columns from first object keys
    const firstRow = jsonData[0];
    const columns = Object.keys(firstRow).map(key => {
      const value = firstRow[key];
      let type: 'string' | 'number' | 'boolean' | 'date' = 'string';
      
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date || (!isNaN(Date.parse(value)))) {
        type = 'date';
      }

      return {
        name: key,
        type: type,
        description: `Column ${key}`,
      };
    });

    return {
      columns,
      data: jsonData,
    };
  };

  // Parse CSV/JSON file into columns and data
  const parseFileToDataset = async (file: File, type: 'csv' | 'json') => {
    try {
      const fileContent = await file.text();
      
      if (type === 'csv') {
        // Parse CSV using papaparse
        const result = parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        if (result.errors.length > 0) {
          console.error('CSV parse errors:', result.errors);
          throw new Error('Failed to parse CSV file');
        }

        // Extract columns from headers
        const headers = result.meta.fields || [];
        const dataRows = result.data as Array<Record<string, any>>;
        const columns = headers.map(header => {
          // Try to infer type from first row of data
          const firstValue = dataRows[0]?.[header];
          let type: 'string' | 'number' | 'boolean' | 'date' = 'string';
          
          if (typeof firstValue === 'number') {
            type = 'number';
          } else if (typeof firstValue === 'boolean') {
            type = 'boolean';
          } else if (firstValue instanceof Date || (!isNaN(Date.parse(firstValue)))) {
            type = 'date';
          }

          return {
            name: header,
            type: type,
            description: `Column ${header}`,
          };
        });

        return {
          columns,
          data: dataRows,
        };

      } else if (type === 'json') {
        // Parse JSON and reuse parseJsonData function
        const jsonData = JSON.parse(fileContent);
        return parseJsonData(jsonData);
      }

      return { columns: [], data: [] };
    } catch (error) {
      console.error('Error parsing file:', error);
      throw error;
    }
  };


  // Save dataset
  const handleSaveDataset = async () => {
    if (!formData.name.trim()) {
      toast.error('Dataset name is required');
      return;
    }

    // Validate based on type
    if ((formData.type === 'csv' || formData.type === 'json') && !formData.file && !editingDataset) {
      toast.error(`Please upload a ${formData.type.toUpperCase()} file`);
      return;
    }

    if (formData.type === 'api' && !formData.apiUrl.trim()) {
      toast.error('API URL is required');
      return;
    }

    if (formData.type === 'database' && !formData.jdbcUri.trim()) {
      toast.error('JDBC URI is required');
      return;
    }

    try {
      setSaving(true);

      // Prepare configuration, columns, and data based on type
      let configuration: any = {};
      let columns: any[] = [];
      let data: any[] = [];
      
      if (formData.type === 'csv' || formData.type === 'json') {
        if (formData.file) {
          // Parse file to extract columns and data
          try {
            const parsed = await parseFileToDataset(formData.file, formData.type);
            columns = parsed.columns;
            data = parsed.data;
            
            // Store basic file info in configuration
            configuration.fileName = formData.file.name;
            configuration.fileSize = formData.file.size;
            configuration.rowCount = data.length;
            
            toast.success(`Parsed ${data.length} rows with ${columns.length} columns`);
          } catch (parseError) {
            toast.error(parseError instanceof Error ? parseError.message : 'Failed to parse file');
            setSaving(false);
            return;
          }
        }
      } else if (formData.type === 'api') {
        // Prepare API configuration
        configuration.url = formData.apiUrl.trim();
        let headers: Record<string, string> = {};
        let params: Record<string, any> = {};
        
        if (formData.apiHeaders.trim()) {
          try {
            headers = JSON.parse(formData.apiHeaders);
            configuration.headers = headers;
          } catch (e) {
            toast.error('Invalid JSON format in headers');
            setSaving(false);
            return;
          }
        }
        if (formData.apiParams.trim()) {
          try {
            params = JSON.parse(formData.apiParams);
            configuration.params = params;
          } catch (e) {
            toast.error('Invalid JSON format in parameters');
            setSaving(false);
            return;
          }
        }

        // Fetch data from API
        try {
          toast.info('Fetching data from API...');
          
          // Build URL with query parameters
          const apiUrl = new URL(configuration.url);
          Object.keys(params).forEach(key => {
            apiUrl.searchParams.append(key, params[key]);
          });

          // Send GET request
          const apiResponse = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: headers,
          });

          if (!apiResponse.ok) {
            throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
          }

          const jsonData = await apiResponse.json();
          
          // Parse JSON data to extract columns and data
          const parsed = parseJsonData(jsonData);
          columns = parsed.columns;
          data = parsed.data;
          
          configuration.rowCount = data.length;
          toast.success(`Fetched ${data.length} rows with ${columns.length} columns from API`);
        } catch (apiError) {
          toast.error(apiError instanceof Error ? apiError.message : 'Failed to fetch data from API');
          setSaving(false);
          return;
        }
      } else if (formData.type === 'database') {
        configuration.jdbcUri = formData.jdbcUri.trim();
      }

      const response = await fetch('/api/test-case/dataset', {
        method: editingDataset ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingDataset?.id,
          testCaseId: testCaseDetails.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          type: formData.type,
          configuration: configuration,
          columns: columns,
          data: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save dataset');
      }

      toast.success(editingDataset ? 'Dataset updated successfully' : 'Dataset created successfully');
      handleCloseDialog();
      await fetchDatasets();
    } catch (error) {
      console.error('Failed to save dataset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save dataset');
    } finally {
      setSaving(false);
    }
  };

  // Delete dataset
  const handleDeleteDataset = async (datasetId: string) => {
    if (!confirm(t('testCase.dataset.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/test-case/dataset?id=${datasetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }

      toast.success('Dataset deleted successfully');
      await fetchDatasets();
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      toast.error('Failed to delete dataset');
    }
  };

  // 将数据集转换为CSV格式用于SpreadsheetEditor
  const convertDatasetToCSV = (dataset: Dataset): string => {
    if (!dataset.columns || !dataset.data) {
      return '';
    }

    // 创建表头
    const headers = dataset.columns.map(col => col.name);

    // 创建数据行
    const rows = dataset.data.map(row =>
      headers.map(header => row[header] || '')
    );

    // 合并表头和数据
    const csvData = [headers, ...rows];
    const csvString = unparse(csvData, {
      header: false,
      skipEmptyLines: false,
      delimiter: ',',
      newline: '\n'
    });

    return csvString;
  };

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
          <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('testCase.modules.dataset')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('testCase.datasetDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchDatasets}
            disabled={loading}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button 
            variant="outline" 
            className="border-cyan-200 text-cyan-600 hover:bg-cyan-50"
            onClick={handleOpenDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.addDataset')}
          </Button>
        </div>
      </div>

      {/* Dataset Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.datasets')}</span>
          </div>
          <p className="text-2xl font-bold text-cyan-600">{datasets.length}</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.records')}</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('testCase.lastUpdated')}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {lastUpdated ? new Date(lastUpdated).toLocaleDateString() + ' ' + new Date(lastUpdated).toLocaleTimeString() : t('testCase.never')}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">{t('common.loading')}</span>
        </div>
      )}

      {/* Dataset List */}
      {!loading && datasets.length > 0 && (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold">{t('testCase.datasets')}</h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {datasets.map((dataset) => (
              <div key={dataset.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                      {dataset.name}
                    </h4>
                    {dataset.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {dataset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>{dataset.columns.length} columns</span>
                      <span>{dataset.data.length} rows</span>
                      <span>Updated {new Date(dataset.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewDataset(dataset)}
                      className="h-8 px-3"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('common.preview')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditDialog(dataset)}
                      className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDataset(dataset.id)}
                      className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      dataset.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {dataset.isActive ? t('testCase.dataset.active') : t('testCase.dataset.inactive')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && datasets.length === 0 && !error && (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-12 border border-slate-200 dark:border-slate-700 text-center">
          <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">
            {t('testCase.noDatasets')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {t('testCase.noDatasetsDescription')}
          </p>
          <Button 
            variant="outline" 
            className="border-cyan-200 text-cyan-600 hover:bg-cyan-50"
            onClick={handleOpenDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('testCase.addFirstDataset')}
          </Button>
        </div>
      )}

      {/* Dataset Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[60vw] !max-w-none max-h-[80vh] overflow-hidden bg-background" style={{ width: '60vw', maxWidth: 'none' }}>
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Database className="w-5 h-5 text-primary" />
                {previewDataset?.name || 'Dataset Preview'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({previewDataset?.columns?.length || 0} columns, {previewDataset?.data?.length || 0} rows)
                </span>
              </DialogTitle>
              
              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewDataset && handleExportDataset(previewDataset, 'csv')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('testCase.dataset.exportCSV')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewDataset && handleExportDataset(previewDataset, 'json')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('testCase.dataset.exportJSON')}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-background">
            {previewDataset && (
              <div className="h-[calc(80vh-80px)] bg-background">
                {/* Spreadsheet Editor with Native Dark Mode Support */}
                <div className="h-full overflow-hidden bg-background">
                  <SpreadsheetEditor
                    content={convertDatasetToCSV(previewDataset)}
                    saveContent={() => {}} // 只读模式
                    status="complete"
                    isCurrentVersion={true}
                    currentVersionIndex={0}
                  />
                </div>

                {/* Enhanced Table Display */}
                {previewDataset.data && previewDataset.data.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Data Preview</h4>
                      <span className="text-xs text-slate-500">
                        Showing {Math.min(previewDataset.data.length, 20)} of {previewDataset.data.length} rows
                      </span>
                    </div>
                    <div className="max-h-96 overflow-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left border-r text-xs font-medium text-slate-500">#</th>
                            {previewDataset.columns?.map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left border-r font-medium">
                                <div className="flex flex-col">
                                  <span>{col.name}</span>
                                  <span className="text-xs font-normal text-slate-500">
                                    {col.type}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewDataset.data.slice(0, 20).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 border-r text-xs text-slate-500 font-mono">
                                {rowIdx + 1}
                              </td>
                              {previewDataset.columns?.map((col, colIdx) => {
                                const value = row[col.name];
                                // Convert objects/arrays to JSON string for display
                                const displayValue = value === null || value === undefined 
                                  ? null 
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value);
                                
                                return (
                                  <td key={colIdx} className="px-3 py-2 border-r max-w-xs">
                                    <div className="truncate" title={displayValue || ''}>
                                      {displayValue || <span className="text-slate-400 italic">null</span>}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dataset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDataset ? (
                <>
                  <Edit className="w-5 h-5" />
                  {t('testCase.dataset.editDataset')}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {t('testCase.addDataset')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name">{t('testCase.dataset.datasetName')} *</Label>
              <Input
                id="dataset-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('testCase.dataset.enterDatasetName')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-description">{t('testCase.dataset.description')}</Label>
              <Textarea
                id="dataset-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('testCase.dataset.enterDescription')}
                disabled={saving}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-type">{t('testCase.dataset.dataSourceType')} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={saving}
              >
                <SelectTrigger id="dataset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">{t('testCase.dataset.csvFiles')}</SelectItem>
                  <SelectItem value="api">{t('testCase.dataset.apiResponse')}</SelectItem>
                  <SelectItem value="json">{t('testCase.dataset.jsonData')}</SelectItem>
                  <SelectItem value="database">{t('testCase.dataset.database')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('testCase.dataset.selectSourceType')}
              </p>
            </div>

            {/* CSV/JSON File Upload */}
            {(formData.type === 'csv' || formData.type === 'json') && (
              <div className="space-y-2">
                <Label htmlFor="dataset-file">{t('testCase.dataset.uploadFile', { type: formData.type.toUpperCase() })} *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="dataset-file"
                    type="file"
                    accept={formData.type === 'csv' ? '.csv' : '.json'}
                    onChange={handleFileUpload}
                    disabled={saving}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => document.getElementById('dataset-file')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t('testCase.dataset.browse')}
                  </Button>
                </div>
                {uploadedFileName && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ {uploadedFileName}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('testCase.dataset.uploadFileDesc', { type: formData.type.toUpperCase() })}
                </p>
              </div>
            )}

            {/* API Configuration */}
            {formData.type === 'api' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dataset-api-url">{t('testCase.dataset.apiUrl')} *</Label>
                  <Input
                    id="dataset-api-url"
                    value={formData.apiUrl}
                    onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                    placeholder="https://api.example.com/data"
                    disabled={saving}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('testCase.dataset.enterApiUrl')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataset-api-headers">{t('testCase.dataset.headers')}</Label>
                  <Textarea
                    id="dataset-api-headers"
                    value={formData.apiHeaders}
                    onChange={(e) => handleInputChange('apiHeaders', e.target.value)}
                    placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                    disabled={saving}
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('testCase.dataset.headersDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataset-api-params">{t('testCase.dataset.queryParams')}</Label>
                  <Textarea
                    id="dataset-api-params"
                    value={formData.apiParams}
                    onChange={(e) => handleInputChange('apiParams', e.target.value)}
                    placeholder='{"page": 1, "limit": 100, "sort": "desc"}'
                    disabled={saving}
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('testCase.dataset.queryParamsDesc')}
                  </p>
                </div>
              </>
            )}

            {/* Database Configuration */}
            {formData.type === 'database' && (
              <div className="space-y-2">
                <Label htmlFor="dataset-jdbc-uri">{t('testCase.dataset.jdbcUri')} *</Label>
                <Input
                  id="dataset-jdbc-uri"
                  value={formData.jdbcUri}
                  onChange={(e) => handleInputChange('jdbcUri', e.target.value)}
                  placeholder="jdbc:postgresql://localhost:5432/dbname?user=username&password=password"
                  disabled={saving}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('testCase.dataset.enterJdbcUri')}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {t('testCase.dataset.credentialsSecure')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveDataset}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('common.saving') : editingDataset ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dataset Types */}
      {/* <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4">{t('testCase.supportedDatasetTypes')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-green-600" />
              <h4 className="font-medium text-slate-800 dark:text-slate-200">CSV Files</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('testCase.csvDescription')}</p>
          </div>

          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h4 className="font-medium text-slate-800 dark:text-slate-200">{t('testCase.jsonData')}</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('testCase.jsonDescription')}</p>
          </div>

          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-purple-600" />
              <h4 className="font-medium text-slate-800 dark:text-slate-200">{t('testCase.apiResponses')}</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('testCase.apiDescription')}</p>
          </div>

          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-orange-600" />
              <h4 className="font-medium text-slate-800 dark:text-slate-200">{t('testCase.database')}</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('testCase.databaseDescription')}</p>
          </div>
        </div>
      </div> */}
    </div>
  );
}
