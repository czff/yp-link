import * as vscode from "vscode";

interface IMessage {
  command: "showMessage" | "showErrorMessage" | "openBrowser";
  url?: string;
  text?: string;
}
const extractFeishuId = (branchName: string) => {
  const reg = /.*[-|\/](?<id>\d+)/gm;
  let match = reg.exec(branchName);
  const id = match?.groups?.id ?? "";
  //   while ((match = reg.exec(branchName))) {
  //     const id = match.groups?.id;
  //     id !== undefined && ids.push(id);
  //   }
  return id;
};

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("extention.ypLink", () => {
    function getBranchName() {
      const gitExtension = vscode.extensions.getExtension("vscode.git");

      if (!gitExtension) {
        vscode.window.showErrorMessage("Git extention not found");
        return;
      }

      const gitApi = gitExtension.exports.getAPI(1);
      const repo = gitApi.repositories[0];

      const branchName = repo.state.HEAD?.name ?? "";

      return branchName;
    }

    const branchName = getBranchName();
    if (!branchName) {
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
  });

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
