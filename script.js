
    // Configuración de Supabase
    const SUPABASE_URL = 'https://lbkakkgojpczcjcvevpp.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2Fra2dvanBjemNqY3ZldnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDIwNzksImV4cCI6MjA3NzM3ODA3OX0.84fn2r02HUn4zkHTKZiDo3HF0lX210xQChFbPpyJElY';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Funciones de navegación
    function mostrarSeccion(id) {
      document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
      document.getElementById(id).classList.remove('d-none');
      document.querySelectorAll('.list-group-item').forEach(l => l.classList.remove('active'));
      document.querySelector(`.list-group-item[onclick*="${id}"]`).classList.add('active');
      
      if (id === 'inicio') {
        cargarEstadisticas();
      }
    }

    // Función para cargar estadísticas
    async function cargarEstadisticas() {
      try {
        const { data, error } = await supabase
          .from('consultas')
          .select('*');

        if (error) throw error;

        const total = data.length;
        const etiquetasUnicas = new Set();
        data.forEach(c => {
          if (c.etiquetas) {
            c.etiquetas.split(',').forEach(tag => etiquetasUnicas.add(tag.trim()));
          }
        });

        document.getElementById('total-consultas').textContent = total;
        document.getElementById('total-etiquetas').textContent = etiquetasUnicas.size;
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    }

    // Función para buscar consultas
    async function buscarConsultas() {
      const palabra = document.getElementById('busqueda').value.trim();
      const tabla = document.getElementById('tabla-consultas');
      
      if (!palabra) {
        mostrarMensajeResultados('⚠️ Por favor, ingresa un término de búsqueda', 'warning');
        return;
      }

      tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border" role="status"></div> Buscando...</td></tr>';

      try {
        const { data, error } = await supabase
          .from('consultas')
          .select('*')
          .or(`titulo.ilike.%${palabra}%,descripcion.ilike.%${palabra}%,etiquetas.ilike.%${palabra}%`)
          .order('creado_en', { ascending: false });

        if (error) throw error;

        mostrarResultados(data, `para "${palabra}"`);
      } catch (error) {
        tabla.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error: ${error.message}</td></tr>`;
      }
    }

    // Función para cargar todas las consultas
    async function cargarTodasConsultas() {
      const tabla = document.getElementById('tabla-consultas');
      tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border" role="status"></div> Cargando todas las consultas...</td></tr>';

      try {
        const { data, error } = await supabase
          .from('consultas')
          .select('*')
          .order('creado_en', { ascending: false });

        if (error) throw error;

        mostrarResultados(data, 'todas las consultas');
      } catch (error) {
        tabla.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error: ${error.message}</td></tr>`;
      }
    }

    // Función para mostrar resultados
    function mostrarResultados(data, contexto) {
      const tabla = document.getElementById('tabla-consultas');
      
      if (data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No se encontraron resultados ${contexto}</td></tr>`;
        mostrarMensajeResultados(`🔍 No se encontraron resultados ${contexto}`, 'warning');
        return;
      }

      tabla.innerHTML = '';
      data.forEach(c => {
        const etiquetasHTML = c.etiquetas ? 
          c.etiquetas.split(',').map(tag => 
            `<span class="tag">${tag.trim()}</span>`
          ).join('') : '';
        
        tabla.innerHTML += `
          <tr>
            <td><strong>${c.titulo}</strong></td>
            <td>${c.descripcion || '<span class="text-muted">Sin descripción</span>'}</td>
            <td>${etiquetasHTML || '<span class="text-muted">Sin etiquetas</span>'}</td>
            <td><pre class="sql-code">${c.sql}</pre></td>
          </tr>`;
      });

      mostrarMensajeResultados(`✅ Se encontraron ${data.length} resultado(s) ${contexto}`, 'success');
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
        cargarEstadisticas();
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
      cargarEstadisticas();
      
      // Verificar conexión al cargar
      verificarConexion();
    });

    // Función para verificar conexión (sin botón visible)
    async function verificarConexion() {
      try {
        const { data, error } = await supabase
          .from('consultas')
          .select('*')
          .limit(1);

        if (error) throw error;

        // Actualizar badge de estado
        document.getElementById('status-connection').className = 'badge bg-success';
        document.getElementById('status-connection').textContent = '✅ Conectado';
      } catch (error) {
        document.getElementById('status-connection').className = 'badge bg-danger';
        document.getElementById('status-connection').textContent = '❌ Sin conexión';
      }
    }