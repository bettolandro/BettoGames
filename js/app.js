

// ====== Helpers de Storage ======
const LS = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      console.error('LS.get error', e);
      return fallback;
    }
  },
  set(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// ====== Semilla de datos (se ejecuta 1 vez) ======
(function seed(){
  // // acá creo un admin por defecto para poder entrar al panel
  const users = LS.get('users', []);
  if(!users.length){
    users.push({
      id: crypto.randomUUID(),
      name: "Admin",
      email: "admin@vg.cl",
      pass: "Admin123!",
      role: "admin"
    });
    users.push({
      id: crypto.randomUUID(),
      name: "Gamer",
      email: "gamer@vg.cl",
      pass: "Gamer123!",
      role: "client"
    });
    LS.set('users', users);
  }

  // // acá creo algunos juegos para el catálogo (portadas corregidas)
  const products = LS.get('products', []);
  if(!products.length){
    const demo = [
      {
        id: crypto.randomUUID(),
        title:"Elden Ring",
        price:44990, stock:10, category:"RPG",
        cover:"img/elden-ring.jpg",
        desc:"Acción RPG desafiante del mundo abierto de FromSoftware."
      },
      {
        id: crypto.randomUUID(),
        title:"Hades II",
        price:34990, stock:12, category:"Roguelike",
        cover:"img/hades2.jpg",
        desc:"Secuela del premiado roguelike con combate rápido y rejugable."
      },
      {
        id: crypto.randomUUID(),
        title:"Spider-Man 2",
        price:55990, stock:8, category:"Acción",
        cover:"img/spiderman2.jpg",
        desc:"Superhéroes, balanceos por la ciudad y narrativa cinemática."
      },
      {
        id: crypto.randomUUID(),
        title:"Stardew Valley",
        price:12990, stock:30, category:"Simulación",
        cover:"img/stardew.jpg",
        desc:"Granjas, amistad y muchas horas de paz pixel art."
      }
    ];
    LS.set('products', demo);
  }

  // // si no hay sesión, la dejo como null
  if(localStorage.getItem('session') === null){
    LS.set('session', null);
  }
})();

// ====== Sesión / Auth ======
const Auth = {
  me(){ return LS.get('session', null); },
  isLogged(){ return !!Auth.me(); },
  isAdmin(){ return Auth.isLogged() && Auth.me().role === 'admin'; },
  login(email, pass){
    const users = LS.get('users', []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pass === pass);
    if(!user) return {ok:false, msg:'Credenciales inválidas'};
    LS.set('session', { id:user.id, name:user.name, email:user.email, role:user.role });
    return {ok:true};
  },
  logout(){
    LS.set('session', null);
    // // redirijo al home
    location.href = 'index.html';
  },
  register({name,email,pass}){
    const users = LS.get('users', []);
    if(users.some(u => u.email.toLowerCase() === email.toLowerCase())){
      return {ok:false, msg:'El email ya está registrado'};
    }
    const user = { id: crypto.randomUUID(), name, email, pass, role:'client' };
    users.push(user);
    LS.set('users', users);
    return {ok:true};
  },
  requireLogin(){
    if(!Auth.isLogged()) location.href = 'login.html';
  },
  requireAdmin(){
    if(!Auth.isAdmin()) location.href = 'index.html';
  }
};

// ====== UI Navbar Dinámica (muestra botón según sesión) ======
function renderNavbarSession(){
  const spanUser = document.querySelector('[data-user-name]');
  const btnLogin = document.querySelector('[data-btn-login]');
  const btnLogout = document.querySelector('[data-btn-logout]');
  const linkAdmin = document.querySelector('[data-link-admin]');
  const linkProfile = document.querySelector('[data-link-profile]');

  if(!spanUser || !btnLogin || !btnLogout || !linkAdmin || !linkProfile) return;

  if(Auth.isLogged()){
    spanUser.textContent = Auth.me().name;
    btnLogin.classList.add('d-none');
    btnLogout.classList.remove('d-none');
    linkProfile.classList.remove('d-none');
    if(Auth.isAdmin()){
      linkAdmin.classList.remove('d-none');
    }else{
      linkAdmin.classList.add('d-none');
    }
  }else{
    spanUser.textContent = 'Invitado';
    btnLogin.classList.remove('d-none');
    btnLogout.classList.add('d-none');
    linkAdmin.classList.add('d-none');
    linkProfile.classList.add('d-none');
  }
}

// ====== Validaciones ======
const Validators = {
  // // aquí reviso las 4 reglas: largo >=8, mayúscula, número y caracter especial
  strongPassword(pwd){
    const rules = {
      length: pwd.length >= 8,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };
    return { ok: Object.values(rules).every(Boolean), rules };
  },
  email(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); },
  positiveInt(n){ return Number.isInteger(n) && n >= 0; },
  price(v){ return !isNaN(v) && Number(v) >= 0; }
};

// ====== Productos / Carrito ======
const Products = {
  all(){ return LS.get('products', []); },
  get(id){ return Products.all().find(p => p.id === id); },
  saveAll(list){ LS.set('products', list); },
  create(p){
    const list = Products.all();
    p.id = crypto.randomUUID();
    list.push(p);
    Products.saveAll(list);
  },
  update(p){
    const list = Products.all().map(x => x.id === p.id ? p : x);
    Products.saveAll(list);
  },
  remove(id){
    const list = Products.all().filter(x => x.id !== id);
    Products.saveAll(list);
  }
};

const Cart = {
  key(){
    const me = Auth.me();
    return me ? `cart_${me.email.toLowerCase()}` : 'cart_guest';
  },
  get(){ return LS.get(Cart.key(), []); },
  save(items){ LS.set(Cart.key(), items); },
  add(id){
    const items = Cart.get();
    const it = items.find(i => i.id === id);
    if(it){ it.qty++; } else { items.push({id, qty:1}); }
    Cart.save(items);
  },
  setQty(id, qty){
    const items = Cart.get().map(i => i.id === id ? {...i, qty} : i);
    Cart.save(items);
  },
  remove(id){
    const items = Cart.get().filter(i => i.id !== id);
    Cart.save(items);
  },
  clear(){ Cart.save([]); },
  total(){
    return Cart.get().reduce((sum, i) => {
      const p = Products.get(i.id);
      return sum + (p ? p.price * i.qty : 0);
    }, 0);
  }
};

// ====== Render por páginas (según data-page) ======
document.addEventListener('DOMContentLoaded', () => {
  renderNavbarSession();
  const page = document.body.dataset.page;

  // botón logout común
  document.querySelectorAll('[data-btn-logout]').forEach(b=>{
    b.addEventListener('click', Auth.logout);
  });

  if(page === 'home') initHome();
  if(page === 'product') initProduct();
  if(page === 'cart'){ Auth.requireLogin(); initCart(); }
  if(page === 'login') initLogin();
  if(page === 'register') initRegister();
  if(page === 'forgot') initForgot();
  if(page === 'profile'){ Auth.requireLogin(); initProfile(); }
  if(page === 'admin'){ Auth.requireAdmin(); initAdmin(); }
});

// ====== Home (catálogo) ======
function initHome(){
  const grid = document.getElementById('gridProducts');
  const selectCat = document.getElementById('filterCategory');
  const txtSearch = document.getElementById('txtSearch');

  const all = Products.all();
  const cats = ['Todas', ...Array.from(new Set(all.map(p=>p.category)))];
  cats.forEach(c=>{
    const opt = document.createElement('option'); opt.value = c; opt.textContent = c;
    selectCat.appendChild(opt);
  });

  function render(){
    const q = (txtSearch.value||'').toLowerCase();
    const cat = selectCat.value || 'Todas';
    grid.innerHTML = '';
    Products.all()
      .filter(p => (cat==='Todas' || p.category===cat))
      .filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
      .forEach(p=>{
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
          <div class="card h-100 card-fixed">
            <div class="card-cover">
              <img src="${p.cover}" alt="${p.title}">
            </div>
            <div class="card-body d-flex flex-column">
              <h5 class="card-title mb-1">${p.title}</h5>
              <span class="badge bg-secondary mb-2">${p.category}</span>
              <p class="card-text clamp-3">${p.desc}</p>
              <div class="card-actions d-flex justify-content-between align-items-center pt-2">
                <strong>$${p.price.toLocaleString('es-CL')}</strong>
                <div>
                  <a href="product.html?id=${p.id}" class="btn btn-sm btn-outline-light me-2">Ver</a>
                  <button class="btn btn-sm btn-primary" data-add="${p.id}">Agregar</button>
                </div>
              </div>
            </div>
          </div>
        `;
        grid.appendChild(col);
      });

    // // listeners para botones "Agregar"
    grid.querySelectorAll('[data-add]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        if(!Auth.isLogged()) return location.href = 'login.html';
        const id = btn.getAttribute('data-add');
        Cart.add(id);
        toast('Producto agregado al carrito');
      });
    });
  }

  selectCat.addEventListener('change', render);
  txtSearch.addEventListener('input', render);
  render();
}

// ====== Product (detalle) ======
function initProduct(){
  const id = new URLSearchParams(location.search).get('id');
  const p = Products.get(id);
  const wrap = document.getElementById('productWrap');
  if(!p){ wrap.innerHTML = '<div class="alert alert-danger">Producto no encontrado</div>'; return; }

  wrap.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6">
        <div class="card-cover rounded">
          <img src="${p.cover}" alt="${p.title}">
        </div>
      </div>
      <div class="col-md-6">
        <h2>${p.title}</h2>
        <p class="chip">${p.category}</p>
        <p class="mt-3">${p.desc}</p>
        <p class="fs-4 fw-bold">$${p.price.toLocaleString('es-CL')}</p>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" id="btnAdd">Agregar al carrito</button>
          <a class="btn btn-outline-light" href="index.html">Volver</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btnAdd').addEventListener('click', ()=>{
    if(!Auth.isLogged()) return location.href = 'login.html';
    Cart.add(p.id);
    toast('Producto agregado al carrito');
  });
}

// ====== Cart ======
function initCart(){
  const tbody = document.querySelector('#cartTable tbody');
  const totalEl = document.getElementById('cartTotal');
  const btnClear = document.getElementById('btnClear');

  function render(){
    const items = Cart.get();
    tbody.innerHTML = '';
    items.forEach(i=>{
      const p = Products.get(i.id);
      if(!p) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.cover}" alt="" style="width:64px;height:64px;object-fit:cover" class="rounded"></td>
        <td>${p.title}</td>
        <td>$${p.price.toLocaleString('es-CL')}</td>
        <td style="max-width:120px">
          <input type="number" min="1" class="form-control form-control-sm" value="${i.qty}" data-qty="${i.id}">
        </td>
        <td>$${(p.price*i.qty).toLocaleString('es-CL')}</td>
        <td><button class="btn btn-sm btn-outline-light" data-del="${i.id}">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });
    totalEl.textContent = `$${Cart.total().toLocaleString('es-CL')}`;

    tbody.querySelectorAll('[data-qty]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const id = inp.getAttribute('data-qty');
        const val = parseInt(inp.value||'1',10);
        Cart.setQty(id, Math.max(1,val));
        render();
      });
    });
    tbody.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        Cart.remove(btn.getAttribute('data-del'));
        render();
      });
    });
  }

  btnClear.addEventListener('click', ()=>{
    Cart.clear(); render(); toast('Carrito vacío');
  });

  render();
}

// ====== Login ======
function initLogin(){
  const form = document.getElementById('formLogin');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    e.stopPropagation();

    const email = form.email.value.trim();
    const pass = form.pass.value;

    if(!Validators.email(email)){
      feedback(form.email, 'Ingresa un email válido');
      return;
    }
    const res = Auth.login(email, pass);
    if(!res.ok) return feedback(form.pass, 'Email o contraseña incorrectos');
    // // si es admin lo mando a admin, si no al home
    location.href = Auth.isAdmin() ? 'admin.html' : 'index.html';
  });
}

// ====== Register ======
function initRegister(){
  const form = document.getElementById('formRegister');
  const pass = form.pass;
  const pass2 = form.pass2;

  function updateMeter(){
    const res = Validators.strongPassword(pass.value);
    const meter = document.getElementById('pwdMeter');
    meter.className = 'form-text';
    const msgs = [];
    if(!res.rules.length) msgs.push('• 8+ caracteres');
    if(!res.rules.upper) msgs.push('• 1 mayúscula');
    if(!res.rules.number) msgs.push('• 1 número');
    if(!res.rules.special) msgs.push('• 1 carácter especial');
    meter.textContent = msgs.length ? `Falta: ${msgs.join(', ')}` : 'Contraseña robusta';
    meter.style.color = msgs.length ? '#f87171' : '#22d3ee';
  }
  pass.addEventListener('input', updateMeter);

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const name = form.name.value.trim();
    const email = form.email.value.trim();

    if(name.length < 2) return feedback(form.name, 'Nombre demasiado corto');
    if(!Validators.email(email)) return feedback(form.email, 'Email inválido');

    const pw = pass.value;
    const pw2 = pass2.value;
    const res = Validators.strongPassword(pw);
    if(!res.ok) return feedback(pass, 'La contraseña no cumple las 4 reglas');
    if(pw !== pw2) return feedback(pass2, 'Las contraseñas no coinciden');

    const r = Auth.register({name,email,pass:pw});
    if(!r.ok) return feedback(form.email, r.msg);

    toast('Registro exitoso, ya puedes iniciar sesión');
    location.href = 'login.html';
  });
}

// ====== Forgot ======
function initForgot(){
  const form = document.getElementById('formForgot');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = form.email.value.trim();
    if(!Validators.email(email)) return feedback(form.email, 'Email inválido');
    const users = LS.get('users', []);
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if(!u) return feedback(form.email, 'No existe un usuario con ese email');
    // // reseteo simple la password a Temporal123!
    u.pass = 'Temporal123!';
    LS.set('users', users);
    toast('Listo. Se estableció una contraseña temporal: "Temporal123!"');
    location.href = 'login.html';
  });
}

// ====== Profile ======
function initProfile(){
  const me = Auth.me();
  const form = document.getElementById('formProfile');
  form.name.value = me.name;
  form.email.value = me.email; // solo lectura

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = form.name.value.trim();
    const pw = form.pass.value;
    const pw2 = form.pass2.value;

    if(name.length < 2) return feedback(form.name, 'Nombre demasiado corto');

    const users = LS.get('users', []);
    const idx = users.findIndex(u => u.id === me.id);
    if(idx === -1) return toast('Error de sesión');

    users[idx].name = name;
    // // si escribió pass, la cambio validando reglas
    if(pw || pw2){
      const res = Validators.strongPassword(pw);
      if(!res.ok) return feedback(form.pass, 'La contraseña no cumple las 4 reglas');
      if(pw !== pw2) return feedback(form.pass2, 'No coinciden');
      users[idx].pass = pw;
    }
    LS.set('users', users);
    // // actualizo la sesión para reflejar el nuevo nombre
    LS.set('session', { ...Auth.me(), name });
    toast('Perfil actualizado');
    location.reload();
  });
}

// ====== Admin (CRUD productos) ======
function initAdmin(){
  const tbody = document.querySelector('#adminTable tbody');
  const form = document.getElementById('formProduct');
  const btnCancel = document.getElementById('btnCancel');
  let editing = null; // // aquí guardo el id que estoy editando

  function render(){
    const list = Products.all();
    tbody.innerHTML = '';
    list.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.cover}" style="width:64px;height:64px;object-fit:cover" class="rounded"></td>
        <td>${p.title}</td>
        <td>${p.category}</td>
        <td>$${p.price.toLocaleString('es-CL')}</td>
        <td>${p.stock}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-light me-2" data-edit="${p.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-del="${p.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-edit]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.getAttribute('data-edit');
        const p = Products.get(id);
        editing = id;
        form.title.value = p.title;
        form.price.value = p.price;
        form.stock.value = p.stock;
        form.category.value = p.category;
        form.cover.value = p.cover;
        form.desc.value = p.desc;
        btnCancel.classList.remove('d-none');
        form.querySelector('button[type="submit"]').textContent = 'Actualizar';
        window.scrollTo({top:0, behavior:'smooth'});
      });
    });

    tbody.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.getAttribute('data-del');
        Products.remove(id);
        render();
        toast('Producto eliminado');
      });
    });
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const p = {
      title: form.title.value.trim(),
      price: Number(form.price.value),
      stock: parseInt(form.stock.value||'0',10),
      category: form.category.value.trim(),
      cover: form.cover.value.trim(),
      desc: form.desc.value.trim()
    };
    if(p.title.length < 2) return feedback(form.title, 'Título muy corto');
    if(!Validators.price(p.price)) return feedback(form.price, 'Precio inválido');
    if(!Validators.positiveInt(p.stock)) return feedback(form.stock, 'Stock inválido');
    if(p.category.length < 2) return feedback(form.category, 'Categoría inválida');
    if(!p.cover.startsWith('http')) return feedback(form.cover, 'URL inválida');

    if(editing){
      p.id = editing;
      Products.update(p);
      editing = null;
      form.querySelector('button[type="submit"]').textContent = 'Crear';
      btnCancel.classList.add('d-none');
      form.reset();
      toast('Producto actualizado');
    }else{
      Products.create(p);
      form.reset();
      toast('Producto creado');
    }
    render();
  });

  btnCancel.addEventListener('click', ()=>{
    editing = null;
    btnCancel.classList.add('d-none');
    form.querySelector('button[type="submit"]').textContent = 'Crear';
    form.reset();
  });

  render();
}

// ====== UX Helpers ======
function feedback(input, msg){
  // // acá muestro un texto de error simple y foco en el campo
  input.classList.add('is-invalid');
  let fb = input.nextElementSibling;
  if(!fb || !fb.classList.contains('invalid-feedback')){
    fb = document.createElement('div');
    fb.className = 'invalid-feedback';
    input.insertAdjacentElement('afterend', fb);
  }
  fb.textContent = msg;
  input.focus();
  // // elimino el error al editar
  input.addEventListener('input', ()=> input.classList.remove('is-invalid'), {once:true});
}

function toast(message){
  // // toast simple con alert de Bootstrap (para no usar libs extra)
  const box = document.createElement('div');
  box.className = 'alert alert-info position-fixed top-0 start-50 translate-middle-x mt-3';
  box.style.zIndex = 2000;
  box.textContent = message;
  document.body.appendChild(box);
  setTimeout(()=> box.remove(), 1800);
}
