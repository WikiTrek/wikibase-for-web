import { siteLinks } from './siteLinks.mjs';
import { url } from './url.mjs';
import { urlMatchPattern } from './urlMatchPattern.mjs';
import { wikibase } from './wikibase.mjs';
import wikibases from '../wikibases.mjs';
import WikiBaseQueryManager from '../queries/index.mjs';

const queryManager = new WikiBaseQueryManager();

const resolvers = {
	list: [siteLinks, url, urlMatchPattern, wikibase],
};

const resolvedCache = {};

resolvers.resolve = async function (url, allowedWikibases = null) {
	if (url in resolvedCache && allowedWikibases === null) {
		return resolvedCache[url];
	}

	let candidates = [];
	await Promise.all(
		this.list.map(async resolver => {
			await Promise.all(
				Object.keys(wikibases).map(async name => {
					if (allowedWikibases && !allowedWikibases.includes(name)) {
						return;
					}
					if (wikibases[name]?.resolve === false) {
						return;
					}
					const context = {
						wikibase: wikibases[name],
						queryManager: queryManager,
						wikibaseID: name,
					};
					const applies = await resolver.applies(url, context);
					if (applies.length > 0) {
						for (const apply of applies) {
							apply.resolved = await resolver.resolve(apply, context);
						}
						candidates = [...candidates, ...applies];
					}
				}),
			);
		}),
	);

	candidates.sort((a, b) => b.specificity - a.specificity);

	resolvedCache[url] = candidates;

	return candidates;
};

export { resolvers, resolvedCache };
