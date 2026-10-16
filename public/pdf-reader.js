function decodeAscii85(input) {
  const s = input.replace(/\s/g, '').replace(/^<~/, '').replace(/~>$/, ''); const out=[];
  for (let i=0;i<s.length;) { if (s[i]==='z') {out.push(0,0,0,0);i++;continue;} const group=s.slice(i,i+5);i+=5;let value=0n;for(let j=0;j<5;j++)value=value*85n+BigInt(j<group.length?group.charCodeAt(j)-33:84);const b=[Number(value>>24n&255n),Number(value>>16n&255n),Number(value>>8n&255n),Number(value&255n)];out.push(...b.slice(0,group.length===5?4:group.length-1)); }
  return new Uint8Array(out);
}
function decodeString(raw) { if(raw[0]==='<'){const hex=raw.slice(1,-1).replace(/\s/g,'');let s='';for(let i=0;i+1<hex.length;i+=2)s+=String.fromCharCode(parseInt(hex.slice(i,i+2),16));return s;} const s=raw.slice(1,-1);let out='';for(let i=0;i<s.length;i++){if(s[i]==='\\'){const n=s[++i];const map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'};if(/[0-7]/.test(n)){let o=n;for(let j=0;j<2&&/[0-7]/.test(s[i+1]||'');j++)o+=s[++i];out+=String.fromCharCode(parseInt(o,8));}else if(n==='\r'&&s[i+1]==='\n')i++;else if(n!=='\r'&&n!=='\n')out+=map[n]??n;}else out+=s[i];}return out; }
function operators(stream) { const out=[];const re=/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:.|\n)*?)\]\s*TJ/g;for(const m of stream.matchAll(re)){if(m[1]!==undefined)out.push(decodeString(`(${m[1]})`));else{const vals=m[2].match(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)||[];out.push(vals.map(decodeString).join(''));}out.push('\n');}return out.join('');}
async function inflate(bytes) { if(!('DecompressionStream'in globalThis))throw new Error('This browser does not support local PDF decompression. Try a current version of Chrome or Edge.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));return new Uint8Array(await new Response(stream).arrayBuffer()); }
export async function extractPdfText(file) {
  if(file.size>12*1024*1024)throw new Error('This PDF is larger than the 12 MB demo limit.');
  const bytes=new Uint8Array(await file.arrayBuffer());if(new TextDecoder('latin1').decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('This file is not a readable PDF.');
  const raw=new TextDecoder('latin1').decode(bytes);const chunks=[];const streamRe=/stream\r?\n/g;
  for(const match of raw.matchAll(streamRe)){const start=match.index+match[0].length;const end=raw.indexOf('endstream',start);if(end<0)continue;const dictEnd=raw.lastIndexOf('>>',match.index);const dictStart=raw.lastIndexOf('<<',dictEnd);if(dictStart<0||dictEnd<dictStart)continue;const dict=raw.slice(dictStart,dictEnd+2);let data=raw.slice(start,end).replace(/[\r\n]+$/,'');let decoded;
    try{if(/\/ASCII85Decode/.test(dict)){const ascii=decodeAscii85(data);decoded=/\/FlateDecode/.test(dict)?await inflate(ascii):ascii;}else if(/\/FlateDecode/.test(dict))decoded=await inflate(new TextEncoder().encode(data));else if(/\/Filter\b/.test(dict))continue;else decoded=new TextEncoder().encode(data);}catch{continue;}
    chunks.push(operators(new TextDecoder('latin1').decode(decoded)));
  }
  const text=chunks.join('\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
  if(text.length<60)throw new Error('This PDF has no readable embedded text. Scanned PDFs and image OCR are not supported.');
  return text;
}
