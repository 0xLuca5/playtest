import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { createTestCaseTool, updateTestCaseTool } from './ai/tools/testcase-tools';
import type { executeTestCaseAutomation } from './ai/tools/testcase-automation';
import type { getConfluencePageTool, searchConfluencePagesTool } from './ai/tools/confluence-tools';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/chat/artifact';
import type { Suggestion } from './db/schema';
import { MidsceneReportType, TestCaseArtifactType } from '@/artifacts/types';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type createTestCaseTool = InferUITool<ReturnType<typeof createTestCaseTool>>;
type updateTestCaseTool = InferUITool<ReturnType<typeof updateTestCaseTool>>;
type executeTestCaseAutomationTool = InferUITool<ReturnType<typeof executeTestCaseAutomation>>;
type getConfluencePageToolType = InferUITool<ReturnType<typeof getConfluencePageTool>>;
type searchConfluencePagesToolType = InferUITool<ReturnType<typeof searchConfluencePagesTool>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  createTestCase: createTestCaseTool;
  updateTestCase: updateTestCaseTool;
  executeTestCaseAutomation: executeTestCaseAutomationTool;
  getConfluencePage: getConfluencePageToolType;
  searchConfluencePages: searchConfluencePagesToolType;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  'test-case-delta': any; // 添加 test-case-delta 类型
  'midscene-delta': any; // 添加 midscene-delta 类型
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'document-reference'; title: string; document_id: string }
  | { type: MidsceneReportType; title: string; document_id: string }
  | { type: TestCaseArtifactType; title: string; document_id: string }
  | { type: 'tool-invocation'; toolInvocation: {
      toolName: string;
      toolCallId: string;
      state: string;
      result: any;
      args?: any;
    }};