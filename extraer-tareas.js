const fs = require('fs');
const { leerCSV } = require('./csv-utils');

// Leer configuración
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Obtener nombre del archivo CSV de los argumentos
const csvFile = process.argv[2];

if (!csvFile) {
    console.error('❌ Error: Debes especificar el archivo CSV');
    console.log('   Uso: node extraer-tareas.js <archivo.csv>');
    console.log('   Ejemplo: node extraer-tareas.js datos.csv');
    process.exit(1);
}

// Leer CSV
console.log(`📄 Leyendo archivo: ${csvFile}`);

try {
    var { headers, rows, separador } = leerCSV(csvFile, config.encoding);
    console.log(`   Detectado separador: ${separador === '\t' ? 'TAB' : 'COMA'}`);
} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
}

console.log(`📊 Columnas detectadas: ${headers.length}`);
console.log(`   Headers: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`);

// Encontrar índice de la columna "Tarea"
const tareaIndex = headers.findIndex(h => h.toLowerCase().includes('tarea'));
if (tareaIndex === -1) {
    console.error('❌ Error: No se encuentra la columna "Tarea" en el CSV');
    console.log('   Columnas disponibles:', headers.join(', '));
    process.exit(1);
}

console.log(`   Columna "Tarea" encontrada en posición ${tareaIndex + 1}`);

// Extraer tareas únicas
const tareasUnicas = new Set();
const tareasPorLinea = [];

for (let i = 0; i < rows.length; i++) {
    const columns = rows[i];
    if (columns.length > tareaIndex) {
        const tarea = columns[tareaIndex].trim();
        if (tarea) {
            tareasUnicas.add(tarea);
            tareasPorLinea.push({ linea: i + 2, tarea }); // +2 porque la primera línea es header
        }
    }
}

console.log(`\n✓ Registros encontrados: ${rows.length}`);
console.log(`✓ Tareas únicas: ${tareasUnicas.size}`);

// Crear objeto de mapeo con null
const mapeoTareas = {};
tareasUnicas.forEach(tarea => {
    mapeoTareas[tarea] = null;
});

// Guardar archivo JSON
const outputFile = config.archivoTareas;
fs.writeFileSync(outputFile, JSON.stringify(mapeoTareas, null, 2), 'utf8');

console.log(`\n✅ Archivo generado: ${outputFile}`);
console.log('\n📋 Tareas encontradas (asigna los IDs en el archivo JSON):');
console.log('─'.repeat(70));

let contador = 1;
tareasUnicas.forEach(tarea => {
    const veces = tareasPorLinea.filter(t => t.tarea === tarea).length;
    console.log(`${contador.toString().padStart(2)}. ${tarea.substring(0, 50)}${tarea.length > 50 ? '...' : ''} (${veces} registros)`);
    contador++;
});

console.log('\n📝 Instrucciones:');
console.log('   1. Abre el archivo ' + outputFile);
console.log('   2. Reemplaza "null" por el ID de proceso correspondiente');
console.log('   3. Ejecuta: node generar-sql.js ' + csvFile);
