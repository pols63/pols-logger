import { PUtilsDate, PUtilsNumber } from 'pols-utils'
import { PLogger } from '../src/index'

const logger = new PLogger({
	showIn: {
		file: true
	},
	fileName: ({ now }) => PUtilsDate.format(now, `LOG @y-@mm-@dd ${PUtilsNumber.padStart(Math.floor(now.getHours() / 6) * 6, 2)}-00.log`),
	destinationPath: __dirname
})
logger.system({ label: 'UNO', description: 'uno' })