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
  ['cbBTC','Coinbase Wrapped BTC',8,false,'0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4'],
  ['USDG','Global Dollar',6,false,'0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'],
  ['NVDA','NVIDIA',18,false,'0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC'],
  ['SPCX','SpaceX Class A',18,false,'0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa'],
  ['GOOGL','Alphabet Class A',18,false,'0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3'],
  ['TSLA','Tesla',18,false,'0x322F0929c4625eD5bAd873c95208D54E1c003b2d'],
  ['GME','GameStop',18,false,'0x1b0E319c6A659F002271B69dB8A7df2F911c153E'],
  ['AAPL','Apple',18,false,'0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9'],
  ['SPY','SPDR S&P 500 ETF',18,false,'0x117cc2133c37B721F49dE2A7a74833232B3B4C0C'],
  ['SNDK','SanDisk',18,false,'0xB90A19fF0Af67f7779afF50A882A9CfF42446400'],
  ['AMD','Advanced Micro Devices',18,false,'0x86923f96303D656E4aa86D9d42D1e57ad2023fdC'],
  ['AMZN','Amazon',18,false,'0x12f190a9F9d7D37a250758b26824B97CE941bF54'],
  ['MSFT','Microsoft',18,false,'0xe93237C50D904957Cf27E7B1133b510C669c2e74'],
  ['META','Meta Platforms',18,false,'0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35'],
  ['CRCL','Circle Internet Group',18,false,'0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5'],
  ['COIN','Coinbase',18,false,'0x6330D8C3178a418788dF01a47479c0ce7CCF450b'],
  ['MU','Micron Technology',18,false,'0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD'],
  ['PLTR','Palantir Technologies',18,false,'0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A'],
  ['TTWO','Take-Two Interactive',18,false,'0x5e81213613b6B86EaB4c6c50d718d34359459786'],
  ['RIVN','Rivian Automotive',18,false,'0xB1BF26c1D20ff267A4f93550d1E0d06ac40a114B'],
  ['COST','Costco',18,false,'0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2'],
  ['DJT','Trump Media & Technology Group',18,false,'0x1D11f0496982706C5e14A514D4E79F2e6BdE4516'],
  ['MSTR','Strategy',18,false,'0xec262a75e413fAfD0dF80480274532C79D42da09'],
  ['QQQ','Invesco QQQ',18,false,'0xD5f3879160bc7c32ebb4dC785F8a4F505888de68'],
  ['RDDT','Reddit',18,false,'0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C'],
  ['HIMS','Hims & Hers Health',18,false,'0xCceE82fE024c36fA15E1005edE3E9e4787e23D09'],
  ['BB','BlackBerry',18,false,'0x48E39E56aCdbA37b09020C0b734A613C9a2f100A'],
  ['GLD','SPDR Gold Shares',18,false,'0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e'],
  ['LLY','Eli Lilly',18,false,'0x8005d266423c7ea827372c9c864491e5786600ea'],
  ['WYFI','WhiteFiber',18,false,'0x9e7ABD3C9139D14E4c86DcE0e455AAB7A0C2FB3E'],
  ['TSM','Taiwan Semiconductor',18,false,'0x58FfE4a942d3885bAa22D7520691F611EF09e7AA'],
  ['RBLX','Roblox',18,false,'0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8'],
  ['SKHY','SK hynix',18,false,'0x84CAb63bc87912E71ad199ff14A0bA45de68FeF8'],
  ['DELL','Dell Technologies',18,false,'0x941AE714EC6D8130c7B75d67160Ca08f1e7d11Dd'],
  ['USO','United States Oil Fund',18,false,'0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344'],
  ['SNAP','Snap',18,false,'0xF6589F11Bc40b669e584073F428B05562F568733'],
  ['LULU','Lululemon',18,false,'0x4e62068525Ab11FE768e29dfD00ef909B9803016'],
  ['FIG','Figma',18,false,'0x41F4267525a8AFf329540eF24fD83d9044758B33'],
  ['MRNA','Moderna',18,false,'0x43B07D15cE533bEc5476d70C22a78a1B2B662155'],
  ['PFE','Pfizer',18,false,'0x7066A64c24e4206CD62E83bf198c1E7EB361F51e'],
  ['MRVL','Marvell Technology',18,false,'0x62fd0668e10D8B72339BE2DCF7643001688ff13B'],
  ['JNJ','Johnson & Johnson',18,false,'0x03DfbBE0AC4E7bCDaFd08eD41A400326B77D8c80'],
  ['AMC','AMC Entertainment',18,false,'0x05a3d1Cd21d0C88145E82600E62e7E496e0F222B'],
  ['SGOV','iShares 0-3M Treasury ETF',18,false,'0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5'],
  ['BABA','Alibaba',18,false,'0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4'],
  ['INDA','iShares MSCI India ETF',18,false,'0xACEF2e09adb47aD6aBeBAD9fF06689E60615C2B6'],
  ['IBM','IBM',18,false,'0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619'],
  ['NFLX','Netflix',18,false,'0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8'],
  ['BULL','Webull',18,false,'0xceF9027c7d6985b85f0BA431125073529A947A68'],
  ['NU','Nu Holdings',18,false,'0x408c14038a04f7bD235329E26d2bf569ee20e250'],
  ['SLV','iShares Silver Trust',18,false,'0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f'],
  ['SHOP','Shopify',18,false,'0xF53F66751B1Eff985311b693531E3290F600c410'],
  ['BE','Bloom Energy',18,false,'0x822CC93fFD030293E9842c30BBD678F530701867'],
  ['F','Ford Motor',18,false,'0x25C288E6D899b9BC30160965aD9644c67e73bE0C'],
  ['UPS','United Parcel Service',18,false,'0xf23250dac154D05Bb671CB0d0eBEf3c635c79CE2']
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
 const r=await fetch('/api/upload',{method:'POST',body});
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
 $('#launchForm')?.addEventListener('change',e=>{if(e.target.name==='logo'&&e.target.files?.[0]){const file=e.target.files[0];if(file.size>5242880){setMsg('Logo must be under 5 MB.','bad');return}form.logo=URL.createObjectURL(file);$('.token-mark').innerHTML=`<img src="${form.logo}" alt="">`;$('#logoState').textContent='LOGO READY · upload will be verified before launch';} });
 $('#launchForm')?.addEventListener('submit',async e=>{e.preventDefault();setMsg('');if(!form.name||!form.ticker||!form.buy||!form.logo){setMsg('Name, ticker, logo, and a non-zero initial buy are required.','bad');return}if(!provider||!account||!chainOk){setMsg('Connect the wallet on Robinhood Chain first.','bad');return}if(busy)return;busy=true;render();try{await launchOnPons();}catch(err){busy=false;render();setMsg(err.shortMessage||err.reason||err.message||'Launch failed.','bad')}});
}
window.ethereum?.on?.('accountsChanged',()=>connect().catch(()=>{}));window.ethereum?.on?.('chainChanged',()=>connect().catch(()=>{}));render();
