# pols-logger

`pols-logger` es una librería robusta y ligera de logging para Node.js escrita en TypeScript. Permite registrar mensajes formateados tanto en la consola como en archivos físicos, ofreciendo serialización automática de objetos, formateo limpio de errores y pilas de llamadas (stack traces), gestión de directorios automatizada y hooks de finalización personalizados.

## Características

* **Salidas flexibles:** Registra logs en consola, en archivos locales o en ambos a la vez de forma condicional.
* **Serialización automática de datos:** Soporta cuerpos de log (`body`) del tipo `string`, `number`, `object` (JSON estructurado), `Error` (con stack trace seguro) y arreglos mixtos.
* **Ruteo inteligente de consola:** Redirecciona automáticamente los logs de temas críticos (`ERROR`, `FATAL`) a `console.error` y el resto a `console.log`.
* **Escritura eficiente en disco:** Optimiza las comprobaciones de directorios mediante una verificación perezosa (evita llamar a `fs.existsSync` repetidamente).
* **Finalización de procesos controlada:** El método `fatal` detiene el proceso automáticamente con código de salida `1` por defecto, permitiendo configurar códigos de salida específicos en cualquier entrada de log.
* **Eventos personalizados:** Permite registrar un hook `onEntryFinish` para reaccionar al terminar de escribir una entrada de log (útil para telemetría, alertas, etc.).

---

## Instalación

Instala el paquete y sus dependencias en tu proyecto:

```bash
npm install pols-logger
```

---

## Configuración y API

### `PLogger`

La clase principal que maneja los registros.

#### Constructor

```typescript
const logger = new PLogger(config?: PLoggerParams)
```

Donde `PLoggerParams` tiene la siguiente estructura:

* **`destinationPath?: string`**: Directorio donde se guardarán los archivos log. Obligatorio si el guardado en archivo está activado.
* **`fileName?: ({ theme: PThemes, now: Date }) => string`**: Función personalizada para nombrar los archivos log dinámicamente. Por defecto genera nombres con el formato `LOG_YYYY-MM-DD.log`.
* **`showIn?: PLoggerShowInConfig`**: Configura dónde mostrar cada tema de log.

#### `PLoggerShowInConfig`

Define si las salidas van a la consola o a archivos. Puede ser un booleano global o un objeto de grano fino para cada tipo de log:

```typescript
export type PLoggerShowInParams = boolean | {
	info?: boolean
	warning?: boolean
	error?: boolean
	debug?: boolean
	system?: boolean
	fatal?: boolean
}

export type PLoggerShowInConfig = {
	console?: PLoggerShowInParams
	file?: PLoggerShowInParams
}
```

*Por defecto, `console` está activado (`true` para todos) y `file` está desactivado (`false`).*

---

### Métodos de Logging

Todos los métodos aceptan un objeto del tipo `PLoggerLogParams` y formatean la salida con la estructura: `[THEME] DD/MM/YYYY HH:MM:SS.lll :: LABEL :: DESCRIPTION [TAG1] [TAG2]` seguido del contenido de `body`.

* `logger.info(params)`
* `logger.warning(params)`
* `logger.error(params)`
* `logger.debug(params)`
* `logger.system(params)`
* `logger.fatal(params)` *(provoca salida del proceso al finalizar)*

---

### Estructura de Parámetros (`PLoggerLogParams`)

* **`label: string`** (Requerido): Etiqueta identificadora o título de la entrada.
* **`description?: string`**: Descripción breve adicional del evento.
* **`tags?: string[]`**: Etiquetas contextuales que se mostrarán al final de la cabecera (ej: `['database', 'retry']`).
* **`body?: string | Record<string, any> | any[] | Error`**: Contenido o carga útil a registrar.
* **`exit?: boolean | number`**: Si es `true` o un número, terminará la ejecución del proceso al finalizar el registro. Si es un número, se utilizará como código de salida.

---

## Ejemplos de Uso

### 1. Inicialización Básica (Solo Consola)

```typescript
import { PLogger } from 'pols-logger'

const logger = new PLogger()

logger.info({
	label: 'APP_START',
	description: 'Iniciando la aplicación en modo producción'
})
```

### 2. Guardado en Archivo con Rotación Personalizada

Puedes generar archivos de logs separados por horas, turnos o días utilizando la fecha actual en la función `fileName`:

```typescript
import { PLogger } from 'pols-logger'
import { PUtilsDate, PUtilsNumber } from 'pols-utils'

const logger = new PLogger({
	showIn: {
		console: true,
		file: true
	},
	destinationPath: __dirname + '/logs',
	fileName: ({ now }) => {
		// Crea un archivo diferente cada 6 horas (ej: LOG 2026-07-07 06-00.log)
		const hourRange = PUtilsNumber.padStart(Math.floor(now.getHours() / 6) * 6, 2)
		return PUtilsDate.format(now, `LOG @y-@mm-@dd ${hourRange}-00.log`)
	}
})

logger.system({
	label: 'DB_SYNC',
	description: 'Sincronización de esquemas completada'
})
```

### 3. Registro de Datos Complejos (Objetos, Arreglos y Errores)

`pols-logger` detecta automáticamente el tipo de dato del `body` y lo formatea de manera óptima para lectura humana.

```typescript
// 1. Registrar un Objeto (JSON formateado con espacios)
logger.info({
	label: 'USER_LOGIN',
	body: {
		userId: 1042,
		role: 'admin',
		session: { active: true }
	}
})

// 2. Registrar un Error (Muestra mensaje y stack trace limpio)
try {
	throw new Error('Conexión perdida con el host remoto')
} catch (error) {
	logger.error({
		label: 'CONNECTION_FAILURE',
		body: error
	})
}

// 3. Registrar un Arreglo Mixto (Formatea recursivamente cada elemento)
logger.warning({
	label: 'BATCH_PROCESS',
	body: [
		'Procesando lote #54',
		404,
		{ itemId: 'A-12' },
		new Error('Fallo de validación local')
	]
})
```

### 4. Uso del Hook de Evento `onEntryFinish`

Útil para reenviar alertas a servicios de mensajería (como Slack, Telegram) o registrar auditorías adicionales:

```typescript
const logger = new PLogger({
	destinationPath: './logs',
	showIn: { console: true, file: true }
})

// Hook que se ejecuta al finalizar la escritura de cada log
logger.onEntryFinish = (entry) => {
	if (entry.exit) {
		console.log(`El logger provocó una salida del sistema con etiqueta: ${entry.label}`)
	}
}
```

---

## Licencia

Este proyecto está bajo la Licencia ISC.