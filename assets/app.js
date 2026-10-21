// Loja EKKLESIA — dados vêm de data/loja.json, publicado pelo EKKLESIA STUDIO.
import { pixPayload, qrSVG } from './pix.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const round2 = (n) => Math.round(n * 100) / 100;

let D = null; // dados da loja
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
let cart = store.get('ekk-cart', []);

const bySlug = (s) => D.produtos.find((p) => p.slug === s);
const priceOf = (p) => (p.lancamento ? p.lancamento.precoLancamento : p.preco);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2600);
}

// ---------- carrinho ----------
function saveCart() { store.set('ekk-cart', cart); drawCartCount(); }
function drawCartCount() { $('#cartCount').textContent = `(${cart.reduce((n, i) => n + i.qtd, 0)})`; }
const cartLines = () => cart.map((i) => ({ ...i, p: bySlug(i.slug) })).filter((i) => i.p);
const subtotal = () => round2(cartLines().reduce((t, i) => t + priceOf(i.p) * i.qtd, 0));

function addToCart(slug, tam, cor, qtd = 1) {
  const hit = cart.find((i) => i.slug === slug && i.tam === tam && i.cor === cor);
  if (hit) hit.qtd += qtd; else cart.push({ slug, tam, cor, qtd });
  saveCart();
}

function drawCart() {
  const lines = cartLines();
  const sub = subtotal();
  const frete = D.loja.freteGratisAcima ? (sub >= D.loja.freteGratisAcima ? 'Frete grátis' : `Frete a combinar · grátis acima de ${brl(D.loja.freteGratisAcima)}`) : 'Frete a combinar no WhatsApp';
  $('#cart').innerHTML = `
    <div class="drawer-head"><b>SEU CARRINHO</b><button class="icon-btn" data-close aria-label="Fechar">✕</button></div>
    ${lines.length ? `
      <div class="cart-lines">${lines.map((i, k) => `
        <div class="cart-line">
          <img src="${esc(i.p.imagens[0] || '')}" alt="">
          <div>
            <b>${esc(i.p.nome)}</b>
            <small>${esc([i.tam, i.cor].filter(Boolean).join(' · '))}</small>
            <div class="qty"><button data-q="${k}:-1" aria-label="Menos">−</button><span>${i.qtd}</span><button data-q="${k}:1" aria-label="Mais">+</button></div>
          </div>
          <div class="cart-price">${brl(priceOf(i.p) * i.qtd)}<button class="link" data-rm="${k}">remover</button></div>
        </div>`).join('')}</div>
      <div class="cart-foot">
        <div class="row"><span>Subtotal</span><b>${brl(sub)}</b></div>
        <div class="row muted"><span>${frete}</span></div>
        <div class="row gold"><span>Entrada de ${D.loja.entradaPct}% no Pix</span><b>${brl(round2(sub * D.loja.entradaPct / 100))}</b></div>
        <a class="btn gold block" href="#/checkout" data-close>FINALIZAR PEDIDO</a>
      </div>`
    : `<div class="cart-empty"><p>Seu carrinho está vazio.</p><a class="btn outline" href="#/colecao" data-close>VER COLEÇÃO</a></div>`}`;
}

function openDrawer(id) {
  if (id === 'cart') drawCart();
  $(`#${id}`).classList.add('on');
  $(`#${id}`).setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('on');
  document.body.classList.add('lock');
}
function closeDrawers() {
  $$('.drawer').forEach((d) => { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); });
  $('#scrim').classList.remove('on');
  document.body.classList.remove('lock');
}

// ---------- componentes ----------
function priceHTML(p, big = false) {
  if (p.lancamento) return `<div class="price ${big ? 'big' : ''}"><span class="now">${brl(p.lancamento.precoLancamento)}</span><s>${brl(p.preco)}</s><em>-${p.lancamento.desconto}%</em></div>`;
  return `<div class="price ${big ? 'big' : ''}"><span class="now">${brl(p.preco)}</span></div>`;
}
function card(p) {
  const tag = p.lancamento ? `<span class="tag gold">LANÇAMENTO -${p.lancamento.desconto}%</span>` : p.disponibilidade === 'pre-venda' ? '<span class="tag">PRÉ-VENDA</span>' : '';
  return `
    <a class="card" href="#/produto/${esc(p.slug)}">
      <div class="card-img">${p.imagens[0] ? `<img src="${esc(p.imagens[0])}" alt="${esc(p.nome)}" loading="lazy">` : ''}${tag}
        ${p.imagens[1] ? `<img class="alt" src="${esc(p.imagens[1])}" alt="" loading="lazy">` : ''}</div>
      <div class="card-body">
        ${p.versiculo ? `<span class="verse">${esc(p.versiculo)}</span>` : ''}
        <h3>${esc(p.nome)}</h3>
        <span class="muted">${esc(p.genero)}</span>
        ${priceHTML(p)}
        ${p.lancamento ? `<div class="left"><i style="width:${Math.max(4, 100 * p.lancamento.restam / p.lancamento.limite)}%"></i></div><small class="gold-text">Restam ${p.lancamento.restam} de ${p.lancamento.limite} com desconto</small>` : ''}
      </div>
    </a>`;
}
const marquee = (txt) => `<div class="marquee" aria-hidden="true"><div>${`<span>${esc(txt)} ✦ </span>`.repeat(8)}</div></div>`;

// ---------- páginas ----------
function home() {
  const L = D.loja, launch = D.produtos.filter((p) => p.lancamento);
  const hero = L.hero || {};
  const title = esc(hero.titulo || 'Vista o que você crê');
  const word = hero.destaque ? esc(hero.destaque) : '';
  return `
    <section class="hero">
      ${hero.imagem ? `<img class="hero-img" src="${esc(hero.imagem)}" alt="" fetchpriority="high">` : ''}
      <div class="hero-in">
        <span class="badge">COLEÇÃO ${esc(D.marca.nome)} — LANÇAMENTO</span>
        <h1>${title}${word ? `<br><span>${word}</span>` : ''}</h1>
        ${hero.versiculo ? `<p class="hero-verse">${esc(hero.versiculo)}</p>` : ''}
        ${hero.texto ? `<p class="hero-text">${esc(hero.texto)}</p>` : ''}
        <div class="hero-cta"><a class="btn gold" href="#/colecao">VER COLEÇÃO</a><a class="btn outline" href="#/como-comprar">COMO COMPRAR</a></div>
      </div>
    </section>
    ${marquee(L.faixa || `${D.marca.nome} ✦ MODA COM PROPÓSITO`)}
    ${launch.length ? `
    <section class="section">
      <div class="sec-head"><span class="kicker">✦ PRÉ-LANÇAMENTO EXCLUSIVO</span><h2>LANÇAMENTO COM ${Math.max(...launch.map((p) => p.lancamento.desconto))}% OFF</h2>
        <p>Desconto para as primeiras peças vendidas. Garanta a sua com ${L.entradaPct}% de entrada no Pix.</p></div>
      <div class="grid">${launch.map(card).join('')}</div>
    </section>` : ''}
    <section class="section">
      <div class="sec-head"><span class="kicker">✦ PRODUTOS</span><h2>DESTAQUES DO REINO</h2><p>Vista o que você acredita</p></div>
      ${D.produtos.length ? `<div class="grid">${D.produtos.slice(0, 8).map(card).join('')}</div>
      <div class="center"><a class="btn outline" href="#/colecao">VER TODA A COLEÇÃO</a></div>` : '<p class="center muted">Novas peças chegando em breve.</p>'}
    </section>
    ${howTo()}
    <section class="perks">
      <div><b>PIX COM ENTRADA</b><span>${L.entradaPct}% agora, o resto antes do envio</span></div>
      <div><b>PRODUÇÃO SOB ENCOMENDA</b><span>${esc(L.prazoProducao || 'Peças feitas para você')}</span></div>
      <div><b>${L.freteGratisAcima ? 'FRETE GRÁTIS' : 'ENVIO PARA TODO O BRASIL'}</b><span>${L.freteGratisAcima ? `Compras acima de ${brl(L.freteGratisAcima)}` : 'Frete combinado no WhatsApp'}</span></div>
      <div><b>MODA COM PROPÓSITO</b><span>Cada peça carrega uma mensagem</span></div>
    </section>
    ${L.manifesto ? `<section class="manifesto"><span>✝</span><p>“${esc(L.manifesto)}”</p><small>MARCOS 16:15 — IDE POR TODO O MUNDO</small></section>` : ''}`;
}

function howTo() {
  const pct = D.loja.entradaPct;
  return `
    <section class="section how" id="como">
      <div class="sec-head"><span class="kicker">✦ COMO COMPRAR</span><h2>SIMPLES ASSIM</h2></div>
      <ol class="steps">
        <li><b>01</b><h4>Escolha sua peça</h4><p>Tamanho, cor e quantidade. As peças de lançamento têm desconto nas primeiras unidades.</p></li>
        <li><b>02</b><h4>Pague no Pix</h4><p>Dê ${pct}% de entrada para garantir a sua ou pague o valor total. O QR Code e o copia-e-cola saem na hora.</p></li>
        <li><b>03</b><h4>Envie o comprovante</h4><p>O pedido vai pronto para o nosso WhatsApp. Confirmamos e avisamos cada etapa da produção.</p></li>
      </ol>
    </section>`;
}

function collection(q) {
  const f = q.get('f') || 'todos';
  const filters = [['todos', 'Todos'], ['lancamento', 'Lançamentos'], ['Masculino', 'Masculino'], ['Feminino', 'Feminino'], ['Unissex', 'Unissex']];
  const list = D.produtos.filter((p) => f === 'todos' || (f === 'lancamento' ? p.lancamento : p.genero === f));
  return `
    <section class="section page-top">
      <div class="sec-head"><span class="kicker">✦ COLEÇÃO</span><h2>${esc(D.marca.nome)}</h2></div>
      <div class="filters">${filters.map(([id, l]) => `<a href="#/colecao${id === 'todos' ? '' : `?f=${id}`}" class="${f === id ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p class="center muted">Nenhuma peça neste filtro ainda.</p>'}
    </section>`;
}

function productPage(slug) {
  const p = bySlug(slug);
  if (!p) return `<section class="section page-top center"><h2>Peça não encontrada</h2><a class="btn outline" href="#/colecao">VER COLEÇÃO</a></section>`;
  const sizes = Object.keys(p.medidas || {});
  return `
    <section class="pdp page-top">
      <div class="pdp-gallery">
        <div class="pdp-main"><img id="pdpMain" src="${esc(p.imagens[0] || '')}" alt="${esc(p.nome)}"></div>
        ${p.imagens.length > 1 ? `<div class="pdp-thumbs">${p.imagens.map((src, i) => `<button data-img="${esc(src)}" class="${i ? '' : 'on'}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        ${p.versiculo ? `<span class="verse">${esc(p.versiculo)}</span>` : ''}
        <h1>${esc(p.nome)}</h1>
        <span class="muted">${esc(p.genero)} · ${esc(p.categoria)}${p.sku ? ` · ${esc(p.sku)}` : ''}</span>
        ${priceHTML(p, true)}
        ${p.lancamento ? `<div class="launch-box"><b>Lançamento: ${p.lancamento.desconto}% OFF</b><div class="left"><i style="width:${Math.max(4, 100 * p.lancamento.restam / p.lancamento.limite)}%"></i></div><small>Restam <b>${p.lancamento.restam}</b> de ${p.lancamento.limite} peças com desconto.</small></div>` : ''}
        <p class="pix-note">No Pix: <b>${brl(round2(priceOf(p) * D.loja.entradaPct / 100))}</b> de entrada (${D.loja.entradaPct}%) ou o valor total.</p>
        ${p.cores.length ? `<div class="opt"><span>COR</span><div class="chips" data-group="cor">${p.cores.map((c, i) => `<button class="${i ? '' : 'on'}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
        ${p.tamanhos.length ? `<div class="opt"><span>TAMANHO</span><div class="chips" data-group="tam">${p.tamanhos.map((t) => `<button data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : ''}
        <div class="opt"><span>QUANTIDADE</span><div class="qty big"><button data-pq="-1" aria-label="Menos">−</button><span id="pq">1</span><button data-pq="1" aria-label="Mais">+</button></div></div>
        <div class="buy"><button class="btn gold" id="buyNow">COMPRAR AGORA</button><button class="btn outline" id="addCart">ADICIONAR AO CARRINHO</button></div>
        ${p.descricao ? `<div class="desc">${esc(p.descricao).split(/\n{2,}/).map((x) => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
        <dl class="specs">
          ${p.material ? `<dt>Material</dt><dd>${esc(p.material)}${p.gramatura ? ` · ${esc(p.gramatura)} g/m²` : ''}</dd>` : ''}
          ${p.tecnica ? `<dt>Estampa</dt><dd>${esc(p.tecnica)}</dd>` : ''}
          ${D.loja.prazoProducao ? `<dt>Produção</dt><dd>${esc(D.loja.prazoProducao)}</dd>` : ''}
        </dl>
        ${sizes.length ? `<div class="measures"><span>MEDIDAS (cm)</span><table><tr><th></th>${sizes.map((s) => `<th>${esc(s)}</th>`).join('')}</tr>
          <tr><th>Largura</th>${sizes.map((s) => `<td>${esc(p.medidas[s].largura || '—')}</td>`).join('')}</tr>
          <tr><th>Comprimento</th>${sizes.map((s) => `<td>${esc(p.medidas[s].comprimento || '—')}</td>`).join('')}</tr></table></div>` : ''}
      </div>
    </section>`;
}

function bindProduct(slug) {
  const p = bySlug(slug);
  if (!p) return;
  let qtd = 1;
  const sel = { cor: p.cores[0] || '', tam: '' };
  $('#view').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.img) { $('#pdpMain').src = b.dataset.img; $$('.pdp-thumbs button').forEach((x) => x.classList.toggle('on', x === b)); }
    const grp = b.closest('[data-group]');
    if (grp) { sel[grp.dataset.group] = b.dataset.v; $$('button', grp).forEach((x) => x.classList.toggle('on', x === b)); grp.closest('.opt').classList.remove('need'); }
    if (b.dataset.pq) { qtd = Math.max(1, qtd + +b.dataset.pq); $('#pq').textContent = qtd; }
    if (b.id === 'addCart' || b.id === 'buyNow') {
      if (p.tamanhos.length && !sel.tam) { $('[data-group="tam"]').closest('.opt').classList.add('need'); toast('Escolha o tamanho.'); return; }
      addToCart(p.slug, sel.tam, sel.cor, qtd);
      if (b.id === 'buyNow') location.hash = '#/checkout';
      else { toast('Adicionado ao carrinho.'); openDrawer('cart'); }
    }
  });
}

// ---------- checkout ----------
function checkout() {
  const lines = cartLines();
  if (!lines.length) return `<section class="section page-top center"><h2>Carrinho vazio</h2><a class="btn outline" href="#/colecao">VER COLEÇÃO</a></section>`;
  const sub = subtotal(), pct = D.loja.entradaPct, entrada = round2(sub * pct / 100);
  const c = store.get('ekk-cliente', {});
  const f = (n, l, attrs = '') => `<label class="f"><span>${l}</span><input name="${n}" value="${esc(c[n] || '')}" ${attrs}></label>`;
  return `
    <section class="section page-top checkout">
      <div class="sec-head"><span class="kicker">✦ FINALIZAR</span><h2>SEU PEDIDO</h2></div>
      <form id="co" class="co-grid" novalidate>
        <div class="co-form">
          <h3>Seus dados</h3>
          ${f('nome', 'Nome completo', 'required autocomplete="name"')}
          ${f('whats', 'WhatsApp', 'required inputmode="tel" autocomplete="tel" placeholder="(66) 9 9999-9999"')}
          <h3>Entrega</h3>
          <div class="two">${f('cep', 'CEP', 'required inputmode="numeric" autocomplete="postal-code"')}${f('numero', 'Número', 'required')}</div>
          ${f('rua', 'Rua', 'required autocomplete="address-line1"')}
          <div class="two">${f('bairro', 'Bairro', 'required')}${f('complemento', 'Complemento')}</div>
          <div class="two">${f('cidade', 'Cidade', 'required')}${f('uf', 'UF', 'required maxlength="2"')}</div>
          <label class="f"><span>Observação (opcional)</span><textarea name="obs" rows="2"></textarea></label>
        </div>
        <div class="co-side">
          <h3>Resumo</h3>
          ${lines.map((i) => `<div class="sum-line"><span>${i.qtd}× ${esc(i.p.nome)} <small>${esc([i.tam, i.cor].filter(Boolean).join(' · '))}</small></span><b>${brl(priceOf(i.p) * i.qtd)}</b></div>`).join('')}
          <div class="sum-line total"><span>Total</span><b>${brl(sub)}</b></div>
          <p class="muted small">${D.loja.freteGratisAcima && sub >= D.loja.freteGratisAcima ? 'Frete grátis.' : 'Frete combinado no WhatsApp após o pedido.'}</p>
          <h3>Pagamento via Pix</h3>
          <label class="pay"><input type="radio" name="modo" value="entrada" checked><span><b>Entrada de ${pct}%: ${brl(entrada)}</b><small>O restante (${brl(round2(sub - entrada))}) antes do envio.</small></span></label>
          <label class="pay"><input type="radio" name="modo" value="total"><span><b>Pagamento total: ${brl(sub)}</b><small>Quitado agora.</small></span></label>
          <button class="btn gold block">GERAR PIX DO PEDIDO</button>
          <p class="muted small">Depois do Pix, envie o comprovante no WhatsApp. O pedido vai pronto na mensagem.</p>
        </div>
      </form>
    </section>`;
}

function bindCheckout() {
  const form = $('#co');
  if (!form) return;
  form.cep.addEventListener('blur', async () => {
    const cep = form.cep.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (r.erro) return;
      form.rua.value ||= r.logradouro || '';
      form.bairro.value ||= r.bairro || '';
      form.cidade.value = r.localidade || form.cidade.value;
      form.uf.value = r.uf || form.uf.value;
      form.numero.focus();
    } catch { /* sem internet: preenche à mão */ }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const missing = ['nome', 'whats', 'cep', 'numero', 'rua', 'bairro', 'cidade', 'uf'].filter((k) => !String(fd[k] || '').trim());
    $$('.f', form).forEach((l) => l.classList.toggle('need', missing.includes(l.querySelector('input')?.name)));
    if (missing.length) { toast('Preencha os campos destacados.'); return; }
    const { modo, obs, ...cliente } = fd;
    store.set('ekk-cliente', cliente);
    const sub = subtotal();
    const pct = D.loja.entradaPct;
    const valor = modo === 'total' ? sub : round2(sub * pct / 100);
    const code = `EKK${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const pedido = {
      code, at: Date.now(), modo, pct, total: sub, valor, restante: round2(sub - valor), obs, cliente,
      itens: cartLines().map((i) => ({ slug: i.slug, nome: i.p.nome, sku: i.p.sku, tam: i.tam, cor: i.cor, qtd: i.qtd, preco: priceOf(i.p) })),
    };
    const pedidos = store.get('ekk-pedidos', []);
    pedidos.unshift(pedido);
    store.set('ekk-pedidos', pedidos.slice(0, 30));
    cart = []; saveCart();
    location.hash = `#/pedido/${code}`;
  });
}

function orderMessage(o) {
  const c = o.cliente;
  return [
    `*Novo pedido ${o.code}* — ${D.marca.nome}`,
    '',
    ...o.itens.map((i) => `• ${i.qtd}x ${i.nome}${i.sku ? ` (${i.sku})` : ''} — ${[i.tam, i.cor].filter(Boolean).join(' / ')} — ${brl(i.preco * i.qtd)}`),
    '',
    `Total: ${brl(o.total)}`,
    o.modo === 'total' ? `Pago no Pix: ${brl(o.valor)} (valor total)` : `Entrada no Pix (${o.pct}%): ${brl(o.valor)} · restante: ${brl(o.restante)}`,
    '',
    `Cliente: ${c.nome} · ${c.whats}`,
    `Entrega: ${c.rua}, ${c.numero}${c.complemento ? ` (${c.complemento})` : ''} — ${c.bairro}, ${c.cidade}/${c.uf} — CEP ${c.cep}`,
    o.obs ? `Obs.: ${o.obs}` : '',
    '',
    'Segue o comprovante do Pix 👇',
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}

function orderPage(code) {
  const o = store.get('ekk-pedidos', []).find((x) => x.code === code);
  if (!o) return `<section class="section page-top center"><h2>Pedido não encontrado neste aparelho</h2><a class="btn outline" href="#/">VOLTAR</a></section>`;
  const pix = D.loja.pix?.chave ? pixPayload({ ...D.loja.pix, valor: o.valor, txid: o.code }) : '';
  const wa = D.loja.whatsapp ? `https://wa.me/${D.loja.whatsapp}?text=${encodeURIComponent(orderMessage(o))}` : '';
  return `
    <section class="section page-top order">
      <div class="sec-head"><span class="kicker">✦ PEDIDO ${esc(o.code)}</span><h2>PAGUE NO PIX</h2>
        <p>${o.modo === 'total' ? 'Pagamento total' : `Entrada de ${o.pct}%`}: <b class="gold-text">${brl(o.valor)}</b>${o.modo === 'total' ? '' : ` · restante ${brl(o.restante)} antes do envio`}</p></div>
      ${pix ? `
      <div class="pix-box">
        <div class="qr">${qrSVG(pix, 240)}</div>
        <div class="pix-side">
          <ol class="mini-steps"><li>Abra o app do seu banco e escolha <b>Pix → Ler QR Code</b> ou <b>Pix copia e cola</b>.</li><li>Confira o valor de <b>${brl(o.valor)}</b> e o recebedor <b>${esc(D.loja.pix.nome)}</b>.</li><li>Depois de pagar, envie o comprovante no WhatsApp.</li></ol>
          <label class="f"><span>Pix copia e cola</span><textarea readonly rows="3" id="pixCode">${esc(pix)}</textarea></label>
          <button class="btn outline block" id="copyPix">COPIAR CÓDIGO PIX</button>
          ${wa ? `<a class="btn gold block" href="${esc(wa)}" target="_blank" rel="noopener">ENVIAR PEDIDO E COMPROVANTE NO WHATSAPP</a>` : ''}
        </div>
      </div>` : '<p class="center muted">Pagamento indisponível no momento. Fale com a gente no WhatsApp.</p>'}
      <div class="order-items">${o.itens.map((i) => `<div class="sum-line"><span>${i.qtd}× ${esc(i.nome)} <small>${esc([i.tam, i.cor].filter(Boolean).join(' · '))}</small></span><b>${brl(i.preco * i.qtd)}</b></div>`).join('')}
        <div class="sum-line total"><span>Total do pedido</span><b>${brl(o.total)}</b></div></div>
    </section>`;
}

function bindOrder() {
  $('#copyPix')?.addEventListener('click', async () => {
    const t = $('#pixCode');
    try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
    toast('Código Pix copiado.');
  });
}

function ordersPage() {
  const list = store.get('ekk-pedidos', []);
  return `
    <section class="section page-top">
      <div class="sec-head"><span class="kicker">✦ MEUS PEDIDOS</span><h2>FEITOS NESTE APARELHO</h2></div>
      ${list.length ? `<div class="orders">${list.map((o) => `<a class="order-row" href="#/pedido/${esc(o.code)}"><b>${esc(o.code)}</b><span>${new Date(o.at).toLocaleDateString('pt-BR')}</span><span>${o.itens.reduce((n, i) => n + i.qtd, 0)} peça(s)</span><b class="gold-text">${brl(o.total)}</b></a>`).join('')}</div>` : '<p class="center muted">Nenhum pedido ainda.</p>'}
    </section>`;
}

// ---------- casca ----------
function chrome() {
  const L = D.loja;
  $('#topbar').textContent = L.freteGratisAcima ? `✦ FRETE GRÁTIS EM COMPRAS ACIMA DE ${brl(L.freteGratisAcima).replace(/\s/g, ' ')} ✦ ${L.entradaPct}% DE ENTRADA NO PIX` : `✦ PRÉ-VENDA: GARANTA COM ${L.entradaPct}% DE ENTRADA NO PIX`;
  if (D.marca.logo) $('#logoImg').src = D.marca.logo;
  const wa = L.whatsapp ? `https://wa.me/${L.whatsapp}` : '';
  if (wa) { $('#waFloat').href = wa; $('#waFloat').hidden = false; }
  const social = [D.marca.instagram && `<a href="${esc(D.marca.instagram)}" target="_blank" rel="noopener">Instagram</a>`, wa && `<a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>`].filter(Boolean).join('');
  $('#menuSocial').innerHTML = social;
  $('#footer').innerHTML = `
    <img src="${esc(D.marca.logo || 'img/logo.png')}" alt="${esc(D.marca.nome)}" class="foot-logo">
    ${D.marca.frase ? `<p class="foot-verse">${esc(D.marca.frase)}</p>` : ''}
    <div class="foot-links"><a href="#/colecao">Coleção</a><a href="#/como-comprar">Como comprar</a><a href="#/pedidos">Meus pedidos</a>${social}</div>
    <small>© ${new Date().getFullYear()} ${esc(D.marca.nome)}. Pagamento via Pix.</small>`;
}

function route() {
  const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const q = new URLSearchParams(qs);
  const parts = path.split('/');
  const old = $('#view');
  const view = old.cloneNode(false); // novo nó: listeners da página anterior somem
  old.replaceWith(view);
  let html, bind = () => {};
  if (!path) html = home();
  else if (parts[0] === 'colecao') html = collection(q);
  else if (parts[0] === 'produto') { html = productPage(decodeURIComponent(parts[1] || '')); bind = () => bindProduct(decodeURIComponent(parts[1] || '')); }
  else if (parts[0] === 'checkout') { html = checkout(); bind = bindCheckout; }
  else if (parts[0] === 'pedido') { html = orderPage(parts[1]); bind = bindOrder; }
  else if (parts[0] === 'pedidos') html = ordersPage();
  else if (parts[0] === 'como-comprar') html = `<div class="page-top">${howTo()}</div>`;
  else html = home();
  view.innerHTML = html;
  bind();
  closeDrawers();
  window.scrollTo(0, 0);
  const p = parts[0] === 'produto' && bySlug(decodeURIComponent(parts[1] || ''));
  document.title = p ? `${p.nome} — ${D.marca.nome}` : `${D.marca.nome} — Streetwear Cristão Premium`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#menuBtn')) openDrawer('menu');
  else if (e.target.closest('#cartBtn')) openDrawer('cart');
  else if (e.target.closest('[data-close]') || e.target.id === 'scrim') {
    if (e.target.closest('a[href]')) return; // link fecha via rota
    closeDrawers();
  }
  const q = e.target.closest('[data-q]');
  if (q) { const [k, d] = q.dataset.q.split(':').map(Number); cart[k].qtd = Math.max(1, cart[k].qtd + d); saveCart(); drawCart(); }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.splice(+rm.dataset.rm, 1); saveCart(); drawCart(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });
window.addEventListener('hashchange', route);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

(async () => {
  try {
    D = await (await fetch(`data/loja.json?v=${Date.now()}`, { cache: 'no-store' })).json();
  } catch {
    $('#view').innerHTML = '<section class="section center"><h2>Loja em manutenção</h2><p class="muted">Volte em instantes.</p></section>';
    return;
  }
  cart = cart.filter((i) => bySlug(i.slug));
  saveCart();
  chrome();
  route();
})();
