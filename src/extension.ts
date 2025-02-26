import * as vscode from "vscode";
import { exec } from "node:child_process";

interface IMessage {
  command: "showMessage" | "showErrorMessage" | "openBrowser";
  url?: string;
  text?: string;
}
const extractFeishuId = (branchName: string) => {
  const reg = /.*?[-|\/](?<id>\d+)/gm;
  let match = reg.exec(branchName);
  const id = match?.groups?.id ?? "";
  //   while ((match = reg.exec(branchName))) {
  //     const id = match.groups?.id;
  //     id !== undefined && ids.push(id);
  //   }
  return id;
};

function getBranchName(workspaceRoot: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 获取当前工作区根目录
    // const workspaceRoot = vscode.workspace.rootPath;
    if (!workspaceRoot) {
      reject(new Error("No workspace opened."));
      return;
    }
    exec(
      "git rev-parse --abbrev-ref HEAD",
      { cwd: workspaceRoot },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to get branch name: ${stderr}`));
          return;
        }
        // 去除换行符
        resolve(stdout.trim());
      }
    );
  });
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "extention.ypLink",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("No workspace folder opened.");
        return;
      }

      // todo 临时取第一个
      // 存在多个 到时候一一展示
      const branchName = await getBranchName(workspaceFolders[0].uri.fsPath);
      if (!branchName) {
        vscode.window.showErrorMessage("The branch name was not obtained");
        return;
      }

      const feishuId = extractFeishuId(branchName);

      const webviewPannel = vscode.window.createWebviewPanel(
        "branchAndFeishuidView",
        "Show Branch And FeishuId",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      webviewPannel.webview.html = getWebviewContent(branchName, feishuId);

      webviewPannel.webview.onDidReceiveMessage((message: IMessage) => {
        switch (message.command) {
          case "showMessage":
            vscode.window.showInformationMessage(message.text ?? "");
            break;
          case "showErrorMessage":
            vscode.window.showErrorMessage(message.text ?? "");
            break;
          case "openBrowser":
            if (!message.url) return;
            const url = vscode.Uri.parse(message.url);
            vscode.env.openExternal(url);
            break;
          default:
            break;
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(branchName: string, feishuId: string) {
  return `
	<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Branch Info And FeishuId</title>
  </head>
  <body>
    <p>
      <span style="padding-right: 20px">
        <strong>Branch Name:</strong> ${branchName}</span
      >
      <button id="copyBranchName">Copy Branch Name</button>
    </p>

    <p>
      <span style="padding-right: 20px">
        <strong>FeishuId:</strong>
        <span> ${feishuId}</span>
      </span>
      <button id="copyFeishuId">Copy 飞书ID</button>
    </p>

    <p>
      <button id="openFeishuProject">打开飞书项目</button>
    </p>

    <script>
      const vscode = acquireVsCodeApi();

      const branchName = "${branchName}";
      const feishuId = "${feishuId}";

      const copyBranchNamebtn = document.querySelector("#copyBranchName");
      copyBranchNamebtn.addEventListener("click", () => {
        copyText(branchName);
      });

      const copyFeishuIdSpan = document.querySelector("#copyFeishuId");
      copyFeishuIdSpan.addEventListener("click", () => {
        if (!feishuId) {
          return;
        }
        copyText(feishuId);
      });

      function copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
          vscode.postMessage({
            command: "showMessage",
            text: text + "copyied to cliboard",
          });
        });
      }

      const openFeishuProjectBtn = document.querySelector("#openFeishuProject");
      openFeishuProjectBtn.addEventListener("click", () => {
        try {
          if (!feishuId) {
            return;
          }
          vscode.postMessage({
            command: "openBrowser",
            url: "https://project.feishu.cn/yupao/story/detail/" + feishuId,
          });
        } catch (error) {
          vscode.postMessage({
            command: "showErrorMessage",
            text: error?.message || "打开浏览器错误",
          });
        }
      });
    </script>
  </body>
</html>
	`;
}
