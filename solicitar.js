(function(){
  "use strict";

  if(!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.indexOf("TU-PROYECTO") !== -1){
    document.body.innerHTML = '<div style="max-width:520px;margin:80px auto;padding:24px;font-family:system-ui;line-height:1.5;">' +
      '<h2>Falta configurar Supabase</h2>' +
      '<p>Abre <code>supabase-config.js</code> y pega la URL y la llave pública (anon key) de tu proyecto de Supabase.</p></div>';
    return;
  }

  // Este formulario es público (nadie inicia sesión aquí): usa el mismo
  // cliente con la llave pública, que en Supabase opera con el rol "anon".
  // Las políticas de seguridad (ver schema.sql, FASE 3) solo le permiten
  // CREAR solicitudes nuevas — nunca leer, editar ni borrar nada.
  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  function todayISO(){ return new Date().toISOString().slice(0,10); }

  // Suma días hábiles (de lunes a viernes) a una fecha, sin contar
  // festivos colombianos — es una fecha estimada mínima, no exacta.
  function addBusinessDays(date, days){
    var d = new Date(date.getTime());
    var added = 0;
    while(added < days){
      d.setDate(d.getDate() + 1);
      var dow = d.getDay();
      if(dow !== 0 && dow !== 6) added++;
    }
    return d;
  }
  function toISO(d){ return d.toISOString().slice(0,10); }
  function fmtDateLong(iso){
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-CO', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  }

  var minDate = toISO(addBusinessDays(new Date(), 2));

  document.querySelectorAll('input[name="rq-kind"]').forEach(function(radio){
    function sync(){
      document.getElementById('rt-label-diseno').classList.toggle('active', document.querySelector('input[name="rq-kind"][value="diseno"]').checked);
      document.getElementById('rt-label-video').classList.toggle('active', document.querySelector('input[name="rq-kind"][value="video"]').checked);
    }
    radio.addEventListener('change', sync);
    sync();
  });

  document.getElementById('request-form').addEventListener('submit', function(ev){
    ev.preventDefault();
    var errEl = document.getElementById('req-error');
    errEl.hidden = true;

    var kind = document.querySelector('input[name="rq-kind"]:checked').value;
    var name = document.getElementById('rq-name').value.trim();
    var area = document.getElementById('rq-area').value.trim();
    var title = document.getElementById('rq-title').value.trim();
    var desc = document.getElementById('rq-desc').value.trim();
    var wanted = document.getElementById('rq-date').value;

    if(!name || !area || !title || !desc){
      errEl.textContent = 'Por favor completa todos los campos obligatorios.';
      errEl.hidden = false;
      return;
    }

    var dueDate = (wanted && wanted > minDate) ? wanted : minDate;

    var data = {
      kind: kind,
      name: title,
      description: desc,
      status: 'todo',
      due_date: dueDate,
      requested_by: name,
      requested_area: area,
      source: 'solicitud'
    };

    var btn = document.getElementById('req-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    sb.from('creative_projects').insert(data).then(function(res){
      btn.disabled = false;
      btn.textContent = 'Enviar solicitud';
      if(res.error){
        errEl.textContent = 'No se pudo enviar la solicitud: ' + res.error.message;
        errEl.hidden = false;
        return;
      }
      document.getElementById('request-form').hidden = true;
      document.getElementById('req-note').hidden = true;
      document.getElementById('request-success').hidden = false;
      document.getElementById('req-eta-date').textContent = fmtDateLong(dueDate);
    }).catch(function(e){
      btn.disabled = false;
      btn.textContent = 'Enviar solicitud';
      errEl.textContent = 'No se pudo conectar: ' + (e && e.message ? e.message : e);
      errEl.hidden = false;
    });
  });

  document.getElementById('req-another').addEventListener('click', function(){
    document.getElementById('request-form').reset();
    document.getElementById('request-form').hidden = false;
    document.getElementById('req-note').hidden = false;
    document.getElementById('request-success').hidden = true;
    document.querySelectorAll('input[name="rq-kind"]').forEach(function(r){ if(r.value==='diseno') r.checked = true; });
    document.getElementById('rt-label-diseno').classList.add('active');
    document.getElementById('rt-label-video').classList.remove('active');
  });
})();
