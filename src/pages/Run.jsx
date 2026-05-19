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
  const [prompt, setPrompt] = useState('电商护肤品在晨光浴室台面上，水汽、玻璃反光、质感高级');
  const [style, setStyle] = useState('cinematic');
  const [ratio, setRatio] = useState('9:16');
  const [activeTool, setActiveTool] = useState('select');
  const [showGuide, setShowGuide] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [assets, setAssets] = useState([
    {
      id: 'asset_1',
      title: '晨光产品关键帧',
      scene: 'Image2 / product',
      color: 'linear-gradient(135deg, #E7F4EC, #8CC8A7)',
      note: '主图,适合做开场镜头'
    },
    {
      id: 'asset_2',
      title: '微距质感关键帧',
      scene: 'Image2 / macro',
      color: 'linear-gradient(135deg, #FBE4EC, #8B5CF6)',
      note: '材质特写,适合承接卖点'
    }
  ]);
  const [shots, setShots] = useState([
    {
      id: 'shot_1',
      title: '开场建立场景',
      scene: '0-2s',
      meta: '平移 / 产品入画',
      color: 'linear-gradient(135deg, #E7F4EC, #6EA884)',
      x: 430,
      y: 250
    },
    {
      id: 'shot_2',
      title: '卖点微距推进',
      scene: '2-5s',
      meta: '推近 / 水滴反光',
      color: 'linear-gradient(135deg, #FBE4EC, #8B5CF6)',
      x: 720,
      y: 330
    }
  ]);

  function makeAsset() {
    const nextAsset = {
      id: `asset_${Date.now()}`,
      title: prompt.slice(0, 14) || '新关键帧',
      scene: `Image2 / ${style}`,
      color: style === 'product'
        ? 'linear-gradient(135deg, #F6F0E8, #1A5D3A)'
        : 'linear-gradient(135deg, #E9E6FF, #5B3FA8)',
      note: `${ratio} 构图,可拖入画布`
    };
    setAssets((items) => [nextAsset, ...items]);
    trackWorkflowClick(workflow.id, { source: 'react_canvas_image' });
    onToast?.('关键帧已生成,可以加入画布');
  }

  function addAssetToCanvas(asset) {
    const nextIndex = shots.length + 1;
    setShots((items) => [
      ...items,
      {
        id: `shot_${Date.now()}`,
        title: asset.title,
        scene: `${nextIndex * 2}-${nextIndex * 2 + 3}s`,
        meta: asset.scene,
        color: asset.color,
        x: 430 + nextIndex * 265,
        y: nextIndex % 2 ? 250 : 350
      }
    ]);
    onToast?.('已添加到左侧画布');
  }

  function generateVideo() {
    if (shots.length < 2) {
      onToast?.('至少需要 2 个镜头才能生成短视频');
      return;
    }
    setVideoReady(true);
    trackWorkflowClick(workflow.id, { source: 'react_canvas_video' });
    onToast?.('视频分镜预览已生成');
  }

  function applyPreset(nextPrompt, nextStyle = style) {
    setPrompt(nextPrompt);
    setStyle(nextStyle);
  }

  const links = shots.map((shot, index) => {
    const fromX = index === 0 ? 360 : shots[index - 1].x + 210;
    const fromY = index === 0 ? 300 : shots[index - 1].y + 90;
    const toX = shot.x;
    const toY = shot.y + 90;
    return { id: `link_${shot.id}`, fromX, fromY, toX, toY, running: videoReady && index === shots.length - 1 };
  });
  const lastShot = shots[shots.length - 1];
  if (lastShot) {
    links.push({
      id: 'link_video',
      fromX: lastShot.x + 210,
      fromY: lastShot.y + 90,
      toX: 1280,
      toY: 300,
      running: videoReady
    });
  }

  return (
    <div className="run-workspace">
      <div className="inline-runner">
        <div className={`iv-studio ${showGuide ? 'guide-on' : ''}`}>
          <section className="iv-canvas-panel">
            <div className={`iv-canvas-shell ${locked ? 'iv-canvas-locked' : ''}`}>
              <div className="iv-left-rail" aria-label="画布工具">
                {[
                  ['select', 'fa-arrow-pointer'],
                  ['pan', 'fa-hand'],
                  ['frame', 'fa-image'],
                  ['link', 'fa-link']
                ].map(([tool, icon]) => (
                  <button
                    key={tool}
                    className={`iv-tool-btn ${activeTool === tool ? 'active' : ''}`}
                    onClick={() => setActiveTool(tool)}
                    title={tool}
                  >
                    <i className={`fas ${icon}`} />
                  </button>
                ))}
                <span className="iv-rail-divider" />
                <button className="iv-tool-btn" onClick={() => setGridVisible((value) => !value)} title="网格">
                  <i className="fas fa-border-all" />
                </button>
                <button className="iv-tool-btn" onClick={() => setLocked((value) => !value)} title="锁定">
                  <i className={`fas ${locked ? 'fa-lock' : 'fa-lock-open'}`} />
                </button>
              </div>

              <div className="iv-canvas-toolbar">
                <button className="iv-tool-btn active"><i className="fas fa-layer-group" /> 镜头链路</button>
                <button className="iv-tool-btn" onClick={() => setShowGuide((value) => !value)}>
                  <i className="fas fa-circle-question" /> 引导
                </button>
                <button className="iv-tool-btn" onClick={generateVideo}>
                  <i className="fas fa-play" /> 生成预览
                </button>
              </div>

              <div className={`iv-canvas-stage ${activeTool === 'pan' ? 'pan-mode' : ''} ${gridVisible ? '' : 'no-grid'}`}>
                <div className="iv-canvas-content">
                  <svg className="iv-link-layer" aria-hidden="true">
                    {links.map((link) => (
                      <g key={link.id}>
                        <path
                          className={`iv-link-path ${link.running ? 'running' : 'done'}`}
                          d={`M ${link.fromX} ${link.fromY} C ${link.fromX + 90} ${link.fromY}, ${link.toX - 90} ${link.toY}, ${link.toX} ${link.toY}`}
                        />
                        <circle className={`iv-link-dot ${link.running ? 'running' : 'done'}`} cx={link.toX} cy={link.toY} r="4" />
                      </g>
                    ))}
                  </svg>

                  <div className="iv-flow-node iv-draggable-node selected" style={{ left: 150, top: 210 }}>
                    <div className="iv-flow-card status-done">
                      <div className="iv-node-head">
                        <span className="iv-node-index">1</span>
                        <strong>Image2 关键帧</strong>
                        <span className="iv-node-state done">ready</span>
                      </div>
                      <div className="iv-node-body">
                        <div className="iv-node-row"><span>输入</span><span className="iv-node-pill">{style}</span></div>
                        <div className="iv-node-row"><span>比例</span><span className="iv-node-pill">{ratio}</span></div>
                      </div>
                    </div>
                    <button className="iv-node-port out" aria-label="输出端口" />
                  </div>

                  {shots.map((shot, index) => (
                    <div className="iv-shot-node iv-draggable-node" key={shot.id} style={{ left: shot.x, top: shot.y }}>
                      <button className="iv-node-port in" aria-label="输入端口" />
                      <div className={`iv-shot-card ${videoReady ? 'status-done' : index === shots.length - 1 ? 'status-running' : 'status-done'}`}>
                        <div className="iv-shot-preview" data-scene={shot.scene} style={{ background: shot.color }} />
                        <div className="iv-shot-body">
                          <div className="iv-shot-title">{shot.title}</div>
                          <div className="iv-shot-meta">{shot.meta}</div>
                          <div className="iv-shot-actions">
                            <span className={`iv-node-state ${videoReady ? 'done' : 'running'}`}>{videoReady ? 'done' : 'queued'}</span>
                            <button
                              className="iv-mini-btn"
                              disabled={shots.length <= 2}
                              onClick={() => setShots((items) => items.length > 2 ? items.filter((item) => item.id !== shot.id) : items)}
                            >
                              移除
                            </button>
                          </div>
                        </div>
                      </div>
                      <button className="iv-node-port out" aria-label="输出端口" />
                    </div>
                  ))}

                  <div className="iv-flow-node video-node iv-draggable-node" style={{ left: 1280, top: 210 }}>
                    <button className="iv-node-port in" aria-label="输入端口" />
                    <div className={`iv-flow-card video ${videoReady ? 'status-done' : 'status-running'}`}>
                      <div className="iv-node-head">
                        <span className="iv-node-index">V</span>
                        <strong>Video Engine</strong>
                        <span className={`iv-node-state ${videoReady ? 'done' : 'running'}`}>{videoReady ? 'ready' : 'wait'}</span>
                      </div>
                      <div className="iv-node-body">
                        <div className="iv-node-row"><span>时长</span><span className="iv-node-pill">8 秒</span></div>
                        <div className="iv-node-row"><span>镜头</span><span className="iv-node-pill">{shots.length} 段</span></div>
                      </div>
                    </div>
                    <button className="iv-node-port out" aria-label="输出端口" />
                  </div>

                  <div className="iv-flow-node output-node iv-draggable-node" style={{ left: 1580, top: 250 }}>
                    <button className="iv-node-port in" aria-label="输入端口" />
                    <div className="iv-flow-card output">
                      <div className="iv-shot-preview" data-scene="8s" style={{ background: 'linear-gradient(135deg, #0F0F0E, #5B3FA8)' }} />
                      <div className="iv-shot-body">
                        <div className="iv-shot-title">短视频预览</div>
                        <div className="iv-shot-meta">{videoReady ? '已生成 / 可继续细化' : '等待生成'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="iv-minimap" aria-hidden="true">
                <div className="iv-minimap-track">
                  <span className="iv-mini-node" />
                  <span className="iv-mini-node" />
                  <span className="iv-mini-node" />
                </div>
              </div>

              <div className="iv-zoom">
                <button type="button">−</button>
                <span>86%</span>
                <button type="button">＋</button>
              </div>

              <div className="iv-video-box" style={{ display: 'block' }}>
                {videoReady ? (
                  <div className="iv-video-result">
                    <div className="iv-video-thumb" />
                    <div className="iv-video-copy">
                      <h5>FlowHub 预览视频</h5>
                      <p>已把 {shots.length} 个镜头串成 8 秒分镜。下一步接真实视频 API 后这里会替换成生成结果。</p>
                    </div>
                  </div>
                ) : (
                  <div className="iv-video-empty">画布里已有镜头链路，点击「生成预览」查看视频分镜结果。</div>
                )}
              </div>

              <div className="iv-guide-callouts">
                <div className="iv-guide-note canvas" data-step="1"><strong>画布</strong>关键帧、分镜、视频节点都在这里串联。</div>
                <div className="iv-guide-note tools" data-step="2"><strong>工具栏</strong>切换选择、拖动画布、连线和锁定状态。</div>
                <div className="iv-guide-note node" data-step="3"><strong>镜头节点</strong>每张图就是一个镜头，可以继续增删。</div>
                <div className="iv-guide-note video" data-step="4"><strong>输出</strong>生成后右下角显示视频预览。</div>
              </div>
            </div>
          </section>

          <aside className="iv-chat-panel">
            <div className="iv-assistant-head">
              <div className="iv-assistant-tabs">
                <span className="iv-assistant-title">AI 画布助手</span>
                <span className="iv-assistant-tab active">素材</span>
                <span className="iv-assistant-tab">分镜</span>
              </div>
              <div className="iv-assistant-tools">
                <button className="iv-tool-btn" onClick={() => setShowGuide((value) => !value)} title="引导">
                  <i className="fas fa-circle-question" />
                </button>
                <button className="iv-tool-btn" onClick={() => setAssets((items) => items.slice(0, 2))} title="清理">
                  <i className="fas fa-broom" />
                </button>
              </div>
            </div>

            <div className="iv-chat-log">
              <div className="iv-msg bot">先描述画面,生成关键帧,再把素材加入左侧画布形成镜头链路。</div>
              <div className="iv-msg user">{prompt}</div>
              <div className="iv-assets">
                {assets.map((asset) => (
                  <div className="iv-asset-card" key={asset.id} draggable>
                    <div className="iv-asset-preview" data-scene={asset.scene} style={{ background: asset.color }} />
                    <div className="iv-asset-body">
                      <div>
                        <strong>{asset.title}</strong>
                        <span>{asset.note}</span>
                      </div>
                    </div>
                    <div className="iv-asset-actions">
                      <button className="iv-mini-btn" onClick={() => addAssetToCanvas(asset)}>加入画布</button>
                      <button className="iv-mini-btn" onClick={() => setPrompt(`${asset.title}，保持同一主体，增加镜头运动`)}>改提示词</button>
                    </div>
                  </div>
                ))}
              </div>
              {videoReady && (
                <div className="iv-video-chat-card">
                  <div className="iv-video-chat-thumb" style={{ background: 'linear-gradient(135deg, #0F0F0E, #5B3FA8)' }} />
                  <div className="iv-video-chat-copy">
                    <strong>视频链路已完成</strong>
                    <p>当前是本地演示预览。接入真实视频服务后，这里会显示最终视频和下载入口。</p>
                  </div>
                  <div className="iv-asset-actions">
                    <button className="iv-mini-btn" onClick={() => onToast?.('分镜已复制到演示剪贴板')}>复制分镜</button>
                    <button className="iv-mini-btn" onClick={() => onToast?.('版本已保存到本地演示状态')}>保存版本</button>
                  </div>
                </div>
              )}
            </div>

            <div className={`iv-guide-panel ${showGuide ? 'show' : ''}`}>
              <div className="iv-guide-hero">
                <h4>推荐流程</h4>
                <p>先生成 2-4 张关键帧,再按时间顺序加入画布,最后生成视频预览。</p>
              </div>
              <div className="iv-guide-item"><span className="iv-guide-num">1</span><strong>生成主视觉</strong><p>输入主体、场景、光线和画幅比例。</p></div>
              <div className="iv-guide-item"><span className="iv-guide-num">2</span><strong>整理镜头链路</strong><p>把关键帧加入画布,形成连续的镜头顺序。</p></div>
              <div className="iv-guide-item"><span className="iv-guide-num">3</span><strong>生成短视频</strong><p>点击生成预览后检查节奏、主体一致性和转场。</p></div>
            </div>

            <div className="iv-compose">
              <textarea className="runner-textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              <div className="iv-compose-row">
                <select className="runner-select" value={style} onChange={(event) => setStyle(event.target.value)}>
                  <option value="cinematic">电影感</option>
                  <option value="product">电商产品</option>
                  <option value="anime">动漫风</option>
                  <option value="realistic">真实摄影</option>
                </select>
                <select className="runner-select" value={ratio} onChange={(event) => setRatio(event.target.value)}>
                  <option value="9:16">9:16 竖屏</option>
                  <option value="16:9">16:9 横屏</option>
                  <option value="1:1">1:1 方图</option>
                </select>
              </div>
              <div className="iv-workflow-actions">
                <button className="runner-primary" onClick={makeAsset}><i className="fas fa-image" /> 生成图片</button>
                <button className="runner-secondary" onClick={generateVideo}><i className="fas fa-video" /> 生成视频</button>
              </div>
              <div className="runner-presets">
                <button className="runner-preset" onClick={() => applyPreset('健身餐食材在白色厨房台面上，俯拍，清爽自然光', 'product')}>健身餐</button>
                <button className="runner-preset" onClick={() => applyPreset('AI 工具产品界面漂浮在深色玻璃空间，紫蓝光，高级科技感', 'cinematic')}>AI 产品</button>
                <button className="runner-preset" onClick={() => applyPreset('小红书风护肤品测评，粉色背景，真实手持镜头', 'realistic')}>小红书</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
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
            <div className="run-title">
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
            <div className="run-title">
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
