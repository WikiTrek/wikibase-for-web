import { objectGetFirst } from '../modules/objectGetFirst.mjs';
import { h, Component } from '../node_modules/preact/dist/preact.mjs';
import { useState, useEffect, useRef } from '../libraries/preact-hooks.js';
import htm from '../node_modules/htm/dist/htm.mjs';
import { getByUserLanguage } from '../modules/getByUserLanguage.mjs';
import { filterBadClaims } from '../modules/filterBadValues.mjs';

const html = htm.bind(h);

class Spot extends Component {
	render({ value, property, manager }) {
		const getFormatterUrls = async id => {
			const formatterProp = manager.wikibase.props?.formatterURL;
			if (!formatterProp) {
				return [];
			}
			const prop = await manager.add(id);
			if (prop.claims?.[formatterProp]) {
				const filteredClaims = filterBadClaims([prop.claims[formatterProp]]);
				if (filteredClaims.length === 0) {
					return [];
				}
				return filteredClaims[0].map(value => {
					if (value.mainsnak?.datavalue?.value) {
						return value.mainsnak.datavalue.value;
					}
				});
			}
			return [];
		};

		let [formatters, setFormatters] = useState(false);
		const elementRef = useRef(null);

		if (!formatters) {
			useEffect(() => {
				const observer = new IntersectionObserver(async entries => {
					if (entries[0].isIntersecting) {
						const formatters = await getFormatterUrls(property);
						if (formatters.length > 0) {
							setFormatters(formatters);
						}
					}
				});

				if (elementRef.current) {
					observer.observe(elementRef.current);
				}

				return () => observer.disconnect();
			}, []);
		}

		const href = formatters ? formatters[0].replace('$1', value) : false;

		return html`
			<span class="spot" ref=${elementRef}>
				${href && html`<a class="spot__link" href=${href}>${value}</a>`}
				${!href && html`<code class="spot__code">${value}</code>`}
			</span>
		`;
	}
}

export default Spot;