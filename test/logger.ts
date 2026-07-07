import { PUtilsDate } from 'pols-utils'
import { PLogger } from '../src/index'

const logger = new PLogger({
	showIn: {
		console: true,
		file: true
	},
	fileName: ({ now }) => PUtilsDate.format(now, `LOG_TEST_@y-@mm-@dd.log`),
	destinationPath: __dirname
})

console.log('--- TEST 1: Logging a simple message ---')
logger.info({ label: 'INFO_TEST', description: 'Simple test message' })

console.log('--- TEST 2: Logging an object body ---')
logger.info({
	label: 'OBJECT_TEST',
	body: {
		key: 'value',
		nested: {
			num: 42,
			bool: true
		}
	}
})

console.log('--- TEST 3: Logging a mixed array ---')
logger.warning({
	label: 'ARRAY_TEST',
	body: [
		'String in array',
		100,
		{ arrayObj: 'hello' },
		new Error('Error inside array')
	]
})

console.log('--- TEST 4: Logging a top-level Error ---')
logger.error({
	label: 'ERROR_TEST',
	body: new Error('Top-level error trace')
})

console.log('--- TEST 5: Fatal log (will print and exit with code 1) ---')
logger.fatal({
	label: 'FATAL_TEST',
	body: 'This is fatal, exiting now...'
})