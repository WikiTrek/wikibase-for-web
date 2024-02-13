import { render } from './render.mjs'
import WikiBaseEntityManager from '../modules/WikiBaseEntityManager.mjs'

const manager = new WikiBaseEntityManager({
	activateCallback: render,
	languages: navigator.languages,
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "display_entity") {
		try {
			manager.addEntities(message.ids)
		} catch (e) {
			console.error(e)
		}

		(async () => {
			await manager.activate(message.ids)
		})()
		return Promise.resolve('done')
	}
	return false;
})

try {
	await browser.runtime.sendMessage(
		browser.runtime.id,
		{
			type: 'request_entity',
		},
	)
} catch (error) {
	console.error(error);
}