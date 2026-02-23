"use client";

import { useState } from "react";
import { HelpCircle, Search, Book, MessageSquare, Video, FileText, ExternalLink, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const helpCategories = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics of using AI Run",
      icon: Book,
      articles: [
        { title: "Quick Start Guide", description: "Get up and running in 5 minutes", readTime: "5 min" },
        { title: "Creating Your First Test Case", description: "Step-by-step guide to creating test cases", readTime: "10 min" },
        { title: "Understanding the Dashboard", description: "Navigate the main dashboard effectively", readTime: "7 min" }
      ]
    },
    {
      id: "test-management",
      title: "Test Management",
      description: "Master test case creation and management",
      icon: FileText,
      articles: [
        { title: "Advanced Test Case Features", description: "Use advanced features for complex testing", readTime: "15 min" },
        { title: "Test Case Templates", description: "Create and use reusable templates", readTime: "8 min" },
        { title: "Organizing Test Suites", description: "Best practices for organizing tests", readTime: "12 min" }
      ]
    },
    {
      id: "ai-features",
      title: "AI Features",
      description: "Leverage AI to enhance your workflow",
      icon: MessageSquare,
      articles: [
        { title: "Using the AI Assistant", description: "Get help from our AI assistant", readTime: "6 min" },
        { title: "AI-Generated Test Cases", description: "Let AI help create test cases", readTime: "10 min" },
        { title: "Smart Suggestions", description: "Understanding AI recommendations", readTime: "8 min" }
      ]
    }
  ];

  const faqs = [
    {
      question: "How do I create a new test case?",
      answer: "Navigate to the Test Case section and click the 'New Test Case' button. Fill in the required fields and save your test case."
    },
    {
      question: "Can I export my test cases?",
      answer: "Yes, you can export test cases in various formats including PDF, Excel, and JSON from the export menu."
    },
    {
      question: "How does the AI assistant work?",
      answer: "The AI assistant uses advanced language models to help you create test cases, suggest improvements, and answer questions about your testing workflow."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use enterprise-grade security measures including encryption at rest and in transit, regular security audits, and compliance with industry standards."
    }
  ];

  const tutorials = [
    {
      title: "Getting Started with AI Run",
      description: "Complete walkthrough of the platform",
      duration: "15 min",
      type: "video"
    },
    {
      title: "Advanced Test Case Management",
      description: "Learn advanced features and best practices",
      duration: "20 min",
      type: "video"
    },
    {
      title: "AI Assistant Deep Dive",
      description: "Master the AI features",
      duration: "12 min",
      type: "video"
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="text-muted-foreground">
            Find answers, tutorials, and get support
          </p>
        </div>
        <Button>
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search help articles, FAQs, and tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 快速链接 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">Complete guides and references</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground">Step-by-step video guides</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">Community</h3>
                <p className="text-sm text-muted-foreground">Connect with other users</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <category.icon className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.articles.map((article, index) => (
                      <div key={index} className="flex items-start justify-between p-2 rounded hover:bg-muted cursor-pointer">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{article.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{article.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {article.readTime}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-4">
          {tutorials.map((tutorial, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-8 h-8 text-red-500" />
                    <div>
                      <h3 className="font-semibold">{tutorial.title}</h3>
                      <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{tutorial.duration}</Badge>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
