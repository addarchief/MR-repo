// Configuración de Supabase
const SUPABASE_URL = 'https://lbkakkgojpczcjcvevpp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2Fra2dvanBjemNqY3ZldnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDIwNzksImV4cCI6MjA3NzM3ODA3OX0.84fn2r02HUn4zkHTKZiDo3HF0lX210xQChFbPpyJElY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales
let consultaActualModal = '';
let todasLasConsultas = [];

// Funciones de navegación
function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
  document.getElementById(id).classList.remove('d-none');
  document.querySelectorAll('.list-group-item').forEach(l => l.classList.remove('active'));
  document.querySelector(`.list-group-item[onclick*="${id}"]`).classList.add('active');
  
  if (id === 'inicio') {
    cargarMetricasCompletas();
  }
}

// Función para cargar métricas completas
async function cargarMetricasCompletas() {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    todasLasConsultas = data;
    
    // Métricas básicas
    const total = data.length;
    const etiquetasUnicas = new Set();
    const hoy = new Date().toDateString();
    const consultasHoy = data.filter(c => 
      new Date(c.creado_en).toDateString() === hoy
    ).length;

    data.forEach(c => {
      if (c.etiquetas) {
        c.etiquetas.split(',').forEach(tag => etiquetasUnicas.add(tag.trim()));
      }
    });

    // Actualizar métricas principales
    document.getElementById('total-consultas').textContent = total;
    document.getElementById('total-etiquetas').textContent = etiquetasUnicas.size;
    document.getElementById('consultas-hoy').textContent = consultasHoy;
    document.getElementById('consultas-populares').textContent = 
      Math.min(5, total); // Simulación de consultas populares

    // Cargar actividad reciente
    cargarActividadReciente(data);
    
    // Cargar etiquetas populares
    cargarEtiquetasPopulares(data);

  } catch (error) {
    console.error('Error al cargar métricas:', error);
  }
}

// Función para cargar actividad reciente
function cargarActividadReciente(consultas) {
  const actividadContainer = document.getElementById('actividad-reciente');
  const recientes = consultas.slice(0, 5);
  
  if (recientes.length === 0) {
    actividadContainer.innerHTML = '<p class="text-muted">No hay actividad reciente</p>';
    return;
  }

  let html = '';
  recientes.forEach(consulta => {
    const fecha = new Date(consulta.creado_en).toLocaleDateString();
    html += `
      <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
        <div>
          <strong class="d-block">${consulta.titulo}</strong>
          <small class="text-muted">${fecha}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="mostrarPrevia(${consulta.id})">
          👁️
        </button>
      </div>
    `;
  });
  
  actividadContainer.innerHTML = html;
}

// Función para cargar etiquetas populares
function cargarEtiquetasPopulares(consultas) {
  const etiquetasContainer = document.getElementById('etiquetas-populares');
  const etiquetasCount = {};
  
  consultas.forEach(consulta => {
    if (consulta.etiquetas) {
      consulta.etiquetas.split(',').forEach(tag => {
        const tagClean = tag.trim();
        etiquetasCount[tagClean] = (etiquetasCount[tagClean] || 0) + 1;
      });
    }
  });
  
  const etiquetasPopulares = Object.entries(etiquetasCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  
  if (etiquetasPopulares.length === 0) {
    etiquetasContainer.innerHTML = '<p class="text-muted">No hay etiquetas</p>';
    return;
  }

  let html = '';
  etiquetasPopulares.forEach(([tag, count]) => {
    const porcentaje = (count / consultas.length) * 100;
    html += `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span class="tag">${tag}</span>
          <small class="text-muted">${count}</small>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width: ${porcentaje}%"></div>
        </div>
      </div>
    `;
  });
  
  etiquetasContainer.innerHTML = html;
}

// Función para mostrar vista previa en modal
async function mostrarPrevia(id) {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    consultaActualModal = data.sql;
    
    const modal = new bootstrap.Modal(document.getElementById('modalPrevia'));
    document.getElementById('modalPreviaTitle').textContent = data.titulo;
    
    document.getElementById('modalPreviaContent').innerHTML = `
      <div class="mb-3">
        <strong>Descripción:</strong>
        <p>${data.descripcion || 'Sin descripción'}</p>
      </div>
      <div class="mb-3">
        <strong>Etiquetas:</strong>
        <div>
          ${data.etiquetas ? data.etiquetas.split(',').map(tag => 
            `<span class="tag">${tag.trim()}</span>`
          ).join('') : 'Sin etiquetas'}
        </div>
      </div>
      <div>
        <strong>Consulta SQL:</strong>
        <div class="sql-preview mt-2">
          <pre class="sql-code">${data.sql}</pre>
        </div>
      </div>
    `;
    
    modal.show();
  } catch (error) {
    mostrarMensajeGlobal(`❌ Error al cargar vista previa: ${error.message}`, 'danger');
  }
}

// Función para copiar SQL desde el modal
async function copiarSQLModal() {
  try {
    await navigator.clipboard.writeText(consultaActualModal);
    mostrarMensajeGlobal('✅ SQL copiado al portapapeles', 'success');
  } catch (error) {
    mostrarMensajeGlobal('❌ Error al copiar', 'danger');
  }
}

// Función para copiar SQL rápido desde tabla
async function copiarSQLRapido(sql) {
  try {
    await navigator.clipboard.writeText(sql);
    mostrarMensajeGlobal('✅ SQL copiado al portapapeles', 'success');
  } catch (error) {
    mostrarMensajeGlobal('❌ Error al copiar', 'danger');
  }
}

// Función para buscar consultas (actualizada con botones de copia)
async function buscarConsultas() {
  const palabra = document.getElementById('busqueda').value.trim();
  const tabla = document.getElementById('tabla-consultas');
  
  if (!palabra) {
    mostrarMensajeResultados('⚠️ Por favor, ingresa un término de búsqueda', 'warning');
    return;
  }

  tabla.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border" role="status"></div> Buscando...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .or(`titulo.ilike.%${palabra}%,descripcion.ilike.%${palabra}%,etiquetas.ilike.%${palabra}%`)
      .order('creado_en', { ascending: false });

    if (error) throw error;

    mostrarResultados(data, `para "${palabra}"`);
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error: ${error.message}</td></tr>`;
  }
}

// Función para mostrar resultados (actualizada con hover y botón copiar)
function mostrarResultados(data, contexto) {
  const tabla = document.getElementById('tabla-consultas');
  
  if (data.length === 0) {
    tabla.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron resultados ${contexto}</td></tr>`;
    mostrarMensajeResultados(`🔍 No se encontraron resultados ${contexto}`, 'warning');
    return;
  }

  tabla.innerHTML = '';
  data.forEach(c => {
    const etiquetasHTML = c.etiquetas ? 
      c.etiquetas.split(',').map(tag => 
        `<span class="tag">${tag.trim()}</span>`
      ).join('') : '';
    
    // Limitar visualización del SQL en tabla
    const sqlPreview = c.sql.length > 100 ? 
      c.sql.substring(0, 100) + '...' : c.sql;
    
    tabla.innerHTML += `
      <tr class="consulta-item" onclick="mostrarPrevia(${c.id})">
        <td><strong>${c.titulo}</strong></td>
        <td>${c.descripcion || '<span class="text-muted">Sin descripción</span>'}</td>
        <td>${etiquetasHTML || '<span class="text-muted">Sin etiquetas</span>'}</td>
        <td>
          <pre class="sql-code">${sqlPreview}</pre>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-copy" 
                  onclick="event.stopPropagation(); copiarSQLRapido(\`${c.sql.replace(/`/g, '\\`')}\`)"
                  title="Copiar SQL">
            📋
          </button>
        </td>
      </tr>
    `;
  });

  mostrarMensajeResultados(`✅ Se encontraron ${data.length} resultado(s) ${contexto}`, 'success');
}

// El resto de las funciones se mantienen igual (cargarTodasConsultas, formulario, exportación, etc.)
async function cargarTodasConsultas() {
  const tabla = document.getElementById('tabla-consultas');
  tabla.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border" role="status"></div> Cargando todas las consultas...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    mostrarResultados(data, 'todas las consultas');
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error: ${error.message}</td></tr>`;
  }
}

// Funciones para agregar nueva consulta
document.getElementById('form-nueva-consulta').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const titulo = document.getElementById('titulo').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const sql = document.getElementById('sql').value.trim();
  const etiquetas = document.getElementById('etiquetas').value.trim();

  if (!titulo || !sql) {
    mostrarMensajeGlobal('⚠️ El título y la consulta SQL son obligatorios', 'warning');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('consultas')
      .insert([
        {
          titulo: titulo,
          descripcion: descripcion,
          sql: sql,
          etiquetas: etiquetas
        }
      ])
      .select();

    if (error) throw error;

    mostrarMensajeGlobal('✅ Consulta guardada exitosamente', 'success');
    limpiarFormulario();
    cargarMetricasCompletas();
  } catch (error) {
    mostrarMensajeGlobal(`❌ Error al guardar: ${error.message}`, 'danger');
  }
});

function limpiarFormulario() {
  document.getElementById('form-nueva-consulta').reset();
}

// Funciones de exportación
async function exportarJSON() {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consultas-sql.json';
    a.click();
    URL.revokeObjectURL(url);
    
    mostrarMensajeGlobal('✅ Archivo JSON descargado', 'success');
  } catch (error) {
    mostrarMensajeGlobal(`❌ Error al exportar: ${error.message}`, 'danger');
  }
}

async function exportarCSV() {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    const headers = ['Título', 'Descripción', 'SQL', 'Etiquetas', 'Fecha Creación'];
    const csvData = data.map(row => [
      `"${row.titulo.replace(/"/g, '""')}"`,
      `"${(row.descripcion || '').replace(/"/g, '""')}"`,
      `"${row.sql.replace(/"/g, '""')}"`,
      `"${(row.etiquetas || '').replace(/"/g, '""')}"`,
      `"${new Date(row.creado_en).toLocaleDateString()}"`
    ].join(','));

    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consultas-sql.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    mostrarMensajeGlobal('✅ Archivo CSV descargado', 'success');
  } catch (error) {
    mostrarMensajeGlobal(`❌ Error al exportar: ${error.message}`, 'danger');
  }
}

// Funciones auxiliares para mensajes
function mostrarMensajeGlobal(texto, tipo) {
  const mensaje = document.getElementById('mensaje-global');
  mensaje.innerHTML = texto;
  mensaje.className = `alert alert-${tipo}`;
  mensaje.classList.remove('d-none');
  setTimeout(() => mensaje.classList.add('d-none'), 5000);
}

function mostrarMensajeResultados(texto, tipo) {
  const mensaje = document.getElementById('mensaje-resultados');
  mensaje.innerHTML = texto;
  mensaje.className = `alert alert-${tipo}`;
  mensaje.classList.remove('d-none');
}

// Toggle tema
document.getElementById('toggle-theme').addEventListener('click', () => {
  const html = document.documentElement;
  const actual = html.getAttribute('data-bs-theme');
  const nuevoTema = actual === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-bs-theme', nuevoTema);
  document.getElementById('toggle-theme').textContent = 
    nuevoTema === 'dark' ? '🌗 Cambiar tema' : '🌗 Cambiar tema';
});

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  mostrarSeccion('inicio');
  cargarMetricasCompletas();
  verificarConexion();
});

// Función para verificar conexión
async function verificarConexion() {
  try {
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .limit(1);

    if (error) throw error;

    document.getElementById('status-connection').className = 'badge bg-success';
    document.getElementById('status-connection').textContent = '✅ Conectado';
  } catch (error) {
    document.getElementById('status-connection').className = 'badge bg-danger';
    document.getElementById('status-connection').textContent = '❌ Sin conexión';
  }
}
// Función de logout
async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      mostrarMensajeGlobal('❌ Error al cerrar sesión', 'danger');
    }
  }
  function mostrarMensaje(texto, tipo = 'info') {
    const mensaje = document.getElementById('message');
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo} mensaje-top`;
    mensaje.classList.remove('d-none');
  
    // Ocultar después de 2 segundos
    setTimeout(() => {
      mensaje.classList.add('d-none');
    }, 2000);
  }
  