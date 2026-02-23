"use client";

import { useState } from "react";
import { Trash2, RotateCcw, X, Search, FileText, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TrashPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trashedItems, setTrashedItems] = useState([
    {
      id: 1,
      title: "Old Test Case: Login Flow",
      type: "test-case",
      deletedDate: "2024-01-10",
      deletedBy: "John Doe",
      originalLocation: "/test-cases/login",
      description: "Outdated test case for user login functionality"
    },
    {
      id: 2,
      title: "Draft Document: API Changes",
      type: "document",
      deletedDate: "2024-01-08",
      deletedBy: "Jane Smith",
      originalLocation: "/documents/api",
      description: "Draft document about API changes that were not implemented"
    },
    {
      id: 3,
      title: "Chat Session: Bug Discussion",
      type: "chat",
      deletedDate: "2024-01-05",
      deletedBy: "Mike Johnson",
      originalLocation: "/chat/sessions",
      description: "Chat session about a bug that was resolved"
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test-case':
        return <FileText className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'test-case':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'chat':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRestore = (id: number) => {
    setTrashedItems(items => items.filter(item => item.id !== id));
    // 这里可以添加实际的恢复逻辑
    console.log(`Restoring item ${id}`);
  };

  const handlePermanentDelete = (id: number) => {
    setTrashedItems(items => items.filter(item => item.id !== id));
    // 这里可以添加实际的永久删除逻辑
    console.log(`Permanently deleting item ${id}`);
  };

  const handleEmptyTrash = () => {
    setTrashedItems([]);
    // 这里可以添加实际的清空回收站逻辑
    console.log("Emptying trash");
  };

  const filteredItems = trashedItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
          <p className="text-muted-foreground">
            Manage deleted items and restore them if needed
          </p>
        </div>
        {trashedItems.length > 0 && (
          <Button variant="destructive" onClick={handleEmptyTrash}>
            <Trash2 className="w-4 h-4 mr-2" />
            Empty Trash
          </Button>
        )}
      </div>

      {/* 警告信息 */}
      <Alert>
        <Trash2 className="h-4 w-4" />
        <AlertDescription>
          Items in trash will be permanently deleted after 30 days. You can restore them before then.
        </AlertDescription>
      </Alert>

      {/* 搜索栏 */}
      {trashedItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search in trash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 回收站统计 */}
      {trashedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{trashedItems.length}</p>
                </div>
                <Trash2 className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Test Cases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {trashedItems.filter(item => item.type === 'test-case').length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Documents</p>
                  <p className="text-2xl font-bold text-green-600">
                    {trashedItems.filter(item => item.type === 'document').length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 回收站项目列表 */}
      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Deleted Items</h2>
            <span className="text-sm text-muted-foreground">
              {filteredItems.length} items
            </span>
          </div>

          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(item.type)}
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Badge className={getTypeColor(item.type)}>
                      {item.type.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePermanentDelete(item.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Deleted on {item.deletedDate}
                  </span>
                  <span>by {item.deletedBy}</span>
                  <span>from {item.originalLocation}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* 空状态 */
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {trashedItems.length === 0 ? "Trash is empty" : "No items found"}
              </h3>
              <p className="text-muted-foreground">
                {trashedItems.length === 0 
                  ? "Deleted items will appear here"
                  : "Try adjusting your search terms"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
