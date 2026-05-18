import { useMemo, useState } from 'react';
import { runDocumentMarkdown, runFitnessMeal, runImageOcr, runWebpageMarkdown, trackWorkflowClick } from '../lib/api.js';

function ToolResult({ result }) {
  if (!result) {
    return (
      <div className="runner-empty">
        <div><i className="fas fa-wand-magic-sparkles" />等待生成结果</div>
      </div>
    );
  }
  return (
    <div className="ps-result-block">
      <h5>{result.title || '运行结果'}</h5>
      {result.per_serving && (
        <div className="meal-macro-grid">
          <div><span>每份热量</span><strong>{result.per_serving.kcal}</strong><small>kcal</small></div>
          <div><span>蛋白质</span><strong>{result.per_serving.protein}</strong><small>g</small></div>
          <div><span>碳水</span><strong>{result.per_serving.carbs}</strong><small>g</small></div>
          <div><span>脂肪</span><strong>{result.per_serving.fat}</strong><small>g</small></div>
        </div>
      )}
      {Array.isArray(result.steps) && (
        <>
          <h5>怎么做这份菜谱</h5>
          <ol className="meal-steps">{result.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </>
      )}
      {result.text && <pre className="tool-markdown">{result.text}</pre>}
      {result.markdown && (
        <details className="meal-markdown-details" open>
          <summary>Markdown 原文</summary>
          <pre className="tool-markdown">{result.markdown}</pre>
        </details>
      )}
    </div>
  );
}

function FitnessMealRunner({ workflow, onToast }) {
  const [ingredients, setIngredients] = useState('鸡胸肉 200g\n米饭 150g\n西兰花 100g\n鸡蛋 2个');
  const [goal, setGoal] = useState('fat_loss');
  const [mealType, setMealType] = useState('dinner');
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    trackWorkflowClick(workflow.id, { source: 'react_runner' });
    try {
      const json = await runFitnessMeal({ ingredients, goal, meal_type: mealType, servings });
      if (!json.ok) throw new Error(json.error?.message || '生成失败');
      setResult(json.data);
      onToast('健身餐菜谱已生成');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="runner-grid">
      <section className="runner-panel">
        <label>现有食材</label>
        <textarea value={ingredients} onChange={(event) => setIngredients(event.target.value)} rows={9} />
        <label>目标</label>
        <select value={goal} onChange={(event) => setGoal(event.target.value)}>
          <option value="fat_loss">减脂</option>
          <option value="muscle_gain">增肌</option>
          <option value="balanced">均衡</option>
        </select>
        <label>餐次</label>
        <select value={mealType} onChange={(event) => setMealType(event.target.value)}>
          <option value="dinner">晚餐</option>
          <option value="lunch">午餐</option>
          <option value="breakfast">早餐</option>
          <option value="snack">加餐</option>
        </select>
        <label>份数</label>
        <input type="number" min="1" max="8" value={servings} onChange={(event) => setServings(event.target.value)} />
        <button className="try-btn primary" onClick={run} disabled={loading}>{loading ? '生成中...' : '生成菜谱'}</button>
      </section>
      <section className="runner-output">
        {error && <div className="tool-error">{error}</div>}
        <ToolResult result={result} />
      </section>
    </div>
  );
}

function FileRunner({ workflow, type, onToast }) {
  const [file, setFile] = useState(null);
  const [lang, setLang] = useState('chi_sim+eng');
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function selectFile(event) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setResult(null);
    setError('');
    if (nextFile && type === 'ocr') {
      setPreview(URL.createObjectURL(nextFile));
    } else {
      setPreview('');
    }
  }

  async function run() {
    if (!file) return setError('请先选择文件');
    setLoading(true);
    setError('');
    trackWorkflowClick(workflow.id, { source: 'react_runner' });
    try {
      const json = type === 'ocr' ? await runImageOcr(file, lang) : await runDocumentMarkdown(file);
      if (!json.ok) throw new Error(json.error?.message || '处理失败');
      setResult(json.data);
      onToast(type === 'ocr' ? 'OCR 识别完成' : '文档已转 Markdown');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="runner-grid">
      <section className="runner-panel">
        <label>{type === 'ocr' ? '选择图片' : '选择文档'}</label>
        <input type="file" accept={type === 'ocr' ? 'image/*' : '.pdf,.docx,.txt,.md,.html,.csv,.json'} onChange={selectFile} />
        {type === 'ocr' && (
          <>
            <label>识别语言</label>
            <select value={lang} onChange={(event) => setLang(event.target.value)}>
              <option value="chi_sim+eng">中文 + 英文</option>
              <option value="eng">英文</option>
              <option value="chi_sim">中文</option>
            </select>
          </>
        )}
        {preview && <img className="runner-image-preview" src={preview} alt="预览" />}
        <button className="try-btn primary" onClick={run} disabled={loading}>{loading ? '处理中...' : type === 'ocr' ? '开始识别' : '转 Markdown'}</button>
      </section>
      <section className="runner-output">
        {error && <div className="tool-error">{error}</div>}
        <ToolResult result={result} />
      </section>
    </div>
  );
}

function WebpageRunner({ workflow, onToast }) {
  const [url, setUrl] = useState('https://example.com');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError('');
    trackWorkflowClick(workflow.id, { source: 'react_runner' });
    try {
      const json = await runWebpageMarkdown(url);
      if (!json.ok) throw new Error(json.error?.message || '转换失败');
      setResult(json.data);
      onToast('网页已转 Markdown');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="runner-grid">
      <section className="runner-panel">
        <label>网页地址</label>
        <input value={url} onChange={(event) => setUrl(event.target.value)} />
        <button className="try-btn primary" onClick={run} disabled={loading}>{loading ? '转换中...' : '转 Markdown'}</button>
      </section>
      <section className="runner-output">
        {error && <div className="tool-error">{error}</div>}
        <ToolResult result={result} />
      </section>
    </div>
  );
}

function ImageVideoRunner({ workflow, onToast }) {
  const [shots, setShots] = useState([
    { id: 'shot_1', title: '开场', prompt: '商品在干净背景中出现，光线柔和' },
    { id: 'shot_2', title: '卖点', prompt: '镜头推近展示材质和关键卖点' }
  ]);
  const [output, setOutput] = useState('');

  function addShot() {
    setShots((items) => [...items, { id: `shot_${Date.now()}`, title: `镜头 ${items.length + 1}`, prompt: '' }]);
  }

  function generate() {
    const prompt = shots.map((shot, index) => `${index + 1}. ${shot.title}: ${shot.prompt || '补充镜头说明'}`).join('\n');
    setOutput(`Image2Video 分镜提示词\n\n${prompt}\n\n要求: 保持主体一致,镜头连贯,输出 6-12 秒短视频。`);
    trackWorkflowClick(workflow.id, { source: 'react_canvas_runner' });
    onToast('分镜提示词已生成');
  }

  return (
    <div className="iv-react-board">
      <section className="runner-panel">
        <div className="section-head">
          <h3>画布分镜</h3>
          <button className="try-btn" onClick={addShot}>添加镜头</button>
        </div>
        {shots.map((shot, index) => (
          <div className="iv-shot-card" key={shot.id}>
            <strong>镜头 {index + 1}</strong>
            <input value={shot.title} onChange={(event) => setShots((items) => items.map((item) => item.id === shot.id ? { ...item, title: event.target.value } : item))} />
            <textarea value={shot.prompt} onChange={(event) => setShots((items) => items.map((item) => item.id === shot.id ? { ...item, prompt: event.target.value } : item))} />
          </div>
        ))}
        <button className="try-btn primary" onClick={generate}>生成视频提示词</button>
      </section>
      <section className="runner-output">
        <pre className="tool-markdown">{output || '把商品图、分镜和提示词整理到左侧画布后生成。'}</pre>
      </section>
    </div>
  );
}

function GenericRunner({ workflow }) {
  return (
    <div className="runner-output">
      <div className="runner-empty">
        <div>
          <i className="fas fa-circle-info" />
          这个工作流的 React 执行页已保留入口，详细执行链路会继续从 legacy 逻辑迁移。
        </div>
      </div>
      <pre className="tool-markdown">{workflow.description}</pre>
    </div>
  );
}

export default function Run({ currentWorkflow, route, onNavigate, onToast }) {
  const workflow = currentWorkflow;
  const runner = useMemo(() => {
    if (!workflow) return null;
    if (workflow.id === 'wf_seed_fitness_meal') return <FitnessMealRunner workflow={workflow} onToast={onToast} />;
    if (workflow.id === 'wf_seed_image_ocr') return <FileRunner workflow={workflow} type="ocr" onToast={onToast} />;
    if (workflow.id === 'wf_seed_doc_markdown') return <FileRunner workflow={workflow} type="document" onToast={onToast} />;
    if (workflow.id === 'wf_seed_web_markdown') return <WebpageRunner workflow={workflow} onToast={onToast} />;
    if (workflow.id === 'wf_seed_image_video') return <ImageVideoRunner workflow={workflow} onToast={onToast} />;
    return <GenericRunner workflow={workflow} />;
  }, [workflow, onToast]);

  if (!workflow) {
    return (
      <div className="view active" id="view-run">
        <main className="run-page">
          <div className="run-topbar">
            <div className="run-left">
              <button className="run-back" onClick={() => onNavigate('market')} title="返回市场">←</button>
              <div>
                <h1>{route?.workflowId ? '正在加载工作流' : '请选择一个工作流'}</h1>
                <p>{route?.workflowId ? '如果长时间停留在这里，说明这个工作流不存在或未上架。' : '从市场或搜索页选择一个站内工作流后再运行。'}</p>
              </div>
            </div>
          </div>
          <div className="runner-empty">
            <div><i className="fas fa-circle-info" />没有可运行的工作流</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view active" id="view-run">
      <main className="run-page">
        <div className="run-topbar">
          <div className="run-left">
            <button className="run-back" onClick={() => onNavigate('market')} title="返回市场">←</button>
            <div>
              <h1>{workflow.name}</h1>
              <p>{workflow.tagline}</p>
            </div>
          </div>
          <div className="run-actions">
            <button className="try-btn" onClick={() => onNavigate('detail', { workflowId: workflow.id })}>详情</button>
          </div>
        </div>
        {runner}
      </main>
    </div>
  );
}
