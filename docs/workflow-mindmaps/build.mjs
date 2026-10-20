import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const folder=fileURLToPath(new URL('.',import.meta.url));
const data=JSON.parse(readFileSync(folder+'workflows.json','utf8'));
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(text,max=25){let lines=[];for(const paragraph of text.split('\n')){let line='',weight=0;for(const c of paragraph){const w=/[\u2e80-\uffff]/.test(c)?1:0.55;if(weight+w>max){lines.push(line);line='';weight=0;}line+=c;weight+=w;}lines.push(line);}return lines;}
for(const key of ['operator','pm']){
 const tree=data[key],accent=key==='operator'?'#315efb':'#b66c12',pale=key==='operator'?'#edf2ff':'#fff7e9';
 const nodes=[],edges=[];let cursor=90,id=0;
 function visit(n,depth=0,parent=null){const node={...n,id:'n'+(++id),depth,x:50+depth*500,w:depth===0?320:440,lines:wrap(n.text,depth===0?10:depth===1?17:19)};node.h=Math.max(depth===0?90:54,node.lines.length*27+24);nodes.push(node);if(parent)edges.push([parent,node]);
  if(n.children?.length){const children=n.children.map(c=>visit(c,depth+1,node));node.y=(children[0].y+children[0].h/2+children.at(-1).y+children.at(-1).h/2)/2-node.h/2;}
  else{node.y=cursor;cursor+=node.h+16;}return node;}
 visit(tree);const width=Math.max(2030,...nodes.map(n=>n.x+n.w+50)),height=Math.ceil(cursor+55);
 const header='<text x="50" y="42" font-size="25" font-weight="700">'+xml(tree.title)+'</text><text x="50" y="70" font-size="16" fill="#667085">CRM 当前原型 · 2026-10-13 · 按编号阅读阶段，箭头文字标明角色交接</text>';
 const paths=edges.map(([a,b])=>{const x1=a.x+a.w,y1=a.y+a.h/2,x2=b.x,y2=b.y+b.h/2;return '<path d="M'+x1+','+y1+' C'+(x1+70)+','+y1+' '+(x2-70)+','+y2+' '+x2+','+y2+'" fill="none" stroke="'+(a.depth===0||a.kind==='stage'&&b.kind==='stage'?accent:'#cbd2df')+'" stroke-width="'+(a.depth===0||a.kind==='stage'&&b.kind==='stage'?3:1.5)+'"/>';}).join('');
 const marks=nodes.map(n=>'<g><rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="'+(n.depth===0?16:9)+'" fill="'+(n.depth===0?accent:n.depth===1||n.kind==='stage'?pale:'#ffffff')+'" stroke="'+(n.depth===0?accent:'#e0e5ed')+'"/><text fill="'+(n.depth===0?'#ffffff':'#1f2937')+'" font-size="'+(n.depth===0?26:n.depth===1||n.kind==='stage'?23:21)+'" font-weight="'+(n.depth<2||n.kind==='stage'?'700':'400')+'">'+n.lines.map((line,i)=>'<tspan x="'+(n.x+18)+'" y="'+(n.y+(n.h-n.lines.length*27)/2+23+i*27)+'">'+xml(line)+'</tspan>').join('')+'</text></g>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><style>text{font-family:"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}</style><rect width="100%" height="100%" fill="#f8fafc"/>'+header+paths+marks+'</svg>';
 writeFileSync(folder+key+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(folder+key+'.png');
 const cellNodes=nodes.map(n=>'<mxCell id="'+n.id+'" value="'+xml(n.text)+'" style="rounded=1;whiteSpace=wrap;html=0;fillColor='+(n.depth===0?accent:n.depth===1||n.kind==='stage'?pale:'#FFFFFF')+';strokeColor='+(n.depth===0?accent:'#D6DDE7')+';fontColor='+(n.depth===0?'#FFFFFF':'#1F2937')+';fontSize='+(n.depth===0?26:n.depth===1||n.kind==='stage'?23:21)+';fontStyle='+(n.depth<2||n.kind==='stage'?1:0)+';align=left;spacingLeft=18;" vertex="1" parent="1"><mxGeometry x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" as="geometry"/></mxCell>').join('');
 const cellEdges=edges.map(([a,b],i)=>'<mxCell id="e'+i+'" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=0;endArrow=none;strokeColor='+(a.depth===0?accent:'#BCC7D6')+';strokeWidth='+(a.depth===0||a.kind==='stage'&&b.kind==='stage'?3:1.5)+';exitX=1;exitY=0.5;entryX=0;entryY=0.5;" edge="1" parent="1" source="'+a.id+'" target="'+b.id+'"><mxGeometry relative="1" as="geometry"/></mxCell>').join('');
 const drawio='<mxfile host="app.diagrams.net" version="24.7.17"><diagram id="'+key+'" name="'+xml(tree.title)+'"><mxGraphModel dx="2030" dy="'+height+'" grid="1" gridSize="10" guides="1" page="0" pageScale="1" pageWidth="2030" pageHeight="'+height+'"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+cellEdges+cellNodes+'</root></mxGraphModel></diagram></mxfile>';
 writeFileSync(folder+key+'.drawio',drawio);
 const outline=n=>'<outline text="'+xml(n.text)+'">'+(n.children||[]).map(outline).join('')+'</outline>';
 writeFileSync(folder+key+'.opml','<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>'+xml(tree.title)+'</title></head><body>'+outline(tree)+'</body></opml>');
 const mindnode=n=>'<node TEXT="'+xml(n.text)+'"'+(n.folded?' FOLDED="true"':'')+' POSITION="right">'+(n.children||[]).map(mindnode).join('')+'</node>';
 writeFileSync(folder+key+'.mm','<?xml version="1.0" encoding="UTF-8"?><map version="1.0.1">'+mindnode(tree)+'</map>');
 console.log(key+': '+nodes.length+' nodes, '+width+' × '+height);
}
