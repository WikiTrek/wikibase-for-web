import { h, render, Component } from '../importmap/preact/src/index.js';
import { useState, useEffect } from '../importmap/preact/hooks/src/index.js';
import htm from '../importmap/htm/src/index.mjs';
import { requireStylesheet } from '../modules/requireStylesheet.mjs';
import { formDataToData } from '../modules/formDataToData.mjs';
import DismissedEditsAPI from '../modules/DismissedEditsAPI.mjs';
import OptionsHistoryAPI from '../modules/OptionsHistoryAPI.mjs';
import { getPropertySubjectByConstraint } from '../modules/getPropertySubjectByConstraint.mjs';

import { suggestedEdits } from '../mapping/index.mjs';

import Choose from './Choose.mjs';
import Change from './Change.mjs';
import Engage from './Engage.mjs';
import Wait from './Wait.mjs';

const html = htm.bind(h);

const submit = e => {
  for (const component of e.target.form) {
    if (component.nodeName === 'SELECT' && component.disabled == false) {
      const optionsHistoryAPI = new OptionsHistoryAPI();
      optionsHistoryAPI.updateOptionPick(
        Array.from(component.children).map(option => option.value),
        component.value,
      );
    }
  }

  const data = formDataToData(e.target.form);
  const jobs = [];

  if (data.subjectId === 'CREATE') {
    jobs.push({
      action: 'entity:create',
      instance: data.instance,
      new: 'item',
      data: {
        labels: [
          {
            language: data.lang,
            value: data.search,
          },
        ],
      },
    });
  }

  const dismissed = new DismissedEditsAPI();

  for (const edit of data.edits) {
    if (edit.signature) {
      dismissed.toggleDismissedEdit(edit.signature, !edit.apply);
    }
    if (!edit.apply) {
      continue;
    }
    if (edit?.action === 'claim:create') {
      jobs.push({
        action: edit.action,
        instance: data.instance,
        entity: data.subjectId === 'CREATE' ? 'LAST' : data.subjectId,
        claim: edit.claim,
      });

      if (edit?.claim?.qualifiers) {
        edit.claim.qualifiers.forEach(qualifier => {
          jobs.push({
            action: 'qualifier:set',
            instance: data.instance,
            statement: 'LAST',
            value: qualifier.snak.datavalue,
            property: qualifier.property,
            snaktype: qualifier.snak.snaktype,
          });
        });
      }

      if (edit?.claim?.references) {
        edit.claim.references.forEach(reference => {
          jobs.push({
            action: 'reference:set',
            instance: data.instance,
            statement: 'LAST',
            snaks: reference.snaks,
          });
        });
      }
    }
    if (edit?.action === 'sitelink:set') {
      jobs.push({
        action: edit.action,
        instance: data.instance,
        entity: data.subjectId === 'CREATE' ? 'LAST' : data.subjectId,
        sitelink: edit.sitelink,
      });
    }
    if (edit?.action === 'labels:add') {
      jobs.push({
        action: edit.action,
        instance: data.instance,
        entity: data.subjectId === 'CREATE' ? 'LAST' : data.subjectId,
        add: edit.add,
        language: edit.language,
      });
    }
  }

  if (data.matchUrl) {
    jobs.push({
      action: 'resolver:add',
      entity: data.subjectId === 'CREATE' ? 'LAST' : data.subjectId,
      instance: data.instance,
      url: data.matchUrl,
    });
  }

  //console.debug(jobs);

  try {
    browser.runtime.sendMessage({
      type: 'add_to_edit_queue',
      edits: jobs,
    });
    if (data.subjectId !== 'CREATE') {
      browser.runtime.sendMessage({
        type: 'resolved',
        candidates: [
          {
            instance: data.instance,
            specificity: 900,
            matchFromUrl: data.matchUrl,
            resolved: [
              {
                specificity: 900,
                id: `${data.instance}:${data.subjectId}`,
              },
            ],
          },
        ],
      });
    }
  } catch (error) {
    console.error(error);
  }
};

const MatchInstance = ({ suggestion, manager, edits }) => {
  const [subjectSelected, setSubjectSelected] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [searchText, setSeachText] = useState('');
  const [allEdits, setAllEdits] = useState(edits);
  const [metaData, setMetaData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(navigator.language);
  const [subjectType, setSubjectType] = useState('item');

  useEffect(() => {
    setAllEdits(edits);
  }, []);

  const updateAdditionalEdits = async metadata => {
    let newSearchTitle = '';
    let newEdits = [...edits];

    if (metadata?.mediawiki?.wgTitle) {
      newSearchTitle = metadata.mediawiki.wgTitle;
      newEdits.push({
        action: 'labels:add',
        signature: `mediawiki-title:${new URL(metadata.location).host}`,
        labels: {
          add: metadata.mediawiki.wgTitle,
          language: metadata.mediawiki?.wgPageContentLanguage,
        },
      });
    } else if (metadata?.title) {
      newSearchTitle = metadata.title;
      if (suggestion?.titleExtractPattern) {
        const matches = metadata.title.match(suggestion.titleExtractPattern);
        if (matches?.[1]) {
          newSearchTitle = matches[1];
          newEdits.push({
            action: 'labels:add',
            signature: `extracted-title:${suggestion.titleExtractPattern}`,
            labels: {
              add: matches[1],
              language: metadata.lang,
            },
          });
        }
      }
    }

    const additionalEdits = await suggestedEdits(
      suggestion,
      metadata,
      manager.wikibases[suggestion.instance],
    );
    newEdits = [...newEdits, ...additionalEdits];

    setAllEdits(newEdits);

    setSeachText(newSearchTitle);
  };

  const requestMetadata = async () => {
    const requestedMetadata = await browser.runtime.sendMessage({
      type: 'request_metadata',
      url: suggestion.matchFromUrl,
    });

    const newMetaData = requestedMetadata.response;
    setMetaData(newMetaData);

    if (requestedMetadata?.response?.lang) {
      setLang(requestedMetadata.response.lang);
    }

    await updateAdditionalEdits(newMetaData);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await requestMetadata();
    })();
  }, []);

  useEffect(async () => {
    if (suggestion.matchProperty) {
      const requestedType = await getPropertySubjectByConstraint(
        suggestion,
        manager,
      );

      setSubjectType(requestedType);
    }
  }, []);

  const filteredEdits = [];
  for (const edit of allEdits) {
    // labels only apply to items, so lets filter that out
    if (edit.action === 'labels:add' && subjectType !== 'item') {
      continue;
    }
    filteredEdits.push(edit);
  }

  return html`
    <form class="match__form">
      <input type="hidden" value=${suggestion.instance} name="instance" />
      <div class="match__item">
        <div class="match__statements">
          ${Object.entries(filteredEdits).map(
            ([editId, edit]) =>
              html`<${Change}
                key=${editId}
                claim=${edit?.claim}
                labels=${edit?.labels}
                sitelink=${edit?.sitelink}
                action=${edit.action}
                signature=${edit?.signature}
                name=${`edits.${editId}`}
                manager=${manager} />`,
          )}
        </div>
        ${loading
          ? html`<${Wait}
              status=${browser.i18n.getMessage('aquiring_metadata')} />`
          : ''}
        <${Choose}
          label=${searchText}
          manager=${manager}
          wikibase=${suggestion.instance}
          name="subjectId"
          type=${subjectType}
          required="true"
          onSelected=${() => {
            setSubjectSelected(true);
          }} />
      </div>
      <input type="hidden" name="matchUrl" value=${suggestion.matchFromUrl} />
      <div class="match__bottom">
        <input
          type="hidden"
          name="lang"
          value=${navigator.language.toLowerCase()} />
        <input name="instance" type="hidden" value=${suggestion.instance} />
        <${Engage}
          text=${browser.i18n.getMessage('send_to_instance', [
            manager.wikibases[suggestion.instance].name,
          ])}
          onClick=${e => {
            setSubmitted(true);
            submit(e);
          }}
          disabled=${!subjectSelected || submitted} />
      </div>
    </form>
  `;
};

const Match = ({ suggestions, manager }) => {
  const [open, setOpen] = useState(0);
  const [forceRefresh, setForceRefresh] = useState('');

  useEffect(() => {
    requireStylesheet(browser.runtime.getURL('/components/match.css'));
  }, []);

  useEffect(() => {
    (async () => {
      manager.updateSidebarAction(suggestions[open].instance);
    })();
  }, [open]);

  useEffect(() => {
    setForceRefresh(JSON.stringify(suggestions));
  }, [suggestions]);

  return html`
    <div class="match">
      <h1>${browser.i18n.getMessage('match_title')}</h1>
      ${suggestions.map((suggestion, index) => {
        let edits = suggestion.proposeEdits;
        manager.wikibase = manager.wikibases[suggestion.instance];
        return html`
          <details ...${{ open: index === open }} class="match__instance">
            <summary
              class="match__instance-name"
              onClick=${e => {
                e.preventDefault();
                setOpen(index);
              }}>
              ${suggestion?.proposeSummary ??
              manager.wikibases[suggestion.instance].name}
            </summary>
            ${index === open &&
            html`<${MatchInstance}
              suggestion=${suggestion}
              manager=${manager}
              key=${`${forceRefresh}-${index}`}
              edits=${edits} />`}
          </details>
        `;
      })}
    </div>
  `;
};

export default Match;
