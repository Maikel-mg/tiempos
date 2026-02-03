const fs = require('fs');
const { leerCSV, decimalHorasAMinutos } = require('./csv-utils');

// Leer configuración
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Funciones de validación de configuración
function validarUsuario(valor) {
    if (!valor || typeof valor !== 'string' || valor.trim() === '') {
        throw new Error("Config error: 'usuario' must be a non-empty string");
    }
}

function validarTipoHora(valor) {
    const num = parseInt(valor);
    if (isNaN(num) || num <= 0) {
        throw new Error("Config error: 'tipoHora' must be a positive integer");
    }
}

function validarTeletrabajo(valor) {
    const num = parseInt(valor);
    if (num !== 0 && num !== 1) {
        throw new Error("Config error: 'teletrabajo' must be 0 or 1");
    }
}

function validarEncoding(valor) {
    const validEncodings = ['utf8', 'utf-8', 'latin1', 'iso-8859-1', 'ascii', 'base64', 'hex'];
    if (!valor || typeof valor !== 'string' || !validEncodings.includes(valor.toLowerCase())) {
        throw new Error("Config error: 'encoding' must be a valid Node.js encoding (e.g., utf8, latin1)");
    }
}

function validarArchivoTareas(valor) {
    if (!valor || typeof valor !== 'string' || valor.trim() === '') {
        throw new Error("Config error: 'archivoTareas' must be a non-empty string");
    }
}

function validarConfig(config) {
    validarUsuario(config.usuario);
    validarTipoHora(config.tipoHora);
    validarTeletrabajo(config.teletrabajo);
    validarEncoding(config.encoding);
    validarArchivoTareas(config.archivoTareas);
}

// Validar configuración inmediatamente después de cargar
try {
    validarConfig(config);
} catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
}

// Obtener nombre del archivo CSV de los argumentos
const csvFile = process.argv[2];

if (!csvFile) {
    console.error('❌ Error: Debes especificar el archivo CSV');
    console.log('   Uso: node generar-sql.js <archivo.csv>');
    console.log('   Ejemplo: node generar-sql.js datos.csv');
    process.exit(1);
}

// Verificar que existe el archivo de mapeo
const tareasFile = config.archivoTareas;
if (!fs.existsSync(tareasFile)) {
    console.error(`❌ Error: No se encuentra el archivo de mapeo "${tareasFile}"`);
    console.log('   Ejecuta primero: node extraer-tareas.js ' + csvFile);
    process.exit(1);
}

// Cargar mapeo de tareas
const mapeoTareas = JSON.parse(fs.readFileSync(tareasFile, 'utf8'));

// Validar que todas las tareas tengan ID asignado
const tareasSinId = Object.entries(mapeoTareas)
    .filter(([tarea, id]) => id === null || id === undefined)
    .map(([tarea]) => tarea);

if (tareasSinId.length > 0) {
    console.error('\n❌ ERROR: Faltan IDs por asignar\n');
    console.log('Las siguientes tareas no tienen ID asignado en ' + tareasFile + ':\n');
    tareasSinId.forEach((tarea, index) => {
        console.log(`  ${index + 1}. "${tarea.substring(0, 60)}${tarea.length > 60 ? '...' : ''}"`);
    });
    console.log('\n📝 Instrucciones:');
    console.log('   1. Abre el archivo ' + tareasFile);
    console.log('   2. Busca estas tareas y asigna el ID de proceso');
    console.log('   3. Ejecuta nuevamente: node generar-sql.js ' + csvFile);
    process.exit(1);
}

console.log(`✅ Validación exitosa: ${Object.keys(mapeoTareas).length} tareas con ID asignado`);

// Leer CSV
console.log(`\n📄 Procesando: ${csvFile}`);

try {
    var { headers, rows, separador } = leerCSV(csvFile, config.encoding);
    console.log(`   Separador detectado: ${separador === '\t' ? 'TAB' : 'COMA'}`);
} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
}

// Función auxiliar para normalizar nombres de columnas
function normalizarHeader(header) {
    return header.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
        .replace(/\s+/g, ' '); // normalizar espacios
}

// Encontrar índices de columnas relevantes usando coincidencia exacta
const indices = {
    tarea: headers.findIndex(h => normalizarHeader(h) === 'tarea'),
    descripcion: headers.findIndex(h => normalizarHeader(h) === 'descripcion'),
    fechaInicio: headers.findIndex(h => normalizarHeader(h) === 'fecha de inicio'),
    horaInicio: headers.findIndex(h => normalizarHeader(h) === 'hora de inicio'),
    fechaFin: headers.findIndex(h => normalizarHeader(h) === 'fecha de finalizacion'),
    horaFin: headers.findIndex(h => normalizarHeader(h) === 'hora de finalizacion'),
    duracionDecimal: headers.findIndex(h => {
        const hNorm = normalizarHeader(h);
        return hNorm === 'duracion (decimal)' || hNorm === 'duracion (h)';
    }),
};

// Verificar que existan las columnas necesarias
const columnasRequeridas = ['tarea', 'fechaInicio', 'horaInicio', 'fechaFin', 'horaFin', 'duracionDecimal'];
const columnasFaltantes = columnasRequeridas.filter(col => indices[col] === -1);

if (columnasFaltantes.length > 0) {
    console.error(`❌ Error: Columnas requeridas no encontradas: ${columnasFaltantes.join(', ')}`);
    console.log('   Columnas disponibles:', headers.join(', '));
    process.exit(1);
}

console.log('✓ Columnas identificadas correctamente');

// Funciones de validación para prevenir SQL injection
function validarFecha(fecha) {
    // Formato esperado: DD/MM/AAAA
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(fecha)) {
        throw new Error(`Formato de fecha inválido: ${fecha}. Se esperaba DD/MM/AAAA`);
    }
    return fecha;
}

function validarHora(hora) {
    // Formato esperado: HH:MM:SS
    const regex = /^\d{2}:\d{2}:\d{2}$/;
    if (!regex.test(hora)) {
        throw new Error(`Formato de hora inválido: ${hora}. Se esperaba HH:MM:SS`);
    }
    return hora;
}

function validarSeguroSQL(valor) {
    // Detectar patrones potencialmente peligrosos
    const peligroso = /(--|\/\*|\*\/|;|\b(drop|delete|insert|update|exec|execute|union|select)\b)/i;
    if (peligroso.test(valor)) {
        throw new Error(`El valor contiene caracteres no permitidos: ${valor.substring(0, 50)}`);
    }
    return valor;
}

function escapeSQL(valor) {
    if (!valor) return '';
    // Primero validar, luego escapar
    validarSeguroSQL(valor);
    return valor.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function validarIdProceso(id) {
    const num = parseInt(id);
    if (isNaN(num) || num <= 0) {
        throw new Error(`ID de proceso inválido: ${id}`);
    }
    return num;
}

// Generar SQL
const sqlStatements = [];
let procesados = 0;
let errores = 0;

for (let i = 0; i < rows.length; i++) {
    const columns = rows[i];
    const lineaNum = i + 2; // +2 porque la primera línea es el header

    try {
        // Verificar que la línea tenga suficientes columnas
        const maxIndex = Math.max(...Object.values(indices).filter(idx => idx !== -1));
        if (columns.length < maxIndex + 1) {
            console.log(`⚠️  Línea ${lineaNum}: Formato incorrecto (columnas insuficientes - tiene ${columns.length}, necesita ${maxIndex + 1}), se omite`);
            errores++;
            continue;
        }

        const tarea = columns[indices.tarea].trim();
        const descripcion = indices.descripcion !== -1 ? columns[indices.descripcion].trim() : '';
        const fechaInicio = columns[indices.fechaInicio].trim();
        const horaInicio = columns[indices.horaInicio].trim();
        const fechaFin = columns[indices.fechaFin].trim();
        const horaFin = columns[indices.horaFin].trim();
        const duracionDecimal = columns[indices.duracionDecimal].trim();

        // Validar que la tarea exista en el mapeo
        if (!mapeoTareas.hasOwnProperty(tarea)) {
            console.log(`⚠️  Línea ${lineaNum}: Tarea no encontrada en mapeo "${tarea.substring(0, 30)}...", se omite`);
            errores++;
            continue;
        }

        // Validar todos los valores antes de usarlos
        const idProceso = validarIdProceso(mapeoTareas[tarea]);
        const minutos = decimalHorasAMinutos(duracionDecimal);
        const fechaInicioValidada = validarFecha(fechaInicio);
        const horaInicioValidada = validarHora(horaInicio);
        const fechaFinValidada = validarFecha(fechaFin);
        const horaFinValidada = validarHora(horaFin);

        // Generar llamada al procedimiento con valores escapados
        const sql = `exec spNETTiempos_Alta @Usured='${escapeSQL(config.usuario)}', @Fecha='${fechaInicioValidada}', @HoraDesde='${horaInicioValidada}', @HoraHasta='${horaFinValidada}', @Minutos=${minutos}, @Proceso=${idProceso}, @pParteSalida=NULL, @pGastos=0, @pKms=0, @pTipoHora=${parseInt(config.tipoHora) || 11}, @ClienteComercial=NULL, @Comentario='${escapeSQL(descripcion)}', @pCambio=NULL, @pTeleTrabajo=${parseInt(config.teletrabajo) || 0}, @ObservacionesCalidad=NULL, @Rapport=0, @RapportCheck=0, @VBPermisoUsured=NULL, @VBPermisoFechaHora=NULL, @ObservacionesPermiso=NULL, @Ticket=NULL, @EsTeleTrabajo=${parseInt(config.teletrabajo) || 0}, @pMarcajeIP_INI=0, @pMarcajeIP_FIN=0, @pObservacionesPseudoMarcaje=NULL, @pTiempoNoReconocido=0, @pObservacionesRegistroHorario=NULL`;

        sqlStatements.push(sql);
        procesados++;
    } catch (error) {
        console.log(`⚠️  Línea ${lineaNum}: Error de validación - ${error.message}, se omite`);
        errores++;
        continue;
    }
}

// Guardar archivo SQL
const outputFile = 'tiempos.sql';
fs.writeFileSync(outputFile, sqlStatements.join('\nGO\n'), 'utf8');

// Resumen
console.log('\n' + '─'.repeat(70));
console.log('✅ GENERACIÓN COMPLETADA');
console.log('─'.repeat(70));
console.log(`📊 Resumen:`);
console.log(`   • Registros procesados: ${procesados}`);
console.log(`   • Errores/Omitidos: ${errores}`);
console.log(`   • Total registros CSV: ${rows.length}`);
console.log(`\n📝 Archivo SQL generado: ${outputFile}`);
console.log(`\n💡 Puedes ejecutar el SQL en SQL Server Management Studio`);
console.log(`   o usar: sqlcmd -S servidor -d base_datos -i ${outputFile}`);

// Mostrar ejemplo del primer registro
if (sqlStatements.length > 0) {
    console.log('\n📄 Ejemplo del primer registro:');
    console.log(sqlStatements[0].substring(0, 100) + '...');
}
