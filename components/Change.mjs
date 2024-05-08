import { h, render, Component } from '../importmap/preact/src/index.js';
import { useState, useEffect } from '../importmap/preact/hooks/src/index.js';
import htm from '../importmap/htm/src/index.mjs';
import { requireStylesheet } from '../modules/requireStylesheet.mjs';
import DismissedEditsAPI from '../modules/DismissedEditsAPI.mjs';

const html = htm.bind(h);

import Nibble from './Nibble.mjs';
import Snack from './Snack.mjs';
import Specify from './Specify.mjs';
import Thin from './Thin.mjs';
import Thing from './Thing.mjs';

class Change extends Component {
	constructor(props) {
		super(props);

		const dismissed = new DismissedEditsAPI();

		this.manager = props.manager;
		this.editId = props.editId;
		this.name = props.name;
		this.action = props.action;
		this.signature = props?.signature;
		this.state = {
			claim: props?.claim,
			labels: props?.labels,
			sitelink: props?.sitelink,
			editMode: false,
			active: !dismissed.isEditDismissed(this.signature),
		};
	}

	handleDataValueChange = ({ name, value }) => {
		const parts = name.replace(`${this.name}.`, '').split('.');

		this.setState(prevState => {
			let stateRef = prevState;

			parts.forEach((part, index) => {
				// Check if we're at the last part of the path
				if (index === parts.length - 1) {
					// Update the value
					stateRef[part] = value;
				} else {
					// Navigate deeper into the state
					stateRef = stateRef[part];
				}
			});

			return { ...prevState };
		});
	};

	componentDidMount() {
		requireStylesheet(browser.runtime.getURL('/components/change.css'));
	}

	render() {
		const manager = this.manager;

		const getKey = action => {
			switch (action) {
				case 'claim:create':
					if (this.state.claim?.mainsnak.propertyOptions) {
						return html`<${Specify}
							options=${this.state.claim.mainsnak.propertyOptions}
							manager="${manager}"
							disabled=${!this.state.active}
							name=${`${this.name}.claim.mainsnak.property`}
							value=${this.state.claim?.mainsnak?.property} />`;
					} else if (this.state.claim?.mainsnak.property) {
						return html`<${this.state.active ? Thing : Thin}
								id=${this.state.claim.mainsnak.property}
								manager="${manager}" />
							<input
								value=${this.state.claim.mainsnak.property.replace(
									/^\w+\:/,
									'',
								)}
								name=${`${this.name}.claim.mainsnak.property`}
								type="hidden" /> `;
					}
					break;
				case 'labels:add':
					return browser.i18n.getMessage('set_label_or_alias');
				case 'sitelink:set':
					return browser.i18n.getMessage('set_sitelink');
			}
		};

		const getValue = action => {
			switch (action) {
				case 'claim:create':
					if (this.state.claim.mainsnak?.datavalue?.value) {
						return html`<${Snack}
							mainsnak=${this.state.claim.mainsnak}
							manager=${manager} />`;
					} else if (this.state.claim.mainsnak.valueOptions) {
						return html`<${Specify}
								options=${this.state.claim.mainsnak.valueOptions}
								manager="${manager}"
								disabled=${!this.state.active}
								name="${this.name}.claim.mainsnak.datavalue.value.id" />
							<input
								type="hidden"
								name="${this.name}.claim.mainsnak.datatype"
								value=${this.state.claim.mainsnak.datatype} />
							<input
								type="hidden"
								name="${this.name}.claim.mainsnak.snaktype"
								value="value" />`;
					}
				case 'labels:add':
					return html`
						<input
							type="hidden"
							name="${this.name}.add"
							value="${this.state?.labels.add}" />
						<input
							type="hidden"
							name="${this.name}.language"
							value="${this.state?.labels.language}" />
						<em lang=${this.state?.labels.language}
							>${this.state?.labels.add}</em
						>
					`;
				case 'sitelink:set':
					return html`<div>
						<code>
							<input
								type="hidden"
								name="${this.name}.sitelink.site"
								value="${this.state?.sitelink.site}" />
							<input
								type="hidden"
								name="${this.name}.sitelink.title"
								value="${this.state?.sitelink.title}" />
							${this.state?.sitelink.site}:
							<strong>${this.state?.sitelink.title}</strong>
						</code>
					</div>`;
			}
		};

		return html`
			<div class="change">
				<input
					value=${this.signature}
					name=${`${this.name}.signature`}
					type="hidden" />
				<dl
					class="change__preview ${!this.state.active
						? 'change__preview--disabled'
						: ''}">
					<dt class="change__key">${getKey(this.action)}</dt>
					<dd class="change__value" hidden=${this.state.editMode}>
						${getValue(this.action)}
						${this.state?.claim?.mainsnak.datavalue &&
						html`<button
							title="${'Edit mode'}"
							class="change__toggle"
							hidden=${!this.state.active}
							onClick=${e => {
								e.preventDefault();
								this.setState({ editMode: true });
							}}>
							${'🖊︎'}
						</button>`}
					</dd>
					${this.state?.claim?.mainsnak.datavalue &&
					html`<dd class="change__value" hidden=${!this.state.editMode}>
						<${Nibble}
							datatype=${this.state.claim.mainsnak.datatype}
							datavalue=${this.state.claim.mainsnak.datavalue}
							name=${`${this.name}.claim.mainsnak`}
							onValueChange=${this.handleDataValueChange}
							manager=${manager} />
						<input
							name=${`${name}.claim.mainsnak.datatype`}
							value=${this.state.claim.datatype}
							type="hidden" />
						<button
							title="${'Accept'}"
							class="change__toggle"
							onClick=${e => {
								e.preventDefault();
								this.setState({ editMode: false });
							}}>
							${'✓'}
						</button>
						<input
							type="hidden"
							name=${`${this.name}.claim.type`}
							value="statement" />
						<input
							type="hidden"
							name=${`${this.name}.claim.rank`}
							value="normal" />
					</dd>`}
					<dd class="change__bool">
						<input
							name=${`${this.name}.apply`}
							value="yes"
							type="checkbox"
							onChange=${e => {
								this.setState({ active: !this.state.active });
							}}
							checked=${this.state.active} />
					</dd>
					<dd class="change__qualifiers" hidden=${!this.state.active}>
						${this.state?.claim?.qualifiers &&
						this.state.claim.qualifiers.map(
							(qualifier, index) =>
								html`<dl>
									<dt class="change__reference__prop">
										<${Thin}
											id=${qualifier.mainsnak.property}
											manager=${manager} />
										<input
											type="hidden"
											name=${`${this.name}.claim.qualifiers.${index}.property`}
											value=${qualifier.mainsnak.property.replace(/.+:/, '')} />
									</dt>
									<dd class="change__reference__snak">
										<${Snack}
											mainsnak=${qualifier.mainsnak}
											manager=${manager} />
										<div hidden>
											${
												/* maybe we can make this editable in the future 🤷 */ ''
											}
											<${Nibble}
												datatype=${qualifier.mainsnak.datatype}
												datavalue=${qualifier.mainsnak.datavalue}
												name=${`${this.name}.claim.qualifiers.${index}.snak`}
												onValueChange=${this.handleDataValueChange}
												manager=${manager} />
										</div>
									</dd>
								</dl>`,
						)}
						${this.state?.claim?.references?.length > 0 &&
						html`
							<details>
								<summary>Reference</summary>
								${this.state.claim.references.map(
									reference =>
										html` <div class="change__reference">
											${Object.entries(reference.snaks).map(
												([prop, statements]) =>
													html`<dl>
														<dt class="change__reference__prop">
															<${Thin} id=${prop} manager=${manager} />
														</dt>
														${statements.map(
															(statement, index) =>
																html`<dd class="change__reference__snak">
																	<${Snack}
																		mainsnak=${statement}
																		manager=${manager} />
																	<div hidden>
																		${
																			/* maybe we can make this editable in the future 🤷 */ ''
																		}
																		<${Nibble}
																			datatype=${statement.datatype}
																			datavalue=${statement.datavalue}
																			name=${`${this.name}.claim.references.${index}.snaks.${prop.replace(/.+:/, '')}.0`}
																			onValueChange=${this
																				.handleDataValueChange}
																			manager=${manager} />
																	</div>
																	<input
																		type="hidden"
																		name=${`${this.name}.claim.references.${index}.snaks.${prop.replace(/.+:/, '')}.0.property`}
																		value=${prop.replace(/.+:/, '')} />
																</dd>`,
														)}
													</dl>`,
											)}
										</div>`,
								)}
							</details>
						`}
					</dd>
				</dl>
				<input
					name=${`${this.name}.action`}
					value="${this.action}"
					type="hidden"
					checked />
			</div>
		`;
	}
}

export default Change;
