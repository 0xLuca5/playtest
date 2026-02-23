 # Database Schema (SQLite)
 
 This document explains the purpose of each table and column in `data/sqlite.db`. The primary source of truth is the `CREATE TABLE` statements in `lib/db/script/init-db.js`.
 
 ## General conventions
 
 - **Primary keys**
   - Most tables use `id TEXT PRIMARY KEY`.
 - **Timestamps**
   - Columns named `*_at` are typically `INTEGER` Unix timestamps (the code usually uses `Date.now()`, i.e. milliseconds).
 - **JSON stored as text**
   - Some columns are semantically JSON (e.g. `settings`, `tags`, `commands`) but are stored as `TEXT` in SQLite.
 - **Foreign keys**
   - The init script enables `PRAGMA foreign_keys = ON`.
 
 ## Core: users / chats / documents
 
 ### user
 
 **Purpose**: System users (registered users and guest users). Used for authentication and data ownership.
 
 - **id**: Unique user identifier (UUID string).
 - **email**: Login email / account identifier (for guests it is usually `guest-{id}`).
 - **password**: Password hash (bcrypt). When `NULL`, the user has no password set / cannot log in with password.
 
 ### chat
 
 **Purpose**: Chat session metadata.
 
 - **id**: Chat session ID.
 - **created_at**: Creation timestamp.
 - **title**: Chat title.
 - **user_id**: Owner/creator user ID (logically references `user.id`).
 - **visibility**: Visibility (`private`/`public`), default `private`.
 
 ### message
 
 **Purpose**: Chat message details (a single message within a chat).
 
 - **id**: Message ID.
 - **chat_id**: Chat ID (logically references `chat.id`).
 - **role**: Message role (e.g. user/assistant/system).
 - **parts**: Message parts (JSON string).
 - **attachments**: Attachment metadata (JSON string).
 - **created_at**: Creation timestamp.
 
 ### vote
 
 **Purpose**: Feedback on messages (upvote/downvote).
 
 - **chat_id**: Chat ID.
 - **message_id**: Message ID.
 - **is_upvoted**: Upvote flag (`1` = upvote, `0` = downvote).
 - **PRIMARY KEY (chat_id, message_id)**: Ensures only one vote per message per chat.
 
 ### stream
 
 **Purpose**: Tracks streaming output/push events for a chat.
 
 - **id**: Stream record ID.
 - **chat_id**: Chat ID.
 - **created_at**: Creation timestamp.
 
 ### document
 
 **Purpose**: Stores documents/artifacts (text, code snippets, test artifacts, reports, etc.).
 
 - **id**: Document ID (together with `created_at` forms a composite primary key for versioning).
 - **created_at**: Document creation timestamp (multiple versions can share the same `id`).
 - **title**: Title.
 - **content**: Content (nullable).
 - **kind**: Document type (default `text`).
 - **user_id**: Creator user ID.
 - **project_id**: Associated project ID (nullable). Foreign key references `project(id)`.
 
 ### suggestion
 
 **Purpose**: Review suggestions / proposed edits for a specific `document` version.
 
 - **id**: Suggestion ID.
 - **document_id**: Target document ID.
 - **document_created_at**: Target document version timestamp.
 - **original_text**: Original text snippet.
 - **suggested_text**: Suggested replacement text.
 - **description**: Description (nullable).
 - **is_resolved**: Resolved flag (default `0`).
 - **user_id**: Author user ID.
 - **created_at**: Creation timestamp.
 
 ### chat_test_case
 
 **Purpose**: Many-to-many mapping between chats and test cases.
 
 - **id**: Mapping record ID.
 - **chat_id**: Chat ID. Foreign key references `chat(id)` with `ON DELETE CASCADE`.
 - **test_case_id**: Test case ID. Foreign key references `test_case(id)` with `ON DELETE CASCADE`.
 - **created_at**: Creation timestamp.
 
 ## Test case management
 
 ### project
 
 **Purpose**: Project-level data isolation and management (test cases belong to projects).
 
 - **id**: Project ID.
 - **name**: Project name.
 - **description**: Description (nullable).
 - **key**: Unique project key (unique constraint).
 - **status**: Project status (`active`/`inactive`/`archived`), default `active`.
 - **color**: Theme color (HEX), default `#3B82F6`.
 - **avatar**: Avatar (nullable).
 - **settings**: Project settings (JSON string), default `'{}'`.
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 - **created_by**: Creator (usually a user/system identifier).
 - **updated_by**: Last updater (usually a user/system identifier).
 
 ### repository_setting
 
 **Purpose**: Repository connection settings at the project or folder level (used for automation/CI and repo integration).
 
 - **id**: Setting ID.
 - **project_id**: Project ID. Foreign key references `project(id)`.
 - **folder_id**: Bound folder ID (nullable). Foreign key references `folder(id)`.
 - **provider**: SCM provider (default `github`).
 - **repo_url**: Repository URL.
 - **default_branch**: Default branch (default `main`).
 - **auth_type**: Auth type (default `token`).
 - **encrypted_access_token**: Encrypted access token (nullable).
 - **ssh_private_key**: SSH private key (nullable).
 - **ssh_public_key**: SSH public key (nullable).
 - **webhook_secret**: Webhook secret (nullable).
 - **ci_provider**: CI provider (default `none`).
 - **settings**: Extra settings (JSON string), default `'{}'`.
 - **is_active**: Enabled flag (default `1`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 - **created_by**: Creator.
 - **updated_by**: Last updater.
 
 ### folder
 
 **Purpose**: Folder tree used to organize test cases (supports nesting and ordering).
 
 - **id**: Folder ID.
 - **project_id**: Project ID. Foreign key references `project(id)`.
 - **name**: Folder name.
 - **description**: Description (nullable).
 - **parent_id**: Parent folder ID (nullable). Foreign key references `folder(id)` with `ON DELETE CASCADE`.
 - **path**: Full path (used for quick lookup/display).
 - **level**: Depth level (default `0`).
 - **sort_order**: Ordering index (default `0`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 - **created_by**: Creator.
 - **updated_by**: Last updater.
 
 ### test_case
 
 **Purpose**: Test case master table (basic test case information).
 
 - **id**: Test case ID.
 - **project_id**: Project ID. Foreign key references `project(id)`.
 - **folder_id**: Folder ID (nullable). Foreign key references `folder(id)` with `ON DELETE CASCADE`.
 - **name**: Test case name.
 - **description**: Description.
 - **preconditions**: Preconditions (nullable).
 - **priority**: Priority (default `medium`).
 - **status**: Status (default `draft`).
 - **weight**: Weight (default `medium`).
 - **format**: Format (default `classic`).
 - **nature**: Nature (default `functional`).
 - **type**: Type (default `functional`).
 - **tags**: Tags array (JSON string), default `'[]'`.
 - **execution_time**: Estimated execution time (nullable).
 - **last_run_at**: Last run timestamp (nullable).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 - **created_by**: Creator.
 - **updated_by**: Last updater.
 
 ### test_case_step
 
 **Purpose**: Test steps (a test case consists of multiple ordered steps).
 
 - **id**: Step ID.
 - **test_case_id**: Test case ID.
 - **step_number**: Step order number.
 - **action**: Action description.
 - **expected**: Expected result.
 - **type**: Step type (default `manual`).
 - **notes**: Notes (nullable).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### test_case_automation_config
 
 **Purpose**: Automation execution configuration (repo/branch/commands/framework/runtime environment, etc.).
 
 - **id**: Config ID.
 - **test_case_id**: Test case ID.
 - **repository**: Automation repository URL.
 - **branch**: Branch (default `main`).
 - **commands**: Command list (JSON string).
 - **parameters**: Execution parameters (JSON string), default `'{}'`.
 - **framework**: Framework (default `midscene`).
 - **browser**: Browser (default `chrome`).
 - **environment**: Environment label (default `test`).
 - **is_active**: Enabled flag (default `1`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### test_case_document
 
 **Purpose**: Links a test case to external requirements/documents/URLs.
 
 - **id**: Mapping record ID.
 - **test_case_id**: Test case ID.
 - **document_id**: External document/requirement identifier.
 - **type**: Document type.
 - **title**: Title.
 - **status**: Status.
 - **assignee**: Assignee (nullable).
 - **url**: URL (nullable).
 - **source**: Source system.
 - **source_metadata**: Source metadata (nullable).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### test_case_dataset
 
 **Purpose**: Test dataset (CSV/structured data) that can be referenced during execution.
 
 - **id**: Dataset ID.
 - **test_case_id**: Test case ID.
 - **name**: Dataset name.
 - **description**: Description (nullable).
 - **type**: Dataset type (default `csv`).
 - **configuration**: Configuration (nullable).
 - **columns**: Column definitions (JSON string).
 - **data**: The actual dataset payload (JSON/text).
 - **is_active**: Enabled flag (default `1`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### test_case_run
 
 **Purpose**: Test execution record (run result, logs, screenshots, etc.).
 
 - **id**: Run record ID.
 - **test_case_id**: Test case ID.
 - **run_date**: Run timestamp.
 - **status**: Run status.
 - **duration**: Duration (nullable).
 - **environment**: Execution environment.
 - **executor**: Executor (user/runner).
 - **results**: Step results (JSON string), default `'[]'`.
 - **error_message**: Error message (nullable).
 - **logs**: Logs (nullable).
 - **screenshots**: Screenshot list (JSON string), default `'[]'`.
 - **report_url**: Report URL (nullable).
 - **created_at**: Creation timestamp.
 
 ### test_case_issue
 
 **Purpose**: Known issues/defects associated with a test case.
 
 - **id**: Issue ID.
 - **test_case_id**: Test case ID.
 - **title**: Title.
 - **description**: Description.
 - **severity**: Severity.
 - **status**: Status (default `open`).
 - **reporter**: Reporter.
 - **assignee**: Assignee (nullable).
 - **url**: External URL (nullable).
 - **workaround**: Workaround (nullable).
 - **category**: Category (nullable).
 - **tags**: Tags (nullable).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 - **resolved_at**: Resolved timestamp (nullable).
 
 ### test_case_tag
 
 **Purpose**: Tag dictionary (reusable).
 
 - **id**: Tag ID.
 - **name**: Tag name.
 - **color**: Color (default `#3B82F6`).
 - **description**: Description (nullable).
 - **created_at**: Creation timestamp.
 - **created_by**: Creator.
 
 ### test_case_tag_relation
 
 **Purpose**: Many-to-many mapping between test cases and tags.
 
 - **test_case_id**: Test case ID.
 - **tag_id**: Tag ID.
 - **created_at**: Creation timestamp.
 - **PRIMARY KEY (test_case_id, tag_id)**: Ensures each pair is unique.
 
 ### test_case_comment
 
 **Purpose**: Test case comments/discussions (supports threaded replies and attachments).
 
 - **id**: Comment ID.
 - **test_case_id**: Test case ID.
 - **content**: Comment content.
 - **author**: Author.
 - **author_type**: Author type (default `user`).
 - **comment_type**: Comment type (nullable, default `general`).
 - **category**: Category (nullable).
 - **tags**: Tags (nullable).
 - **related_step_id**: Related step ID (nullable).
 - **attachments**: Attachments (nullable).
 - **parent_id**: Parent comment ID (nullable).
 - **is_resolved**: Resolved flag (default `0`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### test_case_history
 
 **Purpose**: Test case change history (versioned audit trail).
 
 - **id**: History record ID.
 - **test_case_id**: Test case ID.
 - **version**: Version number.
 - **change_type**: Change type.
 - **changes**: Change details (JSON/text).
 - **change_description**: Description (nullable).
 - **changed_by**: Changed by.
 - **created_at**: Creation timestamp.
 
 ## AI model configuration
 
 ### ai_provider
 
 **Purpose**: AI provider configuration (OpenAI/Qwen/xAI/proxy, etc.).
 
 - **id**: Provider ID.
 - **name**: Provider key (used in code).
 - **display_name**: Display name.
 - **description**: Description (nullable).
 - **base_url**: API base URL (nullable).
 - **api_key_required**: Whether an API key is required (default `1`).
 - **supported_features**: Supported feature list (JSON string), default `'[]'`.
 - **configuration**: Extra configuration (JSON string), default `'{}'`.
 - **is_active**: Enabled flag (default `1`).
 - **sort_order**: Sort order (default `0`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### ai_model
 
 **Purpose**: Model definitions (belonging to a provider).
 
 - **id**: Model ID.
 - **provider_id**: Provider ID. Foreign key references `ai_provider(id)`.
 - **model_key**: Model key (used in code, e.g. `gpt-4o`).
 - **display_name**: Display name.
 - **description**: Description (nullable).
 - **model_type**: Model type (`chat`/`image`/`embedding`/`reasoning`).
 - **capabilities**: Capabilities (JSON string), default `'[]'`.
 - **context_window**: Context window size (nullable).
 - **max_tokens**: Max tokens (nullable).
 - **pricing**: Pricing (JSON string), default `'{}'`.
 - **configuration**: Extra configuration (JSON string), default `'{}'`.
 - **is_active**: Enabled flag (default `1`).
 - **sort_order**: Sort order (default `0`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### ai_model_usage
 
 **Purpose**: Maps models to usage types (optionally scoped by project/user), with priority and enablement.
 
 - **id**: Mapping ID.
 - **usage_type**: Usage type (e.g. `chat-model`, `title-model`).
 - **model_id**: Model ID. Foreign key references `ai_model(id)`.
 - **project_id**: Project scope (nullable; `NULL` means global). Foreign key references `project(id)`.
 - **user_id**: User scope (nullable; `NULL` means not user-specific). Foreign key references `user(id)`.
 - **priority**: Priority (default `0`; higher means preferred).
 - **is_active**: Enabled flag (default `1`).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
 
 ### ai_api_key
 
 **Purpose**: Stores encrypted AI API keys (scoped by provider and optionally by project/user).
 
 - **id**: Record ID.
 - **provider_id**: Provider ID. Foreign key references `ai_provider(id)`.
 - **key_name**: Key name/label.
 - **encrypted_key**: Encrypted key value.
 - **project_id**: Project scope (nullable). Foreign key references `project(id)`.
 - **user_id**: User scope (nullable). Foreign key references `user(id)`.
 - **is_active**: Enabled flag (default `1`).
 - **expires_at**: Expiration timestamp (nullable).
 - **created_at**: Creation timestamp.
 - **updated_at**: Update timestamp.
