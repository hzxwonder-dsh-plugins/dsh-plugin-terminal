# 截图来源

本目录的图片用于 README 中的终端能力说明，来源可追溯且不包含凭据。

| 文件 | 来源资产 | 用途与验证边界 |
| --- | --- | --- |
| `local-terminal.png` | `tests/web-check.mjs` disposable Harness Web fixture | 当前 DSH Web 本机 PTY 执行验收 |
| `remote-terminal.png` | PI-Desktop `docs/workbench-ssh/panels-evidence/ssh-terminal.png` | SSH 远程终端布局参考；不作为当前 DSH 运行态证明 |

文件 SHA-256：

```text
8d77dc9492062af12ba936a0f9e6169b428d189becae5c714e7b3af111710847  local-terminal.png
a0c17e5b4924043b26aa126592b13ac5d10ed4782dd55e5c572ccd5b1d21720d  remote-terminal.png
```

这些资产展示的是 PI-Desktop 的已验证交互目标。Terminal 插件自身的工具行为由仓库测试覆盖，真实 PTY 连接仍需用户的本机环境和授权。
