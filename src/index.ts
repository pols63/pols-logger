import fs from 'fs'
import path from 'path'
import { PRecord, PUtilsDate } from 'pols-utils'

export enum PThemes {
	INFO = 'INFO',
	WARNING = 'WARNING',
	ERROR = 'ERROR',
	DEBUG = 'DEBUG',
	SYSTEM = 'SYSTEM',
	FATAL = 'FATAL',
}

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

export type PLoggerParams = {
	destinationPath?: string
	fileName?: ({ theme, now }: {
		theme: PThemes
		now: Date
	}) => string
	showIn?: PLoggerShowInConfig
}

export type PLoggerLogParams = {
	label: string
	description?: string
	tags?: string[]
	body?: string | PRecord | unknown[] | Error
	exit?: boolean | number
}

const check = (theme: PThemes, value: null | undefined | PLoggerShowInParams, def: boolean): boolean => {
	if (value == null) return def
	if (typeof value == 'boolean') return value
	switch (theme) {
		case PThemes.INFO: return value.info ?? def
		case PThemes.WARNING: return value.warning ?? def
		case PThemes.ERROR: return value.error ?? def
		case PThemes.DEBUG: return value.debug ?? def
		case PThemes.SYSTEM: return value.system ?? def
		case PThemes.FATAL: return value.fatal ?? def
	}
	return def
}

const logger = (theme: PThemes, pLogger: PLogger, { label, description, body, exit = false, tags }: PLoggerLogParams, executeEvent = true) => {
	const now = new Date
	const nowString = PUtilsDate.format(now, '@dd/@mm/@y @hh:@ii:@ss.@lll')

	const headers: string[] = [`[${theme}]`, nowString, '::', label]
	if (description) headers.push('::', description)
	if (tags?.length) headers.push(...tags.map(tag => `[${tag}]`))

	const textBody: string[] = []
	if (body instanceof Array) {
		textBody.push(...body.map(b => {
			if (b instanceof Error) {
				return [
					'Error: ' + b.message,
					b.stack?.replace(/^Error.*?\n/, '') ?? ''
				]
			} else if (typeof b == 'string') {
				return b
			} else if (typeof b == 'number') {
				return b.toString()
			} else if (b == null) {
				return ''
			} else if (typeof b == 'object') {
				try {
					return JSON.stringify(b, null, 2)
				} catch {
					return b.toString()
				}
			} else {
				return String(b)
			}
		}).flat())
	} else if (body instanceof Error) {
		textBody.push(
			'Error: ' + body.message,
			body.stack?.replace(/^Error.*?\n/, '') ?? ''
		)
	} else if (typeof body == 'string') {
		textBody.push(body)
	} else if (typeof body == 'number') {
		textBody.push((body as any).toString())
	} else if (body == null) {
		// do nothing
	} else if (typeof body == 'object') {
		try {
			textBody.push(JSON.stringify(body, null, 2))
		} catch {
			textBody.push((body as any).toString())
		}
	} else {
		textBody.push(String(body))
	}

	/* Por defecto, muestra el mensaje en consola */
	if (check(theme, pLogger.showIn?.console, true)) {
		if ([PThemes.ERROR, PThemes.FATAL].includes(theme)) {
			console.error(headers.join(' '))
			if (textBody.length) console.error(textBody.join('\n'))
		} else {
			console.log(headers.join(' '))
			if (textBody.length) console.log(textBody.join('\n'))
		}
	}

	/* Mensaje en archivo */
	if (check(theme, pLogger.showIn?.file, false)) {
		const fileName = pLogger.fileName?.({ theme, now }) ?? `LOG_${PUtilsDate.format(now, '@y-@mm-@dd')}.log`
		if (!pLogger.destinationPath) throw new Error(`La propiedad 'destinationPath' es requerida si la entrada debe ir a un archivo`)
		const filePath = path.join(pLogger.destinationPath, fileName)

		if (pLogger._dirChecked !== pLogger.destinationPath) {
			if (!fs.existsSync(pLogger.destinationPath)) {
				/* Si no existe la carpeta para los logs, se intentará crear automáticamente */
				try {
					fs.mkdirSync(pLogger.destinationPath, { recursive: true })
				} catch (error) {
					const errMsg = error instanceof Error ? error.message : String(error)
					throw new Error(`No fue posible crear el directorio '${pLogger.destinationPath}': ${errMsg}`)
				}
			}
			pLogger._dirChecked = pLogger.destinationPath
		}

		try {
			fs.appendFileSync(filePath, `${headers.join(' ')}${textBody.length ? `\n${textBody.join('\n')}` : ''}\n`, { encoding: 'utf-8' })
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error)
			throw new Error(`No fue posible registrar la entrada en el archivo '${filePath}': ${errMsg}`)
		}
	}

	/* Ejecuta el evento del pLogger */
	if (executeEvent) {
		try {
			pLogger.onEntryFinish?.({ label, description, body, exit, tags })
		} catch (error) {
			logger(PThemes.ERROR, pLogger, { label: 'PLOGGER', description: 'Error al ejecutar el evento "onEntryFinish"', body: error }, false)
		}
	}

	/* Si se ha dado la opción, se sale del programa */
	if (exit) {
		const exitCode = typeof exit === 'number' ? exit : (theme === PThemes.FATAL || theme === PThemes.ERROR ? 1 : 0)
		process.exit(exitCode)
	}
}

export class PLogger {
	destinationPath?: string
	showIn?: PLoggerShowInConfig
	fileName?: PLoggerParams['fileName']
	_dirChecked?: string
	declare onEntryFinish?: (params: PLoggerLogParams) => void

	constructor(params?: PLoggerParams) {
		this.destinationPath = params?.destinationPath
		this.showIn = params?.showIn
		this.fileName = params?.fileName
	}

	info(params: PLoggerLogParams) {
		logger(PThemes.INFO, this, params)
	}

	warning(params: PLoggerLogParams) {
		logger(PThemes.WARNING, this, params)
	}

	error(params: PLoggerLogParams) {
		logger(PThemes.ERROR, this, params)
	}

	debug(params: PLoggerLogParams) {
		logger(PThemes.DEBUG, this, params)
	}

	system(params: PLoggerLogParams) {
		logger(PThemes.SYSTEM, this, params)
	}

	fatal(params: PLoggerLogParams) {
		logger(PThemes.FATAL, this, { ...params, exit: true })
	}
}