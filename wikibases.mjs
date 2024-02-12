import { WBK } from './node_modules/wikibase-sdk/dist/src/wikibase-sdk.js'

const wikibases = {
	wikidata: {
		instance: 'https://www.wikidata.org',
		sparqlEndpoint: 'https://query.wikidata.org/sparql',
		props: {
			appliesIfRegularExpressionMatches: 'P8460', 
			formatterURL: 'P1630',
			hasCharacteristic: 'P1552',
			instanceOf: 'P31',
			mastodonAddress: 'P4033',
			mobileFormatterURL: 'P7250',
			shortTitle: 'P1813',
			thirdPartyFormatterURL: 'P3303',
			unitSymbol: 'P5061',
			urlMatchPattern: 'P8966',
			urlMatchReplacementValue: 'P8967', 
			websiteTitleExtractPattern: 'P10999', 
		},
		items: {
			allCaps: 'Q3960579', 
			caseInsensitive: 'Q55121183',
			lowercase: 'Q65048529',
			obsoleteProperty: 'Q18644427',
			propertyLinkingToArticlesInMediaWikiWebsites: 'Q123667996',
		},
		badResolvers: [
			'https://wikidata-externalid-url.toolforge.org/',
			'https://web.archive.org/web/',
			'https://resolve.eidr.org/',
		]
	},
	testWikidata: {
		instance: 'https://test.wikidata.org',
	},
	osmWiki: {
		instance: 'https://wiki.openstreetmap.org',
		sparqlEndpoint: 'https://sophox.org/sparql',
	}, 
	datatrek: {
		instance: 'https://data.wikitrek.org',
  		wgScriptPath: '/dt',
	},
	wikibaseWorld: {
		instance: 'https://wikibase.world',
		sparqlEndpoint: 'https://wikibase.world/query/sparql',
	},
	commons: {
		instance: 'https://commons.wikimedia.org',
		sparqlEndpoint: 'https://wikibase.world/query/sparql',
	}
}

Object.keys(wikibases).forEach(name => {
	wikibases[name].id = name
	const wgScriptPath = wikibases[name]?.wgScriptPath ?? '/w'
	wikibases[name].api = WBK({
		instance: wikibases[name].instance,
		sparqlEndpoint: wikibases[name]?.sparqlEndpoint,
		wgScriptPath: wgScriptPath,
		wikiRoot: `${wikibases[name].instance}${wgScriptPath}`
	})
})

export default wikibases