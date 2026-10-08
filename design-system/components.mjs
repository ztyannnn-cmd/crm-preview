const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const Button=({label,attribute,variant='secondary'})=>`<button class="ds-button ds-button--${variant}" ${attribute}>${escape(label)}</button>`;
export const PageHeader=({title,description='',action='',back=''})=>`<section class="ds-page-header">${back?`<div class="ds-breadcrumb">${back}</div>`:''}<div class="ds-title-row"><h1>${escape(title)}</h1>${action}</div>${description?`<p>${escape(description)}</p>`:''}</section>`;
export const MetricCard=({label,value,description})=>`<article class="ds-metric"><span>${escape(label)}</span><strong>${escape(value)}</strong><p>${escape(description)}</p></article>`;
export const FilterBar=content=>`<section class="ds-toolbar" aria-label="筛选合作记录">${content}</section>`;
export const DataList=(rows,count)=>`<section class="ds-data"><div class="ds-result">${count} 条合作记录</div><div class="ds-data-scroll"><div class="ds-columns" aria-hidden="true"><span>达人资料</span><span>平台账号</span><span>数据</span><span>合作信息</span><span>操作</span></div>${rows||'<div class="ds-empty">暂无符合条件的提报。</div>'}</div></section>`;
