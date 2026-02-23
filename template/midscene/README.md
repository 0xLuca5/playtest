# {{testCaseName}} - Midscene Automation Test

> Generated on {{date}} for test case: {{testCaseId}}
> Description: {{testCaseDescription}}


## Preparation

create `.env` file

```shell
# replace by your gpt-4o own
OPENAI_API_KEY="YOUR_TOKEN"
```

Refer to this document if your want to use other models like Qwen: https://midscenejs.com/choose-a-model

## Install

Ensure that Node.js is installed. Install the `@midscene/cli` globally

```shell
npm i -g @midscene/cli
```

## Run

Run all scripts

> For windows, you need to replace `./` with `.\`, like `midscene .\midscene-scripts\`.

```shell
midscene ./midscene-scripts/
```

Run your specific test case

```shell
midscene ./midscene-scripts/{{testCaseFileName}}.yaml
```

Run using configuration file (recommended)

```shell
midscene --config config.yml
```

## Debug

Run your test with headed mode (i.e. you can see the browser window when running)

```shell
midscene --headed ./midscene-scripts/{{testCaseFileName}}.yaml
```

Keep the browser window open after the script finishes

```shell
midscene --keep-window ./midscene-scripts/{{testCaseFileName}}.yaml
```

# Reference

https://midscenejs.com/automate-with-scripts-in-yaml.html