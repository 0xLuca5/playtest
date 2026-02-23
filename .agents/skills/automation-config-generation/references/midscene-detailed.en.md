🚨🚨🚨 CRITICAL: MUST RETURN VALID JSON OBJECT 🚨🚨🚨
DO NOT return an array! DO NOT return malformed JSON!

EXAMPLE OF CORRECT RESPONSE:
{
  "success": true,
  "config": {
    "name": "Amazon Test",
    "framework": "midscene",
    "description": "Test description",
    "yamlContent": "web:\n  url: https://amazon.com\n  viewportWidth: 1280\n  viewportHeight: 960\n\ntasks:\n  - name: First task\n    flow:\n      - ai: Do something\n      - logScreenshot: Screenshot\n        content: First task"
  }
}

🚨 FORBIDDEN: DO NOT USE \u00a0, \u000a, or any Unicode escapes! 🚨
✅ REQUIRED: Use \n for line breaks and regular spaces for indentation!

🚨 CRITICAL: RETURN VALID JSON OBJECT 🚨
You MUST return a valid JSON object with this exact structure:
{
  "success": true,
  "config": {
    "name": "string",
    "framework": "midscene",
    "description": "string",
    "yamlContent": "string with \n for line breaks"
  }
}

🔥 YAML FORMAT RULES 🔥：
- NEVER use \u00a0, \u000a, \u0020 or ANY Unicode escapes!
- ONLY use \n for line breaks and regular spaces for indentation
- Tasks MUST be indented: "  - name:" (2 spaces + dash + space)
- Flow MUST be indented 4 spaces
- Flow items MUST be indented 6 spaces
- Attributes MUST be indented 8 spaces

🚨 WRONG: "web:\u00a0url: https://example.com"
✅ RIGHT: "web:\n  url: https://example.com"

The .yaml file structure is as follows:
In the .yaml file, there are two parts: web/android and tasks.
The web/android part defines basic task information. For browser automation, use the web parameter (formerly target), and for Android device automation, use the android parameter. These two are mutually exclusive.

#web section
```yaml
web:
  # URL to access, required. If `serve` parameter is provided, provide relative path
  url: <url>
  # Start a static service under local path, optional
  serve: <root-directory>
  # Browser UA, optional
  userAgent: <ua>
  # Browser viewport width, optional, default 1280
  viewportWidth: <width>
  # Browser viewport height, optional, default 960
  viewportHeight: <height>
  # Browser device pixel ratio, optional, default 1
  deviceScaleFactor: <scale>
  # JSON format browser Cookie file path, optional
  cookie: <path-to-cookie-file>
  # Network idle waiting strategy, optional
  waitForNetworkIdle:
    # Wait timeout time, optional, default 2000ms
    timeout: <ms>
    # Whether to continue after timeout, optional, default true
    continueOnNetworkIdleError: <boolean>
  # JSON file path for aiQuery/aiAssert results output, optional
  output: <path-to-output-file>
  # Whether to save log content to JSON file, optional, default false
  unstableLogContent: <boolean | path-to-unstable-log-file>
  # Whether to restrict page opening in current tab, optional, default true
  forceSameTabNavigation: <boolean>
  # Bridge mode, optional, default false
  bridgeMode: false | 'newTabWithUrl' | 'currentTab'
  # Whether to close newly created tabs when bridge disconnects, optional, default false
  closeNewTabsAfterDisconnect: <boolean>
  # Whether to ignore HTTPS certificate errors, optional, default false
  acceptInsecureCerts: <boolean>
  # Background knowledge sent to AI model when calling aiAction, optional
  aiActionContext: <string>
```

# android section
```yaml
android:
  # Device ID, optional, default uses first connected device
  deviceId: <device-id>
  # Launch URL, optional, default uses device current page
  launch: <url>
```

# tasks section
The tasks section is an array that defines the steps for script execution. Remember to add - symbol before each step to indicate these steps are an array.
