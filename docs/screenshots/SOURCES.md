# 截图来源

本目录的图片用于 README 中的终端能力说明，来源可追溯且不包含凭据。

| 文件 | 来源资产 | 用途与验证边界 |
| --- | --- | --- |
| `local-terminal.png` | `tests/web-check.mjs` disposable Harness Web fixture（早期采集） | 本机 PTY 执行验收；展示的是侧栏内嵌时期的布局，当前底部停靠布局以 `docs/e2e.md` 场景为准，并由 `tests/web-check.mjs` 的终端步骤重新采集 |
| `remote-terminal.png` | PI-Desktop `docs/workbench-ssh/panels-evidence/ssh-terminal.png` | SSH 远程终端布局参考；不作为当前 DSH 运行态证明 |

当前布局的复现方式：运行 `node tests/web-check.mjs`，其终端步骤会打开底部停靠面板、
校验面板几何、执行 `printf 'terminal verified\n'` 并重写 `local-terminal.png`。

文件 SHA-256：

```text
a305ff7e2227be0780bc6d2dceac4c9c9534315313f3dce653f40f39cfbdaf50  local-terminal.png
a0c17e5b4924043b26aa126592b13ac5d10ed4782dd55e5c572ccd5b1d21720d  remote-terminal.png
```

这些资产展示的是已验证的交互目标。Terminal 插件自身的工具行为由仓库测试覆盖，
真实 PTY 连接仍需用户的本机环境和授权。
