import './style.css';
import { BrowserProvider, Contract, Interface, parseUnits, MaxUint256, ZeroAddress } from 'ethers';

const CHAIN_ID = '0x1237';
const CHAIN = {
  chainId: CHAIN_ID,
  chainName: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
  blockExplorerUrls: ['https://explorer.mainnet.chain.robinhood.com']
};
// Pons V2 factory verified from the public launcher flow.
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const LAUNCHER = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948';
const LAUNCH_CONFIG_ID = 0n;
const PAIRS = [
  ['ETH','Ether',18,true,'0x0000000000000000000000000000000000000000'],
  ['NVDA','NVIDIA',18,false,'0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC'],
  ['META','Meta Platforms',18,false,'0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35'],
  ['AAPL','Apple',18,false,'0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9'],
  ['TSLA','Tesla',18,false,'0x322F0929c4625eD5bAd873c95208D54E1c003b2d'],
  ['USDG','Global Dollar',6,false,'0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168']
].map(([symbol,name,dec,native,address])=>({symbol,name,dec,native,address}));
const erc20 = ['function allowance(address,address) view returns (uint256)','function approve(address,uint256) returns (bool)'];
const factoryAbi = [
  'function launchFee() view returns (uint256)',
  'function approvedPairTokens(address) view returns (bool)',
  'function previewLaunchEconomics(uint256,address) view returns (bytes32)',
  'function launchAndBuy((string name,string symbol,string logo,string description,(string twitter,string telegram,string discord,string website,string farcaster) socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt) params,uint256 launchConfigId,address pairToken,uint256 quoteIn,uint256 minTokensOut,address recipient,address[] snipeTaxExemptions) payable returns (address token,address curve,uint256 tokensOut)'
];
const $ = (s) => document.querySelector(s);
const app = $('#app');
let provider, account = '', chainOk = false, busy = false;
let form = { name:'', ticker:'', description:'', logo:'', x:'', telegram:'', discord:'', website:'', farcaster:'', pair:'ETH', buy:'', tax:'1', feeWallet:'' };

function esc(v=''){ return v.replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])); }
function short(a){ return a ? `${a.slice(0,8)}…${a.slice(-6)}` : 'NOT CONNECTED'; }
function weiFromDecimal(value, decimals=18){ const [a,b=''] = String(value).trim().split('.'); return BigInt(a||0)*10n**BigInt(decimals)+BigInt((b+'0'.repeat(decimals)).slice(0,decimals)||0); }
function encUint(x){ return '0x'+x.toString(16).padStart(64,'0'); }
function padAddress(a){ return a.slice(2).toLowerCase().padStart(64,'0'); }
function selector(sig){ return window.keccak256 ? window.keccak256(sig).slice(0,10) : null; }
// Minimal ABI encoding is intentionally kept behind ethers-style browser API if present.
function render(){
 const p=PAIRS.find(x=>x.symbol===form.pair)||PAIRS[0];
 app.innerHTML=`<header><a class="brand" href="/">PONS<span>/</span>LAUNCHER</a><nav><a class="active" href="#launcher">LAUNCHER</a><a href="https://www.ponsfamily.com/" target="_blank">PONS</a><a href="https://explorer.mainnet.chain.robinhood.com" target="_blank">EXPLORER</a></nav><button id="connect" class="wallet">${account?short(account):'CONNECT WALLET'}</button></header>
 <main><section class="mast"><div class="eyebrow">PONS / LAUNCHER</div><h1>MAKE AN IDEA<br><i>TRADEABLE.</i></h1><p>Create a community token on Robinhood Chain. Shape the identity, choose its paired market, review the economics, and launch from your own wallet.</p><div class="status ${chainOk?'ok':''}"><b>${account?chainOk?'WALLET READY':'WRONG NETWORK':'CONNECT WALLET TO UNLOCK'}</b><span>${account?short(account):'The form unlocks after your wallet is connected.'}</span></div></section>
 <section class="workspace"><form id="launchForm" class="panel ${account&&chainOk?'':'locked'}"><div class="panel-top"><span>01 / TOKEN IDENTITY</span><em>${account&&chainOk?'EDITABLE':'LOCKED'}</em></div><div class="grid two"><label>NAME *<input name="name" value="${esc(form.name)}" placeholder="Your token name" ${account&&chainOk?'':'disabled'}></label><label>TICKER *<input name="ticker" value="${esc(form.ticker)}" placeholder="$TICKER" maxlength="12" ${account&&chainOk?'':'disabled'}></label></div><label>DESCRIPTION<textarea name="description" placeholder="What is this token about?" ${account&&chainOk?'':'disabled'}>${esc(form.description)}</textarea></label><label>LOGO * <small>PNG, JPG or WEBP · max 5 MB</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" ${account&&chainOk?'':'disabled'}></label><div id="logoState" class="hint">${form.logo?`LOGO READY · embedded metadata preview`:'Upload a logo to include it in the launch metadata.'}</div><div class="panel-top sub"><span>02 / SOCIALS</span><em>OPTIONAL</em></div><div class="grid two">${['x','telegram','discord','website','farcaster'].map(k=>`<label>${k.toUpperCase()}<input name="${k}" value="${esc(form[k])}" placeholder="${k==='x'?'https://x.com/...':'https://...'}" ${account&&chainOk?'':'disabled'}></label>`).join('')}</div><div class="panel-top sub"><span>03 / ECONOMICS</span><em>ON-CHAIN PREVIEW</em></div><div class="grid two"><label>PAIRED ASSET <small>what your token trades against</small><select name="pair" ${account&&chainOk?'':'disabled'}>${PAIRS.map(x=>`<option value="${x.symbol}" ${x.symbol===form.pair?'selected':''}>${x.symbol} — ${x.name}</option>`).join('')}</select></label><label>CREATOR INITIAL BUY (${p.symbol}) *<input name="buy" value="${esc(form.buy)}" placeholder="0.01" ${account&&chainOk?'':'disabled'}></label><label>CREATOR TAX % <small>0–10</small><input name="tax" type="number" min="0" max="10" step="0.1" value="${esc(form.tax)}" ${account&&chainOk?'':'disabled'}></label><label>FEE WALLET <small>blank = your address</small><input name="feeWallet" value="${esc(form.feeWallet)}" placeholder="0x..." ${account&&chainOk?'':'disabled'}></label></div><div class="notice">Transactions are signed in your wallet. This app never asks for a private key. A launch performs a preflight simulation and may require approval for non-native paired assets.</div><button class="launch" type="submit" ${account&&chainOk&&!busy?'':'disabled'}>${busy?'PREPARING TRANSACTION…':'LAUNCH TOKEN →'}</button><div id="message" class="message"></div></form><aside class="preview"><div class="preview-top"><span>LIVE PREVIEW</span><span class="dot"></span></div><div class="token-card"><div class="token-mark">${form.logo?`<img src="${esc(form.logo)}" alt="">`:'✦'}</div><div class="token-name">${esc(form.name)||'YOUR TOKEN NAME'}</div><div class="token-ticker">${form.ticker?'$'+esc(form.ticker.replace(/^\$/,'')):'$TICKER'}</div><p>${esc(form.description)||'A token identity begins here. Connect a wallet to shape the market.'}</p></div><div class="summary"><div><span>NETWORK</span><b>Robinhood Chain</b></div><div><span>CHAIN ID</span><b>4663</b></div><div><span>PAIR</span><b>${p.symbol} · ${p.name}</b></div><div><span>CREATOR TAX</span><b>${esc(form.tax||'1')}%</b></div></div><div class="launch-summary"><span>LAUNCH SUMMARY</span><strong>${account&&chainOk?'READY TO REVIEW':'WALLET REQUIRED'}</strong></div></aside></section></main><footer><span>PONS LAUNCHER / 4663</span><span>DIRECT WALLET FLOW · NO CUSTODY</span></footer>`;
 bind();
}
async function connect(){
 if(!window.ethereum){setMsg('No EVM wallet detected. Install MetaMask or Rabby.','bad');return}
 provider=window.ethereum; const accounts=await provider.request({method:'eth_requestAccounts'}); account=accounts[0]||''; let id=await provider.request({method:'eth_chainId'}); if(id.toLowerCase()!==CHAIN_ID){try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:CHAIN_ID}]}); id=await provider.request({method:'eth_chainId'});}catch(e){try{await provider.request({method:'wallet_addEthereumChain',params:[CHAIN]});id=await provider.request({method:'eth_chainId'});}catch(x){}}} chainOk=id.toLowerCase()===CHAIN_ID; render(); if(!chainOk)setMsg('Switch your wallet to Robinhood Chain · 4663.','bad');
}
function setMsg(text,kind=''){const el=$('#message');if(el){el.textContent=text;el.className='message '+kind}}
async function launchOnPons(){
 const pair=PAIRS.find(x=>x.symbol===form.pair)||PAIRS[0];
 if(!/^0x[0-9a-fA-F]{40}$/.test(account))throw new Error('Wallet address unavailable.');
 const signer=await new BrowserProvider(window.ethereum).getSigner();
 const iface=new Interface(factoryAbi);
 const read=new Contract(FACTORY,factoryAbi,signer);
 const pairAllowed=pair.native?true:await read.approvedPairTokens(pair.address);
 if(!pairAllowed)throw new Error(`${pair.symbol} is not an approved paired asset.`);
 const buy=parseUnits(form.buy,pair.dec);
 const tax=Math.round(Number(form.tax||0)*100);
 if(!Number.isFinite(tax)||tax<0||tax>1000)throw new Error('Creator tax must be between 0 and 10%.');
 const feeWallet=form.feeWallet.trim()||account;
 if(!/^0x[0-9a-fA-F]{40}$/.test(feeWallet))throw new Error('Fee wallet must be a valid address.');
 const logoData=await uploadLogo();
 const expected=await read.previewLaunchEconomics(LAUNCH_CONFIG_ID,pair.address);
 const fee=await read.launchFee();
 const salt='0x'+crypto.getRandomValues(new Uint8Array(32)).reduce((s,x)=>s+x.toString(16).padStart(2,'0'),'');
 const params=[form.name.trim(),form.ticker.trim().replace(/^\\$/,''),logoData,form.description.trim(),[form.x.trim(),form.telegram.trim(),form.discord.trim(),form.website.trim(),form.farcaster.trim()],feeWallet,tax,false,expected,salt];
 const quoteIn=buy;
 const data=iface.encodeFunctionData('launchAndBuy',[params,LAUNCH_CONFIG_ID,pair.address,quoteIn,0n,account,[]]);
 if(!pair.native){
   const token=new Contract(pair.address,erc20,signer); const allowance=await token.allowance(account,LAUNCHER);
   if(allowance<buy){setMsg(`Approve ${pair.symbol} in your wallet…`,'warn');const approval=await token.approve(LAUNCHER,MaxUint256);await approval.wait();}
 }
 const value=fee+ (pair.native?buy:0n);
 const txRequest={from:account,to:LAUNCHER,data,value};
 setMsg('Simulating launch and estimating gas…','warn');
 const gas=await signer.estimateGas(txRequest);
 const tx=await signer.sendTransaction({...txRequest,gasLimit:gas});
 setMsg(`Launch submitted: ${tx.hash}. Waiting for confirmation…`,'warn');
 const receipt=await tx.wait();
 busy=false;render();setMsg(receipt.status===1?`Token launched. Tx: ${tx.hash}`:'Launch transaction reverted.',receipt.status===1?'ok':'bad');
}
async function uploadLogo(){
 const input=document.querySelector('input[type=file]'); const file=input?.files?.[0];
 if(!file)throw new Error('Upload a token logo first.');
 const body=new FormData(); body.append('image',file,file.name);
 const r=await fetch('https://mmmttt.vercel.app/api/upload',{method:'POST',body});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.uri)throw new Error(j.error||`Logo upload failed (HTTP ${r.status})`);
 return j.uri;
}
async function fileToDataUri(){
 const input=document.querySelector('input[type=file]'); const file=input?.files?.[0];
 if(!file)throw new Error('Upload a token logo first.');
 return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Could not read logo.'));r.readAsDataURL(file);});
}
function bind(){
 $('#connect')?.addEventListener('click',connect);
 $('#launchForm')?.addEventListener('input',e=>{if(e.target.name){form[e.target.name]=e.target.value; if(e.target.name==='pair'||e.target.name==='tax')render(); else { $('.token-name')&&( $('.token-name').textContent=form.name||'YOUR TOKEN NAME'); $('.token-ticker')&&( $('.token-ticker').textContent=form.ticker?'$'+form.ticker.replace(/^\$/,''):'$TICKER'); $('.token-card p')&&($('.token-card p').textContent=form.description||'A token identity begins here. Connect a wallet to shape the market.'); }}});
 $('#launchForm')?.addEventListener('change',e=>{if(e.target.name==='logo'&&e.target.files?.[0]){const file=e.target.files[0];if(file.size>5242880){setMsg('Logo must be under 5 MB.','bad');return}form.logo=URL.createObjectURL(file);$('.token-mark').innerHTML=`<img src="${form.logo}" alt="">`;$('#logoState').textContent='LOGO READY · local preview (upload adapter required before broadcast)';} });
 $('#launchForm')?.addEventListener('submit',async e=>{e.preventDefault();setMsg('');if(!form.name||!form.ticker||!form.buy||!form.logo){setMsg('Name, ticker, logo, and a non-zero initial buy are required.','bad');return}if(!provider||!account||!chainOk){setMsg('Connect the wallet on Robinhood Chain first.','bad');return}if(busy)return;busy=true;render();try{await launchOnPons();}catch(err){busy=false;render();setMsg(err.shortMessage||err.reason||err.message||'Launch failed.','bad')}});
}
window.ethereum?.on?.('accountsChanged',()=>connect().catch(()=>{}));window.ethereum?.on?.('chainChanged',()=>connect().catch(()=>{}));render();
