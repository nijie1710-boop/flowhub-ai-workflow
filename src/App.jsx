import { useEffect, useMemo, useState } from 'react';
import DemoBar from './components/DemoBar.jsx';
import LegacyRuntime from './components/LegacyRuntime.jsx';
import LoginModal from './components/LoginModal.jsx';
import MobileChrome from './components/MobileChrome.jsx';
import Market from './pages/Market.jsx';
import Search from './pages/Search.jsx';
import Detail from './pages/Detail.jsx';
import Run from './pages/Run.jsx';
import Me from './pages/Me.jsx';
import Admin from './pages/Admin.jsx';
import Creator from './pages/Creator.jsx';
import Advertiser from './pages/Advertiser.jsx';
import Wizard from './pages/Wizard.jsx';
import { get, getClickStats, listWorkflows, trackWorkflowClick } from './lib/api.js';
import { clearToken, getTheme, getToken } from './lib/auth.js';
import { buildAttributedUrl } from './lib/workflowUtils.js';

const VALID_VIEWS = new Set(['market', 'search', 'detail', 'run', 'me', 'admin', 'creator', 'advertiser', 'wizard']);

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { view: 'market' };
  if (hash.startsWith('run=')) return { view: 'run', workflowId: decodeURIComponent(hash.slice(4)) };
  if (hash.startsWith('detail=')) return { view: 'detail', workflowId: decodeURIComponent(hash.slice(7)) };
  if (VALID_VIEWS.has(hash)) return { view: hash };
  return { view: 'market' };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const [workflows, setWorkflows] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const [clickStats, setClickStats] = useState(null);
  const [user, setUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', getTheme());

    listWorkflows().then(({ workflows: loaded, source }) => {
      setWorkflows(loaded);
      setDataSource(source);
    });
    getClickStats().then(setClickStats);

    const token = getToken();
    if (token) {
      get('/auth/me').then((json) => {
        if (json.ok) setUser(json.data.user);
        else clearToken();
      }).catch(() => clearToken());
    }

    const onPop = () => setRoute(parseHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigate('search');
      }
      if (event.key === 'Escape') setLoginOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentWorkflow = useMemo(
    () => route.workflowId
      ? workflows.find((workflow) => workflow.id === route.workflowId)
      : workflows[0],
    [route.workflowId, workflows]
  );

  useEffect(() => {
    const titles = {
      market: 'FlowHub · AI 工作流市场',
      search: '搜索 · FlowHub',
      detail: currentWorkflow ? `${currentWorkflow.name} · FlowHub` : '详情 · FlowHub',
      run: currentWorkflow ? `${currentWorkflow.name} · 运行中` : '运行工作流 · FlowHub',
      me: '个人中心 · FlowHub',
      admin: '管理后台 · FlowHub',
      creator: '创作者后台 · FlowHub',
      advertiser: '广告主入驻 · FlowHub',
      wizard: '接入向导 · FlowHub'
    };
    document.title = titles[route.view] || 'FlowHub';
  }, [route.view, currentWorkflow]);

  function navigate(view, params = {}) {
    const nextRoute = { view, ...params };
    setRoute(nextRoute);
    const hash = view === 'run'
      ? `#run=${encodeURIComponent(params.workflowId || currentWorkflow?.id || '')}`
      : view === 'detail'
        ? `#detail=${encodeURIComponent(params.workflowId || currentWorkflow?.id || '')}`
        : view === 'market'
          ? ''
          : `#${view}`;
    window.history.pushState(nextRoute, '', `${window.location.pathname}${hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openWorkflow(workflowId) {
    navigate('detail', { workflowId });
  }

  async function runWorkflow(workflow, meta = {}) {
    trackWorkflowClick(workflow.id, { source: meta.source || 'react_ui', search_query: meta.searchQuery || null });
    if (workflow.type === 'recommend') {
      window.open(buildAttributedUrl(workflow, user?.id), '_blank', 'noopener,noreferrer');
      setToast('已记录点击，正在打开官网');
      return;
    }
    navigate('run', { workflowId: workflow.id });
  }

  const commonProps = {
    workflows,
    dataSource,
    clickStats,
    user,
    currentWorkflow,
    route,
    onNavigate: navigate,
    onOpenWorkflow: openWorkflow,
    onRunWorkflow: runWorkflow,
    onLoginClick: () => setLoginOpen(true),
    onToast: setToast
  };

  return (
    <>
      <DemoBar view={route.view} onNavigate={navigate} user={user} onLoginClick={() => setLoginOpen(true)} />
      {route.view === 'market' && <Market {...commonProps} />}
      {route.view === 'search' && <Search {...commonProps} />}
      {route.view === 'detail' && <Detail {...commonProps} />}
      {route.view === 'run' && <Run {...commonProps} />}
      {route.view === 'me' && <Me {...commonProps} setUser={setUser} />}
      {route.view === 'admin' && <Admin {...commonProps} />}
      {route.view === 'creator' && <Creator {...commonProps} />}
      {route.view === 'advertiser' && <Advertiser {...commonProps} />}
      {route.view === 'wizard' && <Wizard {...commonProps} />}
      <MobileChrome activeView={route.view} onNavigate={navigate} onLoginClick={() => setLoginOpen(true)} />
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onAuthed={(nextUser) => {
            setUser(nextUser);
            setToast('登录成功');
          }}
        />
      )}
      <LegacyRuntime />
      <div className={`toast ${toast ? 'show' : ''}`}>
        <i className="fas fa-circle-check" />
        <span>{toast}</span>
      </div>
    </>
  );
}
