window.__ModuleLoader__.load({id: 'dsh-plugin-terminal', factory: require => {
  const React = require('react');
  const h = React.createElement;

  const STATE_KEY = 'dsh-plugin-terminal/panel';
  const MIN_HEIGHT = 140;
  const DEFAULT_HEIGHT = 300;
  const MESSAGES = {
    TERMINAL_SESSION_REQUIRED: '会话不可用，请重新打开标签页',
    TERMINAL_WORKSPACE_CHANGED: '工作区已切换，请重试',
    TERMINAL_READ_ONLY: '当前会话为只读模式',
    TERMINAL_SSH_PLUGIN_UPDATE_REQUIRED: '请更新 SSH 插件后重启服务',
    TERMINAL_REMOTE_WORKSPACE_UNAVAILABLE: '远程工作区不可用，请检查 SSH 连接',
    TERMINAL_HOST_NOT_ALLOWED: '该 SSH 主机不在允许列表内',
    TERMINAL_INVALID_SESSION: '终端会话不存在',
    TERMINAL_START_FAILED: '本机终端启动失败',
    REMOTE_TERMINAL_START_FAILED: '远程终端启动失败，请检查 SSH 配置',
    SSH_CONNECTION_NOT_FOUND: 'SSH 连接不可用',
  };
  const message = error => MESSAGES[error?.message] ?? error?.message ?? '终端请求失败';

  function readState() {
    try { return JSON.parse(window.localStorage.getItem(STATE_KEY) ?? '{}'); } catch { return {}; }
  }
  function writeState(value) {
    try { window.localStorage.setItem(STATE_KEY, JSON.stringify(value)); } catch { /* storage is optional */ }
  }

  const TERMINAL_STYLE = `
    .dsh-term{--term-line:var(--dsw-alias-border-l3,#e7e7e7);--term-muted:var(--dsw-alias-label-secondary,#777);--term-hover:var(--dsw-alias-interactive-bg-hover,#eee);display:flex;flex-direction:column;min-width:0;color:var(--dsw-alias-label-primary,#292929);background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--term-line);border-radius:10px;overflow:hidden;letter-spacing:0}
    .dsh-term *{box-sizing:border-box;letter-spacing:0}
    .dsh-term-bar{display:flex;align-items:center;gap:6px;min-height:34px;padding:3px 6px;flex:none;border-bottom:1px solid transparent}
    .dsh-term.is-open .dsh-term-bar{border-bottom-color:var(--term-line)}
    .dsh-term-tabs{display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
    .dsh-term-tabs::-webkit-scrollbar{display:none}
    .dsh-term .dsh-term-tab{display:inline-flex;align-items:center;gap:6px;max-width:190px;height:26px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:var(--term-muted);font:12px/1 system-ui;cursor:pointer;white-space:nowrap}
    .dsh-term-tab.is-active{background:var(--term-hover);color:var(--dsw-alias-label-primary,#292929)}
    .dsh-term-tab.is-running::before{content:'';width:6px;height:6px;flex:none;border-radius:50%;background:#38965e}
    .dsh-term-tab.is-exited::before{content:'';width:6px;height:6px;flex:none;border-radius:50%;background:#c9c9c9}
    .dsh-term-tab-label{overflow:hidden;text-overflow:ellipsis}
    .dsh-term .dsh-term-action{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;padding:0;border:0;border-radius:7px;background:transparent;color:var(--term-muted);font:14px/1 system-ui;cursor:pointer}
    .dsh-term .dsh-term-action:hover:not(:disabled){background:var(--term-hover);color:var(--dsw-alias-label-primary,#292929)}
    .dsh-term .dsh-term-action:disabled{opacity:.4;cursor:default}
    .dsh-term-target{height:26px;max-width:150px;flex:none;padding:0 4px;border:0;border-radius:7px;background:transparent;color:var(--term-muted);font:12px system-ui;cursor:pointer}
    .dsh-term-body{display:flex;flex-direction:column;flex:1;min-height:0;position:relative}
    .dsh-term-view{flex:1;min-height:0;padding:8px 10px;overflow:hidden}
    .dsh-term-view .xterm{height:100%}
    .dsh-term-view .xterm-viewport{overflow-y:auto!important}
    .dsh-term-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--term-muted);font:12px system-ui}
    .dsh-term-status{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;min-height:22px;padding:2px 10px;border-top:1px solid var(--term-line);color:var(--term-muted);font:11px system-ui}
    .dsh-term-status span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dsh-term-grip{height:5px;flex:none;cursor:ns-resize;background:transparent}
    .dsh-term.is-open .dsh-term-grip:hover{background:var(--term-hover)}
  `;

  function themeFor(element) {
    const css = getComputedStyle(element);
    const background = css.getPropertyValue('--dsw-alias-bg-base').trim() || '#ffffff';
    const foreground = css.getPropertyValue('--dsw-alias-label-primary').trim() || '#292929';
    return {background, foreground, cursor: foreground, selectionBackground: '#739ac540', green: '#38965e', brightGreen: '#58b77f'};
  }

  let asset;
  /** xterm is one Host-served asset; both halves load once per page. */
  function loadAsset() {
    return asset ??= Promise.all([
      fetch('/api/dsh-terminal/panel.js').then(response => {
        if (!response.ok) throw new Error('TERMINAL_ASSET_FAILED');
        return response.text();
      }).then(async source => {
        const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
        try { return await import(url); } finally {URL.revokeObjectURL(url);}
      }),
      fetch('/api/dsh-terminal/panel.css').then(response => response.ok ? response.text() : '')
        .then(css => {
          const style = document.createElement('style');
          style.dataset.plugin = 'dsh-plugin-terminal/xterm';
          style.textContent = css;
          document.head.appendChild(style);
        }),
    ]).then(([module]) => module).catch(error => { asset = null; throw error; });
  }

  /** Move an element to the end of its parent so the active terminal paints on top. */
  function raise(node) {
    if (node?.parentElement) node.parentElement.appendChild(node);
  }

  function Panel({sessionId, useStore}) {
    const stored = React.useMemo(() => readState()[sessionId] ?? {}, [sessionId]);
    const [open, setOpen] = React.useState(stored.open === true);
    const [height, setHeight] = React.useState(Number.isFinite(stored.height) ? stored.height : DEFAULT_HEIGHT);
    const [target, setTarget] = React.useState(stored.target ?? 'local');
    const [connections, setConnections] = React.useState([]);
    const [sessions, setSessions] = React.useState([]);
    const [active, setActive] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const expanded = useStore?.(snapshot => snapshot.bySession?.[sessionId]?.layout?.expanded ?? false) ?? false;
    const view = React.useRef(null);
    const terminals = React.useRef(new Map());
    const alive = React.useRef(null);
    const workspace = React.useRef(null);
    const opening = React.useRef(false);

    const remember = React.useCallback(patch => {
      const next = {...readState(), [sessionId]: {...(readState()[sessionId] ?? {}), ...patch}};
      writeState(next);
    }, [sessionId]);

    const call = React.useCallback(async (args, signal) => {
      const response = await fetch('/api/dsh-terminal', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId, workspaceKey: workspace.current?.key, ...args}),
        signal,
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? 'TERMINAL_REQUEST_FAILED');
      return value;
    }, [sessionId]);

    const report = React.useCallback(error => setStatus(message(error)), []);

    // One owner for the panel lifetime: workspace facts, targets, session list.
    React.useEffect(() => {
      const controller = new AbortController();
      alive.current = controller;
      let timer;
      const poll = async () => {
        try {
          const [facts, listed] = await Promise.all([
            call({action: 'workspace'}, controller.signal),
            call({action: 'listTerminals'}, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          workspace.current = facts;
          setSessions(listed);
          setActive(old => listed.some(item => item.sessionId === old) ? old : listed[0]?.sessionId ?? '');
        } catch (error) {
          if (!controller.signal.aborted) report(error);
        }
        if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
      };
      void poll();
      call({action: 'connections'}, controller.signal).then(value => {
        if (!controller.signal.aborted) setConnections(value.connections ?? []);
      }).catch(() => {});
      return () => {controller.abort(); clearTimeout(timer);};
    }, [call, report]);

    // Attach xterm for the active terminal and pump its output stream.
    React.useEffect(() => {
      if (!open || !active) return undefined;
      const controller = new AbortController();
      const send = (args, signal) => call({terminalId: active, ...args}, signal);
      let timer;
      const attach = async () => {
        try {
          const module = await loadAsset();
          if (controller.signal.aborted || !view.current) return;
          let entry = terminals.current.get(active);
          if (!entry) {
            const terminal = new module.Terminal({
              cursorBlink: true,
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              scrollback: 5000,
              screenReaderMode: true,
              theme: themeFor(view.current),
            });
            const fitAddon = new module.FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.open(view.current);
            terminal.textarea?.setAttribute('aria-label', '终端输入');
            terminal.attachCustomKeyEventHandler(event => {
              if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return true;
              if (event.key === 'C' || event.key === 'c') {
                const selection = terminal.getSelection();
                if (selection) { void navigator.clipboard?.writeText(selection); return false; }
              }
              if (event.key === 'V' || event.key === 'v') {
                void navigator.clipboard?.readText().then(text => text && terminal.paste(text)).catch(() => {});
                return false;
              }
              return true;
            });
            entry = {terminal, fit: fitAddon, cursor: 0, pumped: false, observer: undefined, themeObserver: undefined};
            terminals.current.set(active, entry);
            terminal.onData(text => {
              if (workspace.current?.readOnly) return;
              void send({action: 'writeTerminal', text}, controller.signal).catch(report);
            });
            entry.themeObserver = new MutationObserver(() => {terminal.options.theme = themeFor(view.current);});
            entry.themeObserver.observe(document.documentElement, {attributes: true});
          }
          raise(entry.terminal.element);
          entry.terminal.focus();
          entry.cursor = 0;
          entry.pumped = false;
          const fit = () => {
            if (!view.current?.clientWidth || !view.current?.clientHeight) return;
            entry.fit.fit();
            if (!entry.pumped || workspace.current?.readOnly) return;
            void send({action: 'resizeTerminal', cols: entry.terminal.cols, rows: entry.terminal.rows}, controller.signal).catch(() => {});
          };
          entry.observer?.disconnect();
          entry.observer = new ResizeObserver(fit);
          entry.observer.observe(view.current);
          const pump = async () => {
            try {
              const result = await send({action: 'readTerminal', cursor: entry.cursor}, controller.signal);
              if (controller.signal.aborted) return;
              if (result.reset) entry.terminal.reset();
              entry.cursor = result.cursor;
              entry.pumped = true;
              if (result.text) await new Promise(resolve => entry.terminal.write(result.text, resolve));
              if (result.status?.kind === 'exited') { setStatus('终端已退出'); return; }
            } catch (error) {
              if (!controller.signal.aborted) report(error);
            }
            if (!controller.signal.aborted) timer = setTimeout(pump, 120);
          };
          fit();
          void pump();
        } catch (error) {
          if (!controller.signal.aborted) report(error);
        }
      };
      void attach();
      return () => {
        controller.abort();
        clearTimeout(timer);
        for (const entry of terminals.current.values()) {
          entry.observer?.disconnect();
          entry.observer = undefined;
        }
      };
    }, [open, active, call, report]);

    // Terminal instances outlive tab switches; the panel disposes them.
    React.useEffect(() => () => {
      for (const entry of terminals.current.values()) {
        entry.observer?.disconnect();
        entry.themeObserver?.disconnect();
        entry.terminal.dispose();
      }
      terminals.current.clear();
    }, []);

    const perform = async args => {
      if (busy) return;
      setBusy(true); setStatus('');
      try {
        const result = await call(args, alive.current?.signal);
        if (args.action === 'openTerminal') {
          setSessions(old => [...old, result]);
          setActive(result.sessionId);
          setOpen(true);
          remember({open: true});
        } else if (args.action === 'closeTerminal') {
          setSessions(old => old.filter(item => item.sessionId !== active));
          setActive('');
        } else if (args.action === 'signalTerminal') {
          setStatus('已发送中断信号');
        }
      } catch (error) {
        if (!alive.current?.signal.aborted) report(error);
      } finally {
        if (!alive.current?.signal.aborted) setBusy(false);
      }
    };

    // The panel stays collapsed until a terminal exists; creating one is the
    // explicit request to see it.
    const create = () => {
      toggle(true);
      if (opening.current) return;
      opening.current = true;
      void perform(target === 'local' ? {action: 'openTerminal'} : {action: 'openTerminal', connectionId: target})
        .finally(() => {opening.current = false;});
    };

    const toggle = next => {
      setOpen(old => {
        const value = next === undefined ? !old : next;
        remember({open: value});
        return value;
      });
    };

    const startResize = event => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = height;
      const move = moveEvent => {
        setHeight(Math.max(MIN_HEIGHT, Math.min(startHeight + (startY - moveEvent.clientY), window.innerHeight - 220)));
      };
      const finish = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', finish);
        setHeight(current => {remember({height: current}); return current;});
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', finish);
    };

    if (expanded) return null;
    const readOnly = workspace.current?.readOnly === true;
    const unavailable = workspace.current !== null && !workspace.current.root;
    const tabLabel = item => item.host === 'localhost' ? '本机' : (connections.find(connection => connection.id === item.connectionId)?.name ?? item.host);
    const current = sessions.find(item => item.sessionId === active);
    const button = (label, title, disabled, onClick, extra = {}) => h('button', {
      type: 'button', className: 'dsh-term-action', 'aria-label': title, title, disabled, onClick, ...extra,
    }, label);

    return h('section', {className: `dsh-term${open ? ' is-open' : ''}`, 'data-dsh-terminal': true, style: open ? {height} : undefined},
      h('div', {className: 'dsh-term-bar'},
        h('div', {className: 'dsh-term-tabs'},
          sessions.map(item => h('button', {
            key: item.sessionId, type: 'button',
            className: `dsh-term-tab${item.sessionId === active ? ' is-active' : ''}${item.status?.kind === 'exited' ? ' is-exited' : ' is-running'}`,
            title: `${item.host}${item.cwd ? ` · ${item.cwd}` : ''} · 点击切换，再次点击收起`,
            onClick: () => {
              if (item.sessionId === active) toggle();
              else {setActive(item.sessionId); setOpen(true); remember({open: true});}
            },
          }, h('span', {className: 'dsh-term-tab-label'}, tabLabel(item)))),
          !sessions.length && h('span', {style: {color: 'var(--term-muted)', font: '12px system-ui', paddingLeft: 6}}, '终端')),
        h('select', {
          className: 'dsh-term-target', 'aria-label': '新建终端的目标', value: target, disabled: busy || readOnly,
          title: '新建终端时使用的目标',
          onChange: event => {setTarget(event.target.value); remember({target: event.target.value});},
        }, h('option', {value: 'local'}, '本机'),
          connections.map(connection => h('option', {key: connection.id, value: connection.id}, `SSH · ${connection.name}`))),
        button('+', '新建终端', busy || readOnly || unavailable, create),
        button('⎋', '中断前台命令 (Ctrl+C)', busy || readOnly || !active, () => void perform({action: 'signalTerminal', signal: 'SIGINT'})),
        button('×', '关闭当前终端', busy || readOnly || !active, () => void perform({action: 'closeTerminal'})),
        button(open ? '⌄' : '⌃', open ? '收起终端' : '展开终端', false, () => toggle())),
      open && h('div', {className: 'dsh-term-grip', role: 'separator', 'aria-label': '调整终端高度', onPointerDown: startResize}),
      open && h('div', {className: 'dsh-term-body'},
        h('div', {className: 'dsh-term-view', ref: view, 'aria-label': '终端输出'}),
        !active && h('div', {className: 'dsh-term-empty'}, unavailable ? '当前工作区不可用' : '点击 + 新建终端')),
      h('div', {className: 'dsh-term-status'},
        h('span', null, status || current?.cwd || (readOnly ? '只读模式' : '')),
        h('span', null, readOnly ? '只读' : active ? '已连接' : '未连接')));
  }

  function apply(ctx) {
    ctx.effect(() => {
      const style = document.createElement('style');
      style.dataset.plugin = 'dsh-plugin-terminal';
      style.textContent = TERMINAL_STYLE;
      document.head.appendChild(style);
      return () => style.remove();
    });
    ctx.effect(() => ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
      name: 'conversation.composer.dock',
      id: 'dsh-plugin-terminal/panel',
      order: 20,
    }, Panel)));
  }

  return {name: 'dsh-plugin-terminal', inject: ['slots'], apply};
}});
