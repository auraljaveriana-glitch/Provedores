(function(){
  "use strict";

  var BUCKET = "cotizaciones-files";

  if(!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.indexOf("TU-PROYECTO") !== -1){
    document.body.innerHTML = '<div style="max-width:520px;margin:80px auto;padding:24px;font-family:system-ui;line-height:1.5;">' +
      '<h2>Falta configurar Supabase</h2>' +
      '<p>Abre <code>supabase-config.js</code> y pega la URL y la llave pública (anon key) de tu proyecto de Supabase ' +
      '(Project Settings &rarr; API en el panel de Supabase).</p></div>';
    return;
  }

  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  var providers = [];
  var quotes = [];
  var currentUser = null; // { id, email }
  var canWrite = false;
  var uploading = false;
  var pendingProviderId = null;
  var quickProviderMode = false;
  var lastCreatedProviderId = null;

  var COP = new Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0});
  var USD = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});
  function fmtAmount(amount, currency){
    if(currency === 'USD') return USD.format(amount||0);
    if(currency === 'COP') return COP.format(amount||0);
    return new Intl.NumberFormat('es-CO').format(amount||0) + ' ' + (currency||'');
  }
  function fmtDate(iso){
    if(!iso) return '—';
    var d = new Date(iso + 'T00:00:00');
    if(isNaN(d)) return iso;
    return d.toLocaleDateString('es-CO', {day:'2-digit', month:'short', year:'numeric'});
  }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function orNull(v){ return (v===undefined || v===null || v==='') ? null : v; }

  function quoteStatus(q){
    if(q.balance_paid) return {key:'completo', label:'Pagado completo'};
    if(q.deposit_paid){
      var overdue = q.balance_date && q.balance_date < todayISO();
      return overdue ? {key:'atrasado', label:'Saldo atrasado'} : {key:'abono', label:'Abono 50% pagado'};
    }
    var overdueDep = q.deposit_date && q.deposit_date < todayISO();
    if(overdueDep) return {key:'atrasado', label:'Pago atrasado'};
    return {key:'pendiente', label:'Pendiente'};
  }
  function remaining(q){
    if(q.balance_paid) return 0;
    if(q.deposit_paid) return (q.amount||0) * 0.5;
    return q.amount||0;
  }
  function providerName(id){
    var p = providers.find(function(x){ return x.id===id; });
    return p ? p.name : '(proveedor eliminado)';
  }

  /* ---------------- rendering ---------------- */

  function renderStats(){
    var total = quotes.length;
    var pendiente=0, abono=0, completo=0, valorCOP=0, saldoCOP=0, aprobadas=0;
    quotes.forEach(function(q){
      var st = quoteStatus(q).key;
      if(st==='completo') completo++;
      else if(st==='pendiente') pendiente++;
      else abono++;
      if(q.approved) aprobadas++;
      if(q.currency==='COP'){ valorCOP += (q.amount||0); saldoCOP += remaining(q); }
    });
    var tiles = [
      {n: total, l:'Cotizaciones registradas'},
      {n: aprobadas, l:'Aprobadas'},
      {n: pendiente, l:'Pendientes'},
      {n: abono, l:'Abono 50% pagado'},
      {n: completo, l:'Pagadas completo'},
      {n: COP.format(valorCOP), l:'Valor total (COP)', accent:true},
      {n: COP.format(saldoCOP), l:'Saldo por pagar (COP)', accent:true}
    ];
    document.getElementById('stats').innerHTML = tiles.map(function(t){
      return '<div class="stat'+(t.accent?' accent':'')+'"><div class="num">'+t.n+'</div><div class="label">'+t.l+'</div></div>';
    }).join('');
  }

  function renderProviderOptions(){
    var sel = document.getElementById('q-filter-provider');
    var current = sel.value;
    sel.innerHTML = '<option value="">Todos los proveedores</option>' + providers.map(function(p){
      return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';
    }).join('');
    sel.value = current;

    var qsel = document.getElementById('qt-provider');
    var qcurrent = qsel.value;
    qsel.innerHTML = providers.map(function(p){
      return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';
    }).join('') || '<option value="">Aún no hay proveedores — usa "+ Nuevo"</option>';

    if(pendingProviderId && providers.some(function(p){ return p.id===pendingProviderId; })){
      qsel.value = pendingProviderId;
      var newProv = providers.find(function(p){ return p.id===pendingProviderId; });
      pendingProviderId = null;
      if(newProv){
        if(!document.getElementById('qt-rut').value) document.getElementById('qt-rut').value = newProv.rut||'';
        if(!document.getElementById('qt-bank').value) document.getElementById('qt-bank').value = newProv.bank||'';
        if(!document.getElementById('qt-account-type').value) document.getElementById('qt-account-type').value = newProv.account_type||'';
        if(!document.getElementById('qt-account-number').value) document.getElementById('qt-account-number').value = newProv.account_number||'';
      }
    } else if(qcurrent){
      qsel.value = qcurrent;
    }
  }

  function renderQuotes(){
    var search = document.getElementById('q-search').value.trim().toLowerCase();
    var fProvider = document.getElementById('q-filter-provider').value;
    var fStatus = document.getElementById('q-filter-status').value;

    var list = quotes.filter(function(q){
      if(fProvider && q.provider_id !== fProvider) return false;
      var st = quoteStatus(q).key;
      if(fStatus && !(fStatus===st)) return false;
      if(search){
        var hay = (q.description+' '+providerName(q.provider_id)).toLowerCase();
        if(hay.indexOf(search)===-1) return false;
      }
      return true;
    }).sort(function(a,b){ return (b.created_at||'').localeCompare(a.created_at||''); });

    document.getElementById('quotes-empty').hidden = quotes.length !== 0;
    document.getElementById('quotes-list').innerHTML = list.map(renderQuoteCard).join('');

    list.forEach(function(q){
      var depEl = document.getElementById('dep-'+q.id);
      var balEl = document.getElementById('bal-'+q.id);
      if(depEl) depEl.addEventListener('change', function(){ togglePaid(q.id,'deposit_paid', depEl.checked); });
      if(balEl) balEl.addEventListener('change', function(){ togglePaid(q.id,'balance_paid', balEl.checked); });
      var delBtn = document.getElementById('delq-'+q.id);
      if(delBtn) delBtn.addEventListener('click', function(){ deleteQuote(q.id); });
      var editBtn = document.getElementById('editq-'+q.id);
      if(editBtn) editBtn.addEventListener('click', function(){ openQuoteDialog(q.id); });
      var fileBtn = document.getElementById('file-'+q.id);
      if(fileBtn) fileBtn.addEventListener('click', function(){ openQuoteFile(q); });
    });
  }

  function renderQuoteCard(q){
    var st = quoteStatus(q);
    var fileHtml = q.file_path ? '<button type="button" class="file-link" id="file-'+q.id+'" style="background:none;border:none;padding:0;cursor:pointer;">📎 '+esc(q.file_name||'Ver archivo')+'</button>' : '';

    var acctBits = [];
    if(q.deposit_sent) acctBits.push('Abono env. contab.: <b>'+fmtDate(q.deposit_sent)+'</b>');
    if(q.deposit_acc_paid) acctBits.push('Abono pagado por contab.: <b>'+fmtDate(q.deposit_acc_paid)+'</b>');
    if(q.balance_sent) acctBits.push('Saldo env. contab.: <b>'+fmtDate(q.balance_sent)+'</b>');
    if(q.balance_acc_paid) acctBits.push('Saldo pagado por contab.: <b>'+fmtDate(q.balance_acc_paid)+'</b>');

    return ''+
    '<div class="qcard">'+
      '<div class="main">'+
        '<div class="prov">'+esc(providerName(q.provider_id))+(q.approved ? ' <span class="badge-approved">Aprobada</span>' : '')+'</div>'+
        '<div class="desc">'+esc(q.description)+'</div>'+
        '<div class="meta">'+
          '<span>Cotizada: <b>'+fmtDate(q.quote_date)+'</b></span>'+
          '<span>Pago 50%: <b>'+fmtDate(q.deposit_date)+'</b></span>'+
          '<span>Pago completo: <b>'+fmtDate(q.balance_date)+'</b></span>'+
        '</div>'+
        '<div class="paypills">'+
          '<label class="paytoggle'+(q.deposit_paid?' done':'')+'"><input type="checkbox" id="dep-'+q.id+'" '+(q.deposit_paid?'checked':'')+ (canWrite?'':' disabled') +'> Abono 50% pagado</label>'+
          '<label class="paytoggle'+(q.balance_paid?' done':'')+'"><input type="checkbox" id="bal-'+q.id+'" '+(q.balance_paid?'checked':'')+ (canWrite?'':' disabled') +'> Pago completo</label>'+
        '</div>'+
        (acctBits.length ? '<div class="acct-track">'+acctBits.join('<span>·</span>')+'</div>' : '')+
        (q.rut || q.account_number ? '<div class="acct-track">'+(q.rut?('RUT: <b>'+esc(q.rut)+'</b>'):'')+(q.account_number?(' · Cuenta: <b>'+esc([q.bank,q.account_type,q.account_number].filter(Boolean).join(' ')) +'</b>'):'')+'</div>' : '')+
        (q.created_by ? '<div class="acct-track">Registrada por <b>'+esc(q.created_by)+'</b>'+(q.updated_by && q.updated_by!==q.created_by ? ' · última edición por <b>'+esc(q.updated_by)+'</b>' : '')+'</div>' : '')+
        (fileHtml ? '<div style="margin-top:8px;">'+fileHtml+'</div>' : '')+
      '</div>'+
      '<div class="side">'+
        '<span class="pill '+st.key+'">'+st.label+'</span>'+
        '<span class="amount">'+fmtAmount(q.amount, q.currency)+'</span>'+
        (canWrite ? '<div class="actions"><button class="btn-text" id="editq-'+q.id+'" type="button">Editar</button><button class="btn-text danger" id="delq-'+q.id+'" type="button">Eliminar</button></div>' : '')+
      '</div>'+
    '</div>';
  }

  function renderProviders(){
    var search = document.getElementById('p-search').value.trim().toLowerCase();
    var list = providers.filter(function(p){
      if(!search) return true;
      return ((p.name||'')+' '+(p.category||'')).toLowerCase().indexOf(search)!==-1;
    }).sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });

    document.getElementById('providers-empty').hidden = providers.length !== 0;
    document.getElementById('providers-grid').innerHTML = list.map(function(p){
      var qCount = quotes.filter(function(q){ return q.provider_id===p.id; }).length;
      var cuenta = [p.bank, p.account_type, p.account_number].filter(Boolean).join(' · ');
      return ''+
      '<div class="pcard">'+
        (p.category ? '<span class="cat">'+esc(p.category)+'</span>' : '')+
        '<div class="name">'+esc(p.name)+(p.code ? ' <span style="color:var(--text-soft);font-weight:500;font-size:12px;">('+esc(p.code)+')</span>' : '')+'</div>'+
        '<div class="info">'+
          (p.contact ? esc(p.contact)+'<br>' : '')+
          (p.phone ? esc(p.phone)+'<br>' : '')+
          (p.email ? esc(p.email)+'<br>' : '')+
          (p.city ? esc(p.city) : '')+
        '</div>'+
        (p.rut || cuenta ? '<div class="info" style="border-top:1px dashed var(--border);padding-top:7px;">'+
          (p.rut ? 'RUT: <b style="color:var(--text)">'+esc(p.rut)+'</b><br>' : '')+
          (cuenta ? 'Cuenta: '+esc(cuenta) : '')+
        '</div>' : '')+
        '<div class="count">Cotizaciones: <b>'+qCount+'</b></div>'+
        (p.created_by ? '<div class="count">Agregado por <b>'+esc(p.created_by)+'</b></div>' : '')+
        (canWrite ? '<div class="actions"><button class="btn-text" id="editp-'+p.id+'" type="button">Editar</button><button class="btn-text danger" id="delp-'+p.id+'" type="button">Eliminar</button></div>' : '')+
      '</div>';
    }).join('');

    list.forEach(function(p){
      var editBtn = document.getElementById('editp-'+p.id);
      var delBtn = document.getElementById('delp-'+p.id);
      if(editBtn) editBtn.addEventListener('click', function(){ openProviderDialog(p.id); });
      if(delBtn) delBtn.addEventListener('click', function(){ deleteProvider(p.id); });
    });
  }

  function renderCompare(){
    var term = document.getElementById('c-search').value.trim().toLowerCase();
    var wrap = document.getElementById('compare-results');
    var emptyMsg = document.getElementById('compare-empty');
    if(!term){ wrap.innerHTML=''; emptyMsg.hidden=false; emptyMsg.textContent='Escribe qué producto o servicio quieres comparar entre proveedores — se agruparán las cotizaciones que coincidan y se resaltará la de mejor precio.'; return; }
    var matches = quotes.filter(function(q){
      return (q.description||'').toLowerCase().indexOf(term)!==-1;
    });
    if(matches.length===0){
      wrap.innerHTML='';
      emptyMsg.hidden=false;
      emptyMsg.textContent = 'No hay cotizaciones que coincidan con "'+term+'".';
      return;
    }
    emptyMsg.hidden = true;
    var copOnes = matches.filter(function(q){ return q.currency==='COP'; });
    var minAmount = copOnes.length ? Math.min.apply(null, copOnes.map(function(q){ return q.amount||Infinity; })) : null;
    matches.sort(function(a,b){ return (a.amount||0)-(b.amount||0); });

    wrap.innerHTML = '<div class="compare-group"><div class="compare-cards">' + matches.map(function(q){
      var isBest = minAmount!==null && q.currency==='COP' && q.amount===minAmount;
      return ''+
      '<div class="ccard'+(isBest?' best':'')+'">'+
        (isBest ? '<span class="best-badge">Mejor precio</span>' : '')+
        '<div class="prov">'+esc(providerName(q.provider_id))+'</div>'+
        '<div class="amount" style="color:var(--navy)">'+fmtAmount(q.amount,q.currency)+'</div>'+
        '<div class="desc">'+esc(q.description)+'</div>'+
        '<div class="desc" style="margin-top:6px;">'+quoteStatus(q).label+'</div>'+
      '</div>';
    }).join('') + '</div></div>';
  }

  function renderAll(){
    renderStats();
    renderProviderOptions();
    renderQuotes();
    renderProviders();
    renderCompare();
  }

  /* ---------------- data ops ---------------- */

  function meta(isNew){
    var email = currentUser ? currentUser.email : null;
    var m = { updated_by: email };
    if(isNew) m.created_by = email;
    return m;
  }

  function fetchProviders(){
    return sb.from('providers').select('*').then(function(res){
      if(res.error){ console.error(res.error); return; }
      providers = res.data || [];
      renderAll();
    });
  }
  function fetchQuotes(){
    return sb.from('quotes').select('*').then(function(res){
      if(res.error){ console.error(res.error); return; }
      quotes = res.data || [];
      renderAll();
    });
  }

  function togglePaid(id, field, value){
    var patch = {}; patch[field] = value; Object.assign(patch, meta(false));
    sb.from('quotes').update(patch).eq('id', id).then(function(res){
      if(res.error){ alert('No se pudo actualizar: '+res.error.message); }
      fetchQuotes();
    });
  }

  function deleteQuote(id){
    if(!confirm('¿Eliminar esta cotización? Esta acción no se puede deshacer.')) return;
    var q = quotes.find(function(x){ return x.id===id; });
    sb.from('quotes').delete().eq('id', id).then(function(res){
      if(res.error){ alert('No se pudo eliminar: '+res.error.message); return; }
      if(q && q.file_path){ sb.storage.from(BUCKET).remove([q.file_path]); }
      fetchQuotes();
    });
  }

  function deleteProvider(id){
    var has = quotes.some(function(q){ return q.provider_id===id; });
    var msg = has ? '¿Eliminar este proveedor? Sus cotizaciones existentes quedarán como "proveedor eliminado".' : '¿Eliminar este proveedor?';
    if(!confirm(msg)) return;
    sb.from('providers').delete().eq('id', id).then(function(res){
      if(res.error){ alert('No se pudo eliminar: '+res.error.message); return; }
      fetchProviders(); fetchQuotes();
    });
  }

  function openQuoteFile(q){
    if(!q.file_path) return;
    sb.storage.from(BUCKET).createSignedUrl(q.file_path, 3600).then(function(res){
      if(res.error || !res.data){ alert('No se pudo abrir el archivo.'); return; }
      window.open(res.data.signedUrl, '_blank', 'noopener');
    });
  }

  /* ---------------- dialogs ---------------- */

  function openProviderDialog(id){
    var dlg = document.getElementById('dlg-provider');
    var p = id ? providers.find(function(x){ return x.id===id; }) : null;
    document.getElementById('dlg-provider-title').textContent = p ? 'Editar proveedor' : 'Nuevo proveedor';
    document.getElementById('pv-id').value = p ? p.id : '';
    document.getElementById('pv-name').value = p ? (p.name||'') : '';
    document.getElementById('pv-category').value = p ? (p.category||'') : '';
    document.getElementById('pv-contact').value = p ? (p.contact||'') : '';
    document.getElementById('pv-phone').value = p ? (p.phone||'') : '';
    document.getElementById('pv-email').value = p ? (p.email||'') : '';
    document.getElementById('pv-city').value = p ? (p.city||'') : '';
    document.getElementById('pv-code').value = p ? (p.code||'') : '';
    document.getElementById('pv-rut').value = p ? (p.rut||'') : '';
    document.getElementById('pv-bank').value = p ? (p.bank||'') : '';
    document.getElementById('pv-account-type').value = p ? (p.account_type||'') : '';
    document.getElementById('pv-account-number').value = p ? (p.account_number||'') : '';
    document.getElementById('pv-notes').value = p ? (p.notes||'') : '';
    dlg.showModal();
  }

  function openQuoteDialog(id){
    var dlg = document.getElementById('dlg-quote');
    var q = id ? quotes.find(function(x){ return x.id===id; }) : null;
    document.getElementById('dlg-quote-title').textContent = q ? 'Editar cotización' : 'Nueva cotización';
    document.getElementById('qt-id').value = q ? q.id : '';
    renderProviderOptions();
    document.getElementById('qt-provider').value = q ? q.provider_id : (providers[0] && providers[0].id) || '';
    document.getElementById('qt-desc').value = q ? (q.description||'') : '';
    document.getElementById('qt-amount').value = q ? (q.amount||'') : '';
    document.getElementById('qt-currency').value = q ? (q.currency||'COP') : 'COP';
    document.getElementById('qt-quotedate').value = q ? (q.quote_date||'') : todayISO();
    document.getElementById('qt-deposit-date').value = q ? (q.deposit_date||'') : '';
    document.getElementById('qt-deposit-paid').checked = q ? !!q.deposit_paid : false;
    document.getElementById('qt-deposit-sent').value = q ? (q.deposit_sent||'') : '';
    document.getElementById('qt-deposit-acc-paid').value = q ? (q.deposit_acc_paid||'') : '';
    document.getElementById('qt-balance-date').value = q ? (q.balance_date||'') : '';
    document.getElementById('qt-balance-paid').checked = q ? !!q.balance_paid : false;
    document.getElementById('qt-balance-sent').value = q ? (q.balance_sent||'') : '';
    document.getElementById('qt-balance-acc-paid').value = q ? (q.balance_acc_paid||'') : '';
    document.getElementById('qt-notes').value = q ? (q.notes||'') : '';
    document.getElementById('qt-file').value = '';
    document.getElementById('qt-file-current').textContent = q && q.file_name ? ('Archivo actual: '+q.file_name) : '';

    document.getElementById('qt-approved').checked = q ? !!q.approved : false;
    document.getElementById('qt-approved-date').value = q ? (q.approved_date||'') : '';
    var prov = providers.find(function(x){ return x.id === (q ? q.provider_id : document.getElementById('qt-provider').value); });
    document.getElementById('qt-rut').value = q ? (q.rut||'') : (prov ? (prov.rut||'') : '');
    document.getElementById('qt-bank').value = q ? (q.bank||'') : (prov ? (prov.bank||'') : '');
    document.getElementById('qt-account-type').value = q ? (q.account_type||'') : (prov ? (prov.account_type||'') : '');
    document.getElementById('qt-account-number').value = q ? (q.account_number||'') : (prov ? (prov.account_number||'') : '');
    document.getElementById('qt-accounting-section').hidden = !(q ? q.approved : false);
    dlg.showModal();
  }

  document.querySelectorAll('[data-close]').forEach(function(btn){
    btn.addEventListener('click', function(){ document.getElementById(btn.getAttribute('data-close')).close(); });
  });

  document.getElementById('btn-new-provider').addEventListener('click', function(){ openProviderDialog(null); });
  document.getElementById('btn-new-quote').addEventListener('click', function(){ openQuoteDialog(null); });

  document.getElementById('qt-approved').addEventListener('change', function(){
    document.getElementById('qt-accounting-section').hidden = !this.checked;
    if(this.checked && !document.getElementById('qt-approved-date').value){
      document.getElementById('qt-approved-date').value = todayISO();
    }
  });

  document.getElementById('qt-provider').addEventListener('change', function(){
    var prov = providers.find(function(x){ return x.id === document.getElementById('qt-provider').value; });
    if(!prov) return;
    if(!document.getElementById('qt-rut').value) document.getElementById('qt-rut').value = prov.rut||'';
    if(!document.getElementById('qt-bank').value) document.getElementById('qt-bank').value = prov.bank||'';
    if(!document.getElementById('qt-account-type').value) document.getElementById('qt-account-type').value = prov.account_type||'';
    if(!document.getElementById('qt-account-number').value) document.getElementById('qt-account-number').value = prov.account_number||'';
  });

  document.getElementById('btn-quick-provider').addEventListener('click', function(){
    quickProviderMode = true;
    openProviderDialog(null);
  });

  document.getElementById('dlg-provider').addEventListener('close', function(){
    if(quickProviderMode && lastCreatedProviderId){
      pendingProviderId = lastCreatedProviderId;
      renderProviderOptions();
    }
    quickProviderMode = false;
    lastCreatedProviderId = null;
  });

  document.getElementById('form-provider').addEventListener('submit', function(ev){
    ev.preventDefault();
    var id = document.getElementById('pv-id').value;
    var data = {
      name: document.getElementById('pv-name').value.trim(),
      category: document.getElementById('pv-category').value.trim(),
      contact: document.getElementById('pv-contact').value.trim(),
      phone: document.getElementById('pv-phone').value.trim(),
      email: document.getElementById('pv-email').value.trim(),
      city: document.getElementById('pv-city').value.trim(),
      code: document.getElementById('pv-code').value.trim(),
      rut: document.getElementById('pv-rut').value.trim(),
      bank: document.getElementById('pv-bank').value.trim(),
      account_type: document.getElementById('pv-account-type').value,
      account_number: document.getElementById('pv-account-number').value.trim(),
      notes: document.getElementById('pv-notes').value.trim()
    };
    Object.assign(data, meta(!id));
    if(!data.name) return;

    var submitBtn = document.getElementById('dlg-provider').querySelector('button[type=submit]');
    submitBtn.disabled = true;
    var task = id ? sb.from('providers').update(data).eq('id', id) : sb.from('providers').insert(data).select().single();
    task.then(function(res){
      submitBtn.disabled = false;
      if(res.error){ alert('No se pudo guardar: '+res.error.message); return; }
      if(!id && res.data && res.data.id) lastCreatedProviderId = res.data.id;
      document.getElementById('dlg-provider').close();
      fetchProviders();
    });
  });

  document.getElementById('form-quote').addEventListener('submit', function(ev){
    ev.preventDefault();
    if(uploading) return;
    var id = document.getElementById('qt-id').value;
    var existing = id ? quotes.find(function(x){ return x.id===id; }) : null;
    var data = {
      provider_id: document.getElementById('qt-provider').value,
      description: document.getElementById('qt-desc').value.trim(),
      amount: parseFloat(document.getElementById('qt-amount').value) || 0,
      currency: document.getElementById('qt-currency').value,
      quote_date: orNull(document.getElementById('qt-quotedate').value),
      deposit_date: orNull(document.getElementById('qt-deposit-date').value),
      deposit_paid: document.getElementById('qt-deposit-paid').checked,
      deposit_sent: orNull(document.getElementById('qt-deposit-sent').value),
      deposit_acc_paid: orNull(document.getElementById('qt-deposit-acc-paid').value),
      balance_date: orNull(document.getElementById('qt-balance-date').value),
      balance_paid: document.getElementById('qt-balance-paid').checked,
      balance_sent: orNull(document.getElementById('qt-balance-sent').value),
      balance_acc_paid: orNull(document.getElementById('qt-balance-acc-paid').value),
      approved: document.getElementById('qt-approved').checked,
      approved_date: orNull(document.getElementById('qt-approved-date').value),
      rut: document.getElementById('qt-rut').value.trim(),
      bank: document.getElementById('qt-bank').value.trim(),
      account_type: document.getElementById('qt-account-type').value,
      account_number: document.getElementById('qt-account-number').value.trim(),
      notes: document.getElementById('qt-notes').value.trim()
    };
    Object.assign(data, meta(!id));
    if(!data.provider_id || !data.description) return;

    var fileInput = document.getElementById('qt-file');
    var file = fileInput.files && fileInput.files[0];
    var submitBtn = document.getElementById('qt-submit');
    submitBtn.disabled = true;
    uploading = true;

    function saveRow(){
      return id ? sb.from('quotes').update(data).eq('id', id) : sb.from('quotes').insert(data).select().single();
    }

    var chain;
    if(file){
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var path = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '-' + safeName;
      chain = sb.storage.from(BUCKET).upload(path, file).then(function(res){
        if(res.error) throw res.error;
        data.file_path = path;
        data.file_name = file.name;
        data.file_type = file.type;
        return saveRow();
      }).then(function(res){
        if(res.error) throw res.error;
        if(existing && existing.file_path && existing.file_path !== path){
          sb.storage.from(BUCKET).remove([existing.file_path]);
        }
        return res;
      });
    } else {
      chain = saveRow();
    }

    Promise.resolve(chain).then(function(res){
      submitBtn.disabled = false;
      uploading = false;
      if(res && res.error){ alert('No se pudo guardar la cotización: '+res.error.message); return; }
      document.getElementById('dlg-quote').close();
      fetchQuotes();
    }).catch(function(e){
      submitBtn.disabled = false;
      uploading = false;
      alert('No se pudo guardar la cotización: '+(e && e.message ? e.message : e));
    });
  });

  /* ---------------- filters/tabs ---------------- */

  ['q-search','q-filter-provider','q-filter-status'].forEach(function(id){
    document.getElementById(id).addEventListener('input', renderQuotes);
    document.getElementById(id).addEventListener('change', renderQuotes);
  });
  document.getElementById('p-search').addEventListener('input', renderProviders);
  document.getElementById('c-search').addEventListener('input', renderCompare);

  document.querySelectorAll('.tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
      document.getElementById('view-'+tab.getAttribute('data-tab')).classList.add('active');
    });
  });

  /* ---------------- auth (solo inicio de sesión — las cuentas las crea el administrador en Supabase) ---------------- */

  document.getElementById('auth-form').addEventListener('submit', function(ev){
    ev.preventDefault();
    var email = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    var errEl = document.getElementById('auth-error');
    var okEl = document.getElementById('auth-ok');
    errEl.hidden = true; okEl.hidden = true;
    var btn = document.getElementById('auth-submit');
    btn.disabled = true;

    sb.auth.signInWithPassword({ email: email, password: password }).then(function(res){
      btn.disabled = false;
      if(res.error){ errEl.textContent = res.error.message; errEl.hidden = false; return; }
      // signed in — onAuthStateChange handles showing the app
    });
  });

  document.getElementById('whoami').addEventListener('click', function(ev){
    if(ev.target && ev.target.id === 'btn-signout'){
      sb.auth.signOut();
    }
  });

  function showApp(){
    document.getElementById('auth-screen').hidden = true;
    document.getElementById('app').hidden = false;
    var whoEl = document.getElementById('whoami');
    whoEl.innerHTML = 'Conectado como <b>'+esc(currentUser.email)+'</b> · <button type="button" class="btn-text" id="btn-signout">Cerrar sesión</button>';
    whoEl.hidden = false;
  }
  function showAuthScreen(){
    document.getElementById('app').hidden = true;
    document.getElementById('auth-screen').hidden = false;
  }

  function applyWriteGating(){
    canWrite = !!currentUser;
    ['btn-new-quote','btn-new-provider','btn-quick-provider'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.disabled = !canWrite;
    });
  }

  /* ---------------- boot ---------------- */

  var subscribed = false;
  function subscribeRealtime(){
    if(subscribed) return;
    subscribed = true;
    sb.channel('providers-changes').on('postgres_changes', {event:'*', schema:'public', table:'providers'}, fetchProviders).subscribe();
    sb.channel('quotes-changes').on('postgres_changes', {event:'*', schema:'public', table:'quotes'}, fetchQuotes).subscribe();
  }

  sb.auth.getSession().then(function(res){
    var session = res.data && res.data.session;
    if(session){
      currentUser = session.user;
      applyWriteGating();
      showApp();
      fetchProviders(); fetchQuotes(); subscribeRealtime();
    }
  });

  sb.auth.onAuthStateChange(function(event, session){
    if(session){
      currentUser = session.user;
      applyWriteGating();
      showApp();
      fetchProviders(); fetchQuotes(); subscribeRealtime();
    } else {
      currentUser = null;
      applyWriteGating();
      showAuthScreen();
    }
  });
})();
